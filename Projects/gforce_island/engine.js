// ============================================================================
// MODULE 1: LUMINA_CORE — Soft-Volumetric 2.5D / 3D-Parallax Diorama Engine,
// 5-Plane Perspective Camera, Depth-of-Field Blur Pool, 3D Spherical/Cylindrical
// Gradients, Volumetric Lighting, Universal Multi-Era/Geological/Sci-Fi Set
// Pieces & Molecular FX. Logical Stage: 1920x1080 (16:9). Deterministic fn(t).
// ============================================================================
(function () {
  'use strict';

  const E = (window.E = {
    W: 1920,
    H: 1080,
    PX: 1,
    fps: 60,
    styleId: 'cabinNight',
    style: null,
  });

  const H = (window.H = { W: 1920, H: 1080 });
  const DK = (window.DK = { E, H });

  // ---------- 1. Math, Easing & Keyframe Interpolation ----------
  const clamp = (H.clamp = DK.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x));
  const lerp = (H.lerp = DK.lerp = (a, b, k) => a + (b - a) * k);
  const prog = (H.prog = DK.prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a)));
  const map = (H.map = DK.map = (v, a, b, c, d) => c + ((v - a) / Math.max(1e-6, b - a)) * (d - c));
  const smooth = (H.smooth = DK.smooth = (e0, e1, x) => {
    const t = clamp((x - e0) / Math.max(1e-6, e1 - e0));
    return t * t * (3 - 2 * t);
  });

  const ease = (H.ease = DK.ease = {
    linear: (x) => clamp(x),
    in: (x) => Math.pow(clamp(x), 3),
    out: (x) => 1 - Math.pow(1 - clamp(x), 3),
    outCubic: (x) => 1 - Math.pow(1 - clamp(x), 3),
    inOut: (x) => {
      x = clamp(x);
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    inOutCubic: (x) => {
      x = clamp(x);
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    },
    sine: (x) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2,
    back: (x) => {
      x = clamp(x);
      const c1 = 1.70158;
      return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    outBack: (x) => {
      x = clamp(x);
      const c1 = 1.70158;
      return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    outElastic: (x) => {
      x = clamp(x);
      return x === 0 || x === 1
        ? x
        : Math.pow(2, -10 * x) * Math.sin(((x * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
    },
  });

  DK.segTime = H.segTime = (t, t0, t1, fn = ease.inOut) => fn(prog(t, t0, t1));
  DK.pop = H.pop = (t, t0, dur = 0.42) => {
    const u = clamp((t - t0) / Math.max(1e-6, dur));
    return u <= 0 ? 0 : ease.outBack(u);
  };

  function mixVal(a, b, k) {
    if (typeof a === 'number') return lerp(a, b, k);
    if (Array.isArray(a)) return a.map((v, i) => mixVal(v, b[i], k));
    if (a && typeof a === 'object') {
      const o = {};
      for (const kk in a) {
        o[kk] =
          typeof a[kk] === 'number' || Array.isArray(a[kk])
            ? mixVal(a[kk], b[kk] !== undefined ? b[kk] : a[kk], k)
            : k < 0.5
            ? a[kk]
            : b[kk] !== undefined
            ? b[kk]
            : a[kk];
      }
      return o;
    }
    return k < 0.5 ? a : b;
  }
  DK.mixVal = H.mixVal = mixVal;

  function key(t, frames, fn = ease.inOut) {
    if (!frames || !frames.length) return 0;
    if (t <= frames[0][0]) return frames[0][1];
    for (let i = 1; i < frames.length; i++) {
      const [t1, v1, customEase] = frames[i];
      if (t <= t1) {
        const [t0, v0] = frames[i - 1];
        const eFn = customEase || fn;
        return mixVal(v0, v1, eFn(clamp((t - t0) / Math.max(1e-6, t1 - t0))));
      }
    }
    return frames[frames.length - 1][1];
  }
  DK.key = H.key = key;

  // ---------- 2. Seeded RNG & Perlin/FBM Noise ----------
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const rng = (H.rng = DK.rng = function (seed = 1) {
    let a = typeof seed === 'string' ? hashStr(seed) : (seed >>> 0) || 1;
    const r = function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.chance = (p) => r() < p;
    return r;
  });

  const hash1 = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const noise = (H.noise = DK.noise = function (x, seed = 0) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    return lerp(hash1(i + seed * 57), hash1(i + 1 + seed * 57), u) * 2 - 1;
  });

  H.makeNoise = DK.makeNoise = function (seed = 1) {
    const r = rng(seed);
    const p = new Uint8Array(512);
    const perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    const g3 = (h, x, y, z) => {
      h &= 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    };
    function n3(x, y, z) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const Z = Math.floor(z) & 255;
      x -= Math.floor(x);
      y -= Math.floor(y);
      z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z;
      const B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return lerp(
        lerp(lerp(g3(p[AA], x, y, z), g3(p[BA], x - 1, y, z), u), lerp(g3(p[AB], x, y - 1, z), g3(p[BB], x - 1, y - 1, z), u), v),
        lerp(lerp(g3(p[AA + 1], x, y, z - 1), g3(p[BA + 1], x - 1, y, z - 1), u), lerp(g3(p[AB + 1], x, y - 1, z - 1), g3(p[BB + 1], x - 1, y - 1, z - 1), u), v),
        w
      );
    }
    const n2 = (x, y) => n3(x, y, 0.5);
    const fbm2 = (x, y, oct = 4) => {
      let s = 0, a = 0.5, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        s += a * n3(x * f, y * f, 0.5);
        norm += a;
        a *= 0.5;
        f *= 2;
      }
      return s / norm;
    };
    return { n2, n3, fbm2 };
  };

  DK.shake = H.shake = (t, amp = 6, freq = 14, seed = 3) => [
    noise(t * freq, seed) * amp,
    noise(t * freq, seed + 9) * amp,
  ];

  // ---------- 3. Color Manipulation & Open-Ended Universal Mood Palettes ----------
  function rgb(c) {
    if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] !== undefined ? c[3] : 1];
    if (typeof c !== 'string') return [255, 255, 255, 1];
    if (c.startsWith('rgb')) {
      const m = c.match(/[\d.]+/g).map(Number);
      return [m[0], m[1], m[2], m[3] !== undefined ? m[3] : 1];
    }
    let h = c.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const css = ([r, g, b, a = 1]) => 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (+a.toFixed(3)) + ')';
  const alpha = (H.rgba = DK.alpha = (c, a = 1) => {
    const x = rgb(c);
    return css([x[0], x[1], x[2], a]);
  });
  const mix = (H.mix = DK.mix = (c1, c2, k) => {
    const a = rgb(c1), b = rgb(c2);
    return css([lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]);
  });
  const shade = (H.shade = DK.shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k)));

  const BASE_MOODS = (DK.BASE_MOODS = {
    // --- Universal Geological, Prehistoric, Historical & Futuristic Palettes ---
    primordialLava: {
      sky: ['#140505', '#3d0c08', '#8c220f', '#e86820'],
      ambient: '#4a140a',
      key: '#ff9438',
      rim: '#ffe082',
      wall: '#2b120e',
      floor: '#1c0c0a',
      road: '#381610',
      grass: '#2e1c14',
      practical: '#ff5e1a',
      lightDir: [-0.5, -0.8],
    },
    prehistoricJungle: {
      sky: ['#1d4d4f', '#3b8c78', '#8cd4a8', '#e8f5c8'],
      ambient: '#2e5e4e',
      key: '#fff4c2',
      rim: '#ffffff',
      wall: '#2c4a3e',
      floor: '#1e362a',
      road: '#3d3528',
      grass: '#388e3c',
      practical: '#ffd54f',
      lightDir: [-0.6, -0.78],
    },
    ancientTemple: {
      sky: ['#4a2545', '#9e4747', '#e68a45', '#f7cf78'],
      ambient: '#6b3838',
      key: '#ffe094',
      rim: '#fff5d6',
      wall: '#8c583a',
      floor: '#5c3824',
      road: '#784e34',
      grass: '#4a7838',
      practical: '#ffae38',
      lightDir: [-0.65, -0.75],
    },
    edoMist: {
      sky: ['#24304d', '#4e628c', '#9eb4d4', '#f2d8d8'],
      ambient: '#4a5878',
      key: '#fff0eb',
      rim: '#ffffff',
      wall: '#38425c',
      floor: '#262d40',
      road: '#424a5e',
      grass: '#3e6b52',
      practical: '#ff9e78',
      lightDir: [-0.6, -0.75],
    },
    victorianFog: {
      sky: ['#161c29', '#2b354a', '#4a586e', '#7c8a99'],
      ambient: '#2e3848',
      key: '#ffd28a',
      rim: '#dce6f2',
      wall: '#363d4a',
      floor: '#1f242e',
      road: '#292f3b',
      grass: '#2b4238',
      practical: '#ffae42',
      lightDir: [-0.55, -0.82],
    },
    monsoonLush: {
      sky: ['#1e3852', '#3a6685', '#78a8b8', '#d4e8d0'],
      ambient: '#345866',
      key: '#fff6d6',
      rim: '#ffffff',
      wall: '#526658',
      floor: '#38473c',
      road: '#4a463f',
      grass: '#2e8540',
      practical: '#ffc44d',
      lightDir: [-0.6, -0.78],
    },
    parchmentGold: {
      sky: ['#2b2118', '#4a3728', '#785a40', '#b88e62'],
      ambient: '#4a3828',
      key: '#ffe6b0',
      rim: '#fff8e6',
      wall: '#5c4632',
      floor: '#36281c',
      road: '#4d3a28',
      grass: '#4a6638',
      practical: '#ffbf47',
      lightDir: [-0.65, -0.75],
    },
    cyberFuture: {
      sky: ['#050517', '#120e38', '#2b185c', '#5c2482'],
      ambient: '#1c1442',
      key: '#5ce1ff',
      rim: '#ff4d94',
      wall: '#161436',
      floor: '#0c0b24',
      road: '#12102e',
      grass: '#143838',
      practical: '#00f2fe',
      lightDir: [-0.5, -0.85],
    },
    // --- Existing Aviation, Urban, Space & Science Palettes ---
    cabinNight: {
      sky: ['#141229', '#221c42', '#332456'],
      ambient: '#251e42',
      key: '#ffae70',
      rim: '#ffd8b0',
      wall: '#28224a',
      floor: '#191530',
      seatPrimary: '#a82e4e',
      seatShadow: '#661a32',
      practical: '#ffba7a',
      lightDir: [-0.6, -0.75],
    },
    stratosphereNight: {
      sky: ['#060b21', '#0e1d4a', '#1d3b82', '#355ca8'],
      ambient: '#162858',
      key: '#d8e6ff',
      rim: '#ffffff',
      wall: '#1b2c5c',
      floor: '#0d1636',
      practical: '#ffd47e',
      lightDir: [-0.5, -0.85],
    },
    stratosphereDay: {
      sky: ['#0f388a', '#2364c2', '#5298e8', '#9ed0ff'],
      ambient: '#3a72b8',
      key: '#fff9eb',
      rim: '#ffffff',
      wall: '#3b5c8c',
      floor: '#1f365c',
      practical: '#ffe29a',
      lightDir: [-0.65, -0.75],
    },
    sunriseFlight: {
      sky: ['#381c54', '#8c3268', '#e36856', '#f7b46a'],
      ambient: '#6e3458',
      key: '#ffe09e',
      rim: '#fff3d6',
      wall: '#4d284c',
      floor: '#2b1630',
      practical: '#ffcf78',
      lightDir: [0.7, -0.4],
    },
    urbanMorning: {
      sky: ['#78a4d4', '#a8c8e8', '#e8dec8'],
      ambient: '#7c8ca6',
      key: '#fff4dc',
      rim: '#ffffff',
      wall: '#635c85',
      floor: '#4c5266',
      road: '#5c6478',
      grass: '#68b058',
      practical: '#ffe094',
      lightDir: [-0.65, -0.75],
    },
    urbanSunset: {
      sky: ['#3b2454', '#853c66', '#d97254', '#f7be76'],
      ambient: '#523456',
      key: '#ffc680',
      rim: '#ffe8c2',
      wall: '#4a3248',
      floor: '#2e2234',
      road: '#362d42',
      grass: '#3b5e4c',
      practical: '#ffd584',
      lightDir: [-0.75, -0.65],
    },
    blackoutNight: {
      sky: ['#040612', '#090e26', '#141d42'],
      ambient: '#0e142e',
      key: '#9eb8ff',
      rim: '#cfe0ff',
      wall: '#121830',
      floor: '#080b18',
      road: '#0e1224',
      grass: '#122624',
      practical: '#ff5268',
      lightDir: [0.0, -0.95],
    },
    xrayBlue: {
      sky: ['#060d20', '#0c1b3d', '#152d63'],
      ambient: '#142854',
      key: '#5ce1ff',
      rim: '#a8f0ff',
      wall: '#102247',
      floor: '#081229',
      practical: '#ff5c77',
      lightDir: [-0.5, -0.85],
    },
    dusk: { sky: ['#2d244c', '#7a4978', '#d9825b', '#f5c78e'], ambient: '#3b2b3d', key: '#ffc68a', rim: '#f8ecd0', wall: '#423144', floor: '#2d2130', dark: '#1c1521', practical: '#ffd59a', grass: '#355242', road: '#2e2636', fog: '#c08a8a', lightDir: [-0.65, -0.75] },
    golden: { sky: ['#5a4878', '#d68356', '#f2b878', '#fce2a6'], ambient: '#4a3a50', key: '#ffd494', rim: '#fff0d4', wall: '#5a3a34', floor: '#3d2824', dark: '#241614', practical: '#ffe7b0', grass: '#486638', road: '#3d3236', fog: '#f0c49a', lightDir: [-0.7, -0.7] },
    night: { sky: ['#090d22', '#171f46', '#2e2b5c'], ambient: '#1a203d', key: '#c9d4ff', rim: '#d8e2ff', wall: '#222642', floor: '#16192b', dark: '#0c0e1c', practical: '#ffb860', grass: '#1d3b34', road: '#1d2033', fog: '#323a66', lightDir: [-0.55, -0.82] },
    day: { sky: ['#6d98c8', '#a8c6e4', '#e8dfd1'], ambient: '#6f7d96', key: '#fff5e0', rim: '#f8ecd0', wall: '#8d8496', floor: '#585260', dark: '#2c2733', practical: '#ffe2a8', grass: '#4a8550', road: '#52505c', fog: '#dfe4f0', lightDir: [-0.6, -0.8] },
    storm: { sky: ['#12172e', '#242c4d', '#384166'], ambient: '#202642', key: '#d8e0ff', rim: '#d0dcff', wall: '#282e4a', floor: '#191f33', dark: '#0b0e1c', practical: '#bcd0ff', grass: '#214038', road: '#1e2333', fog: '#434e78', lightDir: [-0.45, -0.88] },
    interiorWarm: { sky: ['#4d4068', '#5e4e7c', '#746294'], ambient: '#4a3c60', key: '#ffd59a', rim: '#fff0d4', wall: '#584875', floor: '#785a46', dark: '#241c30', practical: '#ffd28a', grass: '#385444', road: '#342b38', fog: '#a87a70', lightDir: [-0.6, -0.75] },
    interiorCool: { sky: ['#1e2648', '#384472', '#526094'], ambient: '#262944', key: '#cbd6ff', rim: '#dce4ff', wall: '#2c304d', floor: '#1e2136', dark: '#101222', practical: '#9fe0ff', grass: '#203e36', road: '#202336', fog: '#444a78', lightDir: [-0.5, -0.85] },
    void: { sky: ['#070b16', '#0e1528', '#15203c'], ambient: '#12182b', key: '#ffffff', rim: '#f3e9d2', wall: '#10172a', floor: '#0a0f1d', dark: '#050810', practical: '#ffd47e', grass: '#1a332d', road: '#121724', fog: '#1a243d', lightDir: [-0.6, -0.8] },
  });

  // Accepts a preset name OR a custom mood object for any era/planet/environment
  DK.mood = H.mood = (nameOrObj = 'cabinNight') => {
    if (nameOrObj && typeof nameOrObj === 'object') {
      return Object.assign({}, BASE_MOODS.day, nameOrObj);
    }
    return BASE_MOODS[nameOrObj] || BASE_MOODS.cabinNight;
  };

  // ---------- 4. Vector & 3D-Volumetric Shading Primitives ----------
  const FONTS = (DK.FONTS = H.FONTS = {
    title: 'Fredoka, "Space Grotesk", sans-serif',
    ui: 'Nunito, "Space Grotesk", sans-serif',
    serif: '"Playfair Display", Georgia, serif',
    mono: '"Space Mono", monospace',
  });

  function rr(g, x, y, w, h, r = 8) {
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function circle(g, x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
  }
  function ellipse(g, x, y, rx, ry, fill, rot = 0) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
  }
  function ring(g, x, y, r, w = 2, col = '#ffffff') {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.beginPath();
    g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    g.stroke();
  }
  function poly(g, pts, fill, strokeCol = null, strokeW = 0) {
    if (!pts || !pts.length) return;
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (strokeCol && strokeW > 0) { g.strokeStyle = strokeCol; g.lineWidth = strokeW; g.stroke(); }
  }
  function seg(g, pts, w = 3, col = '#ffffff', cap = 'round') {
    if (!pts || !pts.length || pts.length < 2) return;
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = cap;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
  function linGrad(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach((c, i) =>
      Array.isArray(c) ? gr.addColorStop(c[0], c[1]) : gr.addColorStop(i / Math.max(1, stops.length - 1), c)
    );
    return gr;
  }
  function radGrad(g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
    stops.forEach((c, i) =>
      Array.isArray(c) ? gr.addColorStop(c[0], c[1]) : gr.addColorStop(i / Math.max(1, stops.length - 1), c)
    );
    return gr;
  }

  function sphereGrad(g, x, y, r, baseCol, lightDir = [-0.6, -0.75], specStrength = 0.16) {
    const hx = x + (lightDir[0] || -0.6) * r * 0.35;
    const hy = y + (lightDir[1] || -0.75) * r * 0.35;
    const gr = g.createRadialGradient(hx, hy, r * 0.05, x, y, r * 1.05);
    gr.addColorStop(0, shade(baseCol, specStrength));
    gr.addColorStop(0.55, baseCol);
    gr.addColorStop(1, shade(baseCol, -0.22));
    return gr;
  }

  function cylinderGrad(g, x0, y0, x1, y1, baseCol, lightSign = -1) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    if (lightSign <= 0) {
      gr.addColorStop(0, shade(baseCol, 0.14));
      gr.addColorStop(0.45, baseCol);
      gr.addColorStop(1, shade(baseCol, -0.20));
    } else {
      gr.addColorStop(0, shade(baseCol, -0.20));
      gr.addColorStop(0.55, baseCol);
      gr.addColorStop(1, shade(baseCol, 0.14));
    }
    return gr;
  }

  function contactShadow(g, x, y, rx = 44, ry = 10, a = 0.32) {
    g.save();
    g.fillStyle = radGrad(g, x, y, 0, rx, ['rgba(0,0,0,' + a + ')', 'rgba(0,0,0,0)']);
    g.translate(x, y);
    g.scale(1, Math.max(0.05, ry / Math.max(1, rx)));
    g.beginPath();
    g.arc(0, 0, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function glow(g, x, y, r, col = '#ffd59a', a = 0.7) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = radGrad(g, x, y, 0, r, [alpha(col, a), alpha(col, a * 0.35), alpha(col, 0)]);
    g.beginPath();
    g.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function backdrop(g, colors, area = [-E.W, -E.H, E.W * 3, E.H * 3]) {
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, colors);
    g.fillRect(area[0], area[1], area[2], area[3]);
  }
  function text(g, str, x, y, o = {}) {
    const {
      size = 42,
      font = FONTS.ui,
      weight = 800,
      color = '#ffffff',
      align = 'center',
      base = 'middle',
      glow: gl = 0,
      glowColor = 'rgba(255, 190, 100, 0.7)',
      spacing = 0,
      alpha: al = 1,
      stroke = 0,
      strokeColor = 'rgba(0,0,0,0.8)',
      italic = false,
    } = o;
    g.save();
    g.globalAlpha *= al;
    g.font = (italic ? 'italic ' : '') + weight + ' ' + size + 'px ' + font;
    g.textAlign = align;
    g.textBaseline = base;
    if ('letterSpacing' in g && spacing) g.letterSpacing = spacing + 'px';
    if (stroke > 0) {
      g.lineJoin = 'round';
      g.lineWidth = stroke;
      g.strokeStyle = strokeColor;
      g.strokeText(str, x, y);
    }
    if (gl > 0) {
      g.shadowColor = glowColor;
      g.shadowBlur = gl;
    }
    g.fillStyle = color;
    g.fillText(str, x, y);
    g.restore();
  }
  function measure(g, str, size = 42, font = FONTS.ui, weight = 800) {
    g.save();
    g.font = weight + ' ' + size + 'px ' + font;
    const w = g.measureText(str).width;
    g.restore();
    return w;
  }

  Object.assign(DK, {
    rr, circle, ellipse, ring, poly, seg, linGrad, radGrad, sphereGrad, cylinderGrad,
    contactShadow, glow, backdrop, text, measure,
  });
  Object.assign(H, {
    rr, circle, ellipse, ring, poly, seg, linGrad, radGrad, sphereGrad, cylinderGrad,
    contactShadow, glow, backdrop, text, measure,
  });

  // ---------- 5. 5-Plane 3D-Parallax Camera, 1-Point Perspective & Blur Pool ----------
  function project3D(x, y, z, vx = E.W * 0.5, vy = E.H * 0.45, fov = 600) {
    const scale = fov / Math.max(20, fov + z);
    return {
      x: vx + (x - vx) * scale,
      y: vy + (y - vy) * scale,
      s: scale,
    };
  }
  DK.project3D = H.project3D = project3D;

  function layer(g, cam, depth, fn) {
    const c = cam || { x: 0, y: 0, z: 1, r: 0 };
    const z = Math.max(0.05, 1 + ((c.z !== undefined ? c.z : 1) - 1) * depth);
    g.save();
    g.translate(E.W / 2, E.H / 2);
    if (c.r) g.rotate(c.r * Math.min(1, depth));
    g.scale(z, z);
    g.translate(-E.W / 2 - (c.x || 0) * depth, -E.H / 2 - (c.y || 0) * depth);
    fn(g);
    g.restore();
  }

  const _blurPool = [];
  function blurLayer(g, amount, fn, cam = null, depth = 1) {
    if (!amount || amount <= 0.4) {
      cam ? layer(g, cam, depth, fn) : fn(g);
      return;
    }
    const k = clamp(1 / (1 + amount / 3.5), 0.14, 0.5);
    const w = Math.max(16, Math.round(E.W * k));
    const h = Math.max(16, Math.round(E.H * k));
    let entry = _blurPool.find((b) => !b.busy && b.w === w && b.h === h);
    if (!entry) {
      const c1 = document.createElement('canvas');
      c1.width = w;
      c1.height = h;
      const c2 = document.createElement('canvas');
      c2.width = w;
      c2.height = h;
      entry = { w, h, c1, c2, busy: false };
      _blurPool.push(entry);
    }
    entry.busy = true;
    const x1 = entry.c1.getContext('2d');
    x1.setTransform(1, 0, 0, 1, 0, 0);
    x1.clearRect(0, 0, w, h);
    x1.setTransform(w / E.W, 0, 0, h / E.H, 0, 0);
    cam ? layer(x1, cam, depth, fn) : fn(x1);

    const x2 = entry.c2.getContext('2d');
    x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.clearRect(0, 0, w, h);
    x2.filter = 'blur(' + Math.max(0.5, amount * k).toFixed(1) + 'px)';
    x2.drawImage(entry.c1, 0, 0);
    x2.filter = 'none';

    g.save();
    g.drawImage(entry.c2, 0, 0, E.W, E.H);
    g.restore();
    entry.busy = false;
  }

  function fivePlane(g, cam, planes = {}) {
    if (planes.bgSky) blurLayer(g, planes.bgSkyBlur || 0, planes.bgSky, cam, planes.bgSkyDepth !== undefined ? planes.bgSkyDepth : 0.15);
    if (planes.bgFar) blurLayer(g, planes.bgFarBlur !== undefined ? planes.bgFarBlur : 4, planes.bgFar, cam, planes.bgFarDepth !== undefined ? planes.bgFarDepth : 0.40);
    if (planes.mgBack) blurLayer(g, planes.mgBackBlur || 0, planes.mgBack, cam, planes.mgBackDepth !== undefined ? planes.mgBackDepth : 0.75);
    if (planes.mgHero) layer(g, cam, 1.0, planes.mgHero);
    if (planes.fgBokeh) blurLayer(g, planes.fgBokehBlur !== undefined ? planes.fgBokehBlur : 12, planes.fgBokeh, cam, planes.fgBokehDepth !== undefined ? planes.fgBokehDepth : 1.45);
  }

  function threePlane(g, cam, planes = {}) {
    const bgDepth = planes.bgDepth !== undefined ? planes.bgDepth : 0.3;
    const fgDepth = planes.fgDepth !== undefined ? planes.fgDepth : 1.45;
    const bgBlur = planes.bgBlur !== undefined ? planes.bgBlur : 6;
    const fgBlur = planes.fgBlur !== undefined ? planes.fgBlur : 12;
    if (planes.bg) blurLayer(g, bgBlur, planes.bg, cam, bgDepth);
    if (planes.mg) layer(g, cam, 1.0, planes.mg);
    if (planes.fg) blurLayer(g, fgBlur, planes.fg, cam, fgDepth);
  }

  DK.layer = H.layer = layer;
  DK.blurLayer = H.blurLayer = blurLayer;
  DK.fivePlane = H.fivePlane = fivePlane;
  DK.threePlane = H.threePlane = threePlane;

  // ---------- 6. Lumina Volumetric Lighting, Universal Multi-Era Set Pieces & FX ----------
  const FX = (window.FX = DK.fx = {
    ground(g, y = 840, baseCol = '#2a2238', specCol = '#ffc68a', specA = 0.2, lines = false) {
      g.fillStyle = linGrad(g, 0, y, 0, E.H + 200, [baseCol, shade(baseCol, -0.35)]);
      g.fillRect(-E.W, y, E.W * 3, E.H - y + 300);
      if (specA > 0) FX.pool(g, E.W * 0.5, y + (E.H - y) * 0.32, E.W * 0.55, (E.H - y) * 0.45, specCol, specA);
      if (lines) FX.floorLines(g, y, E.H + 100, 'rgba(0,0,0,0.18)', 0.08);
      seg(g, [[-E.W, y], [E.W * 2, y]], 2, alpha(specCol, 0.22));
    },
    floorLines(g, y0, y1, color = 'rgba(0,0,0,0.2)', spacing = 0.07) {
      g.strokeStyle = color;
      g.lineWidth = 1.5;
      for (let y = y0 + 8; y < y1; y += Math.max(8, (y - y0) * spacing + 6)) {
        g.beginPath();
        g.moveTo(-E.W, y);
        g.lineTo(E.W * 2, y);
        g.stroke();
      }
    },
    pool(g, x, y, rx, ry, color = '#ffd59a', a = 0.26) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.translate(x, y);
      g.scale(1, Math.max(0.05, ry / Math.max(1, rx)));
      g.fillStyle = radGrad(g, 0, 0, 0, rx, [alpha(color, a), alpha(color, 0)]);
      g.beginPath();
      g.arc(0, 0, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    },

    venetianShadows(g, x = 0, y = 0, w = E.W, h = E.H, o = {}) {
      const { slats = 14, angle = 0.26, alpha: al = 0.42, lightCol = '#7b68b8', shadowCol = '#0b0818' } = o;
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.translate(x + w / 2, y + h / 2);
      g.rotate(angle);
      const span = Math.hypot(w, h) * 1.2;
      const step = span / slats;
      for (let i = -slats; i <= slats; i++) {
        g.fillStyle = alpha(lightCol, al * 0.35);
        g.fillRect(-span / 2, i * step, span, step * 0.42);
        g.fillStyle = alpha(shadowCol, al);
        g.fillRect(-span / 2, i * step + step * 0.42, span, step * 0.58);
      }
      g.restore();
    },

    screenGlow(g, x, y, o = {}) {
      const { angle = -Math.PI * 0.65, spread = 0.85, len = 480, color = '#a8c8ff', a = 0.38 } = o;
      glow(g, x, y, 130, color, a * 1.1);
      FX.lightCone(g, x, y, { angle, spread, len, color, a });
    },

    godRays(g, x, y, o = {}) {
      const { count = 6, angle = Math.PI * 0.32, spread = 0.6, len = 1800, color = '#ffe5b8', a = 0.12, t = 0, width = 0.06 } = o;
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < count; i++) {
        const ang = angle - spread / 2 + (spread * (i + 0.5)) / count + Math.sin(t * 0.35 + i) * 0.01;
        const w = width * (0.65 + ((i * 37) % 10) / 12);
        g.fillStyle = linGrad(g, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, [alpha(color, a), alpha(color, 0)]);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len);
        g.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len);
        g.closePath();
        g.fill();
      }
      g.restore();
    },

    lightCone(g, x, y, o = {}) {
      const { angle = Math.PI / 2, spread = 0.55, len = 680, color = '#ffe2a8', a = 0.22 } = o;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = radGrad(g, x, y, 0, len, [alpha(color, a), alpha(color, a * 0.4), alpha(color, 0)]);
      g.beginPath();
      g.moveTo(x, y);
      g.arc(x, y, len, angle - spread / 2, angle + spread / 2);
      g.closePath();
      g.fill();
      g.restore();
    },

    bokehOrbs(g, t = 0, o = {}) {
      const { seed = 17, count = 16, color = '#ffba7a', area = [0, 0, E.W, E.H], rMin = 18, rMax = 52, a = 0.18 } = o;
      const r = rng(seed);
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < count; i++) {
        const rad = r.range(rMin, rMax);
        const x = area[0] + r() * area[2] + Math.sin(t * 0.35 + i) * 14;
        const y = area[1] + r() * area[3] + Math.cos(t * 0.28 + i) * 10;
        const al = a * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.7));
        g.fillStyle = radGrad(g, x, y, rad * 0.1, rad, [alpha(color, al * 0.6), alpha(color, al), alpha(color, 0)]);
        g.beginPath();
        g.arc(x, y, rad, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    },

    cumulusDeck(g, t = 0, o = {}) {
      const { y = 740, seed = 12, palette = 'night', speed = 22 } = o;
      const pals = {
        night: ['#8aa8e6', '#5875bd', '#364d8d', '#1f3066'],
        day: ['#ffffff', '#dceeff', '#a8ccf5', '#76a4e0'],
        sunset: ['#ffe6b8', '#f5b078', '#cf7268', '#7d4468'],
        golden: ['#fff2cc', '#f7c87c', '#d98c5f', '#8c4f58'],
      };
      const cols = pals[palette] || pals.night;

      for (let layerIdx = 0; layerIdx < 3; layerIdx++) {
        const ly = y + layerIdx * 95;
        const lColTop = cols[layerIdx];
        const lColBot = cols[Math.min(cols.length - 1, layerIdx + 1)];
        const spd = speed * (0.5 + layerIdx * 0.35);
        const offset = (t * spd) % 2400;

        g.save();
        g.fillStyle = linGrad(g, 0, ly - 90, 0, E.H, [lColTop, lColBot]);
        g.beginPath();
        g.moveTo(-400, E.H + 100);
        for (let cx = -400; cx <= E.W + 400; cx += 110) {
          const worldIdx = Math.floor((cx + offset) / 110);
          const puffR = 65 + hash1(worldIdx + layerIdx * 31) * 55;
          const py = ly + (hash1(worldIdx * 3 + layerIdx) - 0.5) * 28;
          g.arc(cx - (offset % 110), py, puffR, Math.PI, 0, false);
        }
        g.lineTo(E.W + 400, E.H + 100);
        g.closePath();
        g.fill();
        g.restore();
      }
    },

    milkyWayArch(g, t = 0, o = {}) {
      const { cx = E.W * 0.52, cy = E.H * 0.68, rx = 740, ry = 460, alpha: al = 0.92 } = o;
      g.save();
      g.globalAlpha = al;
      g.globalCompositeOperation = 'lighter';

      for (let i = 0; i <= 48; i++) {
        const u = i / 48;
        const ang = Math.PI * 1.05 + u * Math.PI * 0.92;
        const px = cx + Math.cos(ang) * rx;
        const py = cy + Math.sin(ang) * ry;
        const spread = 55 + Math.sin(u * Math.PI) * 95;
        const col = u > 0.45 ? '#e8b8ff' : '#9eb8ff';
        glow(g, px, py, spread * 1.6, col, 0.14 * Math.sin(u * Math.PI));
        if (u > 0.48 && u < 0.88) {
          glow(g, px + 18, py - 10, spread * 0.9, '#ffd8a8', 0.12);
        }
      }

      const r = rng(404);
      for (let i = 0; i < 650; i++) {
        const u = r();
        const ang = Math.PI * 1.02 + u * Math.PI * 0.96;
        const radialSpread = (r() - 0.5) * (45 + Math.sin(u * Math.PI) * 110);
        const px = cx + Math.cos(ang) * (rx + radialSpread);
        const py = cy + Math.sin(ang) * (ry + radialSpread * 0.75);
        const sz = 0.6 + Math.pow(r(), 3) * 2.6;
        const tw = 0.45 + 0.55 * Math.sin(t * 2.5 + i);
        circle(g, px, py, sz, alpha(i % 7 === 0 ? '#ffe4b8' : '#ffffff', tw * 0.85));
      }

      if (o.shootingStar !== undefined && o.shootingStar > 0 && o.shootingStar < 1) {
        const su = o.shootingStar;
        const sx0 = lerp(cx - 280, cx - 80, su);
        const sy0 = lerp(cy - 240, cy - 150, su);
        seg(g, [[sx0 - 90, sy0 - 42], [sx0, sy0]], 2.5, alpha('#ffffff', 1 - su));
        circle(g, sx0, sy0, 3.5, '#ffffff');
      }
      g.restore();
    },

    molecules(g, t = 0, o = {}) {
      const {
        area = [160, 120, 1600, 840],
        kind = 'air',
        density = 42,
        condenseProg = 0,
        flowX = 0,
        seed = 21,
      } = o;

      const r = rng(seed);
      g.save();
      for (let i = 0; i < density; i++) {
        const sp = 28 + r() * 45;
        const ph = r() * 6.28;
        const bx = area[0] + (((r() * area[2] + t * (flowX + Math.cos(ph) * sp)) % area[2]) + area[2]) % area[2];
        const by = area[1] + (((r() * area[3] + t * Math.sin(ph) * sp) % area[3]) + area[3]) % area[3];
        const rot = t * (r() - 0.5) * 3.5 + ph;
        const isH2O = kind === 'h2o_condense' && i % 3 === 0;

        g.save();
        g.translate(bx, by);
        g.rotate(rot);

        if (isH2O) {
          if (condenseProg > 0.65) {
            const dropScale = lerp(0.4, 1.0, (condenseProg - 0.65) / 0.35);
            const dr = 28 * dropScale;
            circle(g, 0, 0, dr, radGrad(g, -dr * 0.3, -dr * 0.3, 2, dr, ['rgba(255,255,255,0.85)', 'rgba(135,210,255,0.65)', 'rgba(70,155,235,0.35)']));
            ring(g, 0, 0, dr, 2, 'rgba(220,245,255,0.8)');
            circle(g, -dr * 0.35, -dr * 0.35, dr * 0.22, 'rgba(255,255,255,0.9)');
          } else {
            circle(g, -9, -7, 6.5, sphereGrad(g, -9, -7, 6.5, '#f0f4ff'));
            circle(g, 9, -7, 6.5, sphereGrad(g, 9, -7, 6.5, '#f0f4ff'));
            circle(g, 0, 2, 10.5, sphereGrad(g, 0, 2, 10.5, '#ff4757'));
          }
        } else {
          const col = kind === 'o2' ? '#68c8ff' : mix('#f59e3d', '#4da6ff', clamp(condenseProg, 0, 1));
          circle(g, -6.5, 0, 8.5, sphereGrad(g, -6.5, 0, 8.5, col));
          circle(g, 6.5, 0, 8.5, sphereGrad(g, 6.5, 0, 8.5, col));
        }
        g.restore();
      }
      g.restore();
    },

    slipstream(g, t = 0, o = {}) {
      const { speed = 2400, count = 48, dir = -1, color = '#dcebff', alpha: al = 0.45, napkins = 0, target = null } = o;
      const r = rng(88);
      g.save();
      g.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const len = 140 + r() * 340;
        const y = r() * E.H;
        const rawX = ((r() * (E.W + 500) + t * speed * (0.7 + r() * 0.6) * dir) % (E.W + 500) + (E.W + 500)) % (E.W + 500) - 250;
        g.strokeStyle = alpha(color, al * (0.3 + r() * 0.7));
        g.lineWidth = 1.5 + r() * 3.2;
        g.beginPath();
        if (target) {
          const ang = Math.atan2(target[1] - y, target[0] - rawX);
          g.moveTo(rawX, y);
          g.lineTo(rawX + Math.cos(ang) * len * 0.65, y + Math.sin(ang) * len * 0.65);
        } else {
          g.moveTo(rawX, y);
          g.lineTo(rawX + len * dir, y);
        }
        g.stroke();
      }

      for (let k = 0; k < napkins; k++) {
        const nx = ((r() * E.W + t * speed * 0.35 * dir + k * 210) % (E.W + 300) + E.W + 300) % (E.W + 300) - 150;
        const ny = 180 + r() * 680 + Math.sin(t * 6 + k) * 35;
        g.save();
        g.translate(nx, ny);
        g.rotate(t * 4 * (k % 2 ? 1 : -1) + k);
        rr(g, -28, -22, 56, 44, 6);
        g.fillStyle = 'rgba(240, 248, 255, 0.9)';
        g.fill();
        g.restore();
      }
      g.restore();
    },

    cabinFog(g, t = 0, o = {}) {
      const { density = 0.72, speed = 90 } = o;
      if (density <= 0.01) return;
      g.save();
      g.fillStyle = alpha('#dce8f8', density * 0.58);
      g.fillRect(0, 0, E.W, E.H);
      const r = rng(55);
      for (let i = 0; i < 14; i++) {
        const cx = ((r() * (E.W + 600) - t * speed * (0.5 + r())) % (E.W + 600) + E.W + 600) % (E.W + 600) - 300;
        const cy = r() * E.H;
        const rw = 260 + r() * 380;
        const rh = 70 + r() * 110;
        ellipse(g, cx, cy, rw, rh, alpha('#ffffff', density * 0.35));
      }
      g.restore();
    },

    cabinRow(g, x = 960, y = 880, s = 1, o = {}) {
      const { seats = 3, isBack = false, rowNumber = '23', seatColor = '#a82e4e' } = o;
      g.save();
      g.translate(x, y);
      g.scale(s, s);

      const spacing = 310;
      const startX = -((seats - 1) * spacing) / 2;

      if (rowNumber) {
        rr(g, startX + spacing * 1.35, -590, 128, 86, 14);
        g.fillStyle = '#181a30';
        g.fill();
        g.strokeStyle = '#4e5478';
        g.lineWidth = 3;
        g.stroke();
        text(g, String(rowNumber), startX + spacing * 1.35 + 64, -545, {
          size: 56,
          font: FONTS.ui,
          weight: 900,
          color: '#f5b942',
        });
      }

      for (let i = 0; i < seats; i++) {
        const sx = startX + i * spacing;
        const sw = 256, sh = 460;
        rr(g, sx - sw / 2, -sh, sw, sh, 38);
        g.fillStyle = cylinderGrad(g, sx - sw / 2, -sh, sx + sw / 2, 0, seatColor, -1);
        g.fill();

        rr(g, sx - sw * 0.42, -sh + 24, sw * 0.84, 110, 22);
        g.fillStyle = shade(seatColor, 0.12);
        g.fill();

        if (isBack) {
          rr(g, sx - 92, -sh + 85, 184, 120, 14);
          g.fillStyle = '#1c2442';
          g.fill();
          rr(g, sx - 78, -sh + 98, 156, 94, 8);
          g.fillStyle = '#1468b8';
          g.fill();
          g.save();
          g.setLineDash([5, 6]);
          seg(g, [[sx - 58, -sh + 165], [sx, -sh + 130], [sx + 52, -sh + 145]], 2.5, '#a8e0ff');
          g.restore();
          circle(g, sx + 12, -sh + 135, 6, '#ffd54f');
          rr(g, sx - 108, -sh + 230, 216, 175, 16);
          g.fillStyle = shade(seatColor, -0.18);
          g.fill();
          rr(g, sx - 20, -sh + 214, 40, 22, 6);
          g.fillStyle = '#5c668a';
          g.fill();
        }
      }
      g.restore();
    },

    airplaneExterior(g, x = 960, y = 520, s = 1, o = {}) {
      const {
        pitch = 0,
        livery = 'modern',
        brokenWindowIdx = -1,
        doorPlugOpen = false,
        cockpitBlown = false,
        mistPlume = false,
        spoilersUp = false,
      } = o;

      g.save();
      g.translate(x, y);
      g.rotate(pitch);
      g.scale(s, s);

      const tailCol = livery === 'southwest' ? '#2048a8' : livery === 'ba1990' ? '#1b2c5c' : '#ff6b2b';
      poly(g, [[-520, -45], [-660, -280], [-550, -280], [-360, -45]], tailCol);
      if (livery === 'modern') {
        poly(g, [[-625, -210], [-660, -280], [-550, -280], [-490, -210]], '#ffc425');
      }

      const bodyCol = livery === 'southwest' ? '#2554c7' : '#f4f7fc';
      rr(g, -560, -85, 1140, 170, 82);
      g.fillStyle = linGrad(g, 0, -85, 0, 85, [
        shade(bodyCol, 0.08),
        bodyCol,
        livery === 'southwest' ? '#e53935' : '#cdd8ec',
      ]);
      g.fill();

      const stripeCol = livery === 'southwest' ? '#ffb300' : livery === 'ba1990' ? '#e53935' : '#2554c7';
      g.fillStyle = stripeCol;
      g.fillRect(-520, 8, 1060, 12);

      if (cockpitBlown) {
        poly(g, [[430, -52], [510, -32], [515, -2], [430, -2]], '#12182b');
        seg(g, [[430, -52], [465, -42], [455, -12]], 3, '#a8d8ff');
      } else {
        poly(g, [[430, -52], [510, -32], [515, -2], [430, -2]], '#162447', '#dce8ff', 2);
      }

      const isSquare = livery === 'comet1952';
      for (let i = 0; i < 20; i++) {
        const wx = -440 + i * 42;
        const wy = -38;
        if (i === brokenWindowIdx) {
          rr(g, wx - 11, wy - 15, 22, 30, isSquare ? 2 : 10);
          g.fillStyle = '#120d1d';
          g.fill();
          poly(g, [[wx - 10, wy - 12], [wx - 3, wy - 14], [wx - 8, wy - 4]], '#a8dcff');
          poly(g, [[wx + 10, wy + 12], [wx + 4, wy + 14], [wx + 9, wy + 3]], '#a8dcff');
          if (mistPlume) {
            g.save();
            g.fillStyle = linGrad(g, wx, wy, wx - 420, wy - 40, ['rgba(235,245,255,0.85)', 'rgba(235,245,255,0)']);
            poly(g, [[wx, wy - 10], [wx - 420, wy - 65], [wx - 420, wy + 35], [wx, wy + 10]], g.fillStyle);
            g.restore();
          }
        } else {
          rr(g, wx - 9, wy - 13, 18, 26, isSquare ? 2 : 9);
          g.fillStyle = o.litWindows ? '#ffd278' : '#1b2b52';
          g.fill();
        }
      }

      if (doorPlugOpen) {
        rr(g, -180, -52, 36, 78, 12);
        g.fillStyle = '#3b1e2e';
        g.fill();
      }

      poly(g, [[-140, 28], [80, 28], [-190, 145], [-290, 145]], '#b8c7e0', '#8fa4c7', 2);
      if (spoilersUp) {
        poly(g, [[-90, 24], [-10, 24], [-25, -8], [-105, -2]], '#dce6f7');
      }

      rr(g, -75, 65, 165, 64, 22);
      g.fillStyle = cylinderGrad(g, -75, 65, -75, 129, '#e2eaf7', -1);
      g.fill();
      ellipse(g, 88, 97, 10, 28, '#1e2942');

      g.restore();
    },

    // Universal Multi-Era 1-Point Perspective Avenue / Canyon (Supports any era or custom style)
    architecture1P(g, o = {}) {
      const {
        style = 'modern', // 'ancientTamil' | 'eastAsian' | 'victorian' | 'classical' | 'futuristic' | 'modern' | 'prehistoric'
        vx = E.W * 0.5,
        vy = 200,
        lit = 0.4,
        mood = 'day',
        wallColor = null,
      } = o;

      const isNight = mood === 'night' || mood === 'sunset' || style === 'futuristic';
      const roadCol =
        style === 'ancientTamil' || style === 'classical'
          ? '#6e523c'
          : style === 'prehistoric'
          ? '#3b2d22'
          : isNight
          ? '#22263a'
          : '#525b72';

      poly(g, [[vx - 42, vy], [vx + 42, vy], [E.W * 0.84, E.H], [E.W * 0.16, E.H]], roadCol);

      if (style === 'modern' || style === 'futuristic') {
        const lineCol = style === 'futuristic' ? '#00f2fe' : '#e6b830';
        seg(g, [[vx - 2, vy], [E.W * 0.492, E.H]], 4, lineCol);
        seg(g, [[vx + 2, vy], [E.W * 0.508, E.H]], 4, lineCol);
      }

      const r = rng(91);
      [-1, 1].forEach((side) => {
        for (let i = 0; i < 6; i++) {
          const u0 = i / 6;
          const u1 = (i + 0.86) / 6;
          const xInner0 = lerp(vx + side * 44, side < 0 ? E.W * 0.15 : E.W * 0.85, u0);
          const xInner1 = lerp(vx + side * 44, side < 0 ? E.W * 0.15 : E.W * 0.85, u1);
          const yBot0 = lerp(vy, E.H, u0);
          const yBot1 = lerp(vy, E.H, u1);
          const bh0 = lerp(110, 620, u0) * (0.85 + r() * 0.28);
          const bh1 = lerp(110, 620, u1) * (0.85 + r() * 0.28);

          const defaultCol =
            style === 'ancientTamil'
              ? '#9c6844'
              : style === 'eastAsian'
              ? '#4a3b36'
              : style === 'victorian'
              ? '#4e3b38'
              : style === 'classical'
              ? '#c8b89e'
              : style === 'futuristic'
              ? '#181c42'
              : isNight
              ? '#2b3252'
              : '#7c879e';
          const bCol = shade(wallColor || defaultCol, (i % 2) * -0.1);

          poly(g, [[xInner0, yBot0], [xInner1, yBot1], [xInner1, yBot1 - bh1], [xInner0, yBot0 - bh0]], bCol);
          const faceW = (170 + i * 52) * side;
          poly(g, [[xInner1, yBot1], [xInner1 + faceW, yBot1], [xInner1 + faceW, yBot1 - bh1], [xInner1, yBot1 - bh1]], shade(bCol, -0.16));

          // Era-specific Roofs & Architectural Details
          if (style === 'ancientTamil') {
            // Stepped Gopuram / Mandapam tiers + carved pillars + gold Kalasam finials
            for (let tier = 1; tier <= 3; tier++) {
              const tw = faceW * (1 - tier * 0.2);
              const th = bh1 * 0.14;
              const ty = yBot1 - bh1 - (tier - 1) * th;
              poly(g, [[xInner1, ty], [xInner1 + tw, ty], [xInner1 + tw * 0.88, ty - th], [xInner1, ty - th]], shade(bCol, tier * 0.06));
            }
            circle(g, xInner1 + faceW * 0.35, yBot1 - bh1 - bh1 * 0.44, 6 * (u1 + 0.3), '#ffd54f');
          } else if (style === 'eastAsian') {
            // Swept Pagoda eaves
            poly(
              g,
              [
                [xInner1 - 18 * side, yBot1 - bh1 + 8],
                [xInner1 + faceW + 24 * side, yBot1 - bh1 - 12],
                [xInner1 + faceW * 0.7, yBot1 - bh1 - 44],
                [xInner1, yBot1 - bh1 - 36],
              ],
              '#262936'
            );
          } else if (style === 'victorian') {
            // Steeply pitched gable roof & chimney
            poly(g, [[xInner1, yBot1 - bh1], [xInner1 + faceW, yBot1 - bh1], [xInner1 + faceW * 0.5, yBot1 - bh1 - 65]], '#282c38');
          } else if (style === 'classical') {
            // Classical triangular pediment or dome
            poly(g, [[xInner1, yBot1 - bh1], [xInner1 + faceW, yBot1 - bh1], [xInner1 + faceW * 0.5, yBot1 - bh1 - 48]], shade(bCol, 0.12));
          }

          if (lit > 0 && style !== 'prehistoric') {
            g.fillStyle = style === 'futuristic' ? '#00f2fe' : '#ffd584';
            for (let wy = yBot1 - bh1 + 24; wy < yBot1 - 30; wy += 28) {
              for (let wx = 18; wx < Math.abs(faceW) - 20; wx += 24) {
                if (r() < lit) g.fillRect(xInner1 + wx * side, wy, 10, 14);
              }
            }
          }
        }
      });
    },

    cityStreet1P(g, o = {}) {
      FX.architecture1P(g, Object.assign({ style: 'modern' }, o));
    },

    earthGlobe(g, x, y, r = 380, o = {}) {
      const { rot = 0, termAngle = 0.2, cityLightsProg = 1.0, pins = [], flightArcs = 0, molten = false } = o;
      g.save();
      g.translate(x, y);
      glow(g, -r * 0.25, -r * 0.25, r * 1.32, molten ? '#ff5e1a' : '#5ca0ff', 0.42);

      g.save();
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.clip();

      g.fillStyle = sphereGrad(g, 0, 0, r, molten ? '#3b100c' : '#1a3870', [-0.6, -0.6], 0.22);
      g.fillRect(-r, -r, r * 2, r * 2);

      const contOff = (rot * r) % (r * 2);
      const contCol = molten ? '#8c2612' : '#284d82';
      const drawCont = (ox) => {
        poly(g, [[-r * 0.55 + ox, -r * 0.55], [-r * 0.15 + ox, -r * 0.45], [-r * 0.05 + ox, -r * 0.08], [-r * 0.35 + ox, r * 0.05], [-r * 0.65 + ox, -r * 0.25]], contCol);
        poly(g, [[-r * 0.25 + ox, r * 0.08], [r * 0.05 + ox, r * 0.2], [-r * 0.1 + ox, r * 0.75], [-r * 0.32 + ox, r * 0.5]], shade(contCol, -0.08));
        poly(g, [[r * 0.15 + ox, -r * 0.55], [r * 0.75 + ox, -r * 0.45], [r * 0.65 + ox, r * 0.1], [r * 0.35 + ox, r * 0.45], [r * 0.15 + ox, -r * 0.1]], contCol);
      };
      drawCont(contOff);
      drawCont(contOff - r * 1.8);

      g.save();
      g.rotate(termAngle);
      g.fillStyle = linGrad(g, -r * 0.3, 0, r * 0.2, 0, ['rgba(6,10,24,0)', 'rgba(6,10,24,0.82)', 'rgba(6,10,24,0.92)']);
      g.fillRect(-r, -r * 1.2, r * 2, r * 2.4);
      g.restore();

      const cr = rng(77);
      const maxCities = Math.floor(110 * clamp(cityLightsProg, 0, 1));
      for (let i = 0; i < maxCities; i++) {
        const lx = (cr() - 0.48) * r * 1.45;
        const ly = (cr() - 0.48) * r * 1.35;
        if (lx * lx + ly * ly < r * r * 0.82) {
          glow(g, lx, ly, 9, molten ? '#ff6b1a' : '#ffd278', 0.45);
          circle(g, lx, ly, 1.8 + cr() * 2.2, molten ? '#ffae42' : '#ffe8a8');
        }
      }

      if (flightArcs > 0) {
        const ar = rng(102);
        g.strokeStyle = 'rgba(255, 195, 90, 0.32)';
        g.lineWidth = 1.4;
        for (let k = 0; k < Math.floor(flightArcs * 65); k++) {
          const x0 = (ar() - 0.5) * r * 1.3, y0 = (ar() - 0.5) * r * 1.1;
          const x1 = (ar() - 0.5) * r * 1.3, y1 = (ar() - 0.5) * r * 1.1;
          g.beginPath();
          g.moveTo(x0, y0);
          g.quadraticCurveTo((x0 + x1) * 0.5, (y0 + y1) * 0.5 - 60, x1, y1);
          g.stroke();
        }
      }
      g.restore();

      ring(g, 0, 0, r, 4, molten ? 'rgba(255, 120, 50, 0.55)' : 'rgba(150, 205, 255, 0.55)');

      pins.forEach((p) => {
        const px = Math.cos(p.angle || -0.8) * (r * (p.radFrac || 0.55));
        const py = Math.sin(p.angle || -0.8) * (r * (p.radFrac || 0.55));
        glow(g, px, py, 36, '#ffd578', 0.85);
        circle(g, px, py, 7, '#ffffff');
        ring(g, px, py, 24, 2, 'rgba(255, 225, 160, 0.75)');
      });
      g.restore();
    },

    // Erupting Volcano & Magma Plume (Primordial Earth / Jurassic / Geology)
    volcano(g, x = 960, y = 780, s = 1, o = {}) {
      const { erupt = 0.8, rockCol = '#2b1e1c', lavaCol = '#ff5e1a', t = 0 } = o;
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      poly(g, [[-480, 0], [-110, -340], [110, -340], [480, 0]], linGrad(g, 0, -340, 0, 0, [shade(rockCol, 0.15), rockCol, shade(rockCol, -0.25)]));
      if (erupt > 0) {
        glow(g, 0, -350, 220 * erupt, lavaCol, 0.75);
        poly(g, [[-85, -340], [85, -340], [35, -140], [-15, -220], [-55, -110]], linGrad(g, 0, -340, 0, -100, ['#fff3b0', lavaCol, 'rgba(255,60,10,0)']));
        const r = rng(41);
        for (let i = 0; i < 14; i++) {
          const u = ((t * 0.6 + i * 0.13) % 1);
          const bx = (r() - 0.5) * 360 * u;
          const by = -340 - u * 280 * erupt + u * u * 160;
          circle(g, bx, by, (1 - u) * 9, '#ffae38');
        }
      }
      g.restore();
    },

    sun(g, x, y, r = 64, color = '#fff6e0', glowColor = '#ffd59a', glowR = 4.2) {
      glow(g, x, y, r * glowR, glowColor, 0.55);
      glow(g, x, y, r * 1.8, '#fff3dc', 0.6);
      circle(g, x, y, r, color);
    },
    moon(g, x, y, r = 48, color = '#eef2ff') {
      glow(g, x, y, r * 3.8, color, 0.28);
      circle(g, x, y, r, sphereGrad(g, x, y, r, color));
    },
    dust(g, t, o = {}) {
      const { seed = 3, count = 55, color = '#ffe9d2', area = [0, 0, E.W, E.H], size = 2.4, speed = 15, a = 0.45, vx = 6 } = o;
      const r = rng(seed);
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < count; i++) {
        const s = 0.4 + r() * 1.2, ph = r() * 6.28, rad = (0.5 + r()) * size;
        const x = area[0] + (((r() * area[2] + t * vx * s + Math.sin(t * 0.5 + ph) * 18) % area[2]) + area[2]) % area[2];
        const y = area[1] + (((r() * area[3] - t * speed * s) % area[3]) + area[3]) % area[3];
        const al = a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + ph)));
        g.fillStyle = radGrad(g, x, y, 0, rad * 3, [alpha(color, al), alpha(color, 0)]);
        g.beginPath();
        g.arc(x, y, rad * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    },
    stars(g, t = 0, o = {}) {
      const { seed = 5, count = 180, area = [0, 0, E.W, E.H * 0.75], color = '#ffffff' } = o;
      const r = rng(seed);
      for (let i = 0; i < count; i++) {
        const x = area[0] + r() * area[2], y = area[1] + r() * area[3], s = r();
        circle(g, x, y, 0.7 + s * 1.8, alpha(color, 0.25 + 0.65 * s * (0.6 + 0.4 * Math.sin(t * 2.2 + i))));
      }
    },

    // Universal Multi-Era Skyline Generator (Supports 'ancientTamil', 'eastAsian', 'victorian', 'classical', 'futuristic', 'prehistoric', 'modern')
    skyline(g, o = {}) {
      const {
        style = 'modern',
        seed = 7,
        x = -200,
        y = 760,
        w = E.W + 400,
        minH = 80,
        maxH = 340,
        color = '#241e38',
        windowColor = '#ffd59a',
        lit = 0.35,
        minW = 65,
        maxW = 140,
      } = o;
      const r = rng(seed);
      let cx = x;
      while (cx < x + w) {
        const bw = minW + r() * (maxW - minW);
        const bh = minH + Math.pow(r(), 1.5) * (maxH - minH);
        g.fillStyle = cylinderGrad(g, cx, y - bh, cx + bw, y, color, -1);

        if (style === 'ancientTamil' || style === 'temple') {
          // Stepped Pyramid Gopuram Silhouette + Kalasam Finials
          poly(g, [[cx, y], [cx + bw, y], [cx + bw * 0.82, y - bh], [cx + bw * 0.18, y - bh]], g.fillStyle);
          circle(g, cx + bw * 0.5, y - bh - 8, 6, '#ffd54f');
        } else if (style === 'eastAsian') {
          g.fillRect(cx + bw * 0.1, y - bh, bw * 0.8, bh);
          poly(g, [[cx - 12, y - bh + 8], [cx + bw + 12, y - bh + 8], [cx + bw * 0.75, y - bh - 24], [cx + bw * 0.25, y - bh - 24]], shade(color, -0.15));
        } else if (style === 'classical') {
          g.fillRect(cx, y - bh, bw, bh);
          g.beginPath();
          g.arc(cx + bw * 0.5, y - bh, bw * 0.42, Math.PI, 0);
          g.fill();
        } else if (style === 'victorian') {
          g.fillRect(cx, y - bh, bw, bh);
          poly(g, [[cx, y - bh], [cx + bw, y - bh], [cx + bw * 0.5, y - bh - 45]], shade(color, -0.15));
        } else {
          g.fillRect(cx, y - bh, bw, bh + 4);
        }

        if (lit > 0 && style !== 'prehistoric') {
          g.fillStyle = style === 'futuristic' ? '#00f2fe' : windowColor;
          for (let wy = y - bh + 16; wy < y - 16; wy += 18) {
            for (let wx = cx + 14; wx < cx + bw - 14; wx += 16) {
              if (r() < lit) g.fillRect(wx, wy, 7, 10);
            }
          }
        }
        cx += bw + r() * 14;
      }
    },

    hills(g, o = {}) {
      const { seed = 8, y = 760, amp = 95, color = '#261f38', freq = 0.0025 } = o;
      g.fillStyle = linGrad(g, 0, y - amp, 0, E.H, [shade(color, 0.1), shade(color, -0.25)]);
      g.beginPath();
      g.moveTo(-E.W, E.H * 2);
      for (let x = -E.W; x <= E.W * 2; x += 24) {
        g.lineTo(x, y - (noise(x * freq, seed) * 0.5 + 0.5) * amp);
      }
      g.lineTo(E.W * 2, E.H * 2);
      g.closePath();
      g.fill();
    },
    clouds(g, o = {}) {
      const { seed = 10, count = 6, y = 180, h = 140, color = '#fff5ea', a = 0.22, t = 0, speed = 10 } = o;
      const r = rng(seed);
      for (let i = 0; i < count; i++) {
        const cx = ((r() * (E.W + 400) + t * speed * (0.5 + r() * 0.5)) % (E.W + 400)) - 200;
        const cy = y + r() * h, w = 160 + r() * 240;
        g.fillStyle = alpha(color, a);
        rr(g, cx - w / 2, cy - 22, w, 44, 22);
        g.fill();
        circle(g, cx - w * 0.18, cy - 14, 34, alpha(color, a));
        circle(g, cx + w * 0.12, cy - 18, 42, alpha(color, a));
      }
    },

    // Multi-Biome Tree Generator ('oak' | 'palm' | 'cycad' | 'pine' | 'cherry')
    tree(g, x, y, s = 1, color = '#3c6e4e', kind = 'oak') {
      contactShadow(g, x, y + 4 * s, 45 * s, 9 * s, 0.28);
      if (kind === 'palm' || kind === 'cycad') {
        seg(g, [[x, y], [x + 8 * s, y - 65 * s], [x + 4 * s, y - 135 * s]], (kind === 'cycad' ? 18 : 12) * s, '#5c4028');
        for (let i = 0; i < 7; i++) {
          const ang = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
          const fx = x + 4 * s + Math.cos(ang) * 78 * s;
          const fy = y - 135 * s + Math.sin(ang) * 48 * s + 18 * s;
          seg(g, [[x + 4 * s, y - 135 * s], [fx, fy]], 9 * s, shade(color, (i % 2) * 0.08));
        }
      } else if (kind === 'pine') {
        seg(g, [[x, y], [x, y - 80 * s]], 12 * s, '#4a3528');
        for (let tier = 0; tier < 3; tier++) {
          const ty = y - (55 + tier * 42) * s;
          const tw = (65 - tier * 14) * s;
          poly(g, [[x - tw, ty], [x + tw, ty], [x, ty - 68 * s]], shade(color, tier * 0.06));
        }
      } else {
        const leafCol = kind === 'cherry' ? '#f59eb8' : color;
        seg(g, [[x, y], [x, y - 95 * s]], 12 * s, '#4a3528');
        const blobs = [[0, -135, 52], [-36, -108, 38], [36, -108, 38], [-18, -156, 36], [22, -152, 36]];
        blobs.forEach(([dx, dy, rad], idx) => {
          circle(g, x + dx * s, y + dy * s, rad * s, sphereGrad(g, x + dx * s, y + dy * s, rad * s, shade(leafCol, idx % 2 ? 0.06 : -0.06)));
        });
      }
    },

    lampPost(g, x, y, h = 340, o = {}) {
      const { color = '#23283d', light = '#ffd59a', on = true, a = 0.24 } = o;
      seg(g, [[x, y], [x, y - h], [x + 36, y - h - 10]], 7, color);
      rr(g, x + 24, y - h - 14, 28, 12, 4);
      g.fillStyle = color;
      g.fill();
      if (on) {
        glow(g, x + 38, y - h - 2, 65, light, 0.85);
        FX.lightCone(g, x + 38, y - h, { angle: Math.PI / 2, spread: 0.58, len: h + 40, color: light, a });
      }
    },
    bench(g, x, y, s = 1, color = '#9c6b4e') {
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      contactShadow(g, 0, 4, 150, 10, 0.32);
      for (let i = 0; i < 3; i++) {
        g.fillStyle = cylinderGrad(g, -136, -88 + i * 16, -136, -77 + i * 16, shade(color, i * -0.05), -1);
        rr(g, -136, -88 + i * 16, 272, 11, 4);
        g.fill();
      }
      g.fillStyle = shade(color, -0.15);
      rr(g, -144, -40, 288, 12, 5);
      g.fill();
      seg(g, [[-112, -88], [-112, -40], [-120, 0]], 7, '#232736');
      seg(g, [[112, -88], [112, -40], [120, 0]], 7, '#232736');
      g.restore();
    },
  });

  // ---------- 7. Post-Processing: Vignette & Subtle Studio Grain ----------
  H.vignette = DK.vignette = function (g, strength = 0.38, color = '0,0,0') {
    const gr = g.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.38, E.W / 2, E.H / 2, Math.hypot(E.W, E.H) * 0.58);
    gr.addColorStop(0, 'rgba(' + color + ',0)');
    gr.addColorStop(1, 'rgba(' + color + ',' + strength + ')');
    g.save();
    g.fillStyle = gr;
    g.fillRect(0, 0, E.W, E.H);
    g.restore();
  };

  let _grainTiles = null;
  function ensureGrain() {
    if (_grainTiles) return _grainTiles;
    _grainTiles = [];
    const gw = 320, gh = 180;
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas');
      c.width = gw;
      c.height = gh;
      const x = c.getContext('2d');
      const id = x.createImageData(gw, gh);
      const r = rng(100 + k * 77);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = (r() * 255) | 0;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      x.putImageData(id, 0, 0);
      _grainTiles.push(c);
    }
    return _grainTiles;
  }

  H.grain = DK.grain = function (g, t = 0, amount = 0.03) {
    if (amount <= 0) return;
    const tiles = ensureGrain();
    const idx = Math.floor(Math.abs(t) * 24) % tiles.length;
    g.save();
    g.globalAlpha = amount;
    g.globalCompositeOperation = 'overlay';
    g.drawImage(tiles[idx], 0, 0, E.W, E.H);
    g.restore();
  };

  DK.finishFrame = H.finishFrame = function (g, t = 0, o = {}) {
    const vig = o.vignette !== undefined ? o.vignette : 0.38;
    const grn = o.grain !== undefined ? o.grain : 0.03;
    if (vig > 0) DK.vignette(g, vig);
    if (grn > 0) DK.grain(g, t, grn);
  };
})();


// ============================================================================
// MODULE 2: LUMINA_RIG (lib/lumina_rig.js) — Soft-Volumetric 3D-Shaded Human
// Character Rig, 19 Full-Body Action & Intentional Stillness Presets, Built-In
// Anti-Treadmill Locomotion (moveX), Universal Multi-Era Wardrobes/Headwear/Props,
// Two-Mode Expressive Eyes, Independent Pill Eyebrows, Full 2D Mouths,
// 5-Finger Articulated Hands, Crowds & Prehistoric/Historical/Cellular Fauna.
// Requires MODULE 1 (window.DK / window.H). Pure deterministic function of t.
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const {
    clamp,
    lerp,
    ease,
    rng,
    alpha,
    mix,
    shade,
    rr,
    circle,
    ellipse,
    ring,
    poly,
    seg,
    linGrad,
    radGrad,
    sphereGrad,
    cylinderGrad,
    contactShadow,
    glow,
    text,
    FONTS,
  } = DK;

  // ---------- 1. Official Lumina Skin, Hair & Universal Wardrobe Palettes ----------
  const PALETTE = {
    // Human Skin Tones (3D Spherical Shaded)
    skinTan: '#D69A72',
    skinPeach: '#E8A478',
    skinLight: '#F2B892',
    skinBrown: '#7A4E38',
    skinOlive: '#C88C68',
    skinHypoxia: '#9A9698',

    // Hair Colors
    hairEspresso: '#261C1A',
    hairNavy: '#182854',
    hairSilver: '#9EA6B8',
    hairGrey: '#788092',
    hairBlonde: '#D9A84E',
    hairBrown: '#5C3A28',
    hairAuburn: '#A8482B',
    hairOrange: '#F27438',

    // Universal Wardrobe Colors
    yellow: '#F7B928',
    orange: '#FF851B',
    teal: '#28808C',
    mustard: '#C98A2C',
    pilotNavy: '#1E2749',
    flightGreen: '#5C8A3E',
    pajamaPurple: '#9E82C8',
    red: '#E53935',
    blue: '#2E6BE6',
    mint: '#38C878',
    pink: '#F06292',
    purple: '#8E54E9',
    cream: '#F4EFE6',
    saffron: '#FF7722',
    gold: '#FFD54F',
    bronze: '#B87333',
    steel: '#B0BEC5',
  };

  const TIER3_PALETTE = [
    { top: '#4A5568', bottom: '#2D3748', skin: '#D69A72', hair: '#261C1A' },
    { top: '#5A6B5C', bottom: '#364238', skin: '#E8A478', hair: '#5C3A28' },
    { top: '#685878', bottom: '#3E344A', skin: '#7A4E38', hair: '#1A1822' },
    { top: '#786258', bottom: '#4A3B34', skin: '#F2B892', hair: '#9EA6B8' },
    { top: '#46627A', bottom: '#283A4A', skin: '#C88C68', hair: '#261C1A' },
  ];

  // Resolve Anti-Treadmill Locomotion: moveX: [startX, endX, lt, dur]
  function resolveLocomotion(o) {
    let px = o.x !== undefined ? o.x : 960;
    let py = o.y !== undefined ? o.y : 840;
    let autoFlip = o.flipX;
    let isMovingX = false;

    if (Array.isArray(o.moveX) && o.moveX.length >= 2) {
      const [x0, x1, ltOrU, dur] = o.moveX;
      let u = 0;
      if (dur !== undefined && dur > 0) {
        u = clamp((ltOrU || 0) / dur, 0, 1);
      } else if (ltOrU !== undefined) {
        u = clamp(ltOrU, 0, 1);
      } else if (o.u !== undefined) {
        u = clamp(o.u, 0, 1);
      }
      px = lerp(x0, x1, u);
      if (autoFlip === undefined && Math.abs(x1 - x0) > 4) {
        autoFlip = x1 < x0;
      }
      isMovingX = Math.abs(x1 - x0) > 4;
    }
    if (Array.isArray(o.moveY) && o.moveY.length >= 2) {
      const [y0, y1, ltOrU, dur] = o.moveY;
      const u = dur !== undefined && dur > 0 ? clamp((ltOrU || 0) / dur, 0, 1) : clamp(ltOrU || o.u || 0, 0, 1);
      py = lerp(y0, y1, u);
    }
    return { px, py, flipX: !!autoFlip, isMovingX };
  }

  function resolveFacialState(o) {
    const expr = o.expr || 'neutral';
    let eyeMode = o.eyeMode || 'warm';
    let brows = o.brows || 'neutral';
    let mouth = o.mouth || 'neutral';
    let pupilSize = o.pupilSize !== undefined ? o.pupilSize : 0.85;

    if (!o.eyeMode && !o.mouth && !o.brows) {
      if (expr === 'shock' || expr === 'panic' || expr === 'fear') {
        eyeMode = 'panic';
        brows = 'raised';
        mouth = 'scream';
        pupilSize = 0.32;
      } else if (expr === 'joy' || expr === 'happy') {
        eyeMode = 'happyArch';
        brows = 'raised';
        mouth = 'laugh';
      } else if (expr === 'softSmile' || expr === 'warm') {
        eyeMode = 'warm';
        brows = 'neutral';
        mouth = 'smile';
      } else if (expr === 'sad' || expr === 'worry') {
        eyeMode = 'warm';
        brows = 'sad';
        mouth = 'frown';
      } else if (expr === 'angry' || expr === 'determined' || expr === 'fight') {
        eyeMode = 'warm';
        brows = 'furrowed';
        mouth = 'grimace';
      } else if (expr === 'deadpan' || expr === 'bored' || expr === 'squint') {
        eyeMode = 'halfLidded';
        brows = 'neutral';
        mouth = 'neutral';
      } else if (expr === 'calm' || expr === 'sleeping' || expr === 'meditate') {
        eyeMode = 'closed';
        brows = 'neutral';
        mouth = o.sleepBubble ? 'sleepBubble' : 'neutral';
      } else if (expr === 'wince' || expr === 'brace') {
        eyeMode = 'wince';
        brows = 'furrowed';
        mouth = 'grimace';
      } else if (expr === 'awe' || expr === 'overviewEarth' || expr === 'admire') {
        eyeMode = 'warm';
        brows = 'raised';
        mouth = 'o';
      }
    }
    return { eyeMode, brows, mouth, pupilSize };
  }

  function hashSeed(s) {
    let h = 2166136261 ^ (s | 0);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ---------- 2. Two-Mode Expressive Eyes + Independent Floating Pill Eyebrows ----------
  function drawLuminaEyes(g, hx, hy, R, o = {}) {
    const {
      eyeMode = 'warm',
      sclera = false,
      pupilSize = 0.85,
      look = [0, 0],
      brows = 'neutral',
      hairColor = PALETTE.hairEspresso,
      skinColor = PALETTE.skinTan,
      glasses = false,
      foreheadMark = null, // 'vibhuti' | 'tilak' | 'bindi' | 'headband'
      blink = 'auto',
      t = 0,
      seed = 1,
    } = o;

    let blinkAmt = typeof blink === 'number' ? clamp(blink, 0, 1) : 0;
    if (blink === 'auto' || blink === null || blink === undefined) {
      const period = 2.8 + (hashSeed(seed) % 140) / 100;
      const phase = (t + hashSeed(seed * 7) * 0.37) % period;
      if (phase < 0.11) blinkAmt = Math.sin((phase / 0.11) * Math.PI);
    }

    const lx = clamp(look[0] || 0, -1, 1);
    const ly = clamp(look[1] || 0, -0.8, 0.8);
    const gazeX = lx * R * 0.28;
    const gazeY = ly * R * 0.18;
    const spacing = R * 0.34;
    const baseY = hy - R * 0.04 + gazeY;

    // Optional Cultural Forehead Marks (Sacred Vibhuti Stripes, Tilak, Bindi)
    if (foreheadMark === 'vibhuti') {
      const fy = hy - R * 0.48;
      seg(g, [[hx + gazeX - R * 0.26, fy - R * 0.06], [hx + gazeX + R * 0.26, fy - R * 0.06]], Math.max(2, R * 0.045), '#F4F6FA');
      seg(g, [[hx + gazeX - R * 0.30, fy], [hx + gazeX + R * 0.30, fy]], Math.max(2, R * 0.045), '#F4F6FA');
      seg(g, [[hx + gazeX - R * 0.26, fy + R * 0.06], [hx + gazeX + R * 0.26, fy + R * 0.06]], Math.max(2, R * 0.045), '#F4F6FA');
      circle(g, hx + gazeX, fy, R * 0.055, '#E53935');
    } else if (foreheadMark === 'tilak' || foreheadMark === 'bindi') {
      circle(g, hx + gazeX, hy - R * 0.38, R * 0.065, '#E53935');
    }

    [-1, 1].forEach((side) => {
      const ex = hx + gazeX + side * spacing * (1 - Math.abs(lx) * 0.12);
      const ey = baseY;

      g.save();
      g.translate(ex, ey);

      if (eyeMode === 'closed' || (blinkAmt > 0.75 && eyeMode !== 'happyArch' && eyeMode !== 'wince')) {
        g.strokeStyle = '#2B1D1A';
        g.lineWidth = Math.max(2.5, R * 0.075);
        g.lineCap = 'round';
        g.beginPath();
        g.arc(0, -R * 0.05, R * 0.16, Math.PI * 0.15, Math.PI * 0.85, false);
        g.stroke();
      } else if (eyeMode === 'happyArch') {
        g.strokeStyle = '#2B1D1A';
        g.lineWidth = Math.max(2.8, R * 0.08);
        g.lineCap = 'round';
        g.beginPath();
        g.arc(0, R * 0.08, R * 0.16, Math.PI * 1.15, Math.PI * 1.85, false);
        g.stroke();
      } else if (eyeMode === 'wince') {
        const dir = side < 0 ? 1 : -1;
        const cw = R * 0.15, ch = R * 0.12;
        seg(g, [[-cw * dir, -ch], [cw * 0.7 * dir, 0], [-cw * dir, ch]], Math.max(2.8, R * 0.08), '#2B1D1A');
      } else if (eyeMode === 'panic' || eyeMode === 'halfLidded' || sclera) {
        const rx = R * (eyeMode === 'panic' ? 0.24 : 0.19);
        const ry = R * (eyeMode === 'panic' ? 0.29 : 0.22) * Math.max(0.2, 1 - blinkAmt * 0.85);

        g.save();
        g.beginPath();
        g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        g.clip();

        g.fillStyle = '#FFFFFF';
        g.fillRect(-rx, -ry, rx * 2, ry * 2);

        const pr = rx * (eyeMode === 'panic' ? clamp(pupilSize, 0.18, 0.45) : 0.56);
        const jitX = eyeMode === 'panic' ? Math.sin(t * 28 + seed) * R * 0.012 : 0;
        const jitY = eyeMode === 'panic' ? Math.cos(t * 32 + seed) * R * 0.012 : 0;
        circle(g, lx * rx * 0.35 + jitX, ly * ry * 0.35 + jitY, pr, '#1A1624');
        if (eyeMode !== 'panic') {
          circle(g, lx * rx * 0.35 - pr * 0.3, ly * ry * 0.35 - pr * 0.3, pr * 0.28, '#FFFFFF');
        }

        if (eyeMode === 'halfLidded') {
          g.fillStyle = shade(skinColor, -0.08);
          g.fillRect(-rx * 1.2, -ry * 1.1, rx * 2.4, ry * 1.05);
          seg(g, [[-rx, -ry * 0.05], [rx, -ry * 0.05]], Math.max(2, R * 0.05), '#3A231B');
        }
        g.restore();
      } else {
        const rx = R * 0.115;
        const ry = R * 0.155 * Math.max(0.15, 1 - blinkAmt * 0.85);
        ellipse(g, 0, 0, rx, ry, '#231820');
        circle(g, -rx * 0.32, -ry * 0.32, rx * 0.34, '#FFFFFF');
      }

      const browY = -R * (eyeMode === 'panic' ? 0.38 : 0.28);
      const bw = R * 0.21;
      let browTilt = 0;
      let browLift = 0;
      if (brows === 'raised') {
        browLift = -R * 0.06;
        browTilt = side * -0.12;
      } else if (brows === 'furrowed') {
        browLift = R * 0.03;
        browTilt = side * -0.34;
      } else if (brows === 'sad') {
        browLift = -R * 0.02;
        browTilt = side * 0.32;
      } else if (brows === 'asymmetric') {
        browLift = side < 0 ? -R * 0.06 : R * 0.02;
        browTilt = side < 0 ? -0.18 : 0.12;
      }

      g.save();
      g.translate(0, browY + browLift);
      g.rotate(browTilt);
      seg(g, [[-bw, 0], [bw, 0]], Math.max(3, R * 0.095), hairColor, 'round');
      g.restore();

      g.restore();
    });

    if (glasses) {
      const gy = baseY;
      const gx = hx + gazeX;
      const gr = R * 0.27;
      [-1, 1].forEach((side) => {
        const lxCenter = gx + side * spacing * (1 - Math.abs(lx) * 0.12);
        if (glasses === 'starReflect') {
          g.save();
          g.beginPath();
          g.arc(lxCenter, gy, gr - 1.5, 0, Math.PI * 2);
          g.clip();
          g.fillStyle = linGrad(g, lxCenter, gy - gr, lxCenter, gy + gr, ['#0c122e', '#2c2254', '#583b7a']);
          g.fillRect(lxCenter - gr, gy - gr, gr * 2, gr * 2);
          seg(g, [[lxCenter - gr, gy + gr * 0.6], [lxCenter + gr, gy - gr * 0.6]], gr * 0.7, 'rgba(235, 210, 255, 0.35)');
          const sr = rng(99 + side);
          for (let k = 0; k < 14; k++) {
            const sx = lxCenter + (sr() - 0.5) * gr * 1.5;
            const sy = gy + (sr() - 0.5) * gr * 1.5;
            circle(g, sx, sy, 1.2 + sr() * 1.5, '#FFFFFF');
          }
          const spX = lxCenter + side * gr * 0.22;
          const spY = gy - gr * 0.2;
          const spR = gr * (0.35 + 0.08 * Math.sin(t * 5 + side));
          poly(g, [[spX, spY - spR], [spX + spR * 0.22, spY - spR * 0.22], [spX + spR, spY], [spX + spR * 0.22, spY + spR * 0.22], [spX, spY + spR], [spX - spR * 0.22, spY + spR * 0.22], [spX - spR, spY], [spX - spR * 0.22, spY - spR * 0.22]], '#FFFFFF');
          g.restore();
        } else {
          circle(g, lxCenter, gy, gr, 'rgba(255, 255, 255, 0.07)');
          seg(g, [[lxCenter - gr * 0.45, gy - gr * 0.45], [lxCenter + gr * 0.2, gy + gr * 0.2]], 2.2, 'rgba(255, 255, 255, 0.25)');
        }
        ring(g, lxCenter, gy, gr, Math.max(2.4, R * 0.065), '#3A231E');
      });
      seg(g, [[gx - spacing + gr, gy - R * 0.02], [gx + spacing - gr, gy - R * 0.02]], Math.max(2.4, R * 0.065), '#3A231E');
    }
  }

  // ---------- 3. Full Expressive 2D Mouth Rig ----------
  function drawLuminaMouth(g, hx, hy, R, o = {}) {
    const {
      mouth = 'neutral',
      look = [0, 0],
      mustache = false,
      beard = false,
      hairColor = PALETTE.hairEspresso,
      t = 0,
    } = o;

    const mx = hx + clamp(look[0] || 0, -1, 1) * R * 0.22;
    const my = hy + R * 0.36 + clamp(look[1] || 0, -0.8, 0.8) * R * 0.1;

    g.save();
    g.translate(mx, my);

    if (beard) {
      ellipse(g, 0, R * 0.14, R * 0.62, R * 0.48, hairColor);
    }
    if (mustache) {
      g.fillStyle = hairColor;
      rr(g, -R * 0.26, -R * 0.16, R * 0.52, R * 0.12, R * 0.06);
      g.fill();
    }

    if (mouth === 'smile' || mouth === 'softSmile') {
      g.strokeStyle = '#3E221C';
      g.lineWidth = Math.max(2.2, R * 0.06);
      g.lineCap = 'round';
      g.beginPath();
      g.arc(0, -R * 0.06, R * 0.15, Math.PI * 0.18, Math.PI * 0.82, false);
      g.stroke();
    } else if (mouth === 'frown') {
      g.strokeStyle = '#3E221C';
      g.lineWidth = Math.max(2.2, R * 0.06);
      g.lineCap = 'round';
      g.beginPath();
      g.arc(0, R * 0.12, R * 0.14, Math.PI * 1.2, Math.PI * 1.8, false);
      g.stroke();
    } else if (mouth === 'laugh' || mouth === 'bigSmile') {
      const mw = R * 0.36, mh = R * 0.22;
      g.save();
      g.beginPath();
      g.moveTo(-mw, -mh * 0.2);
      g.lineTo(mw, -mh * 0.2);
      g.bezierCurveTo(mw, mh * 1.1, -mw, mh * 1.1, -mw, -mh * 0.2);
      g.closePath();
      g.clip();

      g.fillStyle = '#5A1C24';
      g.fillRect(-mw, -mh, mw * 2, mh * 2);
      g.fillStyle = '#FFFFFF';
      g.fillRect(-mw, -mh * 0.2, mw * 2, mh * 0.42);
      ellipse(g, 0, mh * 0.85, mw * 0.65, mh * 0.5, '#F0788C');
      g.restore();
    } else if (mouth === 'scream' || mouth === 'panic' || mouth === 'grimace') {
      const mw = R * 0.38, mh = R * 0.26;
      g.save();
      rr(g, -mw, -mh * 0.5, mw * 2, mh, R * 0.08);
      g.clip();
      g.fillStyle = '#4A151B';
      g.fillRect(-mw, -mh, mw * 2, mh * 2);
      g.fillStyle = '#FFFFFF';
      g.fillRect(-mw, -mh * 0.5, mw * 2, mh * 0.32);
      g.fillRect(-mw, mh * 0.18, mw * 2, mh * 0.32);
      seg(g, [[-mw, 0], [mw, 0]], 1.5, '#2A0D10');
      g.restore();
      rr(g, -mw, -mh * 0.5, mw * 2, mh, R * 0.08);
      g.strokeStyle = '#3E221C';
      g.lineWidth = Math.max(2, R * 0.05);
      g.stroke();
    } else if (mouth === 'gasp' || mouth === 'o' || mouth === 'yawn') {
      const rx = R * (mouth === 'yawn' ? 0.15 : 0.11);
      const ry = R * (mouth === 'yawn' ? 0.19 : 0.14);
      ellipse(g, 0, 0, rx, ry, '#4A1820');
    } else if (mouth === 'sleepBubble') {
      ellipse(g, 0, 0, R * 0.08, R * 0.09, '#4A1820');
      const bRad = R * (0.14 + 0.05 * Math.sin(t * 2.4));
      const bx = R * 0.08, by = R * 0.02;
      circle(g, bx, by, bRad, 'rgba(200, 230, 255, 0.42)');
      ring(g, bx, by, bRad, 1.8, 'rgba(255, 255, 255, 0.75)');
      circle(g, bx - bRad * 0.3, by - bRad * 0.3, bRad * 0.25, 'rgba(255, 255, 255, 0.9)');
    } else {
      seg(g, [[-R * 0.12, 0], [R * 0.12, 0]], Math.max(2.2, R * 0.055), '#3E221C');
    }

    g.restore();
  }

  // ---------- 4. Sculpted, Windswept & Historical Hair + Universal Headwear ----------
  function drawHairBack(g, hx, hy, R, style, col) {
    if (style === 'longStraight') {
      g.save();
      rr(g, hx - R * 1.08, hy - R * 0.4, R * 2.16, R * 1.75, R * 0.35);
      g.fillStyle = linGrad(g, hx, hy - R, hx, hy + R * 1.4, [shade(col, 0.1), col, shade(col, -0.22)]);
      g.fill();
      g.restore();
    } else if (style === 'bun') {
      circle(g, hx, hy - R * 1.05, R * 0.44, sphereGrad(g, hx, hy - R * 1.05, R * 0.44, col));
      ring(g, hx, hy - R * 0.92, R * 0.36, Math.max(3, R * 0.08), '#FFD54F');
    } else if (style === 'topknot') {
      rr(g, hx - R * 0.18, hy - R * 1.42, R * 0.36, R * 0.55, R * 0.14);
      g.fillStyle = col;
      g.fill();
      seg(g, [[hx - R * 0.2, hy - R * 1.05], [hx + R * 0.2, hy - R * 1.05]], 3, '#E53935');
    }
  }

  function drawHairFront(g, hx, hy, R, style, col, wind = 0, t = 0) {
    if (style === 'none' || style === 'bald') return;
    g.save();
    if (style === 'curlyCloud') {
      const puffs = [
        [0, -R * 0.88, R * 0.48],
        [-R * 0.48, -R * 0.72, R * 0.42],
        [R * 0.48, -R * 0.72, R * 0.42],
        [-R * 0.82, -R * 0.38, R * 0.34],
        [R * 0.82, -R * 0.38, R * 0.34],
        [-R * 0.25, -R * 0.62, R * 0.38],
        [R * 0.25, -R * 0.62, R * 0.38],
      ];
      puffs.forEach(([dx, dy, pr], idx) => {
        circle(g, hx + dx, hy + dy, pr, sphereGrad(g, hx + dx, hy + dy, pr, shade(col, (idx % 2) * 0.05)));
      });
    } else if (style === 'spikyMessy') {
      const wOff = wind > 0 ? Math.sin(t * 22) * R * 0.14 * wind : 0;
      poly(
        g,
        [
          [hx - R * 0.98, hy - R * 0.18],
          [hx - R * 1.12 + wOff, hy - R * 0.58],
          [hx - R * 0.82, hy - R * 0.65],
          [hx - R * 0.88 + wOff, hy - R * 1.05],
          [hx - R * 0.45, hy - R * 0.88],
          [hx - R * 0.25 + wOff, hy - R * 1.25],
          [hx + R * 0.1, hy - R * 0.95],
          [hx + R * 0.48 + wOff, hy - R * 1.22],
          [hx + R * 0.68, hy - R * 0.85],
          [hx + R * 1.08 + wOff, hy - R * 0.92],
          [hx + R * 0.96, hy - R * 0.18],
          [hx + R * 0.55, hy - R * 0.52],
          [hx - R * 0.15, hy - R * 0.48],
          [hx - R * 0.62, hy - R * 0.52],
        ],
        linGrad(g, hx, hy - R * 1.25, hx, hy - R * 0.2, [shade(col, 0.18), col, shade(col, -0.15)])
      );
    } else if (style === 'baldTufts') {
      [-1, 1].forEach((side) => {
        ellipse(g, hx + side * R * 0.95, hy - R * 0.15, R * 0.16, R * 0.26, col, side * 0.2);
      });
    } else if (style === 'windswept') {
      const wAmp = Math.max(0.3, wind);
      for (let i = 0; i < 7; i++) {
        const u = i / 6;
        const sx = hx - R * 0.75 + u * R * 1.4;
        const sy = hy - R * 0.65 - Math.sin(u * Math.PI) * R * 0.28;
        const whipX = sx - R * (0.45 + 0.4 * wAmp) + Math.sin(t * 24 + i) * R * 0.15 * wAmp;
        const whipY = sy - R * 0.55 + Math.cos(t * 19 + i) * R * 0.12 * wAmp;
        poly(g, [[sx - R * 0.14, sy], [sx + R * 0.14, sy], [whipX, whipY]], shade(col, (i % 2) * 0.1));
      }
    } else {
      g.beginPath();
      g.arc(hx, hy - R * 0.12, R * 1.02, Math.PI * 1.05, Math.PI * 1.95, false);
      g.quadraticCurveTo(hx + R * 0.2, hy - R * 0.55, hx - R * 0.98, hy - R * 0.18);
      g.closePath();
      g.fillStyle = linGrad(g, hx, hy - R * 1.1, hx, hy, [shade(col, 0.15), col]);
      g.fill();
    }
    g.restore();
  }

  function drawHeadwear(g, hx, hy, R, kind, primaryCol) {
    if (!kind || kind === 'none') return;
    g.save();
    if (kind === 'crown') {
      // Royal Gold Crown / Kireetam (Ancient Tamil / Classical / Medieval)
      poly(
        g,
        [
          [hx - R * 0.85, hy - R * 0.65],
          [hx - R * 0.72, hy - R * 1.35],
          [hx - R * 0.35, hy - R * 1.05],
          [hx, hy - R * 1.62],
          [hx + R * 0.35, hy - R * 1.05],
          [hx + R * 0.72, hy - R * 1.35],
          [hx + R * 0.85, hy - R * 0.65],
        ],
        cylinderGrad(g, hx - R, hy - R * 1.6, hx + R, hy - R * 0.6, '#FFD54F', -1),
        '#D99B26',
        2
      );
      circle(g, hx, hy - R * 0.95, R * 0.11, '#E53935');
      circle(g, hx - R * 0.45, hy - R * 0.9, R * 0.08, '#28808C');
      circle(g, hx + R * 0.45, hy - R * 0.9, R * 0.08, '#28808C');
    } else if (kind === 'turban') {
      const tCol = primaryCol || '#FF7722';
      ellipse(g, hx - R * 0.35, hy - R * 0.85, R * 0.78, R * 0.46, sphereGrad(g, hx - R * 0.35, hy - R * 0.85, R * 0.8, tCol), -0.22);
      ellipse(g, hx + R * 0.35, hy - R * 0.85, R * 0.78, R * 0.46, sphereGrad(g, hx + R * 0.35, hy - R * 0.85, R * 0.8, shade(tCol, -0.08)), 0.22);
      circle(g, hx, hy - R * 0.92, R * 0.12, '#FFD54F');
    } else if (kind === 'gandhiCap') {
      poly(g, [[hx - R * 0.92, hy - R * 0.62], [hx + R * 0.92, hy - R * 0.62], [hx + R * 0.72, hy - R * 1.15], [hx - R * 0.72, hy - R * 1.15]], '#F5F5F0', '#D8D8CE', 2);
    } else if (kind === 'kasa') {
      // Conical Bamboo Hat (East Asia)
      poly(g, [[hx - R * 1.65, hy - R * 0.58], [hx + R * 1.65, hy - R * 0.58], [hx, hy - R * 1.38]], cylinderGrad(g, hx - R * 1.6, hy - R, hx + R * 1.6, hy - R, '#D9B372', -1));
    } else if (kind === 'kabuto') {
      // Samurai Helmet with Gold Crescent Maedate
      g.beginPath();
      g.arc(hx, hy - R * 0.35, R * 1.08, Math.PI, 0);
      g.fillStyle = '#1E2233';
      g.fill();
      poly(g, [[hx, hy - R * 0.95], [hx - R * 0.85, hy - R * 1.55], [hx - R * 0.35, hy - R * 1.05], [hx + R * 0.35, hy - R * 1.05], [hx + R * 0.85, hy - R * 1.55]], '#FFD54F');
    } else if (kind === 'scholarCap') {
      rr(g, hx - R * 0.78, hy - R * 1.22, R * 1.56, R * 0.58, R * 0.12);
      g.fillStyle = '#1E202E';
      g.fill();
      rr(g, hx - R * 1.45, hy - R * 1.02, R * 2.9, R * 0.16, R * 0.08);
      g.fill();
    } else if (kind === 'topHat' || kind === 'bowlerHat' || kind === 'flatCap') {
      const hCol = '#222634';
      ellipse(g, hx, hy - R * 0.68, R * 1.25, R * 0.18, hCol);
      if (kind === 'topHat') {
        rr(g, hx - R * 0.76, hy - R * 1.65, R * 1.52, R * 1.02, R * 0.08);
        g.fillStyle = cylinderGrad(g, hx - R * 0.76, hy - R, hx + R * 0.76, hy - R, hCol, -1);
        g.fill();
        g.fillStyle = '#9E2A2B';
        g.fillRect(hx - R * 0.76, hy - R * 0.82, R * 1.52, R * 0.12);
      } else {
        g.beginPath();
        g.arc(hx, hy - R * 0.68, R * 0.82, Math.PI, 0);
        g.fillStyle = hCol;
        g.fill();
      }
    } else if (kind === 'spaceHelmet') {
      circle(g, hx, hy, R * 1.26, 'rgba(160, 225, 255, 0.24)');
      ring(g, hx, hy, R * 1.26, Math.max(4, R * 0.1), '#E2EAF5');
      seg(g, [[hx - R * 0.65, hy - R * 0.65], [hx - R * 0.25, hy - R * 0.9]], 4, 'rgba(255,255,255,0.65)');
    } else if (kind === 'pilotCap') {
      ellipse(g, hx, hy - R * 0.75, R * 1.1, R * 0.35, '#1A2242');
      rr(g, hx - R * 0.95, hy - R * 1.15, R * 1.9, R * 0.45, R * 0.18);
      g.fillStyle = '#1E2749';
      g.fill();
      seg(g, [[hx - R * 0.85, hy - R * 0.75], [hx + R * 0.85, hy - R * 0.75]], Math.max(3, R * 0.08), '#F5B942');
    }
    g.restore();
  }

  // ---------- 5. Universal Held Action Props (Weapons, Tools, Manuscripts, Science, Baby) ----------
  function drawHeldProp(g, x, y, s, kind, t = 0) {
    if (!kind || kind === 'none') return;
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    if (kind === 'vel' || kind === 'spear') {
      // Sacred / Warrior Leaf-Shaped Spear (Vel)
      seg(g, [[0, 68], [0, -110]], 6, '#8C5832');
      poly(g, [[0, -165], [16, -125], [0, -102], [-16, -125]], cylinderGrad(g, -16, -130, 16, -130, '#FFD54F', -1));
    } else if (kind === 'sword' || kind === 'katana') {
      const isKatana = kind === 'katana';
      seg(g, [[0, 24], [0, -8]], 7, '#3E2723');
      rr(g, -18, -12, 36, 7, 3);
      g.fillStyle = '#FFD54F';
      g.fill();
      poly(g, [[-6, -12], [6, -12], [isKatana ? 10 : 4, -118], [0, -134], [-4, -118]], linGrad(g, -8, -70, 8, -70, ['#FFFFFF', '#CFD8DC', '#90A4AE']));
    } else if (kind === 'shield') {
      circle(g, 0, 0, 38, sphereGrad(g, 0, 0, 38, '#B87333'));
      ring(g, 0, 0, 34, 4, '#FFD54F');
      circle(g, 0, 0, 10, '#FFD54F');
    } else if (kind === 'hammer' || kind === 'wrench' || kind === 'chisel') {
      seg(g, [[0, 26], [0, -38]], 7, '#8D6E63');
      rr(g, -22, -52, 44, 20, 4);
      g.fillStyle = '#78909C';
      g.fill();
    } else if (kind === 'palmLeaf' || kind === 'scroll') {
      // Olai Chuvadi (Palm-Leaf Manuscript) or Historical Scroll
      rr(g, -34, -12, 68, 24, 5);
      g.fillStyle = '#E6C687';
      g.fill();
      g.strokeStyle = '#B38B4D';
      g.lineWidth = 2;
      g.stroke();
      seg(g, [[-24, -3], [24, -3]], 1.8, '#5C4028');
      seg(g, [[-24, 4], [18, 4]], 1.8, '#5C4028');
    } else if (kind === 'quill' || kind === 'stylus') {
      seg(g, [[0, 12], [18, -36]], 3.5, '#F5F5F0');
      poly(g, [[4, 0], [22, -42], [28, -24]], '#FFE082');
    } else if (kind === 'beaker' || kind === 'flask') {
      poly(g, [[-10, -28], [10, -28], [24, 18], [-24, 18]], 'rgba(200, 240, 255, 0.45)', '#DCEeff', 2.5);
      poly(g, [[-17, -2], [17, -2], [22, 16], [-22, 16]], '#38C878');
      circle(g, Math.sin(t * 6) * 6, -8 - ((t * 24) % 18), 4, '#A8FFCE');
    } else if (kind === 'coinBag') {
      circle(g, 0, 8, 22, sphereGrad(g, 0, 8, 22, '#D99B26'));
      poly(g, [[-8, -10], [8, -10], [14, -22], [-14, -22]], '#D99B26');
      circle(g, 0, 8, 8, '#FFD54F');
    } else if (kind === 'flag' || kind === 'torch' || kind === 'lantern') {
      seg(g, [[0, 55], [0, -95]], 5, '#5C4028');
      if (kind === 'flag') {
        const wave = Math.sin(t * 6) * 8;
        poly(g, [[0, -95], [68, -88 + wave], [68, -42 + wave], [0, -48]], '#FF7722');
      } else {
        glow(g, 0, -105, 45, '#FF9E2C', 0.85);
        circle(g, 0, -102, 12, '#FFD54F');
      }
    } else if (kind === 'phone') {
      rr(g, -10, -18, 20, 36, 4);
      g.fillStyle = '#1E293B';
      g.fill();
      rr(g, -8, -14, 16, 28, 2);
      g.fillStyle = '#38BDF8';
      g.fill();
    }

    g.restore();
  }

  // ---------- 6. Aviation Oxygen Mask ----------
  function drawOxygenMask(g, hx, hy, R, mode, t = 0) {
    if (!mode || mode === 'none') return;
    g.save();
    if (mode === 'dangling') {
      const swing = Math.sin(t * 4.5) * R * 0.25;
      const mx = hx - R * 0.85 + swing;
      const my = hy - R * 0.1;
      seg(g, [[hx - R * 0.7, hy - R * 2.4], [mx, my - R * 0.35]], 3.5, '#DCE6F7');
      poly(g, [[mx - R * 0.18, my - R * 0.35], [mx + R * 0.18, my - R * 0.35], [mx + R * 0.36, my + R * 0.2], [mx - R * 0.36, my + R * 0.2]], '#FFB81C');
      ellipse(g, mx, my + R * 0.2, R * 0.36, R * 0.1, '#E09600');
      rr(g, mx - R * 0.14, my + R * 0.2, R * 0.28, R * 0.55, R * 0.08);
      g.fillStyle = 'rgba(220, 238, 255, 0.42)';
      g.fill();
      g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      g.lineWidth = 1.8;
      g.stroke();
      g.restore();
      return;
    }

    const my = hy + R * 0.26;
    seg(g, [[hx - R * 0.98, hy + R * 0.12], [hx + R * 0.98, hy + R * 0.12]], 3.5, '#F0F4FA');
    seg(g, [[hx - R * 0.55, hy - R * 2.5], [hx - R * 0.65, my], [hx, my + R * 0.08]], 4.5, 'rgba(220, 235, 255, 0.8)');

    if (mode === 'wearingFlowing') {
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.9 + i * 0.33) % 1;
        const py = lerp(hy - R * 2.2, my, u);
        const px = lerp(hx - R * 0.55, hx - R * 0.62, u);
        glow(g, px, py, 14, '#5CE1FF', 0.85);
        circle(g, px, py, 4.5, '#FFFFFF');
      }
    }

    circle(g, hx, my, R * 0.42, 'rgba(255, 188, 28, 0.88)');
    ring(g, hx, my, R * 0.42, 2.5, '#FFD54F');
    circle(g, hx, my + R * 0.04, R * 0.16, '#E09200');

    rr(g, hx - R * 0.18, my + R * 0.32, R * 0.36, R * 0.68, R * 0.14);
    g.fillStyle = 'rgba(225, 240, 255, 0.45)';
    g.fill();
    g.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }

  // ---------- 7. Master Soft-Volumetric Human Character Rig (DK.char) ----------
  function drawCutoutChar(g, xOrOpts, y, scale = 1) {
    const o = typeof xOrOpts === 'object' && xOrOpts !== null ? xOrOpts : { x: xOrOpts, y, s: scale };
    const s = o.s !== undefined ? o.s : o.scale !== undefined ? o.scale : 1;
    if (s <= 0.001) return;

    const time = o.t !== undefined ? o.t : 0;
    const seed = o.seed !== undefined ? o.seed : 1;
    const lDir = o.lightDir || [-0.6, -0.75];

    // 1. Resolve Anti-Treadmill Locomotion & Direction
    const loco = resolveLocomotion(o);
    const px = loco.px;
    const py = loco.py;
    const flipX = loco.flipX;

    // 2. Resolve Skin, Hair & Universal Wardrobe Colors
    const rawSkin = PALETTE[o.skin] || o.skin || PALETTE.skinTan;
    const skinCol = o.hypoxia ? mix(rawSkin, PALETTE.skinHypoxia, clamp(o.hypoxia, 0, 1)) : rawSkin;
    const wardrobe = o.wardrobe || (o.era === 'pilot' ? 'pilotUniform' : 'sweater');
    const hairStyle =
      o.hairStyle ||
      (wardrobe === 'samurai' || wardrobe === 'ancientJapan'
        ? 'topknot'
        : wardrobe === 'ancientTamil'
        ? 'bun'
        : o.color === 'orange'
        ? 'spikyMessy'
        : 'curlyCloud');
    const hairCol = PALETTE[o.hairColor] || o.hairColor || (hairStyle === 'spikyMessy' ? PALETTE.hairNavy : PALETTE.hairEspresso);
    const topCol =
      PALETTE[o.topColor] ||
      o.topColor ||
      PALETTE[o.color] ||
      (wardrobe === 'scientist' || wardrobe === 'indianIndependence' || wardrobe === 'astronaut'
        ? '#F4F6FA'
        : wardrobe === 'ancientTamil'
        ? '#F7B928'
        : wardrobe === 'victorian'
        ? '#2B3040'
        : PALETTE.yellow);
    const botCol =
      PALETTE[o.bottomColor] ||
      o.bottomColor ||
      (wardrobe === 'ancientTamil' || wardrobe === 'indianIndependence' || wardrobe === 'roman'
        ? '#F4EFE6'
        : PALETTE.teal);

    // 3. Resolve Action Preset & Full-Body Kinematics
    const p = typeof o.pose === 'string' ? { preset: o.pose } : o.pose || {};
    const preset = p.preset || o.action || (loco.isMovingX ? 'walk' : 'stand');
    const speedMult = p.speed !== undefined ? p.speed : 1.0;

    const isSeated = preset === 'seated' || preset === 'meditate' || !!p.sit;
    const isRun = preset === 'run' || preset === 'sprint';
    const isMarch = preset === 'march';
    const isWalk = preset === 'walk' || isRun || isMarch || Number(p.walk) > 0;
    const walkAmp = isRun ? 1.35 : isMarch ? 1.15 : p.walk ? Number(p.walk) : isWalk ? 1.0 : 0;
    const walkFreq = (isRun ? 11.5 : isMarch ? 7.5 : p.walkSpeed || 6.2) * speedMult;
    const walkPhase = time * walkFreq + seed * 1.7;

    const { eyeMode, brows, mouth, pupilSize } = resolveFacialState(
      Object.assign({}, o, {
        expr: o.expr || (preset === 'fight' || preset === 'swordFight' ? 'fight' : preset === 'admire' ? 'admire' : preset === 'meditate' ? 'meditate' : 'neutral'),
      })
    );

    const R = 50 * s;
    const torsoH = 104 * s;
    const shW = 78 * s;
    const isCrouch = preset === 'crouch' || preset === 'dodge' || preset === 'brace';
    const legH = (isSeated ? 48 : isCrouch ? 64 : 96) * s;
    const legW = 22 * s;
    const armW = 20 * s;

    // Vertical bounce/jump/breathing offset
    let bobY = Math.sin(time * 2.2 + seed) * 1.8 * s;
    if (walkAmp > 0) {
      bobY = Math.abs(Math.sin(walkPhase)) * (isRun ? -12 : -6) * s * walkAmp;
    } else if (preset === 'jump' || preset === 'leap') {
      bobY = -Math.abs(Math.sin(time * 4.5 + seed)) * 54 * s;
    } else if (preset === 'fight' || preset === 'swordFight') {
      bobY = Math.abs(Math.sin(time * 7.5 + seed)) * -5 * s;
    } else if (preset === 'holdBaby') {
      bobY = Math.sin(time * 2.4 + seed) * 2.5 * s;
    }

    // Torso lean angle (forward lean for sprinting, pushing, fighting, climbing)
    const bodyRot =
      (o.rot || 0) +
      (isRun
        ? 0.18
        : preset === 'push'
        ? 0.26
        : preset === 'pull'
        ? -0.22
        : preset === 'fight' || preset === 'swordFight'
        ? 0.09
        : preset === 'holdBaby'
        ? Math.sin(time * 2.2) * 0.04
        : 0);

    const hipY = -legH + bobY;
    const shoulderY = hipY - torsoH;
    const headTiltY = preset === 'admire' ? -6 : preset === 'think' || preset === 'write' ? 5 : 0;
    const headY = shoulderY - R * 1.05 + (p.headBob || headTiltY) * s;
    const headX = (p.lean || (preset === 'admire' ? -4 : 0)) * s;

    g.save();
    g.translate(px, py);
    if (flipX) g.scale(-1, 1);

    // 1. Soft Ambient-Occlusion Ground Shadow
    if (o.shadow !== false && !isSeated) {
      contactShadow(g, 0, 4 * s, 48 * s, 10 * s, 0.32);
    }

    g.rotate(bodyRot);

    // 2. Back Hair Layer
    drawHairBack(g, headX, headY, R, hairStyle, hairCol);

    // 3. Cylindrical Shaded Legs & Era-Adapted Footwear
    if (!o.upperBodyOnly) {
      let stride = walkAmp > 0 ? Math.sin(walkPhase) * (isRun ? 34 : 22) * s * walkAmp : 0;
      let liftL = walkAmp > 0 ? Math.max(0, Math.cos(walkPhase)) * (isRun ? -22 : -11) * s * walkAmp : 0;
      let liftR = walkAmp > 0 ? Math.max(0, -Math.cos(walkPhase)) * (isRun ? -22 : -11) * s * walkAmp : 0;

      if (preset === 'fight' || preset === 'swordFight' || preset === 'push' || preset === 'pull') {
        stride = 22 * s;
      } else if (preset === 'climb') {
        liftL = Math.sin(time * 5) * 18 * s;
        liftR = -Math.sin(time * 5) * 18 * s;
      }

      const isBarefootOrSandal =
        wardrobe === 'ancientTamil' || wardrobe === 'indianIndependence' || wardrobe === 'prehistoric' || wardrobe === 'roman';

      [
        { hx: -16 * s, fx: -16 * s - stride, fy: liftL },
        { hx: 16 * s, fx: 16 * s + stride, fy: liftR },
      ].forEach((lg) => {
        const kneeX = lerp(lg.hx, lg.fx, 0.5) + (isRun || isCrouch || lg.fy < -4 * s ? 10 * s : 0);
        const kneeY = lerp(hipY, lg.fy - 8 * s, 0.5);
        seg(g, [[lg.hx, hipY], [kneeX, kneeY], [lg.fx, lg.fy - 8 * s]], legW, botCol);

        if (wardrobe === 'ancientTamil' || wardrobe === 'indianClassical') {
          // Gold Kasavu border on Veshti/Dhoti ankle hem
          seg(g, [[lg.fx - 9 * s, lg.fy - 16 * s], [lg.fx + 9 * s, lg.fy - 16 * s]], 4 * s, '#FFD54F');
        }

        // Footwear
        rr(g, lg.fx - 13 * s, lg.fy - 12 * s, 28 * s, 12 * s, 6 * s);
        g.fillStyle = isBarefootOrSandal ? skinCol : wardrobe === 'victorian' || wardrobe === '1900s' ? '#1E1B18' : '#F5F7FA';
        g.fill();
        if (isBarefootOrSandal) {
          g.fillStyle = '#8C5832';
          g.fillRect(lg.fx - 12 * s, lg.fy - 3 * s, 26 * s, 3 * s);
        } else {
          g.fillStyle = '#E53935';
          g.fillRect(lg.fx - 12 * s, lg.fy - 3 * s, 26 * s, 3 * s);
        }
      });
    }

    // 4. Cylindrical Shaded Torso & Universal Era Wardrobe Details
    g.save();
    rr(g, -shW / 2, shoulderY, shW, torsoH, 24 * s);
    const torsoBaseCol = wardrobe === 'ancientTamil' && !o.topColor ? skinCol : topCol;
    g.fillStyle = cylinderGrad(g, -shW / 2, shoulderY, shW / 2, hipY, torsoBaseCol, -1);
    g.fill();
    g.clip();

    if (wardrobe === 'ancientTamil' || wardrobe === 'indianClassical') {
      // Diagonal Angavastram / Uttariya Silk Shoulder Drape with Gold Kasavu Border
      const drapeCol = o.topColor || '#F7B928';
      poly(g, [[-shW * 0.52, shoulderY], [-shW * 0.08, shoulderY], [shW * 0.52, hipY - 12 * s], [shW * 0.12, hipY]], drapeCol);
      seg(g, [[-shW * 0.08, shoulderY], [shW * 0.52, hipY - 12 * s]], 5 * s, '#FFD54F');
      // Gold Waistband (Oddiyanam)
      g.fillStyle = '#FFD54F';
      g.fillRect(-shW / 2, hipY - 14 * s, shW, 10 * s);
    } else if (wardrobe === 'indianIndependence' || wardrobe === 'khadi') {
      // Khadi Kurta Placket + Optional Nehru Vest
      seg(g, [[0, shoulderY + 6 * s], [0, shoulderY + 46 * s]], 3 * s, '#CBD5E1');
      if (o.topColor && o.topColor !== '#F4F6FA') {
        g.fillStyle = shade(topCol, -0.15);
        g.fillRect(-shW / 2, shoulderY, shW * 0.34, torsoH);
        g.fillRect(shW * 0.16, shoulderY, shW * 0.34, torsoH);
      }
    } else if (wardrobe === 'ancientJapan' || wardrobe === 'samurai' || wardrobe === 'ancientChina' || wardrobe === 'hanfu') {
      // Crossed Y-Collar Kimono / Hanfu + Wide Obi Sash
      seg(g, [[-22 * s, shoulderY], [12 * s, hipY - 22 * s]], 6 * s, '#F4EFE6');
      seg(g, [[22 * s, shoulderY], [-6 * s, shoulderY + 48 * s]], 6 * s, '#F4EFE6');
      g.fillStyle = wardrobe === 'samurai' ? '#9E2A2B' : '#FFD54F';
      g.fillRect(-shW / 2, hipY - 28 * s, shW, 18 * s);
    } else if (wardrobe === 'victorian' || wardrobe === '1900s') {
      // Frock Coat Lapels, Waistcoat & Cravat
      poly(g, [[-18 * s, shoulderY], [18 * s, shoulderY], [0, shoulderY + 52 * s]], '#F4F6FA');
      poly(g, [[-4 * s, shoulderY + 8 * s], [4 * s, shoulderY + 8 * s], [6 * s, shoulderY + 38 * s], [-6 * s, shoulderY + 38 * s]], '#9E2A2B');
      seg(g, [[-20 * s, shoulderY], [-6 * s, shoulderY + 55 * s]], 5 * s, shade(topCol, -0.25));
      seg(g, [[20 * s, shoulderY], [6 * s, shoulderY + 55 * s]], 5 * s, shade(topCol, -0.25));
    } else if (wardrobe === 'roman' || wardrobe === 'medieval') {
      poly(g, [[-shW * 0.5, shoulderY], [shW * 0.2, shoulderY], [shW * 0.5, hipY], [-shW * 0.2, hipY]], '#E53935');
      g.fillStyle = '#B87333';
      g.fillRect(-shW / 2, hipY - 16 * s, shW, 12 * s);
    } else if (wardrobe === 'scientist' || wardrobe === 'labCoat') {
      // Open White Lab Coat over Colored Shirt & Tie
      g.fillStyle = '#2E6BE6';
      g.fillRect(-14 * s, shoulderY, 28 * s, torsoH);
      seg(g, [[0, shoulderY + 10 * s], [0, hipY - 18 * s]], 6 * s, '#E53935');
      seg(g, [[-14 * s, shoulderY], [-14 * s, hipY]], 3 * s, '#CBD5E1');
      seg(g, [[14 * s, shoulderY], [14 * s, hipY]], 3 * s, '#CBD5E1');
    } else if (wardrobe === 'astronaut' || wardrobe === 'spacesuit') {
      rr(g, -22 * s, shoulderY + 22 * s, 44 * s, 36 * s, 6 * s);
      g.fillStyle = '#1E293B';
      g.fill();
      circle(g, -10 * s, shoulderY + 40 * s, 5 * s, '#E53935');
      circle(g, 10 * s, shoulderY + 40 * s, 5 * s, '#38C878');
    } else if (wardrobe === 'prehistoric' || wardrobe === 'tribal') {
      poly(g, [[-shW * 0.48, shoulderY], [shW * 0.15, shoulderY + 15 * s], [shW * 0.48, hipY], [-shW * 0.48, hipY]], '#8C5832');
    } else if (wardrobe === 'shirtTie' || wardrobe === 'pilotUniform') {
      const tieCol = o.tieColor || (wardrobe === 'pilotUniform' ? '#1A1E2E' : '#E53935');
      poly(g, [[-4 * s, shoulderY + 10 * s], [4 * s, shoulderY + 10 * s], [7 * s, hipY - 14 * s], [0, hipY - 4 * s], [-7 * s, hipY - 14 * s]], tieCol);
      poly(g, [[-18 * s, shoulderY], [0, shoulderY + 14 * s], [-10 * s, shoulderY + 22 * s]], shade(topCol, 0.12));
      poly(g, [[18 * s, shoulderY], [0, shoulderY + 14 * s], [10 * s, shoulderY + 22 * s]], shade(topCol, 0.12));
      if (wardrobe === 'pilotUniform') {
        rr(g, -shW * 0.48, shoulderY + 2 * s, 20 * s, 8 * s, 2 * s);
        rr(g, shW * 0.48 - 20 * s, shoulderY + 2 * s, 20 * s, 8 * s, 2 * s);
        g.fillStyle = '#1E2749';
        g.fill();
        seg(g, [[-shW * 0.38, shoulderY + 2 * s], [-shW * 0.38, shoulderY + 10 * s]], 2.5 * s, '#F5B942');
        seg(g, [[shW * 0.38, shoulderY + 2 * s], [shW * 0.38, shoulderY + 10 * s]], 2.5 * s, '#F5B942');
      }
    } else if (wardrobe === 'pajamas') {
      g.strokeStyle = shade(topCol, -0.18);
      g.lineWidth = 4 * s;
      for (let sx = -shW * 0.4; sx <= shW * 0.4; sx += 14 * s) {
        g.beginPath();
        g.moveTo(sx, shoulderY);
        g.lineTo(sx, hipY);
        g.stroke();
      }
    } else {
      circle(g, headX, shoulderY + 2 * s, 22 * s, shade(topCol, 0.18));
      g.fillStyle = shade(topCol, -0.14);
      g.fillRect(-shW / 2, hipY - 12 * s, shW, 12 * s);
    }

    if (o.seatbelt) {
      g.fillStyle = '#254282';
      g.fillRect(-shW * 0.52, hipY - 24 * s, shW * 1.04, 14 * s);
      rr(g, -14 * s, hipY - 26 * s, 28 * s, 18 * s, 4 * s);
      g.fillStyle = '#CBD5E8';
      g.fill();
    }
    g.restore();

    if (o.neckPillow) {
      ellipse(g, headX, shoulderY + 8 * s, 48 * s, 22 * s, cylinderGrad(g, -48 * s, shoulderY, 48 * s, shoulderY + 24 * s, '#1B8C98', -1));
    }

    // 5. Shaded Neck Cylinder & Chin Drop Shadow
    rr(g, headX - 13 * s, shoulderY - 18 * s, 26 * s, 26 * s, 8 * s);
    g.fillStyle = skinCol;
    g.fill();
    ellipse(g, headX, shoulderY - 12 * s, 14 * s, 7 * s, shade(skinCol, -0.25));

    // 6. Full-Body Kinematic Arm & Hand Choreography + Props
    const swing = walkAmp > 0 ? Math.sin(walkPhase) * (isRun ? 32 : 18) * s * walkAmp : 0;
    let lHand = p.leftHand || [-shW * 0.58 + swing, hipY - (isRun ? 36 : 6) * s];
    let rHand = p.rightHand || [shW * 0.58 - swing, hipY - (isRun ? 36 : 6) * s];
    let propName = o.prop || p.prop || 'none';
    let rPropRot = 0;

    if (preset === 'build' || preset === 'hammer' || preset === 'wrench') {
      const strike = Math.sin(time * 8.5 + seed);
      lHand = [shW * 0.38, shoulderY + 34 * s];
      rHand = [shW * 0.78, shoulderY - 18 * s + strike * 34 * s];
      rPropRot = 0.45 + strike * 0.55;
      if (propName === 'none') propName = 'hammer';
    } else if (preset === 'fight' || preset === 'punch') {
      const jab = Math.max(0, Math.sin(time * 10 + seed));
      const cross = Math.max(0, -Math.sin(time * 10 + seed));
      lHand = [shW * (0.45 + jab * 0.72), shoulderY + 14 * s];
      rHand = [shW * (0.35 + cross * 0.82), shoulderY + 22 * s];
    } else if (preset === 'swordFight' || preset === 'slash') {
      const slash = Math.sin(time * 7.5 + seed);
      lHand = [-shW * 0.45, shoulderY + 24 * s];
      rHand = [shW * 0.85, shoulderY - 10 * s + slash * 38 * s];
      rPropRot = 0.5 + slash * 0.65;
      if (propName === 'none') propName = wardrobe === 'samurai' || wardrobe === 'ancientJapan' ? 'katana' : wardrobe === 'ancientTamil' ? 'vel' : 'sword';
    } else if (preset === 'push' || preset === 'pull') {
      const dir = preset === 'push' ? 1 : 0.75;
      lHand = [shW * 0.78 * dir, shoulderY + 18 * s];
      rHand = [shW * 0.92 * dir, shoulderY + 26 * s];
    } else if (preset === 'climb') {
      const cl = Math.sin(time * 5.5 + seed) * 28 * s;
      lHand = [-shW * 0.35, shoulderY - 38 * s + cl];
      rHand = [shW * 0.35, shoulderY - 38 * s - cl];
    } else if (preset === 'write' || preset === 'scholar') {
      lHand = [-shW * 0.15, shoulderY + 42 * s];
      rHand = [shW * 0.25 + Math.sin(time * 12) * 8 * s, shoulderY + 36 * s];
      if (propName === 'none') propName = wardrobe === 'ancientTamil' ? 'palmLeaf' : 'scroll';
    } else if (preset === 'experiment') {
      lHand = [-shW * 0.25, shoulderY + 34 * s];
      rHand = [shW * 0.58, shoulderY + 16 * s + Math.sin(time * 5) * 8 * s];
      if (propName === 'none') propName = 'beaker';
    } else if (preset === 'trade') {
      lHand = [-shW * 0.45, hipY - 12 * s];
      rHand = [shW * 0.82, shoulderY + 24 * s + Math.sin(time * 4) * 6 * s];
      if (propName === 'none') propName = 'coinBag';
    } else if (preset === 'holdBaby' || preset === 'carry' || propName === 'baby') {
      const rock = Math.sin(time * 2.4 + seed) * 5 * s;
      lHand = [-14 * s + rock, shoulderY + 48 * s];
      rHand = [24 * s + rock, shoulderY + 50 * s];
      propName = 'baby';
    } else if (preset === 'think' || preset === 'ponder') {
      lHand = [8 * s, shoulderY + 46 * s];
      rHand = [14 * s, headY + R * 0.65];
    } else if (preset === 'admire' || preset === 'overview') {
      lHand = [-shW * 0.52, hipY - 18 * s];
      rHand = [shW * 0.52, hipY - 18 * s];
    } else if (preset === 'wave' || p.wave) {
      rHand = [shW * 0.85, shoulderY - 28 * s + Math.sin(time * 6) * 10 * s];
    } else if (preset === 'celebrate' || preset === 'jump') {
      lHand = [-shW * 0.75, shoulderY - 55 * s];
      rHand = [shW * 0.75, shoulderY - 55 * s];
    } else if (p.reach) {
      rHand = [p.reach[0] * s, p.reach[1] * s];
    } else if (p.thumbsUp) {
      rHand = [shW * 0.85, shoulderY + 12 * s];
    }

    const sleeveCol = wardrobe === 'ancientTamil' && !o.topColor ? skinCol : topCol;
    [
      { sx: -shW * 0.46, sy: shoulderY + 16 * s, hx: lHand[0], hy: lHand[1], side: -1, isThumb: false },
      { sx: shW * 0.46, sy: shoulderY + 16 * s, hx: rHand[0], hy: rHand[1], side: 1, isThumb: !!p.thumbsUp },
    ].forEach((a) => {
      const ex = lerp(a.sx, a.hx, 0.5) + a.side * (isRun ? -12 : 8) * s;
      const ey = lerp(a.sy, a.hy, 0.52) + (isRun ? 14 : 4) * s;
      seg(g, [[a.sx, a.sy], [ex, ey], [a.hx, a.hy]], armW, shade(sleeveCol, a.side * -0.05));
      if (wardrobe === 'ancientTamil' || wardrobe === 'indianClassical') {
        // Gold Armlet (Vanki)
        seg(g, [[lerp(a.sx, ex, 0.55) - 8 * s, lerp(a.sy, ey, 0.55)], [lerp(a.sx, ex, 0.55) + 8 * s, lerp(a.sy, ey, 0.55)]], 4.5 * s, '#FFD54F');
      }
      circle(g, a.hx, a.hy, 11 * s, sphereGrad(g, a.hx, a.hy, 11 * s, skinCol));
      if (a.isThumb) {
        rr(g, a.hx - 4 * s, a.hy - 22 * s, 8 * s, 14 * s, 4 * s);
        g.fillStyle = skinCol;
        g.fill();
      }
    });

    // Render Cradled Swaddled Baby (when preset === 'holdBaby' or prop === 'baby')
    if (propName === 'baby') {
      const bx = 6 * s + Math.sin(time * 2.4 + seed) * 5 * s;
      const by = shoulderY + 42 * s;
      g.save();
      g.translate(bx, by);
      g.rotate(-0.18 + Math.sin(time * 2.4) * 0.04);
      ellipse(g, 0, 0, 34 * s, 18 * s, sphereGrad(g, 0, 0, 34 * s, '#FFF3D6'));
      circle(g, -18 * s, -4 * s, 13 * s, sphereGrad(g, -18 * s, -4 * s, 13 * s, skinCol));
      // Peaceful sleeping baby eyes
      seg(g, [[-23 * s, -5 * s], [-19 * s, -5 * s]], 1.8 * s, '#2B1D1A');
      seg(g, [[-16 * s, -5 * s], [-12 * s, -5 * s]], 1.8 * s, '#2B1D1A');
      g.restore();
    } else if (propName !== 'none') {
      g.save();
      g.translate(rHand[0], rHand[1]);
      g.rotate(rPropRot);
      drawHeldProp(g, 0, 0, s, propName, time);
      g.restore();
      if (preset === 'write') {
        drawHeldProp(g, lHand[0], lHand[1], s, 'palmLeaf', time);
        drawHeldProp(g, rHand[0], rHand[1], s, 'quill', time);
      } else if (preset === 'swordFight' && o.shield) {
        drawHeldProp(g, lHand[0], lHand[1], s, 'shield', time);
      }
    }

    // 7. 3D Spherical Shaded Human Head & Ears
    [-1, 1].forEach((side) => {
      circle(g, headX + side * R * 0.96, headY + R * 0.04, R * 0.2, sphereGrad(g, headX + side * R * 0.96, headY, R * 0.2, skinCol));
      circle(g, headX + side * R * 0.94, headY + R * 0.04, R * 0.1, shade(skinCol, -0.2));
      if (wardrobe === 'ancientTamil' || wardrobe === 'indianClassical') {
        circle(g, headX + side * R * 0.95, headY + R * 0.22, R * 0.08, '#FFD54F');
      }
    });

    circle(g, headX, headY, R, sphereGrad(g, headX, headY, R, skinCol, lDir, 0.16));
    ellipse(g, headX + (o.look ? o.look[0] * R * 0.25 : 0), headY + R * 0.12, R * 0.06, R * 0.045, shade(skinCol, -0.15));

    // 8. Expressive Eyes, Independent Pill Eyebrows, Forehead Marks & Glasses
    drawLuminaEyes(g, headX, headY, R, {
      eyeMode,
      sclera: o.sclera,
      pupilSize,
      look: o.look || o.lookDir || [0, 0],
      brows,
      hairColor: hairCol,
      skinColor: skinCol,
      glasses: o.glasses,
      foreheadMark: o.foreheadMark || (wardrobe === 'ancientTamil' ? 'vibhuti' : null),
      blink: o.blink,
      t: time,
      seed,
    });

    // 9. Expressive 2D Mouth
    drawLuminaMouth(g, headX, headY, R, {
      mouth,
      look: o.look || o.lookDir || [0, 0],
      mustache: o.mustache,
      beard: o.beard,
      hairColor: hairCol,
      t: time,
    });

    // 10. Front Sculpted / Windswept Hair Silhouette
    drawHairFront(g, headX, headY, R, hairStyle, hairCol, o.hairWind || (isRun ? 0.55 : 0), time);

    // 11. Universal Era Headwear, Headset & Oxygen Mask
    const headwear = o.headwear || (o.pilotCap ? 'pilotCap' : wardrobe === 'astronaut' ? 'spaceHelmet' : 'none');
    drawHeadwear(g, headX, headY, R, headwear, o.topColor);

    if (o.headset) {
      seg(g, [[headX - R * 1.02, headY], [headX, headY - R * 1.08], [headX + R * 1.02, headY]], 5 * s, '#232736');
      ellipse(g, headX - R * 1.04, headY + R * 0.02, R * 0.16, R * 0.26, '#1A1D29');
      ellipse(g, headX + R * 1.04, headY + R * 0.02, R * 0.16, R * 0.26, '#1A1D29');
      seg(g, [[headX - R * 1.0, headY + R * 0.12], [headX - R * 0.2, headY + R * 0.42]], 3.5 * s, '#1A1D29');
      circle(g, headX - R * 0.18, headY + R * 0.42, 6 * s, '#1A1D29');
    }
    if (o.oxygenMask && o.oxygenMask !== 'none') {
      drawOxygenMask(g, headX, headY, R, o.oxygenMask, time);
    }

    g.restore();
  }

  // ---------- 8. 5-Finger Articulated Close-Up Hand Rig (DK.hand) ----------
  function drawArticulatedHand(g, o = {}) {
    const {
      x = 960,
      y = 640,
      s = 1,
      skin = PALETTE.skinPeach,
      sleeveColor = PALETTE.orange,
      pose = 'point',
      rot = -0.35,
    } = o;

    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(s, s);

    rr(g, -34, 45, 68, 320, 14);
    g.fillStyle = cylinderGrad(g, -34, 45, 34, 45, sleeveColor, -1);
    g.fill();
    rr(g, -36, 40, 72, 16, 6);
    g.fillStyle = shade(sleeveColor, 0.15);
    g.fill();

    rr(g, -32, -28, 64, 74, 22);
    g.fillStyle = sphereGrad(g, 0, 10, 45, skin);
    g.fill();

    if (pose === 'point') {
      rr(g, -26, -86, 18, 68, 9);
      g.fillStyle = skin;
      g.fill();
      for (let i = 0; i < 3; i++) {
        rr(g, -6 + i * 14, -36, 14, 32, 7);
        g.fillStyle = shade(skin, -0.05 * (i + 1));
        g.fill();
      }
      rr(g, -44, -18, 22, 34, 10);
      g.fillStyle = shade(skin, 0.06);
      g.fill();
    } else if (pose === 'thumbsUp') {
      rr(g, -36, -68, 20, 48, 10);
      g.fillStyle = skin;
      g.fill();
      for (let i = 0; i < 4; i++) {
        rr(g, -14, -22 + i * 13, 38, 12, 6);
        g.fillStyle = shade(skin, -0.06);
        g.fill();
      }
    } else {
      for (let i = 0; i < 4; i++) {
        rr(g, -28 + i * 15, -42, 14, 34, 7);
        g.fillStyle = shade(skin, -0.04 * i);
        g.fill();
      }
      rr(g, -44, -16, 24, 36, 10);
      g.fillStyle = shade(skin, 0.05);
      g.fill();
    }

    g.restore();
  }

  // ---------- 9. Tier 3 Crowd Generator (With Era Wardrobe & Locomotion Support) ----------
  function drawCutoutCrowd(g, o = {}) {
    const {
      count = 6,
      x0 = 240,
      x1 = 1680,
      y = 840,
      s = 0.9,
      seed = 11,
      t = 0,
      behavior = 'walk',
      wardrobe = 'sweater',
      moveOffset = 0,
    } = o;
    const r = rng(seed);
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0.5 : i / (count - 1);
      const cx = lerp(x0, x1, u) + (r() - 0.5) * 40 * s + moveOffset;
      const cy = y + (r() - 0.5) * 14 * s;
      const pal = TIER3_PALETTE[i % TIER3_PALETTE.length];
      drawCutoutChar(g, {
        x: cx,
        y: cy,
        s: s * (0.9 + r() * 0.18),
        skin: pal.skin,
        hairColor: pal.hair,
        wardrobe,
        topColor: pal.top,
        bottomColor: pal.bottom,
        pose: { preset: behavior, walk: behavior === 'walk' || behavior === 'march' ? 0.85 : 0 },
        t,
        seed: seed + i * 19,
      });
    }
  }

  // ---------- 10. Universal Fauna: Dinosaurs, Elephants, Horses, Bulls, Pets & Cells (DK.animal) ----------
  function drawCutoutAnimal(g, o = {}) {
    const {
      kind = 'dog', // 'dinosaur' | 'trex' | 'elephant' | 'horse' | 'bull' | 'dog' | 'cat' | 'pigeon' | 'sparrow' | 'goat' | 'redBloodCell'
      s = 1,
      expr = 'neutral',
      o2Count = 3,
      t = 0,
    } = o;

    const loco = resolveLocomotion(o);
    const x = loco.px;
    const y = loco.py;
    const flipX = o.flipX !== undefined ? o.flipX : loco.flipX;

    g.save();
    g.translate(x, y);
    if (flipX) g.scale(-1, 1);
    g.scale(s, s);

    if (kind === 'redBloodCell') {
      const bob = Math.sin(t * 3.5 + (o.seed || 1)) * 6;
      g.translate(0, bob);
      circle(g, 0, 0, 56, sphereGrad(g, 0, 0, 56, '#F24455', [-0.5, -0.7], 0.2));
      ellipse(g, 0, 0, 34, 28, 'rgba(168, 24, 42, 0.38)');
      circle(g, -16, -4, 5.5, '#2A0E14');
      circle(g, 16, -4, 5.5, '#2A0E14');
      circle(g, -18, -6, 2, '#FFFFFF');
      circle(g, 14, -6, 2, '#FFFFFF');
      g.strokeStyle = '#2A0E14';
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(0, 2, 10, Math.PI * 0.15, Math.PI * 0.85, false);
      g.stroke();

      for (let i = 0; i < o2Count; i++) {
        const ang = -Math.PI * 0.75 + i * 0.45;
        const ox = Math.cos(ang) * 54;
        const oy = Math.sin(ang) * 54;
        circle(g, ox - 5, oy, 7.5, sphereGrad(g, ox - 5, oy, 7.5, '#68D2FF'));
        circle(g, ox + 5, oy, 7.5, sphereGrad(g, ox + 5, oy, 7.5, '#68D2FF'));
      }
      g.restore();
      return;
    }

    if (kind === 'elephant') {
      // 3D-Shaded Royal/Wild Elephant with Trunk, Tusks & Walking Stride
      contactShadow(g, 0, 6, 130, 18, 0.35);
      const stride = Math.sin(t * 4.2) * 14;
      [[-65, -75, stride], [-28, -75, -stride], [38, -75, stride], [72, -75, -stride]].forEach(([lx, ly, st]) => {
        seg(g, [[lx, ly], [lx + st, 0]], 28, '#6E7582');
      });
      ellipse(g, 8, -115, 105, 72, sphereGrad(g, 8, -115, 105, '#7C8494'));
      // Decorative Gold & Crimson Temple/Royal Caparison Cloth
      if (o.royal !== false) {
        rr(g, -45, -168, 105, 78, 16);
        g.fillStyle = '#C92A2A';
        g.fill();
        g.strokeStyle = '#FFD54F';
        g.lineWidth = 5;
        g.stroke();
      }
      // Head, Flapping Ear, Trunk & Ivory Tusks
      circle(g, -88, -142, 48, sphereGrad(g, -88, -142, 48, '#7C8494'));
      ellipse(g, -55, -142, 32, 44, '#646C7A', 0.15);
      const trunkSway = Math.sin(t * 3) * 12;
      seg(g, [[-126, -132], [-142 + trunkSway * 0.5, -75], [-124 + trunkSway, -38]], 20, '#7C8494');
      seg(g, [[-112, -115], [-152, -98]], 8, '#FFF8E7');
      circle(g, -104, -152, 6, '#1A1818');
      circle(g, -106, -154, 2, '#FFFFFF');
      g.restore();
      return;
    }

    if (kind === 'horse' || kind === 'bull') {
      const isBull = kind === 'bull';
      const bodyCol = isBull ? '#D9C8B2' : '#8C5230';
      contactShadow(g, 0, 5, 85, 12, 0.32);
      const gallop = Math.sin(t * 8.5) * 22;
      [[-48, -55, gallop], [-22, -55, -gallop], [32, -55, -gallop], [54, -55, gallop]].forEach(([lx, ly, st]) => {
        seg(g, [[lx, ly], [lx + st, 0]], 12, shade(bodyCol, -0.15));
      });
      ellipse(g, 0, -78, 68, 36, sphereGrad(g, 0, -78, 68, bodyCol));
      if (isBull) {
        // Kangayam / Zebu Humped Bull + Curved Horns
        circle(g, -28, -112, 24, sphereGrad(g, -28, -112, 24, bodyCol));
        circle(g, -68, -98, 24, sphereGrad(g, -68, -98, 24, bodyCol));
        seg(g, [[-65, -115], [-78, -148], [-55, -162]], 7, '#4A3F35');
      } else {
        // Horse Neck, Mane & Head
        seg(g, [[-48, -88], [-74, -138]], 26, bodyCol);
        ellipse(g, -86, -142, 26, 15, bodyCol, -0.35);
      }
      circle(g, -78, -142 + (isBull ? 42 : 0), 5, '#1A1818');
      g.restore();
      return;
    }

    if (kind === 'dinosaur' || kind === 'trex' || kind === 'sauropod') {
      // Prehistoric / Jurassic Dinosaur (T-Rex / Sauropod)
      const dinoCol = o.color || '#4E7A52';
      contactShadow(g, 0, 6, 110, 16, 0.34);
      const step = Math.sin(t * 5.5) * 18;
      seg(g, [[-25, -75], [-25 + step, 0]], 26, shade(dinoCol, -0.15));
      seg(g, [[25, -75], [25 - step, 0]], 26, '#4E7A52');
      // Tail & Body
      poly(g, [[20, -105], [145, -75 + Math.sin(t * 4) * 10], [20, -55]], dinoCol);
      ellipse(g, -10, -98, 68, 46, sphereGrad(g, -10, -98, 68, dinoCol));
      // Tiny T-Rex Arms & Massive Jaw Head
      seg(g, [[-58, -95], [-82, -82]], 9, dinoCol);
      rr(g, -125, -175, 72, 48, 16);
      g.fillStyle = sphereGrad(g, -90, -150, 50, dinoCol);
      g.fill();
      // Sharp white teeth
      for (let k = 0; k < 5; k++) {
        poly(g, [[-120 + k * 10, -128], [-115 + k * 10, -118], [-110 + k * 10, -128]], '#FFFFFF');
      }
      circle(g, -78, -158, 6.5, '#FFD54F');
      circle(g, -79, -158, 3, '#1A1818');
      g.restore();
      return;
    }

    if (kind === 'dog') {
      contactShadow(g, 0, 4, 52, 9, 0.3);
      const wag = Math.sin(t * 8) * 8;
      const step = loco.isMovingX ? Math.sin(t * 8) * 10 : 0;
      seg(g, [[34, -28], [56, -42 + wag]], 11, '#E8D5B5');
      rr(g, -34, -56, 72, 46, 22);
      g.fillStyle = cylinderGrad(g, -34, -56, 38, -10, '#E8D5B5', -1);
      g.fill();
      circle(g, 8, -36, 16, '#C49A6C');
      [[-24, -14, step], [-8, -14, -step], [18, -14, step], [30, -14, -step]].forEach(([lx, ly, st]) => {
        seg(g, [[lx, ly], [lx + st, 0]], 11, '#E8D5B5');
      });
      seg(g, [[-26, -52], [-10, -28]], 7, '#E53935');
      circle(g, -20, -36, 4.5, '#FFD54F');
      circle(g, -28, -64, 24, sphereGrad(g, -28, -64, 24, '#E8D5B5'));
      rr(g, -54, -64, 26, 18, 8);
      g.fillStyle = '#F5E8D0';
      g.fill();
      circle(g, -52, -58, 5, '#1E1816');
      circle(g, -34, -68, 5.5, '#1E1816');
      circle(g, -36, -70, 2, '#FFFFFF');
      ellipse(g, -16, -60, 10, 20, '#A6784E', 0.25);
    } else if (kind === 'pigeon' || kind === 'sparrow') {
      const isSparrow = kind === 'sparrow';
      const bodyCol = isSparrow ? '#A67B5B' : '#8A96A8';
      const wingCol = isSparrow ? '#785238' : '#5E687A';
      contactShadow(g, 0, 3, 24, 5, 0.25);
      seg(g, [[-6, -12], [-8, 0]], 3, '#E8833A');
      seg(g, [[6, -12], [6, 0]], 3, '#E8833A');
      ellipse(g, 0, -24, 26, 18, sphereGrad(g, 0, -24, 26, bodyCol));
      ellipse(g, 4, -24, 16, 10, wingCol, -0.15);
      circle(g, -18, -42, 14, sphereGrad(g, -18, -42, 14, isSparrow ? '#B89882' : '#687488'));
      if (isSparrow) {
        seg(g, [[-24, -52], [-8, -48]], 4, '#1A1818');
        seg(g, [[-22, -55], [-10, -52]], 3, '#FFFFFF');
      }
      poly(g, [[-30, -44], [-40, -40], [-30, -37]], '#F5A623');
      circle(g, -22, -44, 4, '#1A1818');
      circle(g, -23, -45, 1.5, '#FFFFFF');
      if (expr === 'singing') {
        for (let i = 0; i < 3; i++) {
          const nx = -48 - i * 24 - ((t * 30) % 20);
          const ny = -55 - i * 14 + Math.sin(t * 5 + i) * 5;
          text(g, '♪', nx, ny, { size: 24, color: '#FF9E3D', weight: 900 });
        }
      }
    } else if (kind === 'goat') {
      contactShadow(g, 0, 4, 48, 8, 0.28);
      [[-24, -22], [-10, -22], [16, -22], [28, -22]].forEach(([lx, ly], idx) => {
        const step = Math.sin(t * 5 + idx) * 6;
        seg(g, [[lx, ly], [lx + step, 0]], 7, '#E8E4DC');
      });
      ellipse(g, 0, -38, 38, 22, sphereGrad(g, 0, -38, 38, '#F5F2EB'));
      circle(g, -34, -56, 16, '#F5F2EB');
      seg(g, [[-32, -68], [-18, -86], [-6, -80]], 4.5, '#C4B69C');
      poly(g, [[-42, -44], [-36, -44], [-40, -30]], '#D8D2C5');
      circle(g, -38, -58, 3, '#1E1B18');
    } else if (kind === 'cat') {
      rr(g, -24, -56, 48, 56, 22);
      g.fillStyle = sphereGrad(g, 0, -28, 36, '#E88A38');
      g.fill();
      circle(g, 0, -66, 22, sphereGrad(g, 0, -66, 22, '#E88A38'));
      poly(g, [[-20, -76], [-24, -96], [-6, -82]], '#E88A38');
      poly(g, [[6, -82], [24, -96], [20, -76]], '#E88A38');
      circle(g, -8, -68, 4.5, '#2E5E2A');
      circle(g, 8, -68, 4.5, '#2E5E2A');
    }

    g.restore();
  }

  // ---------- 11. Export to Global Namespace (window.CUTOUT & window.DK) ----------
  const CUTOUT = (window.CUTOUT = {
    PALETTE,
    TIER3_PALETTE,
    drawCutoutChar,
    drawLuminaEyes,
    drawLuminaMouth,
    drawArticulatedHand,
    drawCutoutCrowd,
    drawCutoutAnimal,
  });

  DK.PALETTE = H.PALETTE = PALETTE;
  DK.TIER3_PALETTE = H.TIER3_PALETTE = TIER3_PALETTE;
  DK.cutout = CUTOUT;
  DK.char = H.char = (g, opts) => drawCutoutChar(g, opts);
  DK.drawCutoutChar = H.drawCutoutChar = drawCutoutChar;
  DK.eyes = H.eyes = drawLuminaEyes;
  DK.hand = H.hand = drawArticulatedHand;
  DK.crowd = H.crowd = drawCutoutCrowd;
  DK.animal = H.animal = drawCutoutAnimal;
})();


// ============================================================================
// MODULE 3: LUMINA_UI (lib/lumina_ui.js) — Universal Era/Solar/Lunar Horizon
// Dials, Radial Survival Timers, Anatomical & Mechanical X-Ray Cutaways,
// Physics/Chemistry Atomic Cutaways, Economics Balance Scales, Isometric
// Exploded Windows, Ghost Physics Doubles, Smartphone Screens, Diegetic Pill
// Badges & Academic Citations (1920x1080 16:9 Stage). Deterministic fn(t).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const {
    E,
    clamp,
    lerp,
    prog,
    ease,
    rng,
    alpha,
    mix,
    shade,
    rr,
    circle,
    ellipse,
    ring,
    poly,
    seg,
    linGrad,
    radGrad,
    sphereGrad,
    cylinderGrad,
    glow,
    text,
    measure,
    FONTS,
  } = DK;

  // ---------- 1. Global UI & X-Ray Science Cutaway Style Tokens ----------
  const UI_TOKENS = {
    voidTop: '#070D1F',
    voidMid: '#0F1E42',
    voidBot: '#182F63',
    gridLine: 'rgba(130, 175, 245, 0.10)',
    pillBg: '#141829',
    pillBorder: '#F5B041',
    pillText: '#FFFFFF',
    pillSubText: '#FFD47E',
    timerBg: '#121329',
    timerRing: '#2A2E54',
    timerNeon: '#FF4D6A',
    xrayCyan: '#68E0FF',
    citationColor: '#8A99B5',
    chartPrimary: '#FF9E3D',
    chartSecondary: '#6C7D99',
  };

  // ---------- 2. Universal Era / 24-Hour Solar/Lunar Horizon Chapter Dial ----------
  function horizonChapterDial(g, t = 0, o = {}) {
    const {
      t0 = 0,
      hourText = 'HOUR 1 · 8:00 AM',
      titleText = 'AUTOPILOT',
      subText = '',
      progress = 0.08,
      isNight = false,
      portholeStyle = 'city', // 'city' | 'ancientTemple' | 'prehistoricVolcano' | 'eastAsian' | 'cosmic'
      dialX = 500,
      dialY = 540,
      dialR = 215,
    } = o;

    const bgCols = isNight
      ? ['#1c1132', '#2a1848', '#150d28']
      : progress > 0.35
      ? ['#362428', '#4a3235', '#24181c']
      : ['#1b2a47', '#263b61', '#142038'];
    g.fillStyle = linGrad(g, 0, 0, E.W, E.H, bgCols);
    g.fillRect(0, 0, E.W, E.H);

    g.save();

    // Left Circular Porthole with Era-Adaptive Horizon & Water Reflection
    g.save();
    g.beginPath();
    g.arc(dialX, dialY, dialR, 0, Math.PI * 2);
    g.clip();

    const skyCols =
      portholeStyle === 'prehistoricVolcano'
        ? ['#240808', '#6e1c14', '#e86820']
        : portholeStyle === 'ancientTemple'
        ? ['#4a2440', '#a84a42', '#f7c268']
        : isNight || portholeStyle === 'cosmic'
        ? ['#0e0b24', '#261c4a', '#48326b']
        : progress > 0.35
        ? ['#4a2c40', '#9e584e', '#f5b878']
        : ['#5882b8', '#98bee6', '#f5dec2'];
    g.fillStyle = linGrad(g, dialX, dialY - dialR, dialX, dialY + 25, skyCols);
    g.fillRect(dialX - dialR, dialY - dialR, dialR * 2, dialR * 1.2);

    const horizonY = dialY + 22;
    const sr = rng(73);

    if (portholeStyle === 'prehistoricVolcano') {
      poly(g, [[dialX - 160, horizonY], [dialX - 35, horizonY - 125], [dialX + 35, horizonY - 125], [dialX + 160, horizonY]], '#1e1010');
      glow(g, dialX, horizonY - 130, 65, '#ff5e1a', 0.85);
    } else if (portholeStyle === 'ancientTemple') {
      // Stepped Gopuram Temple Silhouette inside Porthole
      [-90, 0, 95].forEach((ox, idx) => {
        const tw = idx === 1 ? 74 : 52;
        const th = idx === 1 ? 135 : 92;
        poly(g, [[dialX + ox - tw / 2, horizonY], [dialX + ox + tw / 2, horizonY], [dialX + ox + tw * 0.28, horizonY - th], [dialX + ox - tw * 0.28, horizonY - th]], '#241614');
        circle(g, dialX + ox, horizonY - th - 5, 4, '#ffd54f');
      });
    } else {
      for (let bx = dialX - dialR; bx < dialX + dialR; bx += 22) {
        const bw = 18 + sr() * 16;
        const bh = 28 + Math.pow(sr(), 1.4) * 115;
        g.fillStyle = isNight ? '#121026' : '#1d2840';
        g.fillRect(bx, horizonY - bh, bw, bh);
        if (isNight && sr() < 0.35) {
          g.fillStyle = '#ffd578';
          g.fillRect(bx + 4, horizonY - bh + 10, 4, 6);
        }
      }
    }

    g.fillStyle = linGrad(g, dialX, horizonY, dialX, dialY + dialR, [
      isNight ? '#181436' : '#2b4266',
      isNight ? '#0a081c' : '#16243d',
    ]);
    g.fillRect(dialX - dialR, horizonY, dialR * 2, dialR);
    g.strokeStyle = 'rgba(255, 230, 185, 0.22)';
    g.lineWidth = 1.5;
    for (let wy = horizonY + 8; wy < dialY + dialR - 10; wy += 9) {
      const ww = (dialR - Math.abs(wy - dialY) * 0.6) * (0.4 + 0.3 * Math.sin(wy));
      g.beginPath();
      g.moveTo(dialX - ww, wy);
      g.lineTo(dialX + ww, wy);
      g.stroke();
    }
    g.restore();

    // Outer Bezel, 24-Hour/Compass Ticks & Golden Progress Arc
    ring(g, dialX, dialY, dialR, 5, 'rgba(255,255,255,0.18)');
    const outerR = dialR + 36;
    ring(g, dialX, dialY, outerR, 2, 'rgba(255,255,255,0.22)');

    for (let i = 0; i < 24; i++) {
      const ang = -Math.PI / 2 + (i / 24) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      const r0 = outerR - (isMajor ? 10 : 5);
      const r1 = outerR + (isMajor ? 10 : 5);
      seg(
        g,
        [
          [dialX + Math.cos(ang) * r0, dialY + Math.sin(ang) * r0],
          [dialX + Math.cos(ang) * r1, dialY + Math.sin(ang) * r1],
        ],
        isMajor ? 2.5 : 1.4,
        'rgba(255,255,255,0.38)'
      );
    }

    const arcProg = clamp(progress * ease.out(clamp((t - t0) / 0.85, 0, 1)), 0.01, 1);
    const startAng = -Math.PI * 0.85;
    const endAng = startAng + arcProg * Math.PI * 2;

    g.save();
    g.strokeStyle = '#FFB84D';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.shadowColor = '#FF9E2C';
    g.shadowBlur = 16;
    g.beginPath();
    g.arc(dialX, dialY, dialR + 14, startAng, endAng, false);
    g.stroke();
    g.restore();

    const iconX = dialX + Math.cos(endAng) * (dialR + 14);
    const iconY = dialY + Math.sin(endAng) * (dialR + 14);
    glow(g, iconX, iconY, 28, '#FFB84D', 0.8);
    circle(g, iconX, iconY, 10, '#FFD578');

    const textX = 830;
    const uHead = ease.out(clamp((t - t0 - 0.05) / 0.45, 0, 1));
    text(g, hourText, textX, dialY - 68, {
      size: 32,
      font: FONTS.ui,
      weight: 800,
      color: '#FFB84D',
      align: 'left',
      spacing: 3.5,
      alpha: uHead,
    });

    const chars = String(titleText).split('');
    let curX = textX;
    const titleSize = titleText.length > 14 ? 76 : 92;
    chars.forEach((ch, idx) => {
      const cu = ease.outBack(clamp((t - t0 - 0.12 - idx * 0.035) / 0.48, 0, 1));
      const cw = measure(g, ch, titleSize, FONTS.serif, 900) + 2;
      g.save();
      g.translate(curX + cw / 2, dialY + 18 - (1 - cu) * 45);
      g.rotate((1 - cu) * 0.25);
      text(g, ch, 0, 0, {
        size: titleSize,
        font: FONTS.serif,
        weight: 900,
        color: '#F4F6FA',
        alpha: clamp(cu * 1.2, 0, 1),
      });
      g.restore();
      curX += cw;
    });

    if (subText) {
      text(g, subText, textX, dialY + 95, {
        size: 48,
        font: FONTS.serif,
        weight: 900,
        color: '#F4F6FA',
        align: 'left',
        alpha: ease.out(clamp((t - t0 - 0.35) / 0.5, 0, 1)),
      });
    }

    g.restore();
  }

  function eraChapterDial(g, t = 0, o = {}) {
    horizonChapterDial(g, t, o);
  }

  // ---------- 3. Radial Decompression / Survival Timer Ring ----------
  function radialTimer(g, t = 0, o = {}) {
    const {
      x = E.W * 0.5,
      y = E.H * 0.5,
      r = 165,
      timeText = '0:00',
      progress = 0.08,
      mode = 'milestone',
      rangeArc = false,
      t0 = 0,
    } = o;

    const popS = o.t0 !== undefined ? DK.pop(t, t0, 0.38) : 1;
    if (popS <= 0.001) return;

    g.save();
    g.translate(x, y);
    g.scale(popS, popS);

    circle(g, 0, 8, r + 18, 'rgba(0, 0, 0, 0.48)');
    circle(g, 0, 0, r + 14, UI_TOKENS.timerRing);
    circle(g, 0, 0, r, UI_TOKENS.timerBg);

    for (let i = 0; i < 24; i++) {
      const ang = -Math.PI / 2 + (i / 24) * Math.PI * 2;
      const r0 = r - 24;
      const r1 = r - 8;
      seg(
        g,
        [
          [Math.cos(ang) * r0, Math.sin(ang) * r0],
          [Math.cos(ang) * r1, Math.sin(ang) * r1],
        ],
        2.5,
        'rgba(120, 135, 190, 0.28)'
      );
    }

    const startAng = -Math.PI / 2;
    const endAng = startAng + clamp(progress, 0.005, 1) * Math.PI * 2;
    const arcR = r - 16;

    if (mode === 'segments') {
      const totalSegs = 10;
      const litSegs = Math.round(clamp(progress, 0, 1) * totalSegs);
      for (let k = 0; k < totalSegs; k++) {
        const a0 = startAng + (k / totalSegs) * Math.PI * 2 + 0.04;
        const a1 = startAng + ((k + 1) / totalSegs) * Math.PI * 2 - 0.04;
        g.strokeStyle = k < litSegs ? UI_TOKENS.timerNeon : 'rgba(255, 77, 106, 0.16)';
        g.lineWidth = 22;
        g.beginPath();
        g.arc(0, 0, arcR, a0, a1, false);
        g.stroke();
      }
    } else {
      g.save();
      g.strokeStyle = UI_TOKENS.timerNeon;
      g.lineWidth = 20;
      g.lineCap = 'round';
      g.shadowColor = '#FF2A55';
      g.shadowBlur = 24;
      g.beginPath();
      g.arc(0, 0, arcR, startAng, endAng, false);
      g.stroke();
      g.restore();

      const tipX = Math.cos(endAng) * arcR;
      const tipY = Math.sin(endAng) * arcR;
      glow(g, tipX, tipY, 28, '#FFFFFF', 0.9);
      circle(g, tipX, tipY, 7.5, '#FFFFFF');
    }

    if (rangeArc) {
      g.save();
      g.strokeStyle = '#FFC425';
      g.lineWidth = 6;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(0, 0, r + 22, -Math.PI * 0.1, Math.PI * 0.45, false);
      g.stroke();
      text(g, '15', r + 58, 45, { size: 48, font: FONTS.ui, weight: 900, color: '#FFC425' });
      g.restore();
    }

    if (mode === 'milestone' && timeText) {
      text(g, String(timeText), 0, 4, {
        size: r * 0.48,
        font: FONTS.ui,
        weight: 900,
        color: '#FFFFFF',
      });
    }

    g.restore();
  }

  // ---------- 4. Anatomical & Biological X-Ray Cutaways (Brain, Lungs & Bloodstream) ----------
  function brainXray(g, x, y, s = 1, o = {}) {
    const { hypoxiaProg = 0.5, o2Count = 6, t = 0 } = o;
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    g.save();
    g.beginPath();
    g.arc(0, 0, 96, Math.PI * 1.05, Math.PI * 1.95, false);
    g.closePath();
    g.fillStyle = 'rgba(14, 24, 56, 0.88)';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = UI_TOKENS.xrayCyan;
    g.stroke();
    g.clip();

    const brainCol = mix('#FF7898', '#7A788C', clamp(hypoxiaProg, 0, 1));
    const sulciCol = mix('#C94466', '#4E4C5E', clamp(hypoxiaProg, 0, 1));
    const puffs = [
      [-45, -32, 36],
      [-15, -48, 40],
      [22, -46, 38],
      [48, -28, 34],
      [-25, -18, 32],
      [18, -18, 32],
    ];
    puffs.forEach(([px, py, pr]) => circle(g, px, py, pr, sphereGrad(g, px, py, pr, brainCol)));

    seg(g, [[-48, -32], [-22, -38], [-8, -24]], 3.5, sulciCol);
    seg(g, [[8, -42], [28, -32], [14, -18]], 3.5, sulciCol);
    seg(g, [[-28, -16], [0, -14], [32, -22]], 3.5, sulciCol);

    const r = rng(31);
    for (let i = 0; i < o2Count; i++) {
      const bx = (r() - 0.5) * 95;
      const by = -18 - r() * 48 + Math.sin(t * 3 + i) * 4;
      circle(g, bx - 4, by, 6, sphereGrad(g, bx - 4, by, 6, '#68D8FF'));
      circle(g, bx + 4, by, 6, sphereGrad(g, bx + 4, by, 6, '#68D8FF'));
    }
    g.restore();
    g.restore();
  }

  function lungXray(g, x, y, s = 1, o = {}) {
    const { o2Density = 0.25, t = 0 } = o;
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    circle(g, 0, 0, 118, '#2B0E24');
    ring(g, 0, 0, 118, 4.5, UI_TOKENS.xrayCyan);

    g.save();
    g.beginPath();
    g.arc(0, 0, 115, 0, Math.PI * 2);
    g.clip();

    seg(g, [[0, -120], [0, -25]], 18, '#DCE8FF');
    seg(g, [[0, -25], [-42, 15]], 12, '#DCE8FF');
    seg(g, [[0, -25], [42, 15]], 12, '#DCE8FF');

    const breathe = 1 + Math.sin(t * 2.5) * 0.04;
    [-1, 1].forEach((side) => {
      g.save();
      g.translate(side * 46, 22);
      g.scale(side * breathe, breathe);
      poly(
        g,
        [
          [-12, -58],
          [24, -48],
          [42, 18],
          [32, 58],
          [-18, 52],
          [-22, -10],
        ],
        sphereGrad(g, 0, 0, 62, '#F26B8A')
      );
      g.restore();
    });

    const pts = [
      [-52, -5],
      [-38, 38],
      [45, -8],
      [38, 40],
    ];
    pts.forEach(([px, py], idx) => {
      const isActive = idx / pts.length < o2Density;
      if (isActive) {
        glow(g, px, py, 22, '#68D8FF', 0.7);
        circle(g, px - 5, py, 7, '#68D8FF');
        circle(g, px + 5, py, 7, '#68D8FF');
      } else {
        circle(g, px, py, 10, 'rgba(45, 20, 40, 0.75)');
      }
    });

    g.restore();
    g.restore();
  }

  function bloodstream(g, t = 0, o = {}) {
    const { y = 540, h = 260, o2Count = 3, speed = 180 } = o;
    g.save();
    g.fillStyle = linGrad(g, 0, y - h / 2, 0, y + h / 2, ['#4a0e1c', '#7a162c', '#4a0e1c']);
    g.fillRect(0, y - h / 2, E.W, h);
    seg(g, [[0, y - h / 2], [E.W, y - h / 2]], 8, '#ff7898');
    seg(g, [[0, y + h / 2], [E.W, y + h / 2]], 8, '#ff7898');

    for (let i = 0; i < 5; i++) {
      const cx = ((i * 420 + t * speed) % (E.W + 300)) - 150;
      const cy = y + Math.sin(t * 2.5 + i) * 24;
      if (DK.animal) {
        DK.animal(g, { kind: 'redBloodCell', x: cx, y: cy, s: 1.0, o2Count, t, seed: i + 1 });
      }
    }
    g.restore();
  }

  // ---------- 5. Physics/Chemistry Atomic Orbital & Economics Balance Cutaways ----------
  function atomCutaway(g, t = 0, o = {}) {
    const {
      x = E.W * 0.5,
      y = E.H * 0.5,
      s = 1,
      protons = 6,
      electrons = 6,
      label = '',
    } = o;

    g.save();
    g.translate(x, y);
    g.scale(s, s);

    glow(g, 0, 0, 260, '#5CE1FF', 0.25);

    // 3 Elliptical Electron Orbits & Orbiting Electrons
    const shells = [0, Math.PI / 3, (Math.PI * 2) / 3];
    shells.forEach((ang, sIdx) => {
      g.save();
      g.rotate(ang);
      g.strokeStyle = 'rgba(104, 224, 255, 0.42)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(0, 0, 240, 88, 0, 0, Math.PI * 2);
      g.stroke();

      const ePerShell = Math.max(1, Math.ceil(electrons / 3));
      for (let k = 0; k < ePerShell; k++) {
        const ph = t * 2.8 + sIdx * 1.4 + (k / ePerShell) * Math.PI * 2;
        const ex = Math.cos(ph) * 240;
        const ey = Math.sin(ph) * 88;
        glow(g, ex, ey, 22, '#5CE1FF', 0.9);
        circle(g, ex, ey, 8, '#FFFFFF');
      }
      g.restore();
    });

    // 3D-Shaded Nucleus Cluster (Protons & Neutrons)
    const r = rng(14);
    for (let i = 0; i < protons * 2; i++) {
      const ang = (i / (protons * 2)) * Math.PI * 2;
      const dist = (i % 2) * 18 + r() * 8;
      const nx = Math.cos(ang) * dist;
      const ny = Math.sin(ang) * dist;
      const col = i % 2 === 0 ? '#FF4D6A' : '#FFB84D';
      circle(g, nx, ny, 16, sphereGrad(g, nx, ny, 16, col));
    }

    if (label) {
      pillBadge(g, 1, { x: 0, y: 295, text: label, border: '#5CE1FF' });
    }

    g.restore();
  }

  function economicsScale(g, t = 0, o = {}) {
    const {
      x = E.W * 0.5,
      y = 640,
      s = 1,
      tilt = 0.18, // positive tilts right pan down, negative tilts left pan down
      leftLabel = 'DEMAND',
      rightLabel = 'SUPPLY',
    } = o;

    g.save();
    g.translate(x, y);
    g.scale(s, s);

    // Brass Base & Central Pillar
    rr(g, -140, 140, 280, 36, 16);
    g.fillStyle = cylinderGrad(g, -140, 140, 140, 140, '#D99B26', -1);
    g.fill();
    rr(g, -18, -220, 36, 360, 12);
    g.fillStyle = cylinderGrad(g, -18, -220, 18, -220, '#F5B942', -1);
    g.fill();
    circle(g, 0, -220, 26, sphereGrad(g, 0, -220, 26, '#FFD54F'));

    // Tilting Balance Beam & Hanging Pans
    const curTilt = tilt + Math.sin(t * 2.2) * 0.025;
    const beamR = 320;
    const lx = -Math.cos(curTilt) * beamR;
    const ly = -220 - Math.sin(curTilt) * beamR;
    const rx = Math.cos(curTilt) * beamR;
    const ry = -220 + Math.sin(curTilt) * beamR;

    seg(g, [[lx, ly], [rx, ry]], 14, '#FFD54F');

    [
      { px: lx, py: ly, label: leftLabel, col: '#FF851B' },
      { px: rx, py: ry, label: rightLabel, col: '#38C878' },
    ].forEach((pan) => {
      seg(g, [[pan.px, pan.py], [pan.px - 75, pan.py + 140]], 3.5, '#CBD5E1');
      seg(g, [[pan.px, pan.py], [pan.px + 75, pan.py + 140]], 3.5, '#CBD5E1');
      ellipse(g, pan.px, pan.py + 145, 95, 22, sphereGrad(g, pan.px, pan.py + 145, 95, '#F5B942'));
      pillBadge(g, 1, { x: pan.px, y: pan.py + 95, text: pan.label, border: pan.col });
    });

    g.restore();
  }

  // ---------- 6. Isometric 3-Pane Exploded Aircraft Window & Stress Lines ----------
  function explodedWindow(g, t = 0, o = {}) {
    const {
      x = E.W * 0.5,
      y = E.H * 0.52,
      s = 1,
      spread = 1.0,
      shatterOuter = false,
      shatterMid = false,
      fingerprints = false,
    } = o;

    g.save();
    g.translate(x, y);
    g.scale(s, s);

    const sp = clamp(spread, 0, 1.5);
    const dx = -195 * sp;
    const dy = 52 * sp;

    g.save();
    g.translate(-dx, -dy);
    rr(g, -185, -245, 370, 490, 175);
    g.fillStyle = cylinderGrad(g, -185, -245, 185, 245, '#3E58B8', -1);
    g.fill();
    g.strokeStyle = '#7A98F0';
    g.lineWidth = 4;
    g.stroke();

    rr(g, -135, -195, 270, 390, 130);
    g.fillStyle = linGrad(g, -135, -195, 135, 195, ['#1A489E', '#387CE8', '#68B0FF']);
    g.fill();
    if (shatterOuter) drawPaneCracks(g, 0, -20, 125);
    g.restore();

    g.save();
    rr(g, -135, -195, 270, 390, 130);
    g.fillStyle = 'rgba(110, 195, 255, 0.52)';
    g.fill();
    g.strokeStyle = 'rgba(200, 240, 255, 0.88)';
    g.lineWidth = 5;
    g.stroke();
    circle(g, 0, 155, 7, '#0E224D');
    ring(g, 0, 155, 7, 2.5, '#D8F2FF');
    if (shatterMid) drawPaneCracks(g, 0, 0, 125);
    g.restore();

    g.save();
    g.translate(dx, dy);
    rr(g, -135, -195, 270, 390, 130);
    g.fillStyle = 'rgba(200, 232, 255, 0.42)';
    g.fill();
    g.strokeStyle = 'rgba(240, 250, 255, 0.9)';
    g.lineWidth = 3.5;
    g.stroke();
    poly(g, [[-85, -120], [-25, -155], [45, -40], [-15, -5]], 'rgba(255,255,255,0.28)');

    if (fingerprints) {
      [
        [-25, 15],
        [32, -35],
        [-38, 85],
      ].forEach(([fx, fy]) => {
        for (let rRing = 6; rRing <= 26; rRing += 5) {
          ring(g, fx, fy, rRing, 1.4, 'rgba(255, 255, 255, 0.28)');
        }
      });
    }
    g.restore();

    g.restore();
  }

  function drawPaneCracks(g, cx, cy, maxR) {
    const r = rng(19);
    g.strokeStyle = 'rgba(235, 248, 255, 0.92)';
    g.lineWidth = 2.4;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + (r() - 0.5) * 0.25;
      const len = maxR * (0.65 + r() * 0.35);
      seg(
        g,
        [
          [cx, cy],
          [cx + Math.cos(ang) * len * 0.5, cy + Math.sin(ang) * len * 0.5 + 8],
          [cx + Math.cos(ang) * len, cy + Math.sin(ang) * len],
        ],
        2.2,
        'rgba(240, 250, 255, 0.92)'
      );
    }
  }

  function stressLines(g, t = 0, o = {}) {
    const { x = E.W * 0.5, y = E.H * 0.5, shape = 'square', crackProg = 0.75 } = o;
    g.save();
    g.translate(x, y);

    const isSquare = shape === 'square';
    const winW = 240, winH = 310;
    const cornerR = isSquare ? 18 : 120;

    [-3, -2, -1, 1, 2, 3].forEach((row) => {
      const baseY = row * 68;
      const deflect = (4 - Math.abs(row)) * 32 * Math.sign(row);
      const col = isSquare && Math.abs(row) <= 2 ? '#FF7838' : '#F5C442';

      g.strokeStyle = col;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-680, baseY);
      g.lineTo(-220, baseY);
      g.bezierCurveTo(-120, baseY + deflect, 120, baseY + deflect, 220, baseY);
      g.lineTo(680, baseY);
      g.stroke();

      for (let p = 0; p < 4; p++) {
        const u = (t * 0.22 + p * 0.25 + Math.abs(row) * 0.07) % 1;
        const px = lerp(-650, 650, u);
        const midFactor = Math.exp(-Math.pow(px / 180, 2));
        const py = baseY + deflect * midFactor;
        glow(g, px, py, 16, '#FFE082', 0.85);
        circle(g, px, py, 4.5, '#FFFFFF');
      }
    });

    rr(g, -winW / 2, -winH / 2, winW, winH, cornerR);
    g.fillStyle = '#0A1E36';
    g.fill();
    g.strokeStyle = isSquare ? '#FF5E3A' : '#58A8E8';
    g.lineWidth = 6;
    g.stroke();

    if (isSquare) {
      [
        [-winW / 2 + 12, -winH / 2 + 12],
        [winW / 2 - 12, -winH / 2 + 12],
        [-winW / 2 + 12, winH / 2 - 12],
        [winW / 2 - 12, winH / 2 - 12],
      ].forEach(([cx, cy]) => {
        glow(g, cx, cy, 48, '#FF3B1F', 0.9);
        circle(g, cx, cy, 9, '#FFF3B8');
      });

      if (crackProg > 0) {
        const len = 180 * clamp(crackProg, 0, 1);
        const sx = winW / 2 - 10, sy = -winH / 2 + 10;
        const ex = sx + len, ey = sy - len * 0.68;
        seg(g, [[sx, sy], [lerp(sx, ex, 0.5), lerp(sy, ey, 0.5) - 8], [ex, ey]], 5, '#1A0A08');
        glow(g, ex, ey, 26, '#FFB300', 0.9);
      }
    }

    g.restore();
  }

  // ---------- 7. Chemical Oxygen Generator & Bolt Cross-Section ----------
  function oxygenGenerator(g, t = 0, o = {}) {
    const { x = E.W * 0.5, y = 460, s = 1, heatProg = 0.65, o2Flow = true } = o;
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    rr(g, -290, -110, 580, 220, 32);
    g.fillStyle = cylinderGrad(g, -290, -110, -290, 110, '#8FA0C8', -1);
    g.fill();

    rr(g, -220, -72, 440, 128, 24);
    g.fillStyle = linGrad(g, -220, 0, 220, 0, ['#FFF6C2', '#FF9E2C', '#D9381E', '#3A1C28']);
    g.fill();

    for (let i = -2; i <= 2; i++) {
      const hx = i * 75;
      const wOff = Math.sin(t * 5 + i) * 12;
      seg(g, [[hx, -115], [hx + wOff, -175], [hx - wOff, -235]], 4, 'rgba(255, 190, 140, 0.35)');
    }

    seg(g, [[-295, 55], [-260, 175], [220, 185], [250, 290]], 8, '#B8C8E8');
    if (o2Flow) {
      for (let k = 0; k < 5; k++) {
        const u = (t * 0.5 + k * 0.2) % 1;
        const ox = lerp(-260, 230, u);
        const oy = lerp(170, 190, u);
        glow(g, ox, oy, 18, '#5CE1FF', 0.85);
        circle(g, ox, oy, 5, '#FFFFFF');
      }
    }

    g.restore();
  }

  function boltCrossSection(g, t = 0, o = {}) {
    const { x = E.W * 0.5, y = 540, s = 1 } = o;
    g.save();
    g.translate(x, y);
    g.scale(s, s);

    g.fillStyle = '#3B5998';
    g.fillRect(-780, -80, 1560, 75);
    g.fillStyle = '#4E6FB8';
    g.fillRect(-780, -5, 1560, 110);

    const bolts = [
      { bx: -460, col: '#DCE6F7', w: 68, h: 240, label: 'CORRECT' },
      { bx: 0, col: '#FFB300', w: 52, h: 240, label: 'TOO NARROW (84)' },
      { bx: 460, col: '#FF5238', w: 68, h: 175, label: 'TOO SHORT (6)' },
    ];

    bolts.forEach((b) => {
      rr(g, b.bx - 42, -80, 84, 290, 6);
      g.fillStyle = '#0A0E1C';
      g.fill();
      rr(g, b.bx - 64, -135, 128, 55, 8);
      g.fillStyle = cylinderGrad(g, b.bx - 64, -135, b.bx + 64, -135, b.col, -1);
      g.fill();
      rr(g, b.bx - b.w / 2, -80, b.w, b.h, 4);
      g.fillStyle = cylinderGrad(g, b.bx - b.w / 2, -80, b.bx + b.w / 2, -80, shade(b.col, -0.1), -1);
      g.fill();
    });

    g.restore();
  }

  // ---------- 8. Dashed-Outline Ghost Physics Double & Smartphone Screen ----------
  function ghostDouble(g, o = {}) {
    const { x = 740, y = 780, s = 1, color = '#9EE8FF', kind = 'person', lean = 0 } = o;
    g.save();
    g.translate(x, y);
    g.rotate(lean);
    g.scale(s, s);

    glow(g, 0, -140, 160, color, 0.25);
    g.fillStyle = alpha(color, 0.14);
    g.strokeStyle = color;
    g.lineWidth = 3.5;
    g.setLineDash([10, 8]);

    if (kind === 'piano') {
      poly(g, [[-180, -40], [180, -40], [180, -190], [40, -190], [-60, -90], [-180, -90]], g.fillStyle, color, 3.5);
    } else {
      circle(g, 0, -220, 48, g.fillStyle);
      g.stroke();
      rr(g, -68, -162, 136, 162, 34);
      g.fill();
      g.stroke();
    }

    g.restore();
  }

  function phoneScreen(g, t = 0, o = {}) {
    const {
      x = E.W * 0.5,
      y = 560,
      s = 1,
      mode = 'callingMom',
      batteryPct = 3,
    } = o;

    g.save();
    g.translate(x, y);
    g.rotate(o.rot || -0.08);
    g.scale(s, s);

    const pw = 350, ph = 680;
    rr(g, -pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 24, 52);
    g.fillStyle = '#2B3248';
    g.fill();
    rr(g, -pw / 2, -ph / 2, pw, ph, 44);
    g.fillStyle = mode === 'lowBattery' ? linGrad(g, 0, -ph / 2, 0, ph / 2, ['#101530', '#2b1e4a', '#161029']) : '#121626';
    g.fill();

    rr(g, -48, -ph / 2 + 18, 96, 24, 12);
    g.fillStyle = '#05070D';
    g.fill();

    if (mode === 'callingMom') {
      text(g, '7:04', -pw / 2 + 48, -ph / 2 + 30, { size: 20, color: '#FFFFFF', weight: 800 });
      text(g, 'calling...', 0, -180, { size: 22, color: '#94A3B8', weight: 600 });
      text(g, 'Mom ❤️', 0, -135, { size: 42, font: FONTS.serif, color: '#FFFFFF', weight: 900 });
      circle(g, 0, -25, 62, '#E07A48');
      text(g, 'M', 0, -23, { size: 54, font: FONTS.serif, color: '#FFFFFF', weight: 900 });
      circle(g, 0, 210, 38, '#E53935');
    } else if (mode === 'frozenFeed') {
      text(g, '8:12', -pw / 2 + 48, -ph / 2 + 30, { size: 20, color: '#FFFFFF', weight: 800 });
      text(g, 'Feed', -pw / 2 + 68, -ph / 2 + 82, { size: 34, font: FONTS.serif, color: '#FFFFFF', weight: 900 });
      rr(g, -110, -ph / 2 + 125, 220, 40, 20);
      g.fillStyle = '#252F4A';
      g.fill();
      text(g, 'No new posts', 0, -ph / 2 + 145, { size: 20, color: '#FFD47E', weight: 800 });
      rr(g, -pw / 2 + 24, -60, pw - 48, 175, 16);
      g.fillStyle = linGrad(g, 0, -60, 0, 115, ['#F5B078', '#CF7268', '#5E3858']);
      g.fill();
      circle(g, 45, 5, 24, '#FFF2CC');
    } else if (mode === 'sandwichPost') {
      text(g, '8:13', -pw / 2 + 48, -ph / 2 + 30, { size: 20, color: '#FFFFFF', weight: 800 });
      text(g, '3:12 AM', -35, -ph / 2 + 142, { size: 24, color: '#FFD47E', weight: 800 });
      rr(g, -pw / 2 + 24, -130, pw - 48, 290, 18);
      g.fillStyle = '#283048';
      g.fill();
      ellipse(g, 0, 95, 115, 24, '#F0F4FA');
      rr(g, -75, 55, 150, 28, 10);
      g.fillStyle = '#D9924C';
      g.fill();
      rr(g, -78, 38, 156, 14, 6);
      g.fillStyle = '#68C858';
      g.fill();
      rr(g, -75, 24, 150, 14, 4);
      g.fillStyle = '#FF6B82';
      g.fill();
      rr(g, -75, -12, 150, 36, 14);
      g.fillStyle = '#E6A258';
      g.fill();
      seg(g, [[0, -45], [0, 5]], 3, '#DCE6F7');
      circle(g, 0, -45, 9, '#5C9E38');
      circle(g, 0, -45, 3.5, '#E53935');
      text(g, 'midnight snack.', -pw / 2 + 36, 205, { size: 22, color: '#FFFFFF', align: 'left', weight: 700 });
    } else if (mode === 'lowBattery') {
      text(g, '10:47', 0, -165, { size: 78, color: '#FFFFFF', weight: 800 });
      text(g, 'Saturday', 0, -105, { size: 24, color: '#CBD5E1', weight: 700 });
      rr(g, -92, -62, 184, 38, 19);
      g.fillStyle = 'rgba(255, 175, 75, 0.16)';
      g.fill();
      g.strokeStyle = '#FFB04D';
      g.lineWidth = 2;
      g.stroke();
      text(g, 'No Service', 0, -43, { size: 20, color: '#FFB04D', weight: 800 });

      rr(g, -125, 15, 250, 210, 24);
      g.fillStyle = 'rgba(18, 22, 40, 0.92)';
      g.fill();
      text(g, batteryPct + '%', 0, 125, { size: 84, font: FONTS.serif, color: '#FF5242', weight: 900 });
      text(g, 'Low Battery', 0, 185, { size: 24, color: '#CBD5E1', weight: 700 });
    }

    circle(g, -pw / 2 - 8, 95, 28, '#D69A72');
    circle(g, -pw / 2 - 12, 155, 26, '#C88C68');
    rr(g, -pw / 2 - 18, 15, 58, 95, 24);
    g.fillStyle = '#E0A67E';
    g.fill();

    g.restore();
  }

  // ---------- 9. Standard Badges, Citations, Title Cards & Chapter Headers ----------
  function pillBadge(g, t = 1, o = {}) {
    const appear = o.t0 !== undefined ? DK.pop(t, o.t0, o.popDur || 0.38) : 1;
    if (appear <= 0.001) return;

    const x = o.x !== undefined ? o.x : E.W * 0.5;
    const y = o.y !== undefined ? o.y : E.H * 0.5;
    const sc = (o.scale || 1) * appear;
    const bgCol = o.bg || UI_TOKENS.pillBg;
    const borderCol = o.border || UI_TOKENS.pillBorder;
    const txtCol = o.color || UI_TOKENS.pillText;
    const subCol = o.subColor || UI_TOKENS.pillSubText;

    let mainStr = o.text !== undefined ? String(o.text) : '';
    if (o.countFrom !== undefined && o.countTo !== undefined) {
      const cStart = o.countStart !== undefined ? o.countStart : o.t0 || 0;
      const cEnd = o.countEnd !== undefined ? o.countEnd : cStart + 1.5;
      const u = ease.out(prog(t, cStart, cEnd));
      const val = lerp(o.countFrom, o.countTo, u);
      const dec = o.decimals !== undefined ? o.decimals : 0;
      const numStr = dec > 0 ? val.toFixed(dec) : Math.round(val).toLocaleString('en-US');
      mainStr = (o.prefix || '') + numStr + (o.suffix || '');
    }

    const subStr = o.subText ? String(o.subText) : '';
    const fontSize = o.size || (subStr ? 28 : 24);
    const subSize = o.subSize || 16;
    const mainW = measure(g, mainStr, fontSize, FONTS.ui, 800);
    const subW = subStr ? measure(g, subStr, subSize, FONTS.ui, 800) : 0;
    const pw = Math.max(o.minW || 110, Math.max(mainW, subW) + 52);
    const ph = o.h || (subStr ? 72 : 46);

    g.save();
    if (o.target && Array.isArray(o.target)) {
      const [tx, ty] = o.target;
      const tr = o.targetRadius !== undefined ? o.targetRadius : 18;
      if (tr > 0) ring(g, tx, ty, tr, 2.4, borderCol);
      seg(g, [[tx, ty], [x, y]], 2.4, borderCol);
    }

    g.translate(x, y);
    g.scale(sc, sc);
    rr(g, -pw / 2, -ph / 2, pw, ph, ph / 2);
    g.fillStyle = alpha(bgCol, 0.94);
    g.fill();
    g.strokeStyle = borderCol;
    g.lineWidth = 2.4;
    g.stroke();

    if (subStr) {
      text(g, mainStr, 0, -10, { size: fontSize, font: FONTS.ui, weight: 800, color: txtCol });
      text(g, subStr, 0, 16, { size: subSize, font: FONTS.ui, weight: 800, color: subCol, spacing: 1.2 });
    } else {
      text(g, mainStr, 0, 1, { size: fontSize, font: FONTS.ui, weight: 800, color: txtCol, spacing: 0.8 });
    }
    g.restore();
  }

  function citation(g, str, o = {}) {
    if (!str) return;
    const align = o.align || 'left';
    const x = o.x !== undefined ? o.x : align === 'left' ? 54 : align === 'center' ? E.W / 2 : E.W - 54;
    const y = o.y !== undefined ? o.y : E.H - 42;
    text(g, str, x, y, {
      size: o.size || 20,
      font: FONTS.ui,
      weight: 600,
      color: o.color || UI_TOKENS.citationColor,
      align,
      alpha: o.alpha !== undefined ? o.alpha : 0.85,
    });
  }

  function darkVoidBg(g, t = 0, o = {}) {
    const { top = UI_TOKENS.voidTop, mid = UI_TOKENS.voidMid, bot = UI_TOKENS.voidBot, grid = true, stars = false } = o;
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, [top, mid, bot]);
    g.fillRect(0, 0, E.W, E.H);
    if (grid) {
      const step = o.gridStep || 80;
      g.strokeStyle = UI_TOKENS.gridLine;
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= E.W; x += step) { g.moveTo(x, 0); g.lineTo(x, E.H); }
      for (let y = 0; y <= E.H; y += step) { g.moveTo(0, y); g.lineTo(E.W, y); }
      g.stroke();
    }
    if (stars && window.FX && window.FX.stars) window.FX.stars(g, t, { count: 140 });
  }

  function titleCard(g, t = 0, o = {}) {
    const {
      t0 = 0,
      topText = 'WHAT IF YOU WERE THE',
      mainText = 'LAST PERSON',
      subText = 'ON EARTH?',
      parenText = '(for 24 hours)',
      x = 120,
      y = 320,
      align = 'left',
    } = o;

    const u = clamp((t - t0) / 1.2, 0, 1);
    if (u <= 0) return;

    g.save();
    text(g, topText, x, y - 95, {
      size: 32,
      font: FONTS.ui,
      weight: 800,
      color: '#DCE6F7',
      align,
      spacing: 3,
      alpha: ease.out(clamp((t - t0) / 0.45, 0, 1)),
    });

    text(g, mainText, x, y, {
      size: 104,
      font: FONTS.serif,
      weight: 900,
      color: '#FFB04D',
      align,
      alpha: ease.outBack(clamp((t - t0 - 0.12) / 0.55, 0, 1)),
    });

    text(g, subText, x, y + 105, {
      size: 100,
      font: FONTS.serif,
      weight: 900,
      color: '#F4F7FC',
      align,
      alpha: ease.outBack(clamp((t - t0 - 0.25) / 0.55, 0, 1)),
    });

    if (parenText) {
      const subW = measure(g, subText, 100, FONTS.serif, 900);
      text(g, parenText, align === 'left' ? x + subW + 28 : x, y + 108, {
        size: 56,
        font: FONTS.serif,
        italic: true,
        weight: 700,
        color: '#FFB04D',
        align,
        alpha: ease.out(clamp((t - t0 - 0.55) / 0.5, 0, 1)),
      });
    }
    g.restore();
  }

  function chapterHeader(g, t = 0, o = {}) {
    horizonChapterDial(g, t, {
      t0: o.t0 || 0,
      hourText: o.partText || o.hourText || 'HOUR 1 · 8:00 AM',
      titleText: o.titleText || 'AUTOPILOT',
      subText: o.subText || '',
      progress: o.progress !== undefined ? o.progress : 0.12,
      portholeStyle: o.portholeStyle || 'city',
      isNight: !!o.isNight,
    });
  }

  // ---------- 10. Export to Global Namespace (window.UI & window.DK) ----------
  const UI = (window.UI = {
    TOKENS: UI_TOKENS,
    horizonChapterDial,
    eraChapterDial,
    radialTimer,
    brainXray,
    lungXray,
    bloodstream,
    atomCutaway,
    economicsScale,
    explodedWindow,
    stressLines,
    oxygenGenerator,
    boltCrossSection,
    ghostDouble,
    phoneScreen,
    pillBadge,
    citation,
    darkVoidBg,
    titleCard,
    chapterHeader,
  });

  DK.ui = UI;
  DK.UI_TOKENS = H.UI_TOKENS = UI_TOKENS;
  DK.horizonChapterDial = H.horizonChapterDial = horizonChapterDial;
  DK.eraChapterDial = H.eraChapterDial = eraChapterDial;
  DK.radialTimer = H.radialTimer = radialTimer;
  DK.brainXray = H.brainXray = brainXray;
  DK.lungXray = H.lungXray = lungXray;
  DK.bloodstream = H.bloodstream = bloodstream;
  DK.atomCutaway = H.atomCutaway = atomCutaway;
  DK.economicsScale = H.economicsScale = economicsScale;
  DK.explodedWindow = H.explodedWindow = explodedWindow;
  DK.stressLines = H.stressLines = stressLines;
  DK.oxygenGenerator = H.oxygenGenerator = oxygenGenerator;
  DK.boltCrossSection = H.boltCrossSection = boltCrossSection;
  DK.ghostDouble = H.ghostDouble = ghostDouble;
  DK.phoneScreen = H.phoneScreen = phoneScreen;
  DK.pillBadge = H.pillBadge = pillBadge;
  DK.citation = H.citation = citation;
  DK.darkVoidBg = H.darkVoidBg = darkVoidBg;
  DK.titleCard = H.titleCard = titleCard;
  DK.chapterHeader = H.chapterHeader = chapterHeader;
})();


// ============================================================================
// MODULE 4: LUMINA_SOUND (lib/lumina_sound.js) — Generative Situational &
// Cultural Audio Engine (Tension/Valence/Culture/Tempo-Adaptive Multi-Stem
// Score Synthesizer) + Prehistoric, Historical, Combat, Construction, Science,
// Aviation & Urban Foley Synthesizer.
// Supports live browser playback & offline 48kHz stereo WAV rendering.
// Clean Track Separation Modes (opts.mixMode):
//   - 'sfxOnly' : Heavy (0.75) + Foley/UI (0.45) + Ambient (0.20), ZERO BGM
//   - 'bgmOnly' : Continuous VO-Ducked Situational BGM (0.18 / 0.55 / 0.00)
//   - 'bgmFull' : Continuous Unducked Situational BGM (0.42 / 0.55 / 0.00)
// ============================================================================
(function () {
  'use strict';

  const SOUND = (window.SOUND = window.SOUND || {});
  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  DK.sound = H.sound = SOUND;

  const TINY = 1e-4;

  // Exact Calibrated Mixing Levels
  const MIX = (SOUND.MIX = {
    HEAVY_IMPACT: 0.75, // decompressionBang, thunder, impact, shatter, powerDown, boltSnap, volcanoRumble, dinoRoar
    BGM_SWELL: 0.55,    // Title Cards, Era/Horizon Chapter Dials, Radial Timers, Cosmic/Heroic/Historical Swells
    UI_FOLEY: 0.45,     // swordClash, hammerHit, horseGallop, templeBell, coinClink, liquidBubble, alarmBeep, etc.
    AMBIENT_LOOP: 0.20, // cabinHum, supersonicWind, citySilence, fountainWater, rain, ocean, volcanoLava
    BGM_VO_BED: 0.18,   // Active narration bed
    BGM_STOP: 0.00,     // DIEGETIC_SILENCE & deadpan comedic punchlines
  });

  // Deterministic PRNG for procedural audio textures
  function rand(key) {
    let h = 2166136261;
    const str = String(key);
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let a = h >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Scientific Pitch Notation -> Hz ('C4' -> 261.63, 'Eb3', 'F#5', etc.) or MIDI offset
  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function noteToMidi(n) {
    if (typeof n === 'number') return n;
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(n || 'C4').trim());
    if (!m) return 60;
    return (
      (Number(m[3]) + 1) * 12 +
      STEP[m[1]] +
      (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
    );
  }
  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function hz(n) {
    if (typeof n === 'number') return n;
    if (!n || n === 'REST') return 0;
    return midiToHz(noteToMidi(n));
  }
  SOUND.hz = hz;

  function parseRootMidi(keyStr = 'D Minor') {
    const m = /^([A-G][#b]?)/.exec(String(keyStr).trim());
    const rootName = m ? m[1] : 'D';
    return noteToMidi(rootName + '2');
  }

  // Build adaptive chord progression & melody scale based on Valence, Tension & Culture
  function buildSituationalHarmony(keyStr, valence = 0, tension = 0.5, culture = 'modernCinematic') {
    const root2 = parseRootMidi(keyStr);
    let scaleOffsets;
    let chordDegrees;

    if (culture === 'indianClassical') {
      // Carnatic / Hindustani Ragas: Mayamalavagowla (mystical/ancient) vs. Kalyani/Mohanam (bright/grand)
      scaleOffsets =
        valence < -0.1
          ? [0, 1, 4, 5, 7, 8, 11, 12]
          : [0, 2, 4, 6, 7, 9, 11, 12];
      chordDegrees = [
        [0, 7, 12, 16],
        [0, 5, 12, 17],
        [0, 7, 12, 19],
        [0, 7, 12, 16],
      ];
    } else if (culture === 'eastAsian') {
      // Hirajoshi Pentatonic (minor/tense) vs. Major Pentatonic (serene/grand)
      scaleOffsets =
        valence < 0
          ? [0, 2, 3, 7, 8, 12, 14, 15]
          : [0, 2, 4, 7, 9, 12, 14, 16];
      chordDegrees = [
        [0, 7, 12, 14],
        [-3, 4, 9, 12],
        [5, 12, 17, 19],
        [0, 7, 12, 16],
      ];
    } else if (valence < -0.25) {
      scaleOffsets = tension > 0.7 ? [0, 1, 3, 5, 7, 8, 10, 12] : [0, 2, 3, 5, 7, 8, 10, 12];
      chordDegrees = [
        [0, 7, 12, 15],
        [-4, 3, 8, 12],
        [-2, 5, 10, 14],
        [0, 7, 12, tension > 0.6 ? 13 : 15],
      ];
    } else if (valence <= 0.35) {
      scaleOffsets = [0, 2, 3, 5, 7, 9, 10, 12];
      chordDegrees = [
        [0, 7, 12, 15, 19],
        [5, 12, 17, 21],
        [-2, 5, 10, 14],
        [0, 7, 14, 15],
      ];
    } else {
      scaleOffsets = [0, 2, 4, 6, 7, 9, 11, 12];
      chordDegrees = [
        [0, 7, 12, 16, 19],
        [7, 14, 19, 23],
        [9, 16, 21, 24],
        [5, 12, 17, 21, 24],
      ];
    }

    const chords = chordDegrees.map((deg) => deg.map((d) => midiToHz(root2 + 12 + d)));
    const scaleHz = scaleOffsets.map((s) => midiToHz(root2 + 24 + s));
    const subHz = chordDegrees.map((deg) => midiToHz(root2 + deg[0]));
    return { chords, scaleHz, subHz };
  }

  // ---------- Main Synthesizer Kit Factory ----------
  SOUND.kit = function (ctx, opts) {
    const o = opts || {};
    const mixMode = o.mixMode || (o.voiceover === false ? 'full' : 'sfxOnly');
    const isBgmOnly = mixMode === 'bgmOnly' || mixMode === 'bgmFull';
    const isSfxOnly = mixMode === 'sfxOnly';
    const VO = mixMode === 'vo' || mixMode === 'bgmOnly';

    const T0 = (o.start || 0) - 0;
    const base = ctx.currentTime + (o.delay || 0);
    const SR = ctx.sampleRate;
    const at = (t) => (Math.round((base + (t - T0)) * SR) + 0.25) / SR;

    const master = ctx.createGain();
    master.gain.value = o.master == null ? 0.92 : o.master;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 8;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.004;
    comp.release.value = 0.16;
    comp.connect(master);
    master.connect(o.dest || ctx.destination);

    const bus = {
      heavy: ctx.createGain(),
      sfx: ctx.createGain(),
      amb: ctx.createGain(),
      music: ctx.createGain(),
    };
    bus.heavy.gain.value = isBgmOnly ? 0 : MIX.HEAVY_IMPACT;
    bus.sfx.gain.value = isBgmOnly ? 0 : MIX.UI_FOLEY;
    bus.amb.gain.value = isBgmOnly ? 0 : MIX.AMBIENT_LOOP;
    bus.music.gain.value = isSfxOnly ? 0 : VO ? MIX.BGM_VO_BED : 0.42;

    Object.values(bus).forEach((b) => b.connect(comp));

    const verb = ctx.createConvolver();
    {
      const secs = 2.1;
      const len = Math.floor(secs * SR);
      const ir = ctx.createBuffer(2, len, SR);
      for (let c = 0; c < 2; c++) {
        const r = rand('lumina-verb-' + c);
        const d = ir.getChannelData(c);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const u = i / len;
          lp += (0.54 - 0.38 * u) * (r() * 2 - 1 - lp);
          d[i] = lp * Math.pow(1 - u, 2.6);
        }
      }
      verb.buffer = ir;
    }
    const verbIn = ctx.createGain();
    verbIn.gain.value = 0.88;
    verbIn.connect(verb);
    verb.connect(comp);

    const noiseBuf = {};
    {
      const len = Math.floor(2.5 * SR);
      for (const kind of ['white', 'pink', 'brown']) {
        const b = ctx.createBuffer(1, len, SR);
        const d = b.getChannelData(0);
        const r = rand('lumina-noise-' + kind);
        let p0 = 0, p1 = 0, p2 = 0, br = 0;
        for (let i = 0; i < len; i++) {
          const w = r() * 2 - 1;
          if (kind === 'white') d[i] = w;
          else if (kind === 'pink') {
            p0 = 0.997 * p0 + 0.029 * w;
            p1 = 0.985 * p1 + 0.032 * w;
            p2 = 0.95 * p2 + 0.048 * w;
            d[i] = (p0 + p1 + p2 + w * 0.05) * 2.2;
          } else {
            br = (br + 0.02 * w) / 1.02;
            d[i] = br * 3.2;
          }
        }
        noiseBuf[kind] = b;
      }
    }

    function sweep(param, v, t) {
      if (!Array.isArray(v)) {
        param.setValueAtTime(Math.max(TINY, v), t);
        return;
      }
      param.setValueAtTime(Math.max(TINY, v[0][1]), t + v[0][0]);
      for (let i = 1; i < v.length; i++) {
        param.exponentialRampToValueAtTime(Math.max(1, v[i][1]), t + v[i][0]);
      }
    }

    function shape(param, t, gain, dur, a, hold) {
      a = Math.min(a == null ? 0.004 : a, dur * 0.9);
      hold = Math.min(hold || 0, dur - a);
      param.setValueAtTime(0, t);
      param.linearRampToValueAtTime(Math.max(TINY, gain), t + a);
      if (hold > 0) param.setValueAtTime(Math.max(TINY, gain), t + a + hold);
      param.exponentialRampToValueAtTime(TINY, t + dur);
      param.setValueAtTime(0, t + dur + 0.001);
    }

    function out(node, p) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, p.pan || 0));
      node.connect(pan);
      const targetBus = bus[p.bus || 'sfx'] || bus.sfx;
      pan.connect(targetBus);
      if (p.verb) {
        const s = ctx.createGain();
        s.gain.value = p.verb;
        pan.connect(s);
        s.connect(verbIn);
      }
    }

    function tone(time, p) {
      const dur = p.dur || 0.2;
      const t = at(time);
      if (t + dur < ctx.currentTime || (time < T0 - 0.001 && dur < 1.5)) return;
      const freq = Array.isArray(p.f) ? p.f.map(([d, v]) => [d, hz(v)]) : hz(p.f || 440);
      if (!Array.isArray(freq) && freq <= 0) return;
      const osc = ctx.createOscillator();
      osc.type = p.type || 'sine';
      sweep(osc.frequency, freq, t);
      if (p.detune) osc.detune.value = p.detune;
      const g = ctx.createGain();
      shape(g.gain, t, p.gain == null ? 0.35 : p.gain, dur, p.a, p.hold);
      let node = osc;
      if (p.filter) {
        const f = ctx.createBiquadFilter();
        f.type = p.filter;
        f.Q.value = p.q == null ? 0.8 : p.q;
        sweep(f.frequency, p.f2 || 2000, t);
        osc.connect(f);
        node = f;
      }
      node.connect(g);
      out(g, p);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    function noise(time, p) {
      const dur = p.dur || 0.2;
      const t = at(time);
      if (t + dur < ctx.currentTime || (time < T0 - 0.001 && dur < 1.5)) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf[p.color || 'white'];
      src.loop = true;
      if (p.rate) src.playbackRate.value = p.rate;
      const g = ctx.createGain();
      shape(g.gain, t, p.gain == null ? 0.35 : p.gain, dur, p.a, p.hold);
      if (p.filter) {
        const f = ctx.createBiquadFilter();
        f.type = p.filter;
        f.Q.value = p.q == null ? 1.0 : p.q;
        sweep(f.frequency, p.f == null ? 1000 : p.f, t);
        src.connect(f);
        f.connect(g);
      } else {
        src.connect(g);
      }
      out(g, p);
      const off = rand('off-' + time + '-' + (p.f || ''))() * 2;
      src.start(t, off);
      src.stop(t + dur + 0.02);
    }

    // ---------- 1. Universal Multi-Era, Geological, Combat, Science & Aviation SFX ----------
    const S = {
      // --- Heavy Impacts (Routed to bus: 'heavy' @ 0.75) ---
      decompressionBang: (t, o) => {
        tone(t, { f: [[0, 190], [0.22, 34]], dur: 0.35, gain: 0.85 * o.g, bus: 'heavy', pan: o.pan });
        noise(t, { dur: 0.14, color: 'white', filter: 'bandpass', f: 2200, q: 0.9, gain: 0.75 * o.g, a: 0.001, bus: 'heavy', verb: 0.25, pan: o.pan });
        noise(t + 0.03, { dur: 0.85, color: 'pink', filter: 'bandpass', f: [[0, 2800], [0.85, 580]], q: 0.8, gain: 0.55 * o.g, a: 0.01, bus: 'heavy', verb: 0.35, pan: o.pan });
      },
      volcanoRumble: (t, o) => {
        const d = o.dur || 1.8;
        tone(t, { f: [[0, 95], [d, 28]], type: 'sawtooth', filter: 'lowpass', f2: 180, dur: d, gain: 0.75 * o.g, a: 0.04, bus: 'heavy', verb: 0.4, pan: o.pan });
        noise(t, { dur: d, color: 'brown', filter: 'lowpass', f: 380, gain: 0.7 * o.g, a: 0.04, hold: d * 0.4, bus: 'heavy', verb: 0.45, pan: o.pan });
      },
      dinoRoar: (t, o) => {
        const d = o.dur || 1.2;
        tone(t, { f: [[0, 160], [d * 0.3, 240], [d, 72]], type: 'sawtooth', filter: 'bandpass', f2: [[0, 420], [d, 180]], q: 2.2, dur: d, gain: 0.72 * o.g, a: 0.05, bus: 'heavy', verb: 0.45, pan: o.pan });
        noise(t, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 650], [d, 260]], q: 1.4, gain: 0.52 * o.g, a: 0.05, bus: 'heavy', verb: 0.35, pan: o.pan });
      },
      powerDown: (t, o) => {
        const d = o.dur || 0.95;
        tone(t, { f: [[0, 260], [d, 38]], type: 'sawtooth', filter: 'lowpass', f2: [[0, 900], [d, 90]], dur: d, gain: 0.55 * o.g, a: 0.01, bus: 'heavy', verb: 0.3, pan: o.pan });
        noise(t, { dur: 0.04, filter: 'bandpass', f: 1600, q: 2, gain: 0.4 * o.g, bus: 'heavy', pan: o.pan });
      },
      boltSnap: (t, o) => {
        tone(t, { f: [[0, 1850], [0.08, 620]], type: 'triangle', dur: 0.12, gain: 0.6 * o.g, bus: 'heavy', verb: 0.25, pan: o.pan });
        noise(t, { dur: 0.03, filter: 'highpass', f: 2800, gain: 0.55 * o.g, bus: 'heavy', pan: o.pan });
      },
      shatter: (t, o) => {
        const r = rand('shatter' + t);
        noise(t, { dur: 0.15, filter: 'highpass', f: 2200, gain: 0.5 * o.g, bus: 'heavy', pan: o.pan });
        for (let i = 0; i < 9; i++) {
          tone(t + i * 0.025 + r() * 0.015, { f: 1800 + r() * 3200, dur: 0.09, gain: 0.22 * o.g, bus: 'heavy', verb: 0.2, pan: (r() - 0.5) * 0.6 });
        }
      },
      thud: (t, o) => {
        tone(t, { f: [[0, o.f || 135], [0.16, 42]], dur: 0.26, gain: 0.65 * o.g, bus: 'heavy', pan: o.pan });
        noise(t, { dur: 0.09, color: 'brown', filter: 'lowpass', f: 500, gain: 0.4 * o.g, bus: 'heavy', pan: o.pan });
      },
      impact: (t, o) => {
        S.thud(t, o);
        noise(t, { dur: 0.65, color: 'pink', filter: 'lowpass', f: [[0, 2400], [0.6, 280]], gain: 0.42 * o.g, bus: 'heavy', verb: 0.35, pan: o.pan });
      },
      thunder: (t, o) => {
        const d = o.dur || 1.8;
        noise(t, { dur: d, color: 'brown', filter: 'lowpass', f: [[0, 480], [d, 90]], gain: 0.75 * o.g, a: 0.03, hold: 0.2, bus: 'heavy', verb: 0.45, pan: o.pan });
      },
      teleportPop: (t, o) => {
        tone(t, { f: [[0, 320], [0.09, 58]], dur: 0.14, gain: 0.65 * o.g, bus: 'heavy', pan: o.pan });
      },

      // --- Universal Historical, Combat, Construction, Science & Aviation Foley (bus: 'sfx' @ 0.45) ---
      swordClash: (t, o) => {
        // Metallic blade clash + high harmonic ring
        noise(t, { dur: 0.06, filter: 'bandpass', f: 3600, q: 2.5, gain: 0.55 * o.g, pan: o.pan });
        tone(t, { f: [[0, 2840], [0.35, 2790]], type: 'sine', dur: 0.38, gain: 0.35 * o.g, verb: 0.35, pan: o.pan });
        tone(t, { f: 4120, type: 'triangle', dur: 0.24, gain: 0.24 * o.g, verb: 0.3, pan: o.pan });
      },
      hammerHit: (t, o) => {
        const n = o.n || 1;
        const rate = o.rate || 0.42;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          tone(ti, { f: [[0, 1480], [0.08, 620]], type: 'triangle', dur: 0.11, gain: 0.45 * o.g, verb: 0.2, pan: o.pan });
          noise(ti, { dur: 0.035, filter: 'bandpass', f: 2400, q: 2.0, gain: 0.42 * o.g, pan: o.pan });
        }
      },
      horseGallop: (t, o) => {
        const n = o.n || 4;
        for (let i = 0; i < n; i++) {
          const b = t + i * 0.36;
          [0, 0.08, 0.17].forEach((off, k) => {
            tone(b + off, { f: [[0, 260 + k * 35], [0.04, 95]], dur: 0.05, gain: 0.34 * o.g, pan: o.pan });
            noise(b + off, { dur: 0.035, color: 'brown', filter: 'bandpass', f: 1100 + k * 200, q: 2.2, gain: 0.3 * o.g, pan: o.pan });
          });
        }
      },
      marchSteps: (t, o) => {
        const n = o.n || 4;
        const rate = o.rate || 0.42;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          tone(ti, { f: [[0, 155], [0.08, 48]], dur: 0.1, gain: 0.45 * o.g, pan: o.pan });
          noise(ti, { dur: 0.06, color: 'pink', filter: 'bandpass', f: 950, q: 1.5, gain: 0.38 * o.g, verb: 0.18, pan: o.pan });
        }
      },
      templeBell: (t, o) => {
        // Deep resonant bronze bell with sacred harmonic partials
        const f0 = hz(o.f || 'C5');
        tone(t, { f: f0, type: 'sine', dur: 2.2, gain: 0.42 * o.g, a: 0.003, verb: 0.65, pan: o.pan });
        tone(t, { f: f0 * 2.0, type: 'sine', dur: 1.4, gain: 0.2 * o.g, a: 0.002, verb: 0.55, pan: o.pan });
        tone(t, { f: f0 * 2.76, type: 'sine', dur: 0.85, gain: 0.14 * o.g, a: 0.002, verb: 0.45, pan: o.pan });
      },
      steamWhistle: (t, o) => {
        const d = o.dur || 0.85;
        tone(t, { f: 587.33, type: 'sawtooth', filter: 'lowpass', f2: 1800, dur: d, gain: 0.28 * o.g, a: 0.06, hold: d * 0.6, verb: 0.35, pan: o.pan });
        tone(t, { f: 739.99, type: 'sawtooth', filter: 'lowpass', f2: 1800, dur: d, gain: 0.24 * o.g, a: 0.06, hold: d * 0.6, verb: 0.35, pan: o.pan });
        noise(t, { dur: d, color: 'white', filter: 'bandpass', f: 2400, q: 1.8, gain: 0.25 * o.g, a: 0.04, pan: o.pan });
      },
      coinClink: (t, o) => {
        const n = o.n || 3;
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.075;
          tone(ti, { f: 3400 + (i % 2) * 520, type: 'sine', dur: 0.18, gain: 0.32 * o.g, a: 0.001, verb: 0.25, pan: o.pan });
          tone(ti, { f: 5100 + i * 310, type: 'sine', dur: 0.09, gain: 0.18 * o.g, a: 0.001, pan: o.pan });
        }
      },
      liquidBubble: (t, o) => {
        const n = o.n || 5;
        const r = rand('bub' + t);
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.08 + r() * 0.03;
          const f0 = 380 + r() * 420;
          tone(ti, { f: [[0, f0], [0.065, f0 * 2.1]], type: 'sine', dur: 0.075, gain: 0.28 * o.g, pan: o.pan });
        }
      },
      alarmBeep: (t, o) => {
        const n = o.n || 3;
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.48;
          tone(ti, { f: 2048, type: 'square', filter: 'bandpass', f2: 2048, q: 4, dur: 0.08, gain: 0.32 * o.g, a: 0.002, pan: o.pan });
          tone(ti + 0.11, { f: 2048, type: 'square', filter: 'bandpass', f2: 2048, q: 4, dur: 0.08, gain: 0.32 * o.g, a: 0.002, pan: o.pan });
        }
      },
      timerChime: (t, o) => {
        const f0 = hz(o.f || 'A5');
        tone(t, { f: f0, type: 'sine', dur: 0.65, gain: 0.38 * o.g, a: 0.002, verb: 0.4, pan: o.pan });
        tone(t, { f: f0 * 1.5, type: 'triangle', dur: 0.35, gain: 0.16 * o.g, a: 0.002, verb: 0.35, pan: o.pan });
        noise(t, { dur: 0.015, filter: 'bandpass', f: 3800, q: 3, gain: 0.2 * o.g, pan: o.pan });
      },
      maskDrop: (t, o) => {
        noise(t, { dur: 0.035, filter: 'bandpass', f: 1800, q: 1.8, gain: 0.42 * o.g, pan: o.pan });
        noise(t + 0.04, { dur: 0.22, filter: 'highpass', f: [[0, 1200], [0.22, 3600]], gain: 0.24 * o.g, pan: o.pan });
        tone(t + 0.24, { f: [[0, 420], [0.06, 210]], dur: 0.08, gain: 0.28 * o.g, pan: o.pan });
      },
      seatbeltClick: (t, o) => {
        noise(t, { dur: 0.018, filter: 'bandpass', f: 3400, q: 2.5, gain: 0.45 * o.g, pan: o.pan });
        tone(t + 0.01, { f: 1920, dur: 0.04, gain: 0.25 * o.g, pan: o.pan });
        noise(t + 0.045, { dur: 0.025, filter: 'bandpass', f: 2200, q: 2.0, gain: 0.38 * o.g, pan: o.pan });
      },
      engineSpoolDown: (t, o) => {
        const d = o.dur || 1.4;
        tone(t, { f: [[0, 480], [d, 110]], type: 'sawtooth', filter: 'bandpass', f2: [[0, 1200], [d, 260]], dur: d, gain: 0.34 * o.g, a: 0.05, verb: 0.25, pan: o.pan });
      },
      paperTear: (t, o) => {
        const d = o.dur || 0.35;
        noise(t, { dur: d, color: 'white', filter: 'bandpass', f: [[0, 1800], [d, 4200]], q: 1.4, gain: 0.38 * o.g, a: 0.02, pan: o.pan });
      },
      phoneDial: (t, o) => {
        tone(t, { f: 440, dur: 0.8, gain: 0.22 * o.g, a: 0.01, hold: 0.7, pan: o.pan });
        tone(t, { f: 480, dur: 0.8, gain: 0.22 * o.g, a: 0.01, hold: 0.7, pan: o.pan });
      },
      heartbeatSub: (t, o) => {
        tone(t, { f: [[0, 82], [0.11, 38]], dur: 0.16, gain: 0.62 * o.g, pan: o.pan });
        tone(t + 0.21, { f: [[0, 74], [0.14, 34]], dur: 0.18, gain: 0.48 * o.g, pan: o.pan });
      },
      starShimmer: (t, o) => {
        const notes = ['C5', 'E5', 'G5', 'B5', 'D6', 'E6', 'G6', 'B6'];
        notes.forEach((n, idx) => {
          tone(t + idx * 0.055, { f: n, type: 'sine', dur: 0.85, gain: 0.22 * o.g, a: 0.003, verb: 0.55, pan: (idx - 3.5) * 0.18 });
        });
      },
      birdSong: (t, o) => {
        tone(t, { f: [[0, 2400], [0.09, 3200], [0.18, 2800]], dur: 0.2, gain: 0.25 * o.g, verb: 0.3, pan: o.pan });
        tone(t + 0.24, { f: [[0, 2900], [0.12, 3600]], dur: 0.15, gain: 0.25 * o.g, verb: 0.3, pan: o.pan });
      },
      dogWhimper: (t, o) => {
        const d = o.dur || 0.42;
        tone(t, { f: [[0, 680], [d * 0.4, 820], [d, 490]], type: 'triangle', dur: d, gain: 0.24 * o.g, a: 0.03, verb: 0.2, pan: o.pan });
      },
      toasterPop: (t, o) => {
        noise(t, { dur: 0.03, filter: 'bandpass', f: 1600, q: 1.5, gain: 0.4 * o.g, pan: o.pan });
        tone(t + 0.01, { f: [[0, 320], [0.08, 580]], dur: 0.09, gain: 0.32 * o.g, pan: o.pan });
      },
      seismographScratch: (t, o) => {
        S.penScratch(t, o);
      },
      pillBadge: (t, o) => {
        const f0 = hz(o.f || 'G5');
        tone(t, { f: f0, type: 'triangle', dur: 0.09, gain: 0.36 * o.g, a: 0.002, verb: 0.18, pan: o.pan });
        tone(t + 0.035, { f: f0 * 1.498, type: 'sine', dur: 0.14, gain: 0.3 * o.g, a: 0.002, verb: 0.22, pan: o.pan });
      },
      counterTick: (t, o) => {
        const n = o.n || 1;
        const rate = o.rate || 0.055;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          const pitch = (o.f || 2400) * (1 + (i / Math.max(1, n)) * 0.25);
          noise(ti, { dur: 0.016, filter: 'bandpass', f: pitch, q: 3.0, gain: 0.32 * o.g, pan: o.pan });
        }
      },
      pop: (t, o) => {
        tone(t, { f: [[0, o.f || 620], [0.07, (o.f || 620) * 0.45]], dur: 0.1, gain: 0.42 * o.g, pan: o.pan });
      },
      whoosh: (t, o) => {
        const d = o.dur || 0.38;
        noise(t, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 320], [d * 0.55, o.top || 2200], [d, 580]], q: 0.9, gain: 0.42 * o.g, a: d * 0.45, pan: o.pan, verb: 0.15 });
      },
      swish: (t, o) => {
        const d = o.dur || 0.18;
        noise(t, { dur: d, filter: 'highpass', f: [[0, 1800], [d, 5200]], q: 0.7, gain: 0.28 * o.g, a: d * 0.35, pan: o.pan });
      },
      footstep: (t, o) => {
        const n = o.n || 1;
        const stepRate = o.rate || 0.38;
        for (let i = 0; i < n; i++) {
          const ti = t + i * stepRate;
          tone(ti, { f: [[0, 140], [0.06, 55]], dur: 0.08, gain: 0.32 * o.g, pan: o.pan });
          noise(ti, { dur: 0.045, color: 'brown', filter: 'bandpass', f: 900 + (i % 2) * 180, q: 1.4, gain: 0.28 * o.g, pan: o.pan });
        }
      },
      penScratch: (t, o) => {
        const d = o.dur || 0.45;
        const r = rand('pen' + t);
        for (let x = 0; x < d; x += 0.038 + r() * 0.035) {
          const gd = 0.032 + r() * 0.025;
          noise(t + x, { dur: gd, filter: 'bandpass', f: 3400 + r() * 1400, q: 1.6, gain: 0.24 * o.g, a: gd * 0.3, pan: o.pan });
        }
      },
      ding: (t, o) => {
        const f = hz(o.f || 'E6');
        tone(t, { f, dur: 1.1, gain: 0.28 * o.g, verb: 0.3, pan: o.pan });
      },
      sparkle: (t, o) => {
        S.starShimmer(t, o);
      },
      blip: (t, o) => {
        tone(t, { f: o.f || 'E6', type: 'triangle', dur: 0.07, gain: 0.22 * o.g, a: 0.002, pan: o.pan });
      },
      tick: (t, o) => {
        noise(t, { dur: 0.016, filter: 'bandpass', f: o.f || 4200, q: 2.8, gain: 0.3 * o.g, pan: o.pan });
      },
    };

    function play(name, t, opts) {
      if (isBgmOnly) return;
      const fn = S[name] || S.pop;
      const o2 = Object.assign({}, opts);
      o2.g = o2.gain == null ? 1 : o2.gain;
      fn(t, o2);
    }

    // ---------- 2. Ambient Environment Beds (Routed to bus: 'amb' @ 0.20) ----------
    function bed(name, t0, t1, p) {
      if (isBgmOnly) return;
      p = p || {};
      const g = p.gain == null ? 1 : p.gain;
      const d = Math.max(0.1, t1 - t0);
      const fade = Math.min(0.4, d / 4);
      const long = (q) => Object.assign({ dur: d, a: fade, hold: Math.max(0, d - fade * 2), bus: 'amb' }, q);

      if (name === 'cabinHum') {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 240, gain: 0.48 * g }));
        tone(t0, long({ f: 92, type: 'sine', gain: 0.16 * g }));
      } else if (name === 'supersonicWind' || name === 'cabinRoar') {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 1150, q: 0.55, gain: 0.58 * g }));
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 360, gain: 0.45 * g }));
      } else if (name === 'volcanoLava') {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 190, gain: 0.55 * g }));
      } else if (name === 'fountainWater') {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 1850, q: 0.6, gain: 0.32 * g }));
      } else if (name === 'rain') {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 2400, q: 0.45, gain: 0.35 * g }));
      } else if (name === 'ocean') {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 420, gain: 0.45 * g }));
      } else if (name === 'wind' || name === 'citySilence') {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 480, q: 1.2, gain: 0.28 * g }));
      } else {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 280, gain: 0.26 * g }));
      }
    }

    // ---------- 3. Generative Situational & Cultural Audio Engine (Stems & Voices) ----------
    const VOICES = {
      subPedal: (t, f, dur, g = 1) => {
        if (!f) return;
        tone(t, { f, type: 'sine', dur: dur + 0.15, gain: 0.38 * g, a: Math.min(0.18, dur * 0.25), hold: dur * 0.55, bus: 'music' });
        tone(t, { f: f * 2, type: 'triangle', dur: dur, gain: 0.12 * g, a: 0.1, filter: 'lowpass', f2: 260, bus: 'music' });
      },
      tanpuraDrone: (t, f, dur, g = 1) => {
        if (!f) return;
        tone(t, { f: f * 2, type: 'sawtooth', dur: dur + 0.2, gain: 0.14 * g, a: 0.3, hold: dur * 0.6, filter: 'bandpass', f2: f * 4, q: 2.2, bus: 'music', verb: 0.45, pan: -0.25 });
        tone(t, { f: f * 3, type: 'sawtooth', dur: dur + 0.2, gain: 0.11 * g, a: 0.3, hold: dur * 0.6, filter: 'bandpass', f2: f * 6, q: 2.2, bus: 'music', verb: 0.45, pan: 0.25 });
      },
      pulseOstinato: (t, f, dur, cutoff, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', dur, gain: 0.28 * g, a: 0.005, filter: 'lowpass', f2: cutoff, q: 1.8, bus: 'music', verb: 0.18, pan });
      },
      analogPad: (t, chordHz, dur, cutoff, g = 1) => {
        chordHz.forEach((f, idx) => {
          if (!f) return;
          const pan = (idx - (chordHz.length - 1) / 2) * 0.32;
          tone(t, { f, type: 'sawtooth', detune: -6, dur: dur + 0.35, gain: 0.13 * g, a: Math.min(0.5, dur * 0.35), hold: Math.max(0.1, dur - 0.55), filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.52, pan });
          tone(t, { f, type: 'triangle', detune: 6, dur: dur + 0.35, gain: 0.14 * g, a: Math.min(0.5, dur * 0.35), hold: Math.max(0.1, dur - 0.55), filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.45, pan: -pan });
        });
      },
      sitarVeena: (t, f, dur = 0.65, g = 1, pan = 0) => {
        if (!f) return;
        // Plucked string with bridge buzz (jawari) & sympathetic resonance
        tone(t, { f: [[0, f * 1.015], [0.06, f]], type: 'sawtooth', dur, gain: 0.28 * g, a: 0.003, filter: 'bandpass', f2: [[0, f * 5], [dur, f * 1.8]], q: 2.0, bus: 'music', verb: 0.42, pan });
        tone(t, { f: f * 2, type: 'triangle', dur: dur * 0.7, gain: 0.12 * g, a: 0.002, bus: 'music', verb: 0.48, pan: -pan * 0.5 });
      },
      kotoPluck: (t, f, dur = 0.55, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'triangle', dur, gain: 0.32 * g, a: 0.002, filter: 'lowpass', f2: [[0, f * 4], [dur, f * 1.2]], bus: 'music', verb: 0.45, pan });
        noise(t, { dur: 0.012, filter: 'bandpass', f: 3200, q: 3, gain: 0.14 * g, bus: 'music', pan });
      },
      bambooFlute: (t, f, dur = 1.2, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f: [[0, f * 0.985], [0.12, f]], type: 'sine', dur, gain: 0.26 * g, a: 0.08, hold: dur * 0.5, bus: 'music', verb: 0.5, pan });
        noise(t, { dur: dur * 0.8, color: 'pink', filter: 'bandpass', f: f * 2, q: 3.5, gain: 0.08 * g, a: 0.06, bus: 'music', verb: 0.4, pan });
      },
      harpsichordStrings: (t, f, dur = 0.75, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', dur, gain: 0.24 * g, a: 0.004, filter: 'lowpass', f2: f * 3.2, bus: 'music', verb: 0.38, pan });
      },
      feltPiano: (t, f, dur = 1.4, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'triangle', dur, gain: 0.32 * g, a: 0.01, hold: dur * 0.18, filter: 'lowpass', f2: f * 2.4, bus: 'music', verb: 0.42, pan });
        tone(t, { f: f * 2, type: 'sine', dur: dur * 0.45, gain: 0.07 * g, a: 0.008, bus: 'music', verb: 0.35, pan });
      },
      kalimbaMarimba: (t, f, dur = 0.34, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sine', dur, gain: 0.34 * g, a: 0.002, bus: 'music', verb: 0.3, pan });
        tone(t, { f: f * 4, type: 'sine', dur: 0.04, gain: 0.1 * g, a: 0.001, bus: 'music', pan });
      },
      celestaHarp: (t, f, dur = 0.85, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sine', dur, gain: 0.24 * g, a: 0.003, bus: 'music', verb: 0.55, pan });
        tone(t, { f: f * 3, type: 'sine', dur: 0.22, gain: 0.06 * g, a: 0.002, bus: 'music', pan });
      },
      clockEscapement: (t, isAccent, g = 1, pan = 0) => {
        const pitch = isAccent ? 4200 : 3100;
        noise(t, { dur: 0.015, filter: 'bandpass', f: pitch, q: 3.5, gain: (isAccent ? 0.22 : 0.13) * g, bus: 'music', verb: 0.12, pan });
      },
      mridangamTabla: (t, isDownbeat, g = 1, pan = 0) => {
        const f0 = isDownbeat ? 146.8 : 293.6;
        tone(t, { f: [[0, f0 * 1.12], [0.05, f0]], type: 'sine', dur: 0.24, gain: 0.32 * g, a: 0.002, bus: 'music', verb: 0.22, pan });
        noise(t, { dur: 0.022, filter: 'bandpass', f: 1800, q: 2.5, gain: 0.18 * g, bus: 'music', pan });
      },
      cinematicTom: (t, isDownbeat, g = 1) => {
        const f0 = isDownbeat ? 115 : 88;
        tone(t, { f: [[0, f0], [0.14, 42]], dur: 0.22, gain: (isDownbeat ? 0.34 : 0.22) * g, bus: 'music', verb: 0.28 });
      },
      brushShaker: (t, isAccent, g = 1, pan = 0) => {
        noise(t, { dur: 0.045, filter: 'highpass', f: 4800, gain: (isAccent ? 0.14 : 0.08) * g, a: 0.005, bus: 'music', pan });
      },
    };

    function situationalCue(c) {
      if (isSfxOnly || !c) return;
      const sit = String(c.situation || c.archetype || 'SCIENTIFIC_INQUIRY').toUpperCase();
      const culture = c.culture || 'modernCinematic';
      const t0 = c.start_time !== undefined ? c.start_time : 0;
      const t1 = c.end_time !== undefined ? c.end_time : t0 + 10;
      if (sit === 'DIEGETIC_SILENCE' || sit === 'HARD_STOP' || t1 <= t0) return;

      const tension = clamp(c.tension !== undefined ? c.tension : 0.5, 0, 1);
      const valence = clamp(c.valence !== undefined ? c.valence : 0.0, -1, 1);
      const baseBpm = c.bpm || (sit === 'TICKING_SURVIVAL' ? 120 : sit === 'SOLEMN_TRAGEDY' ? 76 : 104);
      const g = c.gain == null ? 1 : c.gain;

      const { chords, scaleHz, subHz } = buildSituationalHarmony(c.key || 'D Minor', valence, tension, culture);

      const defaultStems = {
        sub: sit !== 'EERIE_ISOLATION',
        pulse: sit === 'TICKING_SURVIVAL' || sit === 'HEROIC_RESCUE' || sit === 'PLAYFUL_FREEDOM' || tension > 0.6,
        pad: sit !== 'PLAYFUL_FREEDOM',
        melody: true,
        perc: sit === 'PLAYFUL_FREEDOM' || sit === 'HEROIC_RESCUE' || sit === 'HISTORICAL_GRANDEUR' || (sit === 'TICKING_SURVIVAL' && tension > 0.75),
        clock: sit === 'TICKING_SURVIVAL' || (sit === 'SCIENTIFIC_INQUIRY' && tension > 0.45),
      };
      const stems = Object.assign(defaultStems, c.layerStems || {});

      if (c.timerChime || c.chapter_chime) {
        if (culture === 'indianClassical' || culture === 'eastAsian') {
          S.templeBell(t0, { f: scaleHz[0] || 523.25, g: 0.9 * g });
        } else {
          VOICES.celestaHarp(t0, scaleHz[4] || 587.33, 1.2, 1.15 * g, -0.15);
          VOICES.kalimbaMarimba(t0 + 0.08, scaleHz[7] || 880, 0.6, 1.05 * g, 0.15);
        }
      }

      const filterCutoff = lerp(480, 3200, Math.pow(tension, 1.3));
      const r = rand('sit-cue-' + t0 + '-' + sit + '-' + culture);

      let tb = t0;
      let barIdx = 0;
      while (tb < t1 - 0.04) {
        const uCue = clamp((tb - t0) / Math.max(0.1, t1 - t0), 0, 1);
        const curBpm = Array.isArray(c.tempoCurve)
          ? lerp(c.tempoCurve[0][1], c.tempoCurve[c.tempoCurve.length - 1][1], uCue)
          : baseBpm;
        const beat = 60 / clamp(curBpm, 48, 180);
        const bar = beat * 4;
        const barLen = Math.min(bar, t1 - tb);

        const ch = chords[barIdx % chords.length];
        const rootSub = subHz[barIdx % subHz.length];

        if (stems.sub) {
          VOICES.subPedal(tb, rootSub, barLen, g * (sit === 'COSMIC_AWE' ? 1.15 : 0.9));
          if (culture === 'indianClassical') {
            VOICES.tanpuraDrone(tb, rootSub, barLen, g * 0.85);
          }
        }

        if (stems.pad) {
          const padGain = sit === 'COSMIC_AWE' || sit === 'SOLEMN_TRAGEDY' ? 1.2 : 0.78;
          VOICES.analogPad(tb, ch, barLen, filterCutoff, g * padGain);
        }

        if (stems.pulse) {
          const subDiv = tension > 0.55 || sit === 'TICKING_SURVIVAL' ? 16 : 8;
          const stepDur = bar / subDiv;
          for (let s = 0; s < subDiv && tb + s * stepDur < t1 - 0.02; s++) {
            const ts = tb + s * stepDur;
            const noteF = ch[s % ch.length] * 0.5;
            const accent = s % 4 === 0 ? 1.0 : 0.62;
            VOICES.pulseOstinato(ts, noteF, stepDur * 0.85, filterCutoff, g * accent * 0.85, ((s % 2) - 0.5) * 0.25);
          }
        }

        if (stems.clock) {
          for (let s = 0; s < 8 && tb + s * (beat / 2) < t1 - 0.02; s++) {
            const ts = tb + s * (beat / 2);
            VOICES.clockEscapement(ts, s % 2 === 0, g * (0.65 + tension * 0.4), (s % 2 === 0 ? -1 : 1) * 0.3);
          }
        }

        if (stems.perc) {
          for (let b = 0; b < 4 && tb + b * beat < t1 - 0.02; b++) {
            const tBeat = tb + b * beat;
            if (culture === 'indianClassical') {
              VOICES.mridangamTabla(tBeat, b === 0 || b === 2, g, -0.15);
              if (tension > 0.45 && tBeat + beat * 0.5 < t1) {
                VOICES.mridangamTabla(tBeat + beat * 0.5, false, g * 0.75, 0.15);
              }
            } else if (sit === 'PLAYFUL_FREEDOM') {
              VOICES.brushShaker(tBeat, b % 2 === 0, g, -0.2);
              VOICES.brushShaker(tBeat + beat * 0.5, false, g, 0.2);
            } else {
              VOICES.cinematicTom(tBeat, b === 0 || b === 2, g * (0.7 + tension * 0.35));
            }
          }
        }

        if (stems.melody) {
          if (sit === 'EERIE_ISOLATION') {
            const dropBeat = (barIdx % 2 === 0 ? 0.5 : 1.5) * beat;
            if (tb + dropBeat < t1 - 0.05) {
              const fNote = scaleHz[(barIdx * 3 + 2) % scaleHz.length];
              if (culture === 'eastAsian') VOICES.bambooFlute(tb + dropBeat, fNote, beat * 2.0, g * 0.9, 0);
              else VOICES.feltPiano(tb + dropBeat, fNote, beat * 2.2, g * 0.9, (r() - 0.5) * 0.4);
            }
          } else if (sit === 'SOLEMN_TRAGEDY') {
            for (let b = 0; b < 4 && tb + b * beat < t1 - 0.05; b += 2) {
              const fNote = ch[b % ch.length] * 2;
              VOICES.feltPiano(tb + b * beat, fNote, beat * 1.9, g * 0.88, (b - 1) * 0.2);
            }
          } else if (sit === 'COSMIC_AWE') {
            for (let s = 0; s < 8 && tb + s * (beat / 2) < t1 - 0.02; s++) {
              const fNote = scaleHz[(barIdx * 2 + s) % scaleHz.length];
              VOICES.celestaHarp(tb + s * (beat / 2), fNote, beat * 1.2, g * 0.92, ((s % 4) - 1.5) * 0.28);
            }
          } else {
            const steps = sit === 'SCIENTIFIC_INQUIRY' ? 12 : 8;
            const stepDur = bar / steps;
            for (let s = 0; s < steps && tb + s * stepDur < t1 - 0.02; s++) {
              if (sit === 'TICKING_SURVIVAL' && s % 3 === 2) continue;
              const fNote = scaleHz[(s * 2 + barIdx) % scaleHz.length];
              const pan = Math.sin(s * 1.3) * 0.35;
              if (culture === 'indianClassical') {
                VOICES.sitarVeena(tb + s * stepDur, fNote, stepDur * 1.35, g * (s % 4 === 0 ? 0.95 : 0.65), pan);
              } else if (culture === 'eastAsian') {
                VOICES.kotoPluck(tb + s * stepDur, fNote, stepDur * 1.35, g * (s % 4 === 0 ? 0.95 : 0.65), pan);
              } else if (culture === 'victorianClassical') {
                VOICES.harpsichordStrings(tb + s * stepDur, fNote, stepDur * 1.25, g * (s % 4 === 0 ? 0.9 : 0.6), pan);
              } else {
                VOICES.kalimbaMarimba(tb + s * stepDur, fNote, stepDur * 1.1, g * (s % 4 === 0 ? 0.9 : 0.6), pan);
              }
            }
          }
        }

        tb += bar;
        barIdx++;
      }
    }

    function cue(archetype, t0, t1, p = {}) {
      const mapLegacy = {
        ARCH_01: { situation: 'PLAYFUL_FREEDOM', tension: 0.35, valence: 0.65 },
        ARCH_02: { situation: 'SCIENTIFIC_INQUIRY', tension: 0.45, valence: 0.1 },
        ARCH_03: { situation: 'COSMIC_AWE', tension: 0.5, valence: 0.85 },
        ARCH_04: { situation: 'SOLEMN_TRAGEDY', tension: 0.3, valence: -0.6 },
        ARCH_05: { situation: 'TICKING_SURVIVAL', tension: 0.85, valence: -0.5 },
        ARCH_06: { situation: 'HEROIC_RESCUE', tension: 0.75, valence: 0.75 },
        HARD_STOP: { situation: 'DIEGETIC_SILENCE', tension: 0, valence: 0 },
      };
      const mapped = mapLegacy[archetype] || { situation: archetype };
      situationalCue(Object.assign({}, p, mapped, { start_time: t0, end_time: t1 }));
    }

    function bgmScore(score) {
      if (!score || isSfxOnly) return;
      if (Array.isArray(score.cues)) {
        score.cues.forEach((c) => situationalCue(c));
      }
      if (Array.isArray(score.volume_automation) && score.volume_automation.length > 0) {
        const pts = score.volume_automation;
        const scaleVol = (v) => (mixMode === 'bgmFull' && v > 0 && v < 0.35 ? 0.42 : v);
        bus.music.gain.setValueAtTime(scaleVol(pts[0].volume), at(pts[0].time));
        for (let i = 1; i < pts.length; i++) {
          const tA = at(pts[i].time);
          if (tA >= ctx.currentTime) {
            bus.music.gain.linearRampToValueAtTime(scaleVol(pts[i].volume), tA);
          }
        }
      }
    }

    return {
      play,
      bed,
      situationalCue,
      cue,
      bgmScore,
      tone,
      noise,
      hz,
      MIX,
      vo: VO,
      sounds: Object.keys(S),
    };
  };

  // ---------- 4. Live Browser Playback & Offline WAV Renderer ----------
  SOUND.live = function (fn, fromT, opts) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    fn(SOUND.kit(ctx, Object.assign({}, opts, { start: fromT || 0, delay: 0.03 })));
    return () => {
      try {
        ctx.close();
      } catch (e) {}
    };
  };

  SOUND.renderOffline = async function (fn, duration, sampleRate, kitOpts) {
    const sr = sampleRate || 48000;
    const len = Math.ceil(duration * sr);
    const ctx = new OfflineAudioContext(2, len, sr);
    fn(SOUND.kit(ctx, kitOpts || {}));
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const inter = new Float32Array(len * 2);
    let peak = 0;
    for (let i = 0; i < len; i++) {
      inter[2 * i] = L[i];
      inter[2 * i + 1] = R[i];
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    }
    return { inter, peak, frames: len, sr, buffer: buf };
  };

  SOUND.encodeWAV = function (interleaved, sampleRate = 48000) {
    const buffer = new ArrayBuffer(44 + interleaved.length * 2);
    const view = new DataView(buffer);
    const writeStr = (off, s) => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + interleaved.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, interleaved.length * 2, true);
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };
})();


// ============================================================================
// MODULE 5: LUMINA_CAMERA (lib/lumina_camera.js) — 3D-Parallax Perspective
// Camera Dollies, X-Ray Diagnostic Dissolves, Match-Cut Scale Morphs,
// Depth Rack-Focus, Decompression Flash Blooms & Automatic SFX Sync
// Logical Stage: 1920x1080 (16:9 Widescreen). Pure deterministic function of lt.
// ============================================================================
(function () {
'use strict';

const DK = (window.DK = window.DK || {});
const H = (window.H = window.H || DK);
const E = (window.E = DK.E || { W: 1920, H: 1080, PX: 1, fps: 60 });
const SOUND = (window.SOUND = window.SOUND || {});

E.W = H.W = 1920;
E.H = H.H = 1080;

const {
clamp,
lerp,
ease,
rng,
alpha,
rr,
circle,
ring,
seg,
glow,
} = DK;

// ---------- 1. Official Lumina 3D-Parallax & X-Ray Transition Presets ----------
const TRANS_PRESETS = {
HARD_CUT: {
outDur: 0.0,
inDur: 0.0,
matchIn: 'HARD_CUT',
sfx: null,
},
CAMERA_DOLLY_IN: {
outDur: 0.34,
inDur: 0.28,
matchIn: 'CAMERA_DOLLY_IN',
sfx: 'whoosh',
sfxOpts: { dur: 0.32, top: 1800, gain: 0.85 },
},
CAMERA_DOLLY_OUT: {
outDur: 0.34,
inDur: 0.28,
matchIn: 'CAMERA_DOLLY_OUT',
sfx: 'swish',
sfxOpts: { dur: 0.28, gain: 0.85 },
},
XRAY_DISSOLVE: {
outDur: 0.28,
inDur: 0.26,
matchIn: 'XRAY_DISSOLVE',
sfx: 'blip',
sfxOpts: { f: 'C6', gain: 0.75 },
},
MATCH_CUT_SCALE: {
outDur: 0.30,
inDur: 0.26,
matchIn: 'MATCH_CUT_SCALE',
sfx: 'whoosh',
sfxOpts: { dur: 0.26, top: 1400, gain: 0.75 },
},
WHIP_PAN_LEFT: {
outDur: 0.24,
inDur: 0.22,
matchIn: 'WHIP_PAN_LEFT',
sfx: 'whoosh',
sfxOpts: { dur: 0.26, top: 2400, pan: -0.45, gain: 0.9 },
},
WHIP_PAN_RIGHT: {
outDur: 0.24,
inDur: 0.22,
matchIn: 'WHIP_PAN_RIGHT',
sfx: 'whoosh',
sfxOpts: { dur: 0.26, top: 2400, pan: 0.45, gain: 0.9 },
},
WHIP_TILT_UP: {
outDur: 0.26,
inDur: 0.24,
matchIn: 'WHIP_TILT_UP',
sfx: 'whoosh',
sfxOpts: { dur: 0.28, top: 2800, gain: 0.9 },
},
WHIP_TILT_DOWN: {
outDur: 0.26,
inDur: 0.24,
matchIn: 'WHIP_TILT_DOWN',
sfx: 'whoosh',
sfxOpts: { dur: 0.28, top: 1500, gain: 0.9 },
},
DEPTH_RACK_FOCUS: {
outDur: 0.28,
inDur: 0.24,
matchIn: 'DEPTH_RACK_FOCUS',
sfx: 'timerChime',
sfxOpts: { f: 'A5', gain: 0.85 },
},
FLASH_BLOOM: {
outDur: 0.18,
inDur: 0.24,
matchIn: 'FLASH_BLOOM',
sfx: 'whoosh',
sfxOpts: { dur: 0.22, top: 3200, gain: 0.85 },
},
FADE_DIP: {
outDur: 0.44,
inDur: 0.40,
matchIn: 'FADE_DIP',
sfx: null,
},

```
// Legacy Alias Mappings (so older transition names work seamlessly)
ZOOM_THROUGH: { outDur: 0.34, inDur: 0.28, matchIn: 'CAMERA_DOLLY_IN', sfx: 'whoosh', sfxOpts: { dur: 0.32, top: 1800, gain: 0.85 } },
ZOOM_OUT_SNAP: { outDur: 0.30, inDur: 0.24, matchIn: 'CAMERA_DOLLY_OUT', sfx: 'swish', sfxOpts: { dur: 0.26, gain: 0.85 } },
WHIP_LEFT: { outDur: 0.24, inDur: 0.22, matchIn: 'WHIP_PAN_LEFT', sfx: 'whoosh', sfxOpts: { dur: 0.26, top: 2400, pan: -0.45, gain: 0.9 } },
WHIP_RIGHT: { outDur: 0.24, inDur: 0.22, matchIn: 'WHIP_PAN_RIGHT', sfx: 'whoosh', sfxOpts: { dur: 0.26, top: 2400, pan: 0.45, gain: 0.9 } },
WHIP_UP: { outDur: 0.26, inDur: 0.24, matchIn: 'WHIP_TILT_UP', sfx: 'whoosh', sfxOpts: { dur: 0.28, top: 2800, gain: 0.9 } },
WHIP_DOWN: { outDur: 0.26, inDur: 0.24, matchIn: 'WHIP_TILT_DOWN', sfx: 'whoosh', sfxOpts: { dur: 0.28, top: 1500, gain: 0.9 } },
FLASH_POP: { outDur: 0.18, inDur: 0.24, matchIn: 'FLASH_BLOOM', sfx: 'whoosh', sfxOpts: { dur: 0.22, gain: 0.85 } },
```

};

const ALIAS_MAP = {
ZOOM_THROUGH: 'CAMERA_DOLLY_IN',
ZOOM_OUT_SNAP: 'CAMERA_DOLLY_OUT',
WHIP_LEFT: 'WHIP_PAN_LEFT',
WHIP_RIGHT: 'WHIP_PAN_RIGHT',
WHIP_UP: 'WHIP_TILT_UP',
WHIP_DOWN: 'WHIP_TILT_DOWN',
FLASH_POP: 'FLASH_BLOOM',
};

function normalizeTrans(spec, phase = 'out') {
if (!spec) return { type: 'HARD_CUT', dur: 0 };
if (typeof spec === 'string') spec = { type: spec };
const rawKey = String(spec.type || 'HARD_CUT').toUpperCase();
const mappedType = ALIAS_MAP[rawKey] || rawKey;
const preset = TRANS_PRESETS[mappedType] || TRANS_PRESETS.HARD_CUT;
const defaultDur = phase === 'in' ? preset.inDur : preset.outDur;
return {
type: mappedType,
dur: spec.dur !== undefined ? Number(spec.dur) : defaultDur,
target: Array.isArray(spec.target) ? spec.target : [E.W * 0.5, E.H * 0.5],
dir: spec.dir || 'left',
color: spec.color || '#070B16',
accent: spec.accent || '#5CE1FF',
sfx: spec.sfx !== undefined ? spec.sfx : preset.sfx,
sfxOpts: Object.assign({}, preset.sfxOpts || {}, spec.sfxOpts || {}),
seed: spec.seed || 77,
};
}

// ---------- 2. Auto-Link Shot Boundary Transitions ----------
function linkShotTransitions(shots, theme) {
if (!Array.isArray(shots)) return shots;
const themeShots = (theme && theme.SHOTS) || (window.THEME && window.THEME.SHOTS) || {};

```
shots.forEach((s) => {
  const ts = themeShots[s.shot_number] || themeShots[s.id] || {};
  if (!s.transOut && ts.transOut) s.transOut = ts.transOut;
  if (!s.transIn && ts.transIn) s.transIn = ts.transIn;
});

for (let i = 0; i < shots.length; i++) {
  const cur = shots[i];
  if (!cur.transIn) {
    const prevShot = i > 0 ? shots[i - 1] : themeShots[cur.shot_number - 1];
    if (prevShot && prevShot.transOut) {
      const outSpec = normalizeTrans(prevShot.transOut, 'out');
      const preset = TRANS_PRESETS[outSpec.type] || TRANS_PRESETS.HARD_CUT;
      cur.transIn = {
        type: preset.matchIn || outSpec.type,
        dir: outSpec.dir,
        color: outSpec.color,
        accent: outSpec.accent,
        target: outSpec.target ? [E.W * 0.5, E.H * 0.5] : undefined,
      };
    }
  }
}
return shots;
```

}

// ---------- 3. Pre-Draw 3D Perspective Camera Transform ----------
function applyKinematicTransform(g, spec, progVal, phase) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;

```
const k =
  phase === 'out'
    ? Math.pow(clamp(progVal, 0, 1), 2.5)
    : Math.pow(1 - clamp(progVal, 0, 1), 2.3);
if (k <= 0.0001) return;

const sign = phase === 'out' ? 1 : -1;

if (t === 'WHIP_PAN_LEFT') {
  const dx = -E.W * 0.9 * k * sign;
  g.translate(E.W * 0.5 + dx, E.H * 0.5);
  g.transform(1 + k * 0.1, 0, -0.1 * k * sign, 1, 0, 0);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'WHIP_PAN_RIGHT') {
  const dx = E.W * 0.9 * k * sign;
  g.translate(E.W * 0.5 + dx, E.H * 0.5);
  g.transform(1 + k * 0.1, 0, 0.1 * k * sign, 1, 0, 0);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'WHIP_TILT_UP') {
  const dy = -E.H * 0.9 * k * sign;
  g.translate(E.W * 0.5, E.H * 0.5 + dy);
  g.scale(1, 1 + k * 0.12);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'WHIP_TILT_DOWN') {
  const dy = E.H * 0.9 * k * sign;
  g.translate(E.W * 0.5, E.H * 0.5 + dy);
  g.scale(1, 1 + k * 0.12);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'CAMERA_DOLLY_IN' || t === 'MATCH_CUT_SCALE') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  if (phase === 'out') {
    const z = lerp(1.0, 3.6, k);
    const cx = lerp(E.W * 0.5, tx, k);
    const cy = lerp(E.H * 0.5, ty, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-cx, -cy);
  } else {
    const z = lerp(1.0, 0.36, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-E.W * 0.5, -E.H * 0.5);
  }
} else if (t === 'CAMERA_DOLLY_OUT') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  if (phase === 'out') {
    const z = lerp(1.0, 0.34, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-E.W * 0.5, -E.H * 0.5);
  } else {
    const z = lerp(1.0, 2.5, k);
    const cx = lerp(E.W * 0.5, tx, k);
    const cy = lerp(E.H * 0.5, ty, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-cx, -cy);
  }
} else if (t === 'DEPTH_RACK_FOCUS') {
  const z = lerp(1.0, 1.08, k);
  g.translate(E.W * 0.5, E.H * 0.5);
  g.scale(z, z);
  g.translate(-E.W * 0.5, -E.H * 0.5);
}
```

}

// ---------- 4. Post-Draw 3D Bokeh, X-Ray Portal & Atmospheric Overlays ----------
function renderTransitionOverlay(g, spec, progVal, phase, gt) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;

```
const k =
  phase === 'out'
    ? ease.inOut(clamp(progVal, 0, 1))
    : ease.inOut(1 - clamp(progVal, 0, 1));
if (k <= 0.001) return;

g.save();
g.setTransform(1, 0, 0, 1, 0, 0);

// --- A. 3D WHIP PAN / TILT ATMOSPHERIC STREAKS ---
if (t === 'WHIP_PAN_LEFT' || t === 'WHIP_PAN_RIGHT' || t === 'WHIP_TILT_UP' || t === 'WHIP_TILT_DOWN') {
  const isHoriz = t === 'WHIP_PAN_LEFT' || t === 'WHIP_PAN_RIGHT';
  const r = rng(spec.seed + (phase === 'out' ? 10 : 20));
  g.fillStyle = alpha('#070B16', k * 0.35);
  g.fillRect(0, 0, E.W, E.H);

  g.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const col = i % 3 === 0 ? '#FFB84D' : '#DCE8FF';
    g.strokeStyle = alpha(col, k * (0.2 + r() * 0.5));
    g.lineWidth = (2 + r() * 6) * (0.6 + k * 0.7);
    g.beginPath();
    if (isHoriz) {
      const y = r() * E.H;
      const len = (240 + r() * 680) * k;
      const x = r() * (E.W - len);
      g.moveTo(x, y);
      g.lineTo(x + len, y);
    } else {
      const x = r() * E.W;
      const len = (180 + r() * 480) * k;
      const y = r() * (E.H - len);
      g.moveTo(x, y);
      g.lineTo(x, y + len);
    }
    g.stroke();
  }
  g.restore();
  return;
}

// --- B. CAMERA_DOLLY_IN / OUT FOREGROUND BOKEH RUSH ---
if (t === 'CAMERA_DOLLY_IN' || t === 'CAMERA_DOLLY_OUT' || t === 'MATCH_CUT_SCALE') {
  const [tx, ty] = phase === 'out' ? spec.target : [E.W * 0.5, E.H * 0.5];
  const r = rng(spec.seed + 33);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + r() * 0.2;
    const dist = lerp(120, 820, k) * (0.6 + r() * 0.6);
    const bx = tx + Math.cos(ang) * dist;
    const by = ty + Math.sin(ang) * dist;
    glow(g, bx, by, (28 + r() * 48) * k, '#A8D8FF', k * 0.35);
  }
  if (k > 0.65) {
    g.fillStyle = alpha('#070B16', ((k - 0.65) / 0.35) * 0.55);
    g.fillRect(0, 0, E.W, E.H);
  }
  g.restore();
  return;
}

// --- C. XRAY_DISSOLVE (Diagnostic Cyan Scan Ring) ---
if (t === 'XRAY_DISSOLVE') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  const maxR = Math.hypot(E.W, E.H) * 0.75;
  const rad = lerp(40, maxR, k);
  g.fillStyle = alpha('#07122B', k * 0.85);
  g.beginPath();
  g.arc(tx, ty, rad, 0, Math.PI * 2);
  g.fill();
  ring(g, tx, ty, rad, 6, alpha(spec.accent || '#5CE1FF', 1 - k * 0.3));
  glow(g, tx, ty, rad * 0.4, '#5CE1FF', k * 0.35);
  g.restore();
  return;
}

// --- D. DEPTH_RACK_FOCUS (Soft Vignette & Focus Dimming for Radial Timers) ---
if (t === 'DEPTH_RACK_FOCUS') {
  g.fillStyle = alpha('#090C1C', k * 0.62);
  g.fillRect(0, 0, E.W, E.H);
  ring(g, E.W * 0.5, E.H * 0.5, lerp(260, 165, k), 4, alpha('#FF4D6A', k * 0.65));
  g.restore();
  return;
}

// --- E. FLASH_BLOOM (Decompression Fog White-Out / Sunrise Bloom) ---
if (t === 'FLASH_BLOOM') {
  const flashCol = spec.color && spec.color !== '#070B16' ? spec.color : '#EBF4FF';
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  glow(g, tx, ty, E.W * 0.85, flashCol, k * 0.92);
  g.fillStyle = alpha(flashCol, Math.pow(k, 1.4) * 0.88);
  g.fillRect(0, 0, E.W, E.H);
  g.restore();
  return;
}

// --- F. FADE_DIP (Smooth Twilight Navy Dip) ---
if (t === 'FADE_DIP') {
  const dipCol = spec.color || '#070B16';
  g.fillStyle = alpha(dipCol, k);
  g.fillRect(0, 0, E.W, E.H);
  g.restore();
  return;
}

g.restore();
```

}

// ---------- 5. Master Shot Wrapper: DK.drawShot(g, shot, lt, gt, u, opts) ----------
function drawShot(g, shot, lt, gt, u, opts = {}) {
if (!shot || typeof shot.draw !== 'function') return;

```
const dur = shot.duration || Math.max(0.001, shot.end - shot.start);
const inSpec = normalizeTrans(shot.transIn, 'in');
const outSpec = normalizeTrans(shot.transOut, 'out');
const enableTrans = opts.transitions !== false;

const inProg =
  enableTrans && inSpec.dur > 0 && lt < inSpec.dur
    ? clamp(lt / inSpec.dur, 0, 1)
    : 1;
const outProg =
  enableTrans && outSpec.dur > 0 && lt > dur - outSpec.dur
    ? clamp((lt - (dur - outSpec.dur)) / outSpec.dur, 0, 1)
    : 0;

g.save();
if (inProg < 1) applyKinematicTransform(g, inSpec, inProg, 'in');
if (outProg > 0) applyKinematicTransform(g, outSpec, outProg, 'out');

shot.draw(g, lt, gt, u);
g.restore();

if (inProg < 1) renderTransitionOverlay(g, inSpec, inProg, 'in', gt);
if (outProg > 0) renderTransitionOverlay(g, outSpec, outProg, 'out', gt);
```

}

// ---------- 6. Automatic Transition SFX Scheduler for scoreSound(k) ----------
function scheduleTransitions(k, shots, batchStart = 0, theme = null) {
if (!k || typeof k.play !== 'function' || !Array.isArray(shots)) return;
linkShotTransitions(shots, theme);

```
shots.forEach((s) => {
  const outSpec = normalizeTrans(s.transOut, 'out');
  if (outSpec.type !== 'HARD_CUT' && outSpec.sfx) {
    const triggerGt = Math.max(s.start, s.end - Math.max(0.12, outSpec.dur * 0.75));
    const bt = triggerGt - batchStart;
    if (bt >= 0) {
      k.play(outSpec.sfx, bt, outSpec.sfxOpts);
    }
  }
});
```

}

// Export to DK, H, and SOUND namespaces
DK.TRANS_PRESETS = H.TRANS_PRESETS = TRANS_PRESETS;
DK.normalizeTrans = H.normalizeTrans = normalizeTrans;
DK.linkShotTransitions = H.linkShotTransitions = linkShotTransitions;
DK.drawShot = H.drawShot = drawShot;
DK.scheduleTransitions = H.scheduleTransitions = SOUND.scheduleTransitions = scheduleTransitions;
})();


// ============================================================================
// MODULE 6: LUMINA_TRANSITIONS (lib/lumina_transitions.js) — Complete 2.5D &
// 3D-Parallax Transition Engine: Billowing Cloud Wipes, 3D Seatback/Door
// Occluder Pass-Bys, Golden/Cyan X-Ray Scanner Wipes, Aircraft Porthole Irises,
// Curved Human Eye-Blinks, Depth Rack-Focus, 3D Camera Dollies/Whips & SFX Sync
// Logical Stage: 1920x1080 (16:9 Widescreen). Pure deterministic function of lt.
// ============================================================================
(function () {
'use strict';

const DK = (window.DK = window.DK || {});
const H = (window.H = window.H || DK);
const E = (window.E = DK.E || { W: 1920, H: 1080, PX: 1, fps: 60 });
const SOUND = (window.SOUND = window.SOUND || {});

E.W = H.W = 1920;
E.H = H.H = 1080;

const {
clamp,
lerp,
ease,
rng,
alpha,
shade,
rr,
circle,
ellipse,
ring,
poly,
seg,
linGrad,
radGrad,
sphereGrad,
cylinderGrad,
glow,
} = DK;

// ---------- 1. Master Transition Presets & Default Durations ----------
const TRANS_PRESETS = {
HARD_CUT: {
outDur: 0.0,
inDur: 0.0,
matchIn: 'HARD_CUT',
sfx: null,
},
CLOUD_WIPE: {
outDur: 0.38,
inDur: 0.34,
matchIn: 'CLOUD_WIPE',
sfx: 'whoosh',
sfxOpts: { dur: 0.42, top: 950, gain: 0.85 },
},
SEATBACK_WIPE: {
outDur: 0.32,
inDur: 0.28,
matchIn: 'SEATBACK_WIPE',
sfx: 'swish',
sfxOpts: { dur: 0.28, gain: 0.85 },
},
FG_PASS_BY: {
outDur: 0.32,
inDur: 0.28,
matchIn: 'FG_PASS_BY',
sfx: 'whoosh',
sfxOpts: { dur: 0.32, top: 1100, gain: 0.85 },
},
SCANNER_WIPE: {
outDur: 0.34,
inDur: 0.28,
matchIn: 'SCANNER_WIPE',
sfx: 'swish',
sfxOpts: { dur: 0.28, gain: 0.85 },
},
PAPER_WIPE: {
outDur: 0.34,
inDur: 0.28,
matchIn: 'PAPER_WIPE',
sfx: 'swish',
sfxOpts: { dur: 0.26, gain: 0.85 },
},
PORTHOLE_IRIS: {
outDur: 0.36,
inDur: 0.32,
matchIn: 'PORTHOLE_OPEN',
sfx: 'swish',
sfxOpts: { dur: 0.26, gain: 0.85 },
},
PORTHOLE_OPEN: {
outDur: 0.34,
inDur: 0.32,
matchIn: 'PORTHOLE_OPEN',
sfx: 'pop',
sfxOpts: { f: 540, gain: 0.8 },
},
IRIS_CLOSE: {
outDur: 0.36,
inDur: 0.32,
matchIn: 'IRIS_OPEN',
sfx: 'swish',
sfxOpts: { dur: 0.26, gain: 0.85 },
},
IRIS_OPEN: {
outDur: 0.34,
inDur: 0.32,
matchIn: 'IRIS_OPEN',
sfx: 'pop',
sfxOpts: { f: 560, gain: 0.8 },
},
XRAY_DISSOLVE: {
outDur: 0.28,
inDur: 0.26,
matchIn: 'XRAY_DISSOLVE',
sfx: 'blip',
sfxOpts: { f: 'C6', gain: 0.75 },
},
EYE_BLINK: {
outDur: 0.26,
inDur: 0.22,
matchIn: 'EYE_BLINK',
sfx: 'swish',
sfxOpts: { dur: 0.16, gain: 0.65 },
},
SHUTTER_SNAP: {
outDur: 0.24,
inDur: 0.20,
matchIn: 'SHUTTER_SNAP',
sfx: 'seatbeltClick',
sfxOpts: { gain: 0.8 },
},
DEPTH_RACK_FOCUS: {
outDur: 0.28,
inDur: 0.24,
matchIn: 'DEPTH_RACK_FOCUS',
sfx: 'timerChime',
sfxOpts: { f: 'A5', gain: 0.85 },
},
CAMERA_DOLLY_IN: {
outDur: 0.34,
inDur: 0.28,
matchIn: 'CAMERA_DOLLY_IN',
sfx: 'whoosh',
sfxOpts: { dur: 0.32, top: 1800, gain: 0.85 },
},
CAMERA_DOLLY_OUT: {
outDur: 0.34,
inDur: 0.28,
matchIn: 'CAMERA_DOLLY_OUT',
sfx: 'swish',
sfxOpts: { dur: 0.28, gain: 0.85 },
},
MATCH_CUT_SCALE: {
outDur: 0.30,
inDur: 0.26,
matchIn: 'MATCH_CUT_SCALE',
sfx: 'whoosh',
sfxOpts: { dur: 0.26, top: 1400, gain: 0.75 },
},
WHIP_PAN_LEFT: {
outDur: 0.24,
inDur: 0.22,
matchIn: 'WHIP_PAN_LEFT',
sfx: 'whoosh',
sfxOpts: { dur: 0.26, top: 2400, pan: -0.45, gain: 0.9 },
},
WHIP_PAN_RIGHT: {
outDur: 0.24,
inDur: 0.22,
matchIn: 'WHIP_PAN_RIGHT',
sfx: 'whoosh',
sfxOpts: { dur: 0.26, top: 2400, pan: 0.45, gain: 0.9 },
},
WHIP_TILT_UP: {
outDur: 0.26,
inDur: 0.24,
matchIn: 'WHIP_TILT_UP',
sfx: 'whoosh',
sfxOpts: { dur: 0.28, top: 2800, gain: 0.9 },
},
WHIP_TILT_DOWN: {
outDur: 0.26,
inDur: 0.24,
matchIn: 'WHIP_TILT_DOWN',
sfx: 'whoosh',
sfxOpts: { dur: 0.28, top: 1500, gain: 0.9 },
},
FLASH_BLOOM: {
outDur: 0.18,
inDur: 0.24,
matchIn: 'FLASH_BLOOM',
sfx: 'whoosh',
sfxOpts: { dur: 0.22, top: 3200, gain: 0.85 },
},
GLITCH_SLICE: {
outDur: 0.22,
inDur: 0.18,
matchIn: 'GLITCH_SLICE',
sfx: 'blip',
sfxOpts: { f: 'G5', gain: 0.75 },
},
FADE_DIP: {
outDur: 0.44,
inDur: 0.40,
matchIn: 'FADE_DIP',
sfx: null,
},
};

// Alias map for shorthand or legacy names
const ALIAS_MAP = {
ZOOM_THROUGH: 'CAMERA_DOLLY_IN',
ZOOM_OUT_SNAP: 'CAMERA_DOLLY_OUT',
WHIP_LEFT: 'WHIP_PAN_LEFT',
WHIP_RIGHT: 'WHIP_PAN_RIGHT',
WHIP_UP: 'WHIP_TILT_UP',
WHIP_DOWN: 'WHIP_TILT_DOWN',
FLASH_POP: 'FLASH_BLOOM',
};

function normalizeTrans(spec, phase = 'out') {
if (!spec) return { type: 'HARD_CUT', dur: 0 };
if (typeof spec === 'string') spec = { type: spec };
const rawKey = String(spec.type || 'HARD_CUT').toUpperCase();
const mappedType = ALIAS_MAP[rawKey] || rawKey;
const preset = TRANS_PRESETS[mappedType] || TRANS_PRESETS.HARD_CUT;
const defaultDur = phase === 'in' ? preset.inDur : preset.outDur;
return {
type: mappedType,
dur: spec.dur !== undefined ? Number(spec.dur) : defaultDur,
target: Array.isArray(spec.target) ? spec.target : [E.W * 0.5, E.H * 0.5],
dir: spec.dir || 'left',            // 'left' | 'right' | 'up' | 'down'
variant: spec.variant || 'seatback', // 'seatback' | 'door' | 'fuselage' | 'building' | 'day' | 'night' | 'sunset'
shape: spec.shape || 'oval',        // 'oval' (aircraft window) | 'circle'
color: spec.color || '#070B16',
accent: spec.accent || '#FFB84D',
sfx: spec.sfx !== undefined ? spec.sfx : preset.sfx,
sfxOpts: Object.assign({}, preset.sfxOpts || {}, spec.sfxOpts || {}),
seed: spec.seed || 77,
};
}

// ---------- 2. Auto-Link Shot Boundary Transitions ----------
function linkShotTransitions(shots, theme) {
if (!Array.isArray(shots)) return shots;
const themeShots = (theme && theme.SHOTS) || (window.THEME && window.THEME.SHOTS) || {};

```
shots.forEach((s) => {
  const ts = themeShots[s.shot_number] || themeShots[s.id] || {};
  if (!s.transOut && ts.transOut) s.transOut = ts.transOut;
  if (!s.transIn && ts.transIn) s.transIn = ts.transIn;
});

for (let i = 0; i < shots.length; i++) {
  const cur = shots[i];
  if (!cur.transIn) {
    const prevShot = i > 0 ? shots[i - 1] : themeShots[cur.shot_number - 1];
    if (prevShot && prevShot.transOut) {
      const outSpec = normalizeTrans(prevShot.transOut, 'out');
      const preset = TRANS_PRESETS[outSpec.type] || TRANS_PRESETS.HARD_CUT;
      cur.transIn = {
        type: preset.matchIn || outSpec.type,
        dir: outSpec.dir,
        variant: outSpec.variant,
        shape: outSpec.shape,
        color: outSpec.color,
        accent: outSpec.accent,
        target: outSpec.target ? [E.W * 0.5, E.H * 0.5] : undefined,
      };
    }
  }
}
return shots;
```

}

// ---------- 3. Pre-Draw Kinematic 3D Camera Transform (Dollies & Whips) ----------
function applyKinematicTransform(g, spec, progVal, phase) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;

```
const k =
  phase === 'out'
    ? Math.pow(clamp(progVal, 0, 1), 2.5)
    : Math.pow(1 - clamp(progVal, 0, 1), 2.3);
if (k <= 0.0001) return;

const sign = phase === 'out' ? 1 : -1;

if (t === 'WHIP_PAN_LEFT') {
  const dx = -E.W * 0.92 * k * sign;
  g.translate(E.W * 0.5 + dx, E.H * 0.5);
  g.transform(1 + k * 0.1, 0, -0.12 * k * sign, 1, 0, 0);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'WHIP_PAN_RIGHT') {
  const dx = E.W * 0.92 * k * sign;
  g.translate(E.W * 0.5 + dx, E.H * 0.5);
  g.transform(1 + k * 0.1, 0, 0.12 * k * sign, 1, 0, 0);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'WHIP_TILT_UP') {
  const dy = -E.H * 0.92 * k * sign;
  g.translate(E.W * 0.5, E.H * 0.5 + dy);
  g.scale(1, 1 + k * 0.12);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'WHIP_TILT_DOWN') {
  const dy = E.H * 0.92 * k * sign;
  g.translate(E.W * 0.5, E.H * 0.5 + dy);
  g.scale(1, 1 + k * 0.12);
  g.translate(-E.W * 0.5, -E.H * 0.5);
} else if (t === 'CAMERA_DOLLY_IN' || t === 'MATCH_CUT_SCALE') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  if (phase === 'out') {
    const z = lerp(1.0, 3.6, k);
    const cx = lerp(E.W * 0.5, tx, k);
    const cy = lerp(E.H * 0.5, ty, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-cx, -cy);
  } else {
    const z = lerp(1.0, 0.35, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-E.W * 0.5, -E.H * 0.5);
  }
} else if (t === 'CAMERA_DOLLY_OUT') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  if (phase === 'out') {
    const z = lerp(1.0, 0.34, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-E.W * 0.5, -E.H * 0.5);
  } else {
    const z = lerp(1.0, 2.6, k);
    const cx = lerp(E.W * 0.5, tx, k);
    const cy = lerp(E.H * 0.5, ty, k);
    g.translate(E.W * 0.5, E.H * 0.5);
    g.scale(z, z);
    g.translate(-cx, -cy);
  }
} else if (t === 'DEPTH_RACK_FOCUS') {
  const z = lerp(1.0, 1.08, k);
  g.translate(E.W * 0.5, E.H * 0.5);
  g.scale(z, z);
  g.translate(-E.W * 0.5, -E.H * 0.5);
}
```

}

// ---------- 4. Post-Draw Volumetric & Tactile 2.5D/3D Transition Overlays ----------
function renderTransitionOverlay(g, spec, progVal, phase, gt) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;

```
// Intensity k: 0.0 when settled, 1.0 at exact cut boundary
const k =
  phase === 'out'
    ? ease.inOut(clamp(progVal, 0, 1))
    : ease.inOut(1 - clamp(progVal, 0, 1));
if (k <= 0.001) return;

g.save();
g.setTransform(1, 0, 0, 1, 0, 0);

// --- 1. CLOUD_WIPE (Billowing 3D Cumulus Cloud Bank Pass-Through, Video 2 03:35, 05:52, 09:59) ---
if (t === 'CLOUD_WIPE') {
  const pal = spec.variant === 'sunset'
    ? ['#ffe6b8', '#f5b078', '#cf7268']
    : spec.variant === 'night'
    ? ['#a8c4f5', '#6888cf', '#364d8d']
    : ['#ffffff', '#e0efff', '#b0d0f5'];

  // Soft atmospheric mist veil
  g.fillStyle = alpha(pal[1], Math.pow(k, 1.3) * 0.92);
  g.fillRect(0, 0, E.W, E.H);

  // Left & Right / Top & Bottom billowing 3D cloud clusters converging on center
  const r = rng(spec.seed + 101);
  for (let i = 0; i < 22; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const baseY = (i / 22) * (E.H + 200) - 100;
    const startX = side < 0 ? -420 : E.W + 420;
    const endX = E.W * 0.5 + side * (r() - 0.3) * 320;
    const cx = lerp(startX, endX, k);
    const rad = 180 + r() * 220;
    circle(g, cx, baseY, rad, sphereGrad(g, cx, baseY, rad, pal[i % 2], [-0.5, -0.7], 0.14));
  }
  g.restore();
  return;
}

// --- 2. SEATBACK_WIPE / FG_PASS_BY (3D Foreground Seatback / Door / Building Occluder, Video 2 04:48) ---
if (t === 'SEATBACK_WIPE' || t === 'FG_PASS_BY') {
  const variant = spec.variant || (t === 'SEATBACK_WIPE' ? 'seatback' : 'door');
  const dir = spec.dir || (variant === 'seatback' ? 'up' : 'left');
  const uPass = ease.inOut(clamp(progVal, 0, 1));

  if (dir === 'up' || dir === 'down') {
    const hObj = E.H * 1.22;
    const cy =
      phase === 'out'
        ? dir === 'up'
          ? lerp(E.H + hObj * 0.55, E.H * 0.5, uPass)
          : lerp(-hObj * 0.55, E.H * 0.5, uPass)
        : dir === 'up'
        ? lerp(E.H * 0.5, -hObj * 0.55, uPass)
        : lerp(E.H * 0.5, E.H + hObj * 0.55, uPass);

    // Soft depth-of-field drop shadow
    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.fillRect(0, cy - hObj * 0.54, E.W, hObj * 1.08);

    // 3D-Shaded Maroon Airline Seatback Wall (Video 2 04:48)
    rr(g, -40, cy - hObj * 0.5, E.W + 80, hObj, 48);
    g.fillStyle = cylinderGrad(g, 0, cy - hObj * 0.5, E.W, cy + hObj * 0.5, '#7A223C', -1);
    g.fill();
    // Top headrest cushion seam
    rr(g, 120, cy - hObj * 0.46, E.W - 240, 120, 28);
    g.fillStyle = '#962B4A';
    g.fill();
  } else {
    const wObj = E.W * 1.18;
    const cx =
      phase === 'out'
        ? dir === 'left'
          ? lerp(E.W + wObj * 0.55, E.W * 0.5, uPass)
          : lerp(-wObj * 0.55, E.W * 0.5, uPass)
        : dir === 'left'
        ? lerp(E.W * 0.5, -wObj * 0.55, uPass)
        : lerp(E.W * 0.5, E.W + wObj * 0.55, uPass);

    g.fillStyle = 'rgba(0, 0, 0, 0.55)';
    g.fillRect(cx - wObj * 0.54, -40, wObj * 1.08, E.H + 80);

    const wallCol = variant === 'door' ? '#5E4332' : variant === 'fuselage' ? '#DCE6F7' : '#1E243B';
    g.fillStyle = cylinderGrad(g, cx - wObj * 0.5, 0, cx + wObj * 0.5, 0, wallCol, -1);
    g.fillRect(cx - wObj * 0.5, -40, wObj, E.H + 80);
  }
  g.restore();
  return;
}

// --- 3. SCANNER_WIPE / PAPER_WIPE (Golden/Cyan Infrastructure Laser Scanner Wipe, Video 1 01:18) ---
if (t === 'SCANNER_WIPE' || t === 'PAPER_WIPE') {
  const dir = spec.dir || 'left';
  const scanCol = spec.accent || '#FFB84D';
  const sheetCol = spec.color || '#0B132B';
  const uSweep = ease.inOut(clamp(progVal, 0, 1));

  const edgeX =
    phase === 'out'
      ? dir === 'left'
        ? lerp(E.W + 60, -20, uSweep)
        : lerp(-60, E.W + 20, uSweep)
      : dir === 'left'
      ? lerp(E.W + 20, -60, uSweep)
      : lerp(-20, E.W + 60, uSweep);

  // Dark blueprint/cutaway curtain behind scanner beam
  g.fillStyle = sheetCol;
  if (phase === 'out') {
    if (dir === 'left') g.fillRect(edgeX, 0, E.W - edgeX + 80, E.H);
    else g.fillRect(-80, 0, edgeX + 80, E.H);
  } else {
    if (dir === 'left') g.fillRect(-80, 0, edgeX + 80, E.H);
    else g.fillRect(edgeX, 0, E.W - edgeX + 80, E.H);
  }

  // Glowing vertical laser scanner beam + bloom (Video 1 01:18-01:22)
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = linGrad(g, edgeX - 48, 0, edgeX + 48, 0, [
    alpha(scanCol, 0),
    alpha(scanCol, 0.55),
    alpha('#FFFFFF', 0.95),
    alpha(scanCol, 0.55),
    alpha(scanCol, 0),
  ]);
  g.fillRect(edgeX - 48, 0, 96, E.H);
  g.restore();
  seg(g, [[edgeX, 0], [edgeX, E.H]], 4, '#FFFFFF');
  g.restore();
  return;
}

// --- 4. PORTHOLE_IRIS / PORTHOLE_OPEN / IRIS_CLOSE / IRIS_OPEN (Aircraft Window Oval or Circle Iris) ---
if (t === 'PORTHOLE_IRIS' || t === 'PORTHOLE_OPEN' || t === 'IRIS_CLOSE' || t === 'IRIS_OPEN') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  const isOval = spec.shape === 'oval' || t.startsWith('PORTHOLE');
  const maxR = Math.hypot(E.W, E.H) * 0.85;
  const rad = Math.max(0, lerp(maxR, 0, k));
  const rx = isOval ? rad * 0.74 : rad;
  const ry = rad;

  // Dark fuselage/cabin mask with oval/circular aperture
  g.fillStyle = '#090D1C';
  g.beginPath();
  g.rect(0, 0, E.W, E.H);
  g.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2, true);
  g.fill('evenodd');

  // 3D-shaded aircraft window bezel ring around aperture
  if (rad > 3) {
    g.strokeStyle = '#3E58B8';
    g.lineWidth = 10;
    g.beginPath();
    g.ellipse(tx, ty, rx + 5, ry + 5, 0, 0, Math.PI * 2);
    g.stroke();

    g.strokeStyle = '#8CE8FF';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
  return;
}

// --- 5. EYE_BLINK / SHUTTER_SNAP (Curved Human Eyelid Blink / Mechanical Shutter) ---
if (t === 'EYE_BLINK' || t === 'SHUTTER_SNAP') {
  const bladeH = E.H * 0.56 * k;
  const curve = (1 - k) * 90;

  g.fillStyle = '#070914';
  // Upper Eyelid
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(E.W, 0);
  g.lineTo(E.W, bladeH);
  g.quadraticCurveTo(E.W * 0.5, bladeH + curve, 0, bladeH);
  g.closePath();
  g.fill();

  // Lower Eyelid
  g.beginPath();
  g.moveTo(0, E.H);
  g.lineTo(E.W, E.H);
  g.lineTo(E.W, E.H - bladeH);
  g.quadraticCurveTo(E.W * 0.5, E.H - bladeH - curve, 0, E.H - bladeH);
  g.closePath();
  g.fill();

  g.restore();
  return;
}

// --- 6. XRAY_DISSOLVE (Diagnostic Cyan Scan Portal) ---
if (t === 'XRAY_DISSOLVE') {
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  const maxR = Math.hypot(E.W, E.H) * 0.75;
  const rad = lerp(40, maxR, k);
  g.fillStyle = alpha('#07122B', k * 0.85);
  g.beginPath();
  g.arc(tx, ty, rad, 0, Math.PI * 2);
  g.fill();
  ring(g, tx, ty, rad, 6, alpha(spec.accent || '#5CE1FF', 1 - k * 0.3));
  glow(g, tx, ty, rad * 0.4, '#5CE1FF', k * 0.35);
  g.restore();
  return;
}

// --- 7. DEPTH_RACK_FOCUS (Soft Vignette & Focus Dimming for Radial Timers) ---
if (t === 'DEPTH_RACK_FOCUS') {
  g.fillStyle = alpha('#090C1C', k * 0.62);
  g.fillRect(0, 0, E.W, E.H);
  ring(g, E.W * 0.5, E.H * 0.5, lerp(260, 165, k), 4, alpha('#FF4D6A', k * 0.65));
  g.restore();
  return;
}

// --- 8. 3D WHIP PAN / TILT ATMOSPHERIC STREAKS ---
if (t === 'WHIP_PAN_LEFT' || t === 'WHIP_PAN_RIGHT' || t === 'WHIP_TILT_UP' || t === 'WHIP_TILT_DOWN') {
  const isHoriz = t === 'WHIP_PAN_LEFT' || t === 'WHIP_PAN_RIGHT';
  const r = rng(spec.seed + (phase === 'out' ? 10 : 20));
  g.fillStyle = alpha('#070B16', k * 0.35);
  g.fillRect(0, 0, E.W, E.H);

  g.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const col = i % 3 === 0 ? '#FFB84D' : '#DCE8FF';
    g.strokeStyle = alpha(col, k * (0.2 + r() * 0.5));
    g.lineWidth = (2 + r() * 6) * (0.6 + k * 0.7);
    g.beginPath();
    if (isHoriz) {
      const y = r() * E.H;
      const len = (240 + r() * 680) * k;
      const x = r() * (E.W - len);
      g.moveTo(x, y);
      g.lineTo(x + len, y);
    } else {
      const x = r() * E.W;
      const len = (180 + r() * 480) * k;
      const y = r() * (E.H - len);
      g.moveTo(x, y);
      g.lineTo(x, y + len);
    }
    g.stroke();
  }
  g.restore();
  return;
}

// --- 9. CAMERA_DOLLY_IN / OUT FOREGROUND BOKEH RUSH ---
if (t === 'CAMERA_DOLLY_IN' || t === 'CAMERA_DOLLY_OUT' || t === 'MATCH_CUT_SCALE') {
  const [tx, ty] = phase === 'out' ? spec.target : [E.W * 0.5, E.H * 0.5];
  const r = rng(spec.seed + 33);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + r() * 0.2;
    const dist = lerp(120, 820, k) * (0.6 + r() * 0.6);
    const bx = tx + Math.cos(ang) * dist;
    const by = ty + Math.sin(ang) * dist;
    glow(g, bx, by, (28 + r() * 48) * k, '#A8D8FF', k * 0.35);
  }
  if (k > 0.65) {
    g.fillStyle = alpha('#070B16', ((k - 0.65) / 0.35) * 0.55);
    g.fillRect(0, 0, E.W, E.H);
  }
  g.restore();
  return;
}

// --- 10. FLASH_BLOOM (Decompression Fog White-Out / Sunrise Bloom) ---
if (t === 'FLASH_BLOOM') {
  const flashCol = spec.color && spec.color !== '#070B16' ? spec.color : '#EBF4FF';
  const [tx, ty] = spec.target || [E.W * 0.5, E.H * 0.5];
  glow(g, tx, ty, E.W * 0.85, flashCol, k * 0.92);
  g.fillStyle = alpha(flashCol, Math.pow(k, 1.4) * 0.88);
  g.fillRect(0, 0, E.W, E.H);
  g.restore();
  return;
}

// --- 11. GLITCH_SLICE (Signal Loss / Power Grid Trip Glitch) ---
if (t === 'GLITCH_SLICE') {
  const r = rng(Math.floor((gt || 0) * 45) + spec.seed);
  const canvas = g.canvas;
  const slices = 12;
  for (let i = 0; i < slices; i++) {
    const sy = (i / slices) * E.H;
    const sh = E.H / slices + 2;
    const shiftX = (r() - 0.5) * 160 * k;
    if (canvas) {
      g.drawImage(canvas, 0, sy, E.W, sh, shiftX, sy, E.W, sh);
    }
    if (r() < 0.42 * k) {
      const barCol = r.pick(['#FF4D6A', '#5CE1FF', '#FFB84D', '#38C878']);
      g.fillStyle = alpha(barCol, 0.5 * k);
      g.fillRect(r() * E.W * 0.6, sy + r() * (sh * 0.5), 140 + r() * 420, 6 + r() * 16);
    }
  }
  g.restore();
  return;
}

// --- 12. FADE_DIP (Smooth Twilight Navy Dip) ---
if (t === 'FADE_DIP') {
  const dipCol = spec.color || '#070B16';
  g.fillStyle = alpha(dipCol, k);
  g.fillRect(0, 0, E.W, E.H);
  g.restore();
  return;
}

g.restore();
```

}

// ---------- 5. Master Shot Wrapper: DK.drawShot(g, shot, lt, gt, u, opts) ----------
function drawShot(g, shot, lt, gt, u, opts = {}) {
if (!shot || typeof shot.draw !== 'function') return;

```
const dur = shot.duration || Math.max(0.001, shot.end - shot.start);
const inSpec = normalizeTrans(shot.transIn, 'in');
const outSpec = normalizeTrans(shot.transOut, 'out');
const enableTrans = opts.transitions !== false;

const inProg =
  enableTrans && inSpec.dur > 0 && lt < inSpec.dur
    ? clamp(lt / inSpec.dur, 0, 1)
    : 1;
const outProg =
  enableTrans && outSpec.dur > 0 && lt > dur - outSpec.dur
    ? clamp((lt - (dur - outSpec.dur)) / outSpec.dur, 0, 1)
    : 0;

g.save();
if (inProg < 1) applyKinematicTransform(g, inSpec, inProg, 'in');
if (outProg > 0) applyKinematicTransform(g, outSpec, outProg, 'out');

shot.draw(g, lt, gt, u);
g.restore();

if (inProg < 1) renderTransitionOverlay(g, inSpec, inProg, 'in', gt);
if (outProg > 0) renderTransitionOverlay(g, outSpec, outProg, 'out', gt);
```

}

// ---------- 6. Automatic Transition SFX Scheduler for scoreSound(k) ----------
function scheduleTransitions(k, shots, batchStart = 0, theme = null) {
if (!k || typeof k.play !== 'function' || !Array.isArray(shots)) return;
linkShotTransitions(shots, theme);

```
shots.forEach((s) => {
  const outSpec = normalizeTrans(s.transOut, 'out');
  if (outSpec.type !== 'HARD_CUT' && outSpec.sfx) {
    const triggerGt = Math.max(s.start, s.end - Math.max(0.12, outSpec.dur * 0.75));
    const bt = triggerGt - batchStart;
    if (bt >= 0) {
      k.play(outSpec.sfx, bt, outSpec.sfxOpts);
    }
  }

  const inSpec = normalizeTrans(s.transIn, 'in');
  if (inSpec.type === 'PORTHOLE_OPEN' || inSpec.type === 'IRIS_OPEN') {
    const btIn = s.start + 0.04 - batchStart;
    if (btIn >= 0) {
      k.play('pop', btIn, { f: 560, gain: 0.75 });
    }
  }
});
```

}

// Export to DK, H, and SOUND namespaces
DK.TRANS_PRESETS = H.TRANS_PRESETS = TRANS_PRESETS;
DK.normalizeTrans = H.normalizeTrans = normalizeTrans;
DK.linkShotTransitions = H.linkShotTransitions = linkShotTransitions;
DK.drawShot = H.drawShot = drawShot;
DK.scheduleTransitions = H.scheduleTransitions = SOUND.scheduleTransitions = scheduleTransitions;
})();