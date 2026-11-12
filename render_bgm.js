// ============================================================================
// render_bgm.js — Fast Chunked Headless Situational Master BGM Renderer (48kHz WAV)
// Supports Lumina's k.situationalCue(...) AND legacy k.cue(...)
// Location: C:\Users\vaish\Videos\Video_Studio\Lumina\render_bgm.js
// ============================================================================
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer');

function writeWavHeader(fd, totalPcmBytes, sampleRate = 48000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalPcmBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM
  header.writeUInt16LE(1, 20);  // Linear PCM
  header.writeUInt16LE(2, 22);  // 2 Channels (Stereo)
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28); // ByteRate
  header.writeUInt16LE(4, 32);  // BlockAlign
  header.writeUInt16LE(16, 34); // 16-bit
  header.write('data', 36);
  header.writeUInt32LE(totalPcmBytes, 40);
  fs.writeSync(fd, header, 0, 44, 0);
}

// Install fast windowed BGM renderer inside the browser page
async function installChunkRenderer(page) {
  await page.evaluate(() => {
    if (!window.__webAudioGuarded) {
      window.__webAudioGuarded = true;
      const pProto = window.AudioParam && window.AudioParam.prototype;
      if (pProto) {
        const origSet = pProto.setValueAtTime;
        const origLin = pProto.linearRampToValueAtTime;
        const origExp = pProto.exponentialRampToValueAtTime;
        pProto.setValueAtTime = function (v, t) {
          return origSet.call(this, v, Math.max(0, Number.isFinite(t) ? t : 0));
        };
        pProto.linearRampToValueAtTime = function (v, t) {
          return origLin.call(this, v, Math.max(0, Number.isFinite(t) ? t : 0));
        };
        pProto.exponentialRampToValueAtTime = function (v, t) {
          return origExp.call(this, Math.max(1e-4, v), Math.max(0, Number.isFinite(t) ? t : 0));
        };
      }
      const sProto =
        window.AudioScheduledSourceNode && window.AudioScheduledSourceNode.prototype;
      if (sProto) {
        const origStart = sProto.start;
        const origStop = sProto.stop;
        sProto.start = function (when, offset, duration) {
          const w = Math.max(0, Number.isFinite(when) ? when : 0);
          if (duration !== undefined) return origStart.call(this, w, offset || 0, Math.max(0, duration));
          if (offset !== undefined) return origStart.call(this, w, Math.max(0, offset));
          return origStart.call(this, w);
        };
        sProto.stop = function (when) {
          return origStop.call(this, Math.max(0, Number.isFinite(when) ? when : 0));
        };
      }
    }

    function evalAutomationAt(pts, t) {
      if (!pts || !pts.length) return 0.18;
      if (t <= pts[0].time) return pts[0].volume;
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i].time) {
          const p0 = pts[i - 1];
          const p1 = pts[i];
          const span = Math.max(1e-6, p1.time - p0.time);
          const u = (t - p0.time) / span;
          return p0.volume + (p1.volume - p0.volume) * u;
        }
      }
      return pts[pts.length - 1].volume;
    }

    window.__renderWindowedPcmB64 = async function (winStart, winEnd, preRoll, kitOpts, muteSfxAmb) {
      const sr = 48000;
      const ctxStart = Math.max(0, winStart - preRoll);
      const actualPreRoll = winStart - ctxStart;
      const totalWinDur = actualPreRoll + (winEnd - winStart);
      const origFn = window.scoreBGM || window.scoreSound;

      const windowedFn = (k) => {
        const origSituationalCue = k.situationalCue;
        const origCue = k.cue;
        const origBgmScore = k.bgmScore;

        // Wrap Lumina's k.situationalCue(c) for 30s chunking
        const wrappedSituationalCue = function (c) {
          if (!c || !origSituationalCue) return;
          const t0 = c.start_time !== undefined ? c.start_time : 0;
          const t1 = c.end_time !== undefined ? c.end_time : t0 + 10;
          if (t1 <= ctxStart || t0 > winEnd + 0.25) return;

          const bpm = c.bpm || 108;
          const beat = 60 / bpm;
          const bar = beat * 4;
          let adjT0 = t0;
          if (adjT0 < ctxStart) {
            const skipBars = Math.ceil((ctxStart - adjT0) / bar);
            adjT0 += skipBars * bar;
          }
          const adjT1 = Math.min(t1, winEnd + 0.25);
          if (adjT1 <= adjT0) return;

          const adjC = Object.assign({}, c, {
            start_time: adjT0,
            end_time: adjT1,
            timerChime: Boolean(c.timerChime && t0 >= ctxStart - 0.05 && t0 <= winEnd + 0.25),
            chapter_chime: Boolean(c.chapter_chime && t0 >= ctxStart - 0.05 && t0 <= winEnd + 0.25),
          });
          origSituationalCue(adjC);
        };

        // Wrap legacy k.cue(archetype, t0, t1, p)
        const wrappedCue = function (archetype, t0, t1, p = {}) {
          if (origSituationalCue) {
            wrappedSituationalCue(Object.assign({}, p, { situation: archetype, start_time: t0, end_time: t1 }));
            return;
          }
          if (t1 <= ctxStart || t0 > winEnd + 0.25) return;
          origCue(archetype, Math.max(ctxStart, t0), Math.min(t1, winEnd + 0.25), p);
        };

        const proxyK = Object.assign({}, k, {
          situationalCue: wrappedSituationalCue,
          cue: wrappedCue,
          bgmScore: function (score) {
            if (!score) return;
            if (Array.isArray(score.cues)) {
              score.cues.forEach((c) => wrappedSituationalCue(c));
            }
            if (Array.isArray(score.volume_automation) && score.volume_automation.length > 0 && origBgmScore) {
              const pts = score.volume_automation;
              const startVol = evalAutomationAt(pts, ctxStart);
              const winPts = [{ time: ctxStart, volume: startVol }];
              for (let i = 0; i < pts.length; i++) {
                if (pts[i].time > ctxStart + 0.001 && pts[i].time <= winEnd + 1.0) {
                  winPts.push(pts[i]);
                }
              }
              origBgmScore({ cues: [], volume_automation: winPts });
            }
          },
        });

        if (muteSfxAmb) {
          proxyK.play = () => {};
          proxyK.bed = () => {};
        }

        origFn(proxyK);
      };

      const opts = Object.assign({}, kitOpts, { start: ctxStart });
      const res = await window.SOUND.renderOffline(windowedFn, totalWinDur, sr, opts);

      const skipSamples = Math.round(actualPreRoll * sr) * 2;
      const keepSamples = Math.round((winEnd - winStart) * sr) * 2;
      const inter = res.inter;
      const pcm16 = new Int16Array(keepSamples);

      for (let i = 0; i < keepSamples; i++) {
        const s = Math.max(-1, Math.min(1, inter[skipSamples + i] || 0));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      const step = 32768;
      for (let i = 0; i < bytes.length; i += step) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
      }
      return btoa(binary);
    };
  });
}

async function renderPageInChunks(page, fd, totalDur, kitOpts, muteSfxAmb = false) {
  await installChunkRenderer(page);
  const CHUNK_SEC = 30.0;
  const PRE_ROLL = 2.5;
  const numChunks = Math.ceil(totalDur / CHUNK_SEC);
  let bytesWritten = 0;

  for (let c = 0; c < numChunks; c++) {
    const winStart = c * CHUNK_SEC;
    const winEnd = Math.min(totalDur, (c + 1) * CHUNK_SEC);
    process.stdout.write(
      `  -> Chunk ${c + 1}/${numChunks} (${winStart.toFixed(1)}s - ${winEnd.toFixed(1)}s)... `
    );
    const t0 = Date.now();
    const b64 = await page.evaluate(
      (ws, we, pr, opts, mute) => window.__renderWindowedPcmB64(ws, we, pr, opts, mute),
      winStart,
      winEnd,
      c === 0 ? 0 : PRE_ROLL,
      kitOpts,
      muteSfxAmb
    );
    const buf = Buffer.from(b64, 'base64');
    fs.writeSync(fd, buf);
    bytesWritten += buf.length;
    console.log(`done (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
  }
  return bytesWritten;
}

async function main() {
  const project = process.argv[2];
  const reqMixMode = process.argv[3] || 'bgmOnly';

  if (!project) {
    console.error('Usage: node render_bgm.js <project_name> [bgmOnly|bgmFull]');
    process.exit(1);
  }

  const isFull = reqMixMode === 'bgmFull' || reqMixMode === 'full';
  const kitDir = __dirname;
  let projDir = path.join(kitDir, 'projects', project);
  if (!fs.existsSync(projDir) && fs.existsSync(path.join(kitDir, 'Projects', project))) {
    projDir = path.join(kitDir, 'Projects', project);
  }
  const buildDir = path.join(projDir, 'build');
  const outWavPath = path.join(buildDir, 'bgm_master.wav');

  if (!fs.existsSync(projDir)) {
    console.error(`[ERROR] Project folder not found: ${projDir}`);
    process.exit(1);
  }
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const bgmHtmlPath = path.join(projDir, 'bgm_master.html');
  const browser = await puppeteer.launch({
    headless: 'new',
    protocolTimeout: 0,
    args: ['--allow-file-access-from-files', '--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    const sr = 48000;
    let totalBytes = 0;
    let totalDur = 0;

    const fd = fs.openSync(outWavPath, 'w');
    fs.writeSync(fd, Buffer.alloc(44));

    if (fs.existsSync(bgmHtmlPath)) {
      console.log(`[Lumina BGM] Found bgm_master.html — rendering in fast 30s studio chunks...`);
      await page.goto(pathToFileURL(bgmHtmlPath).href, { waitUntil: 'networkidle0', timeout: 0 });
      totalDur = await page.evaluate(
        () => window.DURATION || (window.BGM_SCORE && window.BGM_SCORE.total_duration) || 20.0
      );
      const mode = isFull ? 'bgmFull' : 'bgmOnly';
      totalBytes += await renderPageInChunks(page, fd, totalDur, { mixMode: mode }, false);
    } else {
      throw new Error(`bgm_master.html not found in ${projDir}`);
    }

    writeWavHeader(fd, totalBytes, sr);
    fs.closeSync(fd);

    console.log(
      `\n[SUCCESS] Rendered ${totalDur.toFixed(2)}s Situational BGM (${(totalBytes / (1024 * 1024)).toFixed(2)} MB) -> ${outWavPath}`
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});