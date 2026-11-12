#!/usr/bin/env node
/**
 * LUMINA 2.5D / 3D-PARALLAX STUDIO (16:9 WIDESCREEN) — FAST AUTOMATED LOCAL RENDERER
 * Location: C:\Users\vaish\Videos\Video_Studio\Lumina\render_shots.js
 * Supports external ../../engine.js, batch files (shots_XX_YY.html), and standalone Step 13 files (shot_XX.html).
 *
 * Usage Examples:
 *   1. Render ALL shots across all shots_*.html / shot_*.html files + merge master (auto-skips already rendered shots):
 *      node render_shots.js my_video --merge
 *
 *   2. Force re-render ALL shots even if build/shot_XX.mp4 already exists:
 *      node render_shots.js my_video --merge --force
 *
 *   3. Re-render ONLY Shot 4 (prefers standalone shot_04.html if newer, else shots_XX_YY.html):
 *      node render_shots.js my_video -shot 4
 *
 *   4. Render only one specific HTML file (batch or single shot):
 *      node render_shots.js my_video -batch shots_81_90.html
 *
 *   5. Render with SFX Only (no BGM) or without vo.wav:
 *      node render_shots.js my_video -mix sfxOnly
 *      node render_shots.js my_video -no-vo
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const puppeteer = require('puppeteer');

const FPS = 60;
const WIDTH = 1920;
const HEIGHT = 1080;

// ---------- 1. Parse Command-Line Arguments ----------
const args = process.argv.slice(2);
if (!args.length || args[0].startsWith('-')) {
  console.log('Usage: node render_shots.js <project_name> [-shot N] [-batch file.html] [-mix vo|full|sfxOnly] [-no-vo] [--merge] [--force]');
  process.exit(1);
}

const projectName = args[0];
const getFlagVal = (flag, def = null) => {
  const idx = args.findIndex((a) => a === flag || a === '-' + flag || a === '--' + flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
};
const hasFlag = (flag) => args.some((a) => a === flag || a === '-' + flag || a === '--' + flag);

const targetShotNum = getFlagVal('shot') ? Number(getFlagVal('shot')) : null;
const targetBatchFile = getFlagVal('batch');
const mixMode = getFlagVal('mix', 'sfxOnly'); // Default to 'sfxOnly' for clean per-shot SFX batches
const disableVo = hasFlag('no-vo');
const doMerge = hasFlag('merge');
const forceRender = hasFlag('force');

// Natural numeric comparator so shots_11_20.html comes BEFORE shots_101_110.html
const naturalSort = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// Resolve Kit & Project Directories (supports both 'projects' and 'Projects')
const kitDir = __dirname;
const engineJsPath = path.join(kitDir, 'engine.js');
let projectDir = path.join(kitDir, 'projects', projectName);
if (!fs.existsSync(projectDir) && fs.existsSync(path.join(kitDir, 'Projects', projectName))) {
  projectDir = path.join(kitDir, 'Projects', projectName);
} else if (!fs.existsSync(projectDir)) {
  projectDir = path.resolve(projectName);
}

if (!fs.existsSync(projectDir)) {
  console.error('[ERROR] Project folder not found:', projectDir);
  process.exit(1);
}

if (!fs.existsSync(engineJsPath)) {
  console.warn('[WARN] engine.js not found at:', engineJsPath);
  console.warn('       Make sure engine.js is saved in your root Lumina folder so <script src="../../engine.js"> loads!');
}

const buildDir = path.join(projectDir, 'build');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Locate vo.wav (checks project root or project/story/vo.wav)
let voPath = null;
if (!disableVo) {
  const candidates = [
    path.join(projectDir, 'vo.wav'),
    path.join(projectDir, 'story', 'vo.wav'),
    path.join(projectDir, 'vo.mp3'),
  ];
  voPath = candidates.find((p) => fs.existsSync(p)) || null;
}

// Locate Batch HTML files (shots_XX_YY.html) AND Standalone Single-Shot HTML files (shot_XX.html)
let htmlFiles = [];
if (targetBatchFile) {
  const cleanName = targetBatchFile.endsWith('.html') ? targetBatchFile : targetBatchFile + '.html';
  const explicitPath = path.join(projectDir, cleanName);
  if (!fs.existsSync(explicitPath)) {
    console.error('[ERROR] Specified file not found:', explicitPath);
    process.exit(1);
  }
  htmlFiles = [explicitPath];
} else if (targetShotNum !== 999999) {
  const allDirFiles = fs.readdirSync(projectDir);
  const batches = allDirFiles
    .filter((f) => /^shots_.*\.html$/i.test(f) || /^animation\.html$/i.test(f))
    .sort(naturalSort)
    .map((f) => path.join(projectDir, f));

  const singles = allDirFiles
    .filter((f) => /^shot_\d+\.html$/i.test(f))
    .sort(naturalSort)
    .map((f) => path.join(projectDir, f));

  htmlFiles = [...batches, ...singles];
}

if (!htmlFiles.length && !doMerge) {
  console.error('[ERROR] No shots_XX_YY.html or shot_XX.html files found in:', projectDir);
  process.exit(1);
}

// ---------- 2. Helper: Write 16-bit Stereo WAV from Float32 Interleaved Array ----------
function writeWavFile(filePath, interleaved, sampleRate = 48000) {
  const buf = Buffer.alloc(44 + interleaved.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + interleaved.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // Stereo
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(interleaved.length * 2, 40);
  let off = 44;
  for (let i = 0; i < interleaved.length; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    buf.writeInt16LE(s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff), off);
  }
  fs.writeFileSync(filePath, buf);
}

// Check if a shot MP4 is already rendered and valid
function isShotAlreadyRendered(shotNum) {
  const padNum = String(shotNum).padStart(2, '0');
  const outMp4 = path.join(buildDir, `shot_${padNum}.mp4`);
  if (!fs.existsSync(outMp4)) return false;
  const stat = fs.statSync(outMp4);
  // Must be > 10 KB to ensure it wasn't an interrupted/empty 0-byte file
  return stat.size > 10240;
}

// ---------- 3. Render a Single Shot via Puppeteer -> FFmpeg Pipe ----------
async function renderShot(page, shot, batchStart, batchSfxWavPath, sourceFileName) {
  const padNum = String(shot.shot_number).padStart(2, '0');
  const outMp4 = path.join(buildDir, `shot_${padNum}.mp4`);
  const shotStartGlobal = Number(shot.start);
  const shotEndGlobal = Number(shot.end);
  const shotDur = Math.max(0.1, shotEndGlobal - shotStartGlobal);
  const shotStartLocal = Math.max(0, shotStartGlobal - batchStart);
  const totalFrames = Math.max(1, Math.round(shotDur * FPS));

  console.log(`\n[Lumina Render] Shot ${padNum} (from ${sourceFileName}): "${shot.title || ''}" (${shotStartGlobal.toFixed(2)}s - ${shotEndGlobal.toFixed(2)}s | ${totalFrames} frames @ ${FPS}fps)`);

  const ffArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', String(FPS),
    '-i', '-', // Input 0: piped JPEG frames from Puppeteer
    '-ss', shotStartLocal.toFixed(4),
    '-t', shotDur.toFixed(4),
    '-i', batchSfxWavPath, // Input 1: Offline Web Audio SFX WAV sliced to this shot
  ];

  if (voPath) {
    ffArgs.push(
      '-ss', shotStartGlobal.toFixed(4),
      '-t', shotDur.toFixed(4),
      '-i', voPath, // Input 2: Global vo.wav sliced to this shot
      '-filter_complex', '[1:a][2:a]amix=inputs=2:duration=first:dropout_transition=0,volume=2.0[aout]',
      '-map', '0:v:0',
      '-map', '[aout]'
    );
  } else {
    ffArgs.push('-map', '0:v:0', '-map', '1:a:0');
  }

  ffArgs.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    outMp4
  );

  const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let ffErr = '';
  ff.stderr.on('data', (d) => { ffErr += d.toString(); });

  const stageHandle = await page.$('#stage');

  const t0 = Date.now();
  for (let f = 0; f < totalFrames; f++) {
    const localT = shotStartLocal + f / FPS;
    await page.evaluate((t) => window.seek(t), localT);
    const jpegBuf = await stageHandle.screenshot({ type: 'jpeg', quality: 96 });
    const canWrite = ff.stdin.write(jpegBuf);
    if (!canWrite) {
      await new Promise((res) => ff.stdin.once('drain', res));
    }
    if ((f + 1) % 30 === 0 || f === totalFrames - 1) {
      const pct = (((f + 1) / totalFrames) * 100).toFixed(0);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`\r  -> Frame ${f + 1}/${totalFrames} (${pct}%) [${elapsed}s]`);
    }
  }
  ff.stdin.end();

  await new Promise((resolve, reject) => {
    ff.on('close', (code) => {
      if (code === 0) {
        console.log(`\n  [OK] Saved: build/shot_${padNum}.mp4`);
        resolve();
      } else {
        console.error(`\n  [FFmpeg Error] Exit code ${code}:\n`, ffErr.slice(-600));
        reject(new Error('FFmpeg failed'));
      }
    });
  });
}

// ---------- 4. Concatenate All build/shot_XX.mp4 (+ bgm_master.wav if present) ----------
function mergeAllShots() {
  const shotMp4s = fs
    .readdirSync(buildDir)
    .filter((f) => /^shot_\d+\.mp4$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0], 10);
      const nb = parseInt(b.match(/\d+/)[0], 10);
      return na - nb;
    });

  if (!shotMp4s.length) {
    console.error('[Merge] No build/shot_XX.mp4 files found to merge.');
    return;
  }

  const listFile = path.join(buildDir, 'concat_list.txt');
  const listContent = shotMp4s.map((f) => `file '${f}'`).join('\n');
  fs.writeFileSync(listFile, listContent, 'utf8');

  const finalOut = path.join(buildDir, 'final_episode_master.mp4');
  const bgmWav = path.join(buildDir, 'bgm_master.wav');

  // If bgm_master.html exists in project folder but bgm_master.wav hasn't been rendered yet, auto-render it!
  const bgmHtml = path.join(projectDir, 'bgm_master.html');
  const renderBgmScript = path.join(kitDir, 'render_bgm.js');
  if (!fs.existsSync(bgmWav) && fs.existsSync(bgmHtml) && fs.existsSync(renderBgmScript)) {
    console.log('\n[Merge] Auto-rendering build/bgm_master.wav via render_bgm.js...');
    try {
      execSync(`node "${renderBgmScript}" "${projectName}" bgmOnly`, { stdio: 'inherit' });
    } catch (e) {}
  }

  if (fs.existsSync(bgmWav)) {
    const tempStitched = path.join(buildDir, '_temp_stitched_sfx.mp4');
    console.log(`\n[Merge] Stitching ${shotMp4s.length} shots + mixing build/bgm_master.wav...`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${tempStitched}"`, { stdio: 'inherit' });
    execSync(
      `ffmpeg -y -i "${tempStitched}" -i "${bgmWav}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0,volume=2.0[aout]" -map 0:v:0 -map "[aout]" -c:v copy -c:a aac -b:a 256k "${finalOut}"`,
      { stdio: 'inherit' }
    );
    try { fs.unlinkSync(tempStitched); } catch (e) {}
  } else {
    console.log(`\n[Merge] Concatenating ${shotMp4s.length} rendered shots into build/final_episode_master.mp4...`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${finalOut}"`, { stdio: 'inherit' });
  }

  console.log(`\n[SUCCESS] Final YouTube Master saved at: ${finalOut}`);
}

// ---------- 5. Main Execution Pipeline ----------
(async () => {
  if (htmlFiles.length > 0 && targetShotNum !== 999999) {
    const browser = await puppeteer.launch({
      headless: 'new',
      defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--allow-file-access-from-files',
        '--disable-web-security',
      ],
    });

    const page = await browser.newPage();

    page.on('pageerror', (err) => {
      console.error('\n[Browser JS Error]:', err.message);
    });

    const shotOwnerMap = new Map();

    for (const htmlPath of htmlFiles) {
      const mtimeMs = fs.statSync(htmlPath).mtimeMs;
      const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
      await page.goto(fileUrl, { waitUntil: 'networkidle0' });

      const check = await page.evaluate(() => ({
        hasEngine: typeof window.DK !== 'undefined' && typeof window.SOUND !== 'undefined',
        shots: (window.SHOTS || []).map((s) => Number(s.shot_number)),
      }));

      if (!check.hasEngine) {
        console.error(`[ERROR] ${path.basename(htmlPath)} failed to load ../../engine.js!`);
        console.error(`        Check that engine.js exists at: ${engineJsPath}`);
        process.exit(1);
      }

      for (const sNum of check.shots) {
        if (targetShotNum !== null && sNum !== targetShotNum) continue;
        const prev = shotOwnerMap.get(sNum);
        const isStandalone = /^shot_\d+\.html$/i.test(path.basename(htmlPath));
        if (!prev || mtimeMs >= prev.mtimeMs || isStandalone) {
          shotOwnerMap.set(sNum, { htmlPath, mtimeMs });
        }
      }
    }

    if (targetShotNum !== null && !shotOwnerMap.has(targetShotNum)) {
      console.error(`[ERROR] Shot ${targetShotNum} was not found in any HTML file in ${projectDir}`);
      await browser.close();
      process.exit(1);
    }

    const skipExisting = !forceRender && targetShotNum === null && !targetBatchFile;

    for (const htmlPath of htmlFiles) {
      const ownedShots = [...shotOwnerMap.entries()]
        .filter(([, info]) => info.htmlPath === htmlPath)
        .map(([sNum]) => sNum)
        .sort((a, b) => a - b);

      if (!ownedShots.length) continue;

      // Filter out shots that are already rendered in build/shot_XX.mp4
      const pendingShotNums = skipExisting
        ? ownedShots.filter((sNum) => {
            if (isShotAlreadyRendered(sNum)) {
              const pad = String(sNum).padStart(2, '0');
              console.log(`[SKIP] Shot ${pad} already rendered (build/shot_${pad}.mp4)`);
              return false;
            }
            return true;
          })
        : ownedShots;

      if (!pendingShotNums.length) continue;

      const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
      await page.goto(fileUrl, { waitUntil: 'networkidle0' });

      await page.evaluate(async (w, h) => {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        if (window.E) { window.E.W = w; window.E.H = h; }
        if (window.H) { window.H.W = w; window.H.H = h; }
        const ctrl = document.getElementById('controls');
        const wrap = document.getElementById('stage-wrap');
        const stage = document.getElementById('stage');
        if (ctrl) ctrl.style.display = 'none';
        if (wrap) {
          wrap.style.padding = '0';
          wrap.style.margin = '0';
        }
        if (stage) {
          stage.width = w;
          stage.height = h;
          stage.style.width = w + 'px';
          stage.style.height = h + 'px';
          stage.style.maxWidth = 'none';
          stage.style.maxHeight = 'none';
        }
      }, WIDTH, HEIGHT);

      const meta = await page.evaluate(() => ({
        batchStart: window.BATCH_START || 0,
        duration: window.DURATION || 10,
        shots: (window.SHOTS || []).map((s) => ({
          shot_number: Number(s.shot_number),
          title: s.title || '',
          start: Number(s.start),
          end: Number(s.end),
        })),
      }));

      const shotsToRender = meta.shots.filter((s) => pendingShotNums.includes(s.shot_number));
      if (!shotsToRender.length) continue;

      console.log(`\n========================================================`);
      console.log(`Loaded File: ${path.basename(htmlPath)} (Start: ${meta.batchStart}s, Duration: ${meta.duration.toFixed(2)}s)`);
      console.log(`Synthesizing Offline Web Audio SFX (mixMode: "${mixMode}")...`);

      const audioData = await page.evaluate(async (mMode, dur) => {
        const res = await window.SOUND.renderOffline(window.scoreSound, dur, 48000, { mixMode: mMode });
        return { sr: res.sr, samples: Array.from(res.inter) };
      }, mixMode, meta.duration);

      const tempWav = path.join(buildDir, `_temp_sfx_${path.basename(htmlPath, '.html')}.wav`);
      writeWavFile(tempWav, Float32Array.from(audioData.samples), audioData.sr);

      for (const shot of shotsToRender) {
        await renderShot(page, shot, meta.batchStart, tempWav, path.basename(htmlPath));
      }

      try { fs.unlinkSync(tempWav); } catch (e) {}
    }

    await browser.close();
  }

  if (doMerge) {
    mergeAllShots();
  }
})();