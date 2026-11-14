// ============================================================================
// MODULE 1: LUMINA_CORE — Soft-Volumetric 2.5D Storybook Diorama & 3D-Parallax
// Engine, 5-Plane Perspective Camera, Depth-of-Field Blur Pool, 3D Gradients,
// Crisp Blue Daytime Skies, Fluffy Cumulus Clouds, Multi-Era Storybook
// Architecture, Subterranean Strata, Cosmic/Bio Fields & Interactive Props.
// Logical Stage: 1920x1080 (16:9). Deterministic fn(t).
// ============================================================================
(function () {
'use strict';

const E = (window.E = {
W: 1920,
H: 1080,
PX: 1,
fps: 60,
styleId: 'clearDay',
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

// ---------- 3. Color Manipulation & Vibrant Storybook Mood Palettes ----------
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

// Crisp, Natural Daytime Blue Skies by Default!
const BASE_MOODS = (DK.BASE_MOODS = {
clearDay: {
sky: ['#1e68c8', '#4298e8', '#82c8f8', '#dff2ff'],
ambient: '#5c88b8',
key: '#fff8e7',
rim: '#ffffff',
wall: '#c88252',
floor: '#7c5c42',
road: '#8c684c',
grass: '#489c4e',
distantHills: '#5a8f76',
practical: '#ffd54f',
lightDir: [-0.6, -0.78],
autoClouds: true,
},
tropicalDay: {
sky: ['#1672c8', '#389ee8', '#78ccf5', '#e4f7ff'],
ambient: '#4a859e',
key: '#fff6d6',
rim: '#ffffff',
wall: '#b86842',
floor: '#75563c',
road: '#856244',
grass: '#3e9648',
distantHills: '#4e8a6e',
practical: '#ffc44d',
lightDir: [-0.6, -0.78],
autoClouds: true,
},
coastalDay: {
sky: ['#145eb8', '#328ce0', '#72bef5', '#dff4ff'],
ambient: '#467aa8',
key: '#fff9eb',
rim: '#ffffff',
wall: '#c48c64',
floor: '#8c6d50',
road: '#9c7c5c',
grass: '#4c9652',
distantHills: '#588882',
practical: '#ffe29a',
lightDir: [-0.65, -0.75],
autoClouds: true,
},
goldenHour: {
sky: ['#2b589e', '#5886c4', '#f2a668', '#ffe29e'],
ambient: '#6b5868',
key: '#ffe094',
rim: '#fff5d6',
wall: '#a86442',
floor: '#6e4c34',
road: '#7c563c',
grass: '#4c8240',
distantHills: '#5c6e68',
practical: '#ffae38',
lightDir: [-0.68, -0.72],
autoClouds: true,
},
// Upgraded legacy historical moods so they have natural, bright Storybook skies!
ancientTemple: {
sky: ['#226ac4', '#4e96e0', '#96c8f2', '#ffebc2'],
ambient: '#687894',
key: '#ffe6a8',
rim: '#fff8e0',
wall: '#b06844',
floor: '#704c34',
road: '#825a3e',
grass: '#489246',
distantHills: '#5c8572',
practical: '#ffae38',
lightDir: [-0.65, -0.75],
autoClouds: true,
},
parchmentGold: {
sky: ['#286ec2', '#569ce2', '#9cd0f5', '#f7ecd0'],
ambient: '#68788c',
key: '#ffe8b8',
rim: '#fff8e6',
wall: '#a86c48',
floor: '#6c4e36',
road: '#7c5a40',
grass: '#4a8c44',
distantHills: '#58826e',
practical: '#ffbf47',
lightDir: [-0.65, -0.75],
autoClouds: true,
},
monsoonLush: {
sky: ['#1c6ec2', '#4298de', '#84c8f2', '#e2f4fc'],
ambient: '#467888',
key: '#fff6d6',
rim: '#ffffff',
wall: '#786858',
floor: '#5c4c3c',
road: '#6c5a48',
grass: '#389448',
distantHills: '#487e68',
practical: '#ffc44d',
lightDir: [-0.6, -0.78],
autoClouds: true,
},
prehistoricJungle: {
sky: ['#1e72c4', '#469ee2', '#88cef5', '#e8f7fc'],
ambient: '#3c7a68',
key: '#fff4c2',
rim: '#ffffff',
wall: '#68523e',
floor: '#52402e',
road: '#644e38',
grass: '#3b9644',
distantHills: '#467c62',
practical: '#ffd54f',
lightDir: [-0.6, -0.78],
autoClouds: true,
},
primordialLava: {
sky: ['#263a6e', '#584e7c', '#b85c38', '#f29848'],
ambient: '#5c3428',
key: '#ffae52',
rim: '#ffe082',
wall: '#4a2c24',
floor: '#3b241c',
road: '#4c3026',
grass: '#3e5c38',
distantHills: '#4a3836',
practical: '#ff5e1a',
lightDir: [-0.5, -0.8],
autoClouds: true,
},
edoMist: {
sky: ['#2c6eb8', '#5c98d8', '#a2ccf2', '#f7e6e6'],
ambient: '#587294',
key: '#fff0eb',
rim: '#ffffff',
wall: '#4c4654',
floor: '#423c48',
road: '#585260',
grass: '#428258',
distantHills: '#5c788a',
practical: '#ff9e78',
lightDir: [-0.6, -0.75],
autoClouds: true,
},
victorianFog: {
sky: ['#3a5878', '#5e7e9e', '#8ca8c4', '#c8d8e6'],
ambient: '#4a5c72',
key: '#ffe2a8',
rim: '#dce6f2',
wall: '#584440',
floor: '#383c46',
road: '#444854',
grass: '#3b6848',
distantHills: '#526878',
practical: '#ffae42',
lightDir: [-0.55, -0.82],
autoClouds: true,
},
ancientInterior: {
sky: ['#38261c', '#523828', '#6e4c36', '#8c6244'],
ambient: '#5c402c',
key: '#ffe4a8',
rim: '#fff6d8',
wall: '#7c5438',
floor: '#4c3424',
road: '#5c402c',
grass: '#488240',
practical: '#ffba42',
lightDir: [-0.6, -0.75],
autoClouds: false,
},
cabinNight: {
sky: ['#141836', '#222852', '#333b6e'],
ambient: '#252852',
key: '#ffae70',
rim: '#ffd8b0',
wall: '#282c54',
floor: '#1c203c',
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
sky: ['#1462c4', '#368ee2', '#74bef5', '#dcf2ff'],
ambient: '#427ab8',
key: '#fff9eb',
rim: '#ffffff',
wall: '#4c6c9c',
floor: '#5c4c3c',
grass: '#48964e',
distantHills: '#56847c',
practical: '#ffe29a',
lightDir: [-0.65, -0.75],
autoClouds: true,
},
sunriseFlight: {
sky: ['#26529c', '#5282c8', '#f29864', '#ffe094'],
ambient: '#6e5468',
key: '#ffe09e',
rim: '#fff3d6',
wall: '#6e4c4c',
floor: '#543c34',
grass: '#488844',
distantHills: '#56746c',
practical: '#ffcf78',
lightDir: [0.7, -0.4],
autoClouds: true,
},
urbanMorning: {
sky: ['#1e6ec8', '#489ce8', '#88ccf8', '#e6f5ff'],
ambient: '#6c88a8',
key: '#fff4dc',
rim: '#ffffff',
wall: '#6e7894',
floor: '#586074',
road: '#5c6478',
grass: '#4c9c52',
distantHills: '#5c8878',
practical: '#ffe094',
lightDir: [-0.65, -0.75],
autoClouds: true,
},
urbanSunset: {
sky: ['#2c4e8c', '#6878b4', '#e68862', '#ffd288'],
ambient: '#5c4c68',
key: '#ffc680',
rim: '#ffe8c2',
wall: '#5c4858',
floor: '#423648',
road: '#483e52',
grass: '#42784c',
practical: '#ffd584',
lightDir: [-0.75, -0.65],
autoClouds: true,
},
blackoutNight: {
sky: ['#0b132b', '#162447', '#243b6b'],
ambient: '#162240',
key: '#b8d0ff',
rim: '#dce8ff',
wall: '#1e2842',
floor: '#161c2e',
road: '#1c2236',
grass: '#1e3c36',
practical: '#ff5268',
lightDir: [0.0, -0.95],
},
nightSky: {
sky: ['#09122c', '#14244d', '#243b6e', '#36528a'],
ambient: '#1a2848',
key: '#c8dcff',
rim: '#e4f0ff',
wall: '#283252',
floor: '#1c2238',
road: '#222840',
grass: '#22443c',
practical: '#ffba52',
lightDir: [-0.5, -0.82],
},
deepSpace: {
sky: ['#03050d', '#070b1c', '#0e1634', '#16224c'],
ambient: '#101836',
key: '#e2eeff',
rim: '#ffffff',
wall: '#182244',
floor: '#0c1226',
practical: '#5ce1ff',
lightDir: [-0.6, -0.75],
},
xrayBlue: {
sky: ['#0a1632', '#122652', '#1d3a78'],
ambient: '#183062',
key: '#5ce1ff',
rim: '#a8f0ff',
wall: '#162b58',
floor: '#0e1c3a',
practical: '#ff5c77',
lightDir: [-0.5, -0.85],
},
dusk: { sky: ['#264e8c', '#5c7ab4', '#e08862', '#f7cf94'], ambient: '#4c4258', key: '#ffc68a', rim: '#f8ecd0', wall: '#6c4c48', floor: '#4c3834', dark: '#241c28', practical: '#ffd59a', grass: '#3e7248', road: '#483c46', fog: '#c08a8a', lightDir: [-0.65, -0.75], autoClouds: true },
golden: { sky: ['#2864b4', '#5894d8', '#f2b878', '#fce4a8'], ambient: '#5c5264', key: '#ffd494', rim: '#fff0d4', wall: '#8c5840', floor: '#5c4030', dark: '#2c1e1a', practical: '#ffe7b0', grass: '#48883e', road: '#58483e', fog: '#f0c49a', lightDir: [-0.7, -0.7], autoClouds: true },
night: { sky: ['#0b132b', '#17254e', '#2b3d6e'], ambient: '#1e2848', key: '#c9d4ff', rim: '#d8e2ff', wall: '#283050', floor: '#1c2238', dark: '#0c0e1c', practical: '#ffb860', grass: '#1f4238', road: '#22263c', fog: '#323a66', lightDir: [-0.55, -0.82] },
day: { sky: ['#1c6ac8', '#449ae6', '#86ccf8', '#e4f5ff'], ambient: '#5e7e9e', key: '#fff5e0', rim: '#f8ecd0', wall: '#9c785c', floor: '#6c5642', dark: '#2c2733', practical: '#ffe2a8', grass: '#48964e', road: '#685c52', fog: '#dfe4f0', lightDir: [-0.6, -0.8], autoClouds: true },
storm: { sky: ['#1e2a4a', '#324268', '#4c6088', '#6e82a6'], ambient: '#2c3858', key: '#d8e4ff', rim: '#e4ecff', wall: '#38425e', floor: '#283046', dark: '#141828', practical: '#bcd0ff', grass: '#2c5244', road: '#2e364c', fog: '#4e5c82', lightDir: [-0.45, -0.88], autoClouds: true },
interiorWarm: { sky: ['#422e22', '#5c402e', '#78543c'], ambient: '#5c4232', key: '#ffd59a', rim: '#fff0d4', wall: '#78543c', floor: '#583c28', dark: '#281c14', practical: '#ffd28a', grass: '#386844', road: '#483428', fog: '#a87a70', lightDir: [-0.6, -0.75] },
interiorCool: { sky: ['#1e2c52', '#324678', '#4c6298'], ambient: '#283658', key: '#cbd6ff', rim: '#dce4ff', wall: '#344268', floor: '#222c46', dark: '#121828', practical: '#9fe0ff', grass: '#26483e', road: '#263048', fog: '#445278', lightDir: [-0.5, -0.85] },
void: { sky: ['#0c152c', '#16264c', '#22386c'], ambient: '#182648', key: '#ffffff', rim: '#f3e9d2', wall: '#1c2c52', floor: '#121c36', dark: '#080d1a', practical: '#ffd47e', grass: '#22443a', road: '#1a243c', fog: '#223254', lightDir: [-0.6, -0.8] },
});

DK.mood = H.mood = (nameOrObj = 'clearDay') => {
if (nameOrObj && typeof nameOrObj === 'object') {
return Object.assign({}, BASE_MOODS.clearDay, nameOrObj);
}
return BASE_MOODS[nameOrObj] || BASE_MOODS.clearDay;
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

// Automatically draws fluffy 3D clouds on daytime blue skies if none were drawn manually!
function backdrop(g, colors, area = [-E.W, -E.H, E.W * 3, E.H * 3], opts = {}) {
const cols = Array.isArray(colors) ? colors : ['#1e68c8', '#4298e8', '#82c8f8', '#dff2ff'];
g.fillStyle = linGrad(g, 0, 0, 0, E.H, cols);
g.fillRect(area[0], area[1], area[2], area[3]);


// Check if the top sky color is a daytime blue/golden sky (not pitch black space/night)
const topRgb = rgb(cols[0]);
const isDayBlue = topRgb[2] > 110 && (topRgb[1] > 70 || topRgb[0] > 30);
if (isDayBlue && opts.clouds !== false && window.FX && window.FX.clouds) {
  window.FX.clouds(g, { seed: 14, count: 6, y: 120, h: 170, color: '#ffffff', a: 0.86, t: opts.t || 0, speed: 10 });
}


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

// ---------- 5. 5-Plane 3D-Parallax Camera & Blur Pool ----------
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
// Keep background Storybook scenery crisp and legible (cap blur to gentle depth-of-field)
const cappedBlur = amount > 6 ? amount : Math.min(amount || 0, 2.2);
if (!cappedBlur || cappedBlur <= 0.4) {
cam ? layer(g, cam, depth, fn) : fn(g);
return;
}
const k = clamp(1 / (1 + cappedBlur / 3.5), 0.18, 0.6);
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
x2.filter = 'blur(' + Math.max(0.5, cappedBlur * k).toFixed(1) + 'px)';
x2.drawImage(entry.c1, 0, 0);
x2.filter = 'none';

g.save();
g.drawImage(entry.c2, 0, 0, E.W, E.H);
g.restore();
entry.busy = false;


}

function fivePlane(g, cam, planes = {}) {
if (planes.bgSky) blurLayer(g, planes.bgSkyBlur || 0, planes.bgSky, cam, planes.bgSkyDepth !== undefined ? planes.bgSkyDepth : 0.15);
if (planes.bgFar) blurLayer(g, planes.bgFarBlur !== undefined ? planes.bgFarBlur : 1.5, planes.bgFar, cam, planes.bgFarDepth !== undefined ? planes.bgFarDepth : 0.40);
if (planes.mgBack) blurLayer(g, planes.mgBackBlur || 0, planes.mgBack, cam, planes.mgBackDepth !== undefined ? planes.mgBackDepth : 0.75);
if (planes.mgHero) layer(g, cam, 1.0, planes.mgHero);
if (planes.fgBokeh) blurLayer(g, planes.fgBokehBlur !== undefined ? planes.fgBokehBlur : 10, planes.fgBokeh, cam, planes.fgBokehDepth !== undefined ? planes.fgBokehDepth : 1.45);
}

function threePlane(g, cam, planes = {}) {
const bgDepth = planes.bgDepth !== undefined ? planes.bgDepth : 0.3;
const fgDepth = planes.fgDepth !== undefined ? planes.fgDepth : 1.45;
const bgBlur = planes.bgBlur !== undefined ? planes.bgBlur : 1.5;
const fgBlur = planes.fgBlur !== undefined ? planes.fgBlur : 10;
if (planes.bg) blurLayer(g, bgBlur, planes.bg, cam, bgDepth);
if (planes.mg) layer(g, cam, 1.0, planes.mg);
if (planes.fg) blurLayer(g, fgBlur, planes.fg, cam, fgDepth);
}

DK.layer = H.layer = layer;
DK.blurLayer = H.blurLayer = blurLayer;
DK.fivePlane = H.fivePlane = fivePlane;
DK.threePlane = H.threePlane = threePlane;

// ---------- 6. Storybook 2.5D Environments, Architecture, Interactive Props & FX ----------
const FX = (window.FX = DK.fx = {
// Upgraded Storybook Ground (Lush grass verge + textured path/stone instead of dark striped void)
ground(g, y = 840, baseCol = '#7c5c42', specCol = '#ffc68a', specA = 0.18, lines = false) {
// Soft green grass verge strip along the horizon edge of the road/ground
const isDarkVoid = rgb(baseCol)[0] < 28 && rgb(baseCol)[1] < 28;
const roadColor = isDarkVoid ? '#5c4838' : baseCol;
if (!isDarkVoid) {
g.fillStyle = linGrad(g, 0, y - 22, 0, y + 6, ['#52a456', '#3d8242']);
g.fillRect(-E.W, y - 18, E.W * 3, 24);
}


  // Main Earth / Flagstone Roadway
  g.fillStyle = linGrad(g, 0, y, 0, E.H + 200, [shade(roadColor, 0.08), roadColor, shade(roadColor, -0.28)]);
  g.fillRect(-E.W, y, E.W * 3, E.H - y + 300);

  if (specA > 0) FX.pool(g, E.W * 0.5, y + (E.H - y) * 0.32, E.W * 0.55, (E.H - y) * 0.45, specCol, specA);

  // Subtle Storybook Flagstone / Cobblestone / Pebble texture
  const r = rng(107);
  for (let i = 0; i < 38; i++) {
    const px = -400 + r() * (E.W + 800);
    const py = y + 14 + r() * (E.H - y - 24);
    const pw = 28 + r() * 54;
    const ph = 8 + r() * 12;
    rr(g, px, py, pw, ph, ph * 0.45);
    g.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
    g.fill();
  }
  seg(g, [[-E.W, y], [E.W * 2, y]], 3, alpha(specCol, 0.32));
},

storybookGround(g, y = 840, o = {}) {
  const { style = 'earthPath', baseCol = '#7c5c42', grassCol = '#489c4e' } = o;
  if (style === 'grassland') {
    g.fillStyle = linGrad(g, 0, y - 15, 0, E.H, [shade(grassCol, 0.12), grassCol, shade(grassCol, -0.25)]);
    g.fillRect(-E.W, y - 15, E.W * 3, E.H - y + 200);
    const r = rng(44);
    for (let i = 0; i < 45; i++) {
      const tx = -200 + r() * (E.W + 400);
      const ty = y + r() * (E.H - y - 20);
      seg(g, [[tx, ty], [tx - 5, ty - 14]], 3, shade(grassCol, 0.22));
      seg(g, [[tx, ty], [tx + 5, ty - 14]], 3, shade(grassCol, 0.18));
    }
  } else {
    FX.ground(g, y, baseCol, '#ffe29a', 0.18, style === 'flagstone');
  }
},

floorLines(g, y0, y1, color = 'rgba(0,0,0,0.16)', spacing = 0.09) {
  g.strokeStyle = color;
  g.lineWidth = 1.5;
  for (let y = y0 + 12; y < y1; y += Math.max(12, (y - y0) * spacing + 8)) {
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

// Individual 2.5D Storybook Buildings & Monuments (Gopuram, Mandapam, Brick House, Hut, Fort, Ship, Furnace)
structure3D(g, x = 960, y = 840, w = 260, h = 240, o = {}) {
  const { kind = 'brickHouse', color = '#b85d38', roofColor = '#8c3420', t = 0 } = o;
  g.save();
  g.translate(x, y);
  contactShadow(g, 0, 4, w * 0.58, 12, 0.28);

  if (kind === 'gopuram') {
    // Multi-Tiered Stepped Dravidian Temple Gopuram with Sculpted Niches & Gold Kalasams
    const plinthH = h * 0.18;
    rr(g, -w * 0.52, -plinthH, w * 1.04, plinthH, 4);
    g.fillStyle = '#8c7258';
    g.fill();
    // Central arched gateway passage
    rr(g, -w * 0.14, -plinthH * 0.88, w * 0.28, plinthH * 0.88, 12);
    g.fillStyle = '#241812';
    g.fill();

    const tiers = 5;
    const towerH = h - plinthH;
    const tierCols = ['#c8643c', '#d98238', '#388e7c', '#c94a38', '#d99b26'];
    for (let i = 0; i < tiers; i++) {
      const u0 = i / tiers;
      const u1 = (i + 1) / tiers;
      const w0 = lerp(w * 0.96, w * 0.44, u0);
      const w1 = lerp(w * 0.96, w * 0.44, u1);
      const ty0 = -plinthH - u0 * towerH;
      const ty1 = -plinthH - u1 * towerH;
      const tCol = tierCols[i % tierCols.length];
      poly(
        g,
        [
          [-w0 / 2, ty0],
          [w0 / 2, ty0],
          [w1 / 2, ty1],
          [-w1 / 2, ty1],
        ],
        cylinderGrad(g, -w0 / 2, ty1, w0 / 2, ty0, tCol, -1),
        shade(tCol, -0.25),
        2
      );
      // Carved Kudu arches along each tier
      const arches = Math.max(2, 5 - i);
      for (let a = 0; a < arches; a++) {
        const ax = lerp(-w1 * 0.36, w1 * 0.36, arches === 1 ? 0.5 : a / (arches - 1));
        rr(g, ax - 7, ty0 - (ty0 - ty1) * 0.72, 14, (ty0 - ty1) * 0.58, 6);
        g.fillStyle = shade(tCol, -0.32);
        g.fill();
      }
    }
    // Barrel-vaulted Sala crown + 5 Gold Kalasam finials
    const topW = w * 0.46;
    rr(g, -topW / 2, -h - 18, topW, 20, 10);
    g.fillStyle = '#d99b26';
    g.fill();
    for (let k = -2; k <= 2; k++) {
      const kx = k * (topW * 0.18);
      circle(g, kx, -h - 24, 5.5, '#ffd54f');
      poly(g, [[kx - 3, -h - 24], [kx + 3, -h - 24], [kx, -h - 34]], '#fff3b0');
    }
  } else if (kind === 'mandapam') {
    // Pillared Stone Temple / Palace Mandapam Pavilion
    const baseH = 26;
    rr(g, -w * 0.54, -baseH, w * 1.08, baseH, 4);
    g.fillStyle = '#8c7a68';
    g.fill();
    // Interior warm sanctum backdrop
    g.fillStyle = '#3d281c';
    g.fillRect(-w * 0.46, -h * 0.78, w * 0.92, h * 0.78 - baseH);
    // Glowing brass oil lamps inside mandapam
    [-w * 0.22, w * 0.22].forEach((lx) => {
      glow(g, lx, -h * 0.42, 42, '#ffae38', 0.65);
      circle(g, lx, -h * 0.42, 5, '#fff3b0');
    });
    // 4 Carved Stone Pillars with Corbel Capitals
    [-0.44, -0.15, 0.15, 0.44].forEach((pf) => {
      const px = pf * w;
      rr(g, px - 11, -h * 0.78, 22, h * 0.78 - baseH, 3);
      g.fillStyle = cylinderGrad(g, px - 11, -h * 0.78, px + 11, -baseH, '#c8b8a2', -1);
      g.fill();
      rr(g, px - 18, -h * 0.78, 36, 12, 3);
      g.fillStyle = '#a89680';
      g.fill();
    });
    // Stepped Stone Roof Cornice (Kapota)
    poly(g, [[-w * 0.58, -h * 0.78], [w * 0.58, -h * 0.78], [w * 0.48, -h], [-w * 0.48, -h]], '#9c8872', '#6e5e4e', 2);
    circle(g, 0, -h - 8, 7, '#ffd54f');
  } else if (kind === 'brickHouse') {
    // Sangam / Keeladi Baked-Brick House with Terracotta Tiled Roof, Wooden Door & Veranda Pillars
    const wallH = h * 0.68;
    rr(g, -w / 2, -wallH, w, wallH, 4);
    g.fillStyle = cylinderGrad(g, -w / 2, -wallH, w / 2, 0, color, -1);
    g.fill();
    // Brick course texture lines
    g.strokeStyle = shade(color, -0.22);
    g.lineWidth = 1.5;
    for (let by = -wallH + 16; by < -12; by += 16) {
      g.beginPath();
      g.moveTo(-w / 2 + 6, by);
      g.lineTo(w / 2 - 6, by);
      g.stroke();
    }
    // Carved Wooden Door & Shuttered Windows
    rr(g, -22, -wallH * 0.68, 44, wallH * 0.68, 8);
    g.fillStyle = '#4a2818';
    g.fill();
    g.strokeStyle = '#d99b26';
    g.lineWidth = 2.5;
    g.stroke();
    [-w * 0.3, w * 0.3].forEach((wx) => {
      rr(g, wx - 16, -wallH * 0.62, 32, 34, 4);
      g.fillStyle = '#3b2012';
      g.fill();
      g.strokeStyle = '#e6b86a';
      g.lineWidth = 2;
      g.stroke();
    });
    // Sloped Terracotta Tiled Roof with Ridge Finials
    poly(
      g,
      [
        [-w * 0.58, -wallH + 4],
        [w * 0.58, -wallH + 4],
        [w * 0.42, -h],
        [-w * 0.42, -h],
      ],
      linGrad(g, 0, -h, 0, -wallH, [shade(roofColor, 0.15), roofColor, shade(roofColor, -0.2)]),
      shade(roofColor, -0.3),
      2
    );
  } else if (kind === 'thatchedHut') {
    // Early Iron Age / Rural Village Mud-and-Wattle Hut with Golden Conical Thatched Roof
    const wallH = h * 0.56;
    rr(g, -w * 0.44, -wallH, w * 0.88, wallH, 8);
    g.fillStyle = cylinderGrad(g, -w * 0.44, -wallH, w * 0.44, 0, '#c49668', -1);
    g.fill();
    rr(g, -20, -wallH * 0.72, 40, wallH * 0.72, 16);
    g.fillStyle = '#2e1c10';
    g.fill();
    poly(
      g,
      [
        [-w * 0.58, -wallH + 6],
        [w * 0.58, -wallH + 6],
        [0, -h],
      ],
      linGrad(g, -w * 0.5, -h, w * 0.5, -wallH, ['#f2c864', '#d99e38', '#9e6c20']),
      '#7c5214',
      2
    );
  } else if (kind === 'stoneFort') {
    // Crenellated Stone Fortress / Palayam Bastion with Battlements & Banner
    rr(g, -w / 2, -h * 0.85, w, h * 0.85, 4);
    g.fillStyle = cylinderGrad(g, -w / 2, -h * 0.85, w / 2, 0, color || '#6e7685', -1);
    g.fill();
    // Stone masonry blocks
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 2;
    for (let sy = -h * 0.75; sy < -20; sy += 28) {
      g.beginPath();
      g.moveTo(-w / 2, sy);
      g.lineTo(w / 2, sy);
      g.stroke();
    }
    // Battlement merlons
    const merlons = 5;
    const mw = (w / merlons) * 0.65;
    for (let m = 0; m < merlons; m++) {
      const mx = -w / 2 + (m / (merlons - 1)) * (w - mw);
      rr(g, mx, -h, mw, h * 0.18, 3);
      g.fillStyle = shade(color || '#6e7685', 0.08);
      g.fill();
    }
    // Arched Fort Gate
    rr(g, -34, -h * 0.48, 68, h * 0.48, 32);
    g.fillStyle = '#2b1d14';
    g.fill();
  } else if (kind === 'romanShip' || kind === 'cholaShip') {
    // Detailed Ancient Wooden Sailing Vessel with Billowing Square Sail & Carved Prow
    const isChola = kind === 'cholaShip';
    poly(g, [[-w * 0.5, 0], [w * 0.5, 0], [w * 0.64, -h * 0.28], [-w * 0.62, -h * 0.28]], cylinderGrad(g, -w * 0.5, -h * 0.28, w * 0.5, 0, '#7c4828', -1));
    seg(g, [[0, -h * 0.28], [0, -h]], 8, '#5c341c');
    const billow = Math.sin(t * 2.5) * 14;
    poly(
      g,
      [
        [-w * 0.38, -h * 0.88],
        [w * 0.38, -h * 0.88],
        [w * 0.42 + billow, -h * 0.38],
        [-w * 0.38 + billow, -h * 0.38],
      ],
      isChola ? '#f7b928' : '#f4efe6',
      isChola ? '#c92a2a' : '#c92a2a',
      3
    );
  } else if (kind === 'furnace') {
    // Clay Iron-Smelting Bloomery Furnace with Glowing Hearth & Flames
    poly(
      g,
      [
        [-w * 0.48, 0],
        [w * 0.48, 0],
        [w * 0.28, -h],
        [-w * 0.28, -h],
      ],
      cylinderGrad(g, -w * 0.48, -h, w * 0.48, 0, '#9c5232', -1)
    );
    glow(g, 0, -h - 10, 85, '#ff5e1a', 0.85);
    poly(g, [[-w * 0.2, -h], [0, -h - 55 - Math.sin(t * 12) * 12], [w * 0.2, -h]], '#ffae38');
    circle(g, 0, -28, 34, '#ff5e1a');
    circle(g, 0, -24, 18, '#fff3b0');
  }
  g.restore();
},

// Storybook Horizon Layer (Plane 2: Replaces skyscraper blocks with authentic temples, hills, forts & palms)
storybookHorizon(g, o = {}) {
  const { style = 'ancientTamil', y = 760, seed = 12, color = '#5c7c6e' } = o;
  FX.hills(g, { seed, y: y - 10, amp: 105, color });
  const r = rng(seed + 5);

  if (style === 'ancientTamil' || style === 'temple') {
    // Distant Gopuram silhouettes, pillared mandapams & coconut palms along the ridge
    [260, 740, 1280, 1680].forEach((hx, idx) => {
      if (idx % 2 === 0) {
        FX.structure3D(g, hx, y, 130, 175, { kind: 'gopuram' });
      } else {
        FX.structure3D(g, hx, y, 160, 105, { kind: 'mandapam' });
      }
      FX.tree(g, hx + 110, y, 0.72, '#3d7c48', 'palm');
    });
  } else if (style === 'rural' || style === 'prehistoric') {
    for (let tx = 180; tx <= 1740; tx += 220) {
      FX.tree(g, tx + (r() - 0.5) * 50, y, 0.75 + r() * 0.2, '#3d8248', tx % 440 === 0 ? 'oak' : 'palm');
    }
  } else if (style === 'fortress') {
    [340, 960, 1580].forEach((fx) => {
      FX.structure3D(g, fx, y, 220, 150, { kind: 'stoneFort', color: '#5c6678' });
    });
  } else {
    FX.skyline(g, { style, y, seed, color, lit: style === 'modern' ? 0.35 : 0 });
  }
},

// Complete One-Call Storybook Midground Scene Presets (Plane 3: mgBack)
storybookScene(g, t = 0, o = {}) {
  const { preset = 'ancientVillage', y = 840, seed = 15 } = o;
  if (preset === 'ancientVillage' || preset === 'farmClearing') {
    FX.tree(g, 180, y, 1.15, '#3b8c44', 'banyan');
    FX.structure3D(g, 480, y, 170, 155, { kind: 'thatchedHut' });
    FX.structure3D(g, 1180, y, 185, 168, { kind: 'thatchedHut' });
    FX.tree(g, 1460, y, 1.05, '#3b8c44', 'palm');
    FX.tree(g, 1720, y, 1.1, '#3b8c44', 'oak');
  } else if (preset === 'keeladiStreet') {
    FX.structure3D(g, 280, y, 240, 210, { kind: 'brickHouse', color: '#b85234' });
    FX.tree(g, 560, y, 1.0, '#3b8c44', 'palm');
    FX.structure3D(g, 880, y, 260, 225, { kind: 'brickHouse', color: '#c46238' });
    FX.structure3D(g, 1480, y, 250, 215, { kind: 'brickHouse', color: '#a8482c' });
    FX.tree(g, 1760, y, 1.08, '#3b8c44', 'palm');
  } else if (preset === 'templeCourtyard' || preset === 'royalAvenue') {
    FX.structure3D(g, 280, y, 230, 320, { kind: 'gopuram' });
    FX.structure3D(g, 760, y, 290, 195, { kind: 'mandapam' });
    FX.structure3D(g, 1380, y, 290, 195, { kind: 'mandapam' });
    FX.tree(g, 1740, y, 1.1, '#3b8c44', 'banyan');
  } else if (preset === 'sangamHall' || preset === 'palaceInterior') {
    // Warm Enclosed Pillared Hall Interior
    g.fillStyle = linGrad(g, 0, 0, 0, y, ['#4a2e1e', '#6e462e', '#583824']);
    g.fillRect(-200, 0, E.W + 400, y);
    for (let px = 220; px <= 1700; px += 370) {
      rr(g, px - 24, 120, 48, y - 120, 6);
      g.fillStyle = cylinderGrad(g, px - 24, 120, px + 24, y, '#c8b294', -1);
      g.fill();
      rr(g, px - 38, 120, 76, 26, 6);
      g.fillStyle = '#a89072';
      g.fill();
      glow(g, px + 60, 480, 65, '#ffae38', 0.65);
      circle(g, px + 60, 480, 7, '#fff3b0');
    }
    FX.godRays(g, 380, 80, { count: 5, angle: 0.48, color: '#ffe6a8', a: 0.16, t });
  } else if (preset === 'harborWharf') {
    FX.waterBody(g, t, { x: -200, y: y - 95, w: 1150, h: 110, color: '#1e6ec8', waves: true });
    FX.structure3D(g, 420, y - 65, 280, 240, { kind: 'romanShip', t });
    // Stone Harbor Wharf on right half
    rr(g, 820, y - 55, 1300, 65, 6);
    g.fillStyle = '#8c7a68';
    g.fill();
    FX.structure3D(g, 1560, y - 50, 240, 190, { kind: 'mandapam' });
  } else if (preset === 'ironForge') {
    FX.tree(g, 220, y, 1.15, '#387c42', 'oak');
    FX.structure3D(g, 960, y, 220, 240, { kind: 'furnace', t });
    FX.structure3D(g, 1580, y, 180, 160, { kind: 'thatchedHut' });
  } else if (preset === 'fortRamparts' || preset === 'battlefield') {
    FX.structure3D(g, 340, y, 280, 260, { kind: 'stoneFort', color: '#6e7685' });
    FX.structure3D(g, 960, y, 310, 280, { kind: 'stoneFort', color: '#5c6474' });
    FX.structure3D(g, 1580, y, 280, 260, { kind: 'stoneFort', color: '#6e7685' });
  }
},

// Cause-and-Effect Interactive Target Props (Solves swinging at empty air!)
interactiveProp(g, o = {}) {
  const { kind = 'choppableTree', x = 565, y = 840, cutTime = 1.8, lt = 0, gt = 0 } = o;
  g.save();
  g.translate(x, y);

  if (kind === 'choppableTree') {
    // Standing tree that gets chopped at cutTime and falls over to 88 degrees!
    contactShadow(g, 0, 4, 48, 10, 0.28);
    // Base Stump (always stays rooted in ground)
    rr(g, -14, -36, 28, 36, 4);
    g.fillStyle = '#5c3c24';
    g.fill();
    ellipse(g, 0, -36, 14, 5, '#d9b382');

    const fallProg = lt >= cutTime ? ease.in(clamp((lt - cutTime) / 0.65, 0, 1)) : 0;
    const fallAng = fallProg * (Math.PI * 0.48);

    // Wood chips flying when struck before cutTime
    if (lt < cutTime && Math.sin(gt * 8.5) > 0.55) {
      for (let c = 0; c < 4; c++) {
        const cx = -18 - c * 8;
        const cy = -44 - (c % 2) * 12;
        circle(g, cx, cy, 4, '#e6c288');
      }
    }

    // Upper Tree Trunk & Lush Canopy (rotates around the cut notch at y = -36)
    g.save();
    g.translate(0, -36);
    g.rotate(fallAng);
    rr(g, -13, -110, 26, 110, 6);
    g.fillStyle = '#5c3c24';
    g.fill();
    // V-shaped axe notch
    if (lt > 0.2) {
      poly(g, [[-14, -14], [4, -8], [-14, -2]], '#d9b382');
    }
    const blobs = [[0, -145, 54], [-38, -118, 42], [38, -118, 42], [-20, -168, 40], [22, -164, 40]];
    blobs.forEach(([dx, dy, rad], idx) => {
      circle(g, dx, dy, rad, sphereGrad(g, dx, dy, rad, idx % 2 ? '#449e48' : '#38863c'));
    });
    g.restore();
  } else if (kind === 'forgeAnvil') {
    // Stone/Iron Anvil with Red-Hot Iron Blade & Impact Sparks
    rr(g, -32, -48, 64, 48, 6);
    g.fillStyle = '#5c4636';
    g.fill();
    poly(g, [[-44, -48], [44, -48], [58, -72], [-48, -72]], '#4a5464');
    // Glowing hot iron bar on anvil
    rr(g, -28, -80, 56, 9, 4);
    g.fillStyle = '#ff6b1a';
    g.fill();
    glow(g, 0, -76, 45, '#ff851b', 0.75);
    // Burst of forge sparks on hammer downstroke
    if (Math.sin(gt * 8.5) > 0.45) {
      for (let s = 0; s < 6; s++) {
        const ang = -Math.PI * 0.85 + (s / 5) * Math.PI * 0.7;
        const dist = 18 + (s % 3) * 16;
        circle(g, Math.cos(ang) * dist, -78 + Math.sin(ang) * dist, 3.5, '#fff3b0');
      }
    }
  } else if (kind === 'scholarDesk') {
    // Carved Wooden Scholar Desk with Stacked Palm-Leaf Manuscripts & Brass Lamp
    rr(g, -55, -52, 110, 14, 4);
    g.fillStyle = '#7c4c28';
    g.fill();
    seg(g, [[-42, -38], [-48, 0]], 8, '#5c361c');
    seg(g, [[42, -38], [48, 0]], 8, '#5c361c');
    rr(g, -28, -64, 56, 12, 3);
    g.fillStyle = '#e6c687';
    g.fill();
    // Brass Kuthuvilakku lamp
    seg(g, [[36, -52], [36, -86]], 5, '#d99b26');
    glow(g, 36, -92, 32, '#ffae38', 0.8);
    circle(g, 36, -90, 5, '#fff3b0');
  } else if (kind === 'merchantStall') {
    // Bazaar Table with Spice Sacks, Pearl Chest & Brass Scale
    rr(g, -75, -62, 150, 62, 6);
    g.fillStyle = '#8c5834';
    g.fill();
    circle(g, -35, -76, 22, '#c89e68');
    circle(g, 5, -74, 20, '#d9b37c');
    rr(g, 32, -82, 34, 20, 4);
    g.fillStyle = '#d99b26';
    g.fill();
  }
  g.restore();
},

// Subterranean Cross-Section Cutaway (Solves Screenshot 3's skyline-underground bug!)
strataCutaway(g, o = {}) {
  const { surfaceY = 360, bottomY = 1080, style = 'keeladiDrainage', t = 0 } = o;
  // Top surface grass & rural palm trees (NO modern city skyline!)
  FX.hills(g, { seed: 19, y: surfaceY, amp: 55, color: '#568e68' });
  FX.tree(g, 220, surfaceY, 0.82, '#3b8c44', 'palm');
  FX.tree(g, 1680, surfaceY, 0.85, '#3b8c44', 'palm');
  g.fillStyle = '#489c4e';
  g.fillRect(0, surfaceY - 12, E.W, 18);

  // Stratified Underground Soil & Terracotta Brick Layers
  g.fillStyle = linGrad(g, 0, surfaceY, 0, bottomY, ['#7c4c32', '#5c3622', '#3d2214']);
  g.fillRect(0, surfaceY + 6, E.W, bottomY - surfaceY);

  if (style === 'keeladiDrainage') {
    // Baked-brick upper & lower conduit walls
    for (let bx = 140; bx < 1780; bx += 48) {
      rr(g, bx, 680, 46, 28, 3);
      rr(g, bx, 960, 46, 28, 3);
      g.fillStyle = '#b84c2e';
      g.fill();
    }
    // Flowing subterranean water channel
    FX.waterBody(g, t, { x: 140, y: 708, w: 1640, h: 252, color: '#14589c', waves: true });
  }
},

waterBody(g, t = 0, o = {}) {
  const { x = 0, y = 760, w = E.W, h = 140, color = '#1e6ec8', waves = true } = o;
  g.save();
  g.fillStyle = linGrad(g, x, y, x, y + h, [shade(color, 0.18), color, shade(color, -0.25)]);
  g.fillRect(x, y, w, h);
  if (waves) {
    g.strokeStyle = 'rgba(225, 245, 255, 0.45)';
    g.lineWidth = 2.5;
    for (let wy = y + 18; wy < y + h - 12; wy += 24) {
      for (let wx = x + 30; wx < x + w - 60; wx += 140) {
        const shift = Math.sin(t * 2.2 + wy * 0.1 + wx * 0.02) * 18;
        g.beginPath();
        g.moveTo(wx + shift, wy);
        g.quadraticCurveTo(wx + 35 + shift, wy - 7, wx + 70 + shift, wy);
        g.stroke();
      }
    }
  }
  g.restore();
},

// Deep Space Nebula, 3D Planets & Microscopic Bio-Matrix
nebula(g, t = 0, o = {}) {
  const { x = 960, y = 540, r = 680, colors = ['#5ce1ff', '#9b51e0', '#ff4d94'], a = 0.28 } = o;
  colors.forEach((col, i) => {
    const ox = x + Math.cos(t * 0.2 + i * 2.1) * 140;
    const oy = y + Math.sin(t * 0.18 + i * 2.1) * 90;
    glow(g, ox, oy, r * (0.85 - i * 0.15), col, a);
  });
},

planet3D(g, x = 960, y = 540, r = 220, o = {}) {
  const { color = '#387ce8', rings = false, ringColor = '#e6c687', atmosphere = true } = o;
  g.save();
  g.translate(x, y);
  if (atmosphere) glow(g, 0, 0, r * 1.28, color, 0.45);
  circle(g, 0, 0, r, sphereGrad(g, 0, 0, r, color, [-0.6, -0.6], 0.24));
  if (rings) {
    g.strokeStyle = alpha(ringColor, 0.75);
    g.lineWidth = r * 0.16;
    g.beginPath();
    g.ellipse(0, 0, r * 2.1, r * 0.42, -0.22, 0, Math.PI * 2);
    g.stroke();
  }
  g.restore();
},

bioMatrix(g, t = 0, o = {}) {
  const { color = '#1a5c68', count = 18 } = o;
  const r = rng(63);
  for (let i = 0; i < count; i++) {
    const cx = r() * E.W;
    const cy = r() * E.H + Math.sin(t * 1.5 + i) * 16;
    const rad = 35 + r() * 75;
    circle(g, cx, cy, rad, alpha(color, 0.22));
    ring(g, cx, cy, rad, 2, alpha(shade(color, 0.35), 0.3));
  }
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
  const { seed = 17, count = 12, color = '#ffba7a', area = [0, 0, E.W, E.H], rMin = 18, rMax = 48, a = 0.14 } = o;
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
  const { y = 740, palette = 'day', speed = 22 } = o;
  const pals = {
    night: ['#8aa8e6', '#5875bd', '#364d8d', '#1f3066'],
    day: ['#ffffff', '#e6f3ff', '#b8daf8', '#86b8eb'],
    sunset: ['#ffe6b8', '#f5b078', '#cf7268', '#7d4468'],
    golden: ['#fff6d6', '#f7cf88', '#e09864', '#9c5c62'],
  };
  const cols = pals[palette] || pals.day;

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
  g.restore();
},

molecules(g, t = 0, o = {}) {
  const { area = [160, 120, 1600, 840], kind = 'air', density = 42, condenseProg = 0, flowX = 0, seed = 21 } = o;
  const r = rng(seed);
  g.save();
  for (let i = 0; i < density; i++) {
    const sp = 28 + r() * 45;
    const ph = r() * 6.28;
    const bx = area[0] + (((r() * area[2] + t * (flowX + Math.cos(ph) * sp)) % area[2]) + area[2]) % area[2];
    const by = area[1] + (((r() * area[3] + t * Math.sin(ph) * sp) % area[3]) + area[3]) % area[3];
    const rot = t * (r() - 0.5) * 3.5 + ph;
    g.save();
    g.translate(bx, by);
    g.rotate(rot);
    const col = kind === 'o2' ? '#68c8ff' : mix('#f59e3d', '#4da6ff', clamp(condenseProg, 0, 1));
    circle(g, -6.5, 0, 8.5, sphereGrad(g, -6.5, 0, 8.5, col));
    circle(g, 6.5, 0, 8.5, sphereGrad(g, 6.5, 0, 8.5, col));
    g.restore();
  }
  g.restore();
},

slipstream(g, t = 0, o = {}) {
  const { speed = 2400, count = 48, dir = -1, color = '#dcebff', alpha: al = 0.45, target = null } = o;
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
  g.restore();
},

cabinFog(g, t = 0, o = {}) {
  const { density = 0.45, speed = 70 } = o;
  if (density <= 0.01) return;
  g.save();
  const r = rng(55);
  for (let i = 0; i < 10; i++) {
    const cx = ((r() * (E.W + 600) - t * speed * (0.5 + r())) % (E.W + 600) + E.W + 600) % (E.W + 600) - 300;
    const cy = 220 + r() * 620;
    const rw = 240 + r() * 320;
    const rh = 55 + r() * 85;
    ellipse(g, cx, cy, rw, rh, alpha('#ffffff', density * 0.25));
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
    text(g, String(rowNumber), startX + spacing * 1.35 + 64, -545, { size: 56, font: FONTS.ui, weight: 900, color: '#f5b942' });
  }
  for (let i = 0; i < seats; i++) {
    const sx = startX + i * spacing;
    const sw = 256, sh = 460;
    rr(g, sx - sw / 2, -sh, sw, sh, 38);
    g.fillStyle = cylinderGrad(g, sx - sw / 2, -sh, sx + sw / 2, 0, seatColor, -1);
    g.fill();
    if (isBack) {
      rr(g, sx - 92, -sh + 85, 184, 120, 14);
      g.fillStyle = '#1c2442';
      g.fill();
    }
  }
  g.restore();
},

airplaneExterior(g, x = 960, y = 520, s = 1, o = {}) {
  const { pitch = 0, livery = 'modern' } = o;
  g.save();
  g.translate(x, y);
  g.rotate(pitch);
  g.scale(s, s);
  poly(g, [[-520, -45], [-660, -280], [-550, -280], [-360, -45]], '#ff6b2b');
  rr(g, -560, -85, 1140, 170, 82);
  g.fillStyle = linGrad(g, 0, -85, 0, 85, ['#ffffff', '#f4f7fc', '#cdd8ec']);
  g.fill();
  poly(g, [[430, -52], [510, -32], [515, -2], [430, -2]], '#162447', '#dce8ff', 2);
  poly(g, [[-140, 28], [80, 28], [-190, 145], [-290, 145]], '#b8c7e0', '#8fa4c7', 2);
  rr(g, -75, 65, 165, 64, 22);
  g.fillStyle = '#e2eaf7';
  g.fill();
  g.restore();
},

// UPGRADED FX.architecture1P — Replaces the Pyramid Road & Skyscraper Windows with a Lush 2.5D Storybook Street!
architecture1P(g, o = {}) {
  const {
    style = 'ancientTamil',
    vx = E.W * 0.5,
    vy = 640,
    lit = 0.4,
    mood = 'day',
    wallColor = null,
  } = o;

  if (style === 'ancientTamil' || style === 'classical' || style === 'medieval' || style === 'prehistoric') {
    // Render a rich 2.5D Storybook Courtyard/Street (NO pyramid ramp, NO skyscraper window grids!)
    const isBrickStreet = wallColor && wallColor.toLowerCase() === '#a84832';
    if (isBrickStreet) {
      FX.storybookScene(g, 0, { preset: 'keeladiStreet', y: 840 });
    } else {
      FX.storybookScene(g, 0, { preset: 'templeCourtyard', y: 840 });
    }
    return;
  }

  if (style === 'eastAsian') {
    FX.tree(g, 220, 840, 1.1, '#f59eb8', 'cherry');
    FX.structure3D(g, 580, 840, 240, 220, { kind: 'mandapam' });
    FX.structure3D(g, 1380, 840, 240, 220, { kind: 'mandapam' });
    FX.tree(g, 1720, 840, 1.1, '#f59eb8', 'cherry');
    return;
  }

  // Modern / Victorian / Futuristic Avenue (with natural low horizon at y = 620)
  const horizonY = Math.max(vy, 580);
  const isNight = mood === 'night' || mood === 'sunset' || style === 'futuristic';
  const roadCol = isNight ? '#282e44' : '#58627a';
  poly(g, [[vx - 110, horizonY], [vx + 110, horizonY], [E.W * 0.86, E.H], [E.W * 0.14, E.H]], roadCol);
  const lineCol = style === 'futuristic' ? '#00f2fe' : '#e6b830';
  seg(g, [[vx - 3, horizonY], [E.W * 0.492, E.H]], 4, lineCol);
  seg(g, [[vx + 3, horizonY], [E.W * 0.508, E.H]], 4, lineCol);

  const r = rng(91);
  [-1, 1].forEach((side) => {
    for (let i = 0; i < 4; i++) {
      const bx = side < 0 ? 140 + i * 165 : E.W - 260 - i * 165;
      const bw = 135;
      const bh = 240 + (r() * 140);
      const bCol = style === 'victorian' ? '#684842' : isNight ? '#343e62' : '#7888a4';
      rr(g, bx, 840 - bh, bw, bh, 4);
      g.fillStyle = cylinderGrad(g, bx, 840 - bh, bx + bw, 840, bCol, -1);
      g.fill();
      if (lit > 0) {
        g.fillStyle = style === 'futuristic' ? '#00f2fe' : '#ffd584';
        for (let wy = 840 - bh + 22; wy < 810; wy += 28) {
          for (let wx = bx + 16; wx < bx + bw - 20; wx += 26) {
            if (r() < lit) g.fillRect(wx, wy, 12, 16);
          }
        }
      }
    }
  });
},

cityStreet1P(g, o = {}) {
  FX.architecture1P(g, Object.assign({ style: 'modern', vy: 600 }, o));
},

earthGlobe(g, x, y, r = 380, o = {}) {
  const { rot = 0, termAngle = 0.2, cityLightsProg = 1.0, pins = [], molten = false } = o;
  g.save();
  g.translate(x, y);
  glow(g, -r * 0.25, -r * 0.25, r * 1.32, molten ? '#ff5e1a' : '#5ca0ff', 0.42);
  g.save();
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = sphereGrad(g, 0, 0, r, molten ? '#3b100c' : '#1a488e', [-0.6, -0.6], 0.22);
  g.fillRect(-r, -r, r * 2, r * 2);
  const contOff = (rot * r) % (r * 2);
  const contCol = molten ? '#8c2612' : '#3d8c52';
  const drawCont = (ox) => {
    poly(g, [[-r * 0.55 + ox, -r * 0.55], [-r * 0.15 + ox, -r * 0.45], [-r * 0.05 + ox, -r * 0.08], [-r * 0.35 + ox, r * 0.05], [-r * 0.65 + ox, -r * 0.25]], contCol);
    poly(g, [[r * 0.15 + ox, -r * 0.55], [r * 0.75 + ox, -r * 0.45], [r * 0.65 + ox, r * 0.1], [r * 0.35 + ox, r * 0.45], [r * 0.15 + ox, -r * 0.1]], contCol);
  };
  drawCont(contOff);
  drawCont(contOff - r * 1.8);
  g.restore();
  ring(g, 0, 0, r, 4, molten ? 'rgba(255, 120, 50, 0.55)' : 'rgba(150, 205, 255, 0.55)');
  pins.forEach((p) => {
    const px = Math.cos(p.angle || -0.8) * (r * (p.radFrac || 0.55));
    const py = Math.sin(p.angle || -0.8) * (r * (p.radFrac || 0.55));
    glow(g, px, py, 36, '#ffd578', 0.85);
    circle(g, px, py, 7, '#ffffff');
  });
  g.restore();
},

volcano(g, x = 960, y = 780, s = 1, o = {}) {
  const { erupt = 0.8, rockCol = '#4a352c', lavaCol = '#ff5e1a', t = 0 } = o;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  poly(g, [[-480, 0], [-110, -340], [110, -340], [480, 0]], linGrad(g, 0, -340, 0, 0, [shade(rockCol, 0.15), rockCol, shade(rockCol, -0.25)]));
  if (erupt > 0) {
    glow(g, 0, -350, 220 * erupt, lavaCol, 0.75);
    poly(g, [[-85, -340], [85, -340], [35, -140], [-15, -220], [-55, -110]], linGrad(g, 0, -340, 0, -100, ['#fff3b0', lavaCol, 'rgba(255,60,10,0)']));
  }
  g.restore();
},

sun(g, x = 1480, y = 210, r = 64, color = '#fff9e6', glowColor = '#ffd578', glowR = 4.2) {
  glow(g, x, y, r * glowR, glowColor, 0.55);
  glow(g, x, y, r * 1.8, '#fff3dc', 0.65);
  circle(g, x, y, r, color);
},
moon(g, x = 1480, y = 210, r = 48, color = '#eef2ff') {
  glow(g, x, y, r * 3.8, color, 0.32);
  circle(g, x, y, r, sphereGrad(g, x, y, r, color));
},
dust(g, t, o = {}) {
  const { seed = 3, count = 45, color = '#ffe9d2', area = [0, 0, E.W, E.H], size = 2.4, speed = 15, a = 0.38, vx = 6 } = o;
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

// UPGRADED FX.skyline — Renders Authentic Storybook Horizons for Ancient Eras (Zero Skyscraper Window Grids!)
skyline(g, o = {}) {
  const {
    style = 'ancientTamil',
    seed = 7,
    x = -200,
    y = 760,
    w = E.W + 400,
    minH = 80,
    maxH = 260,
    color = '#527868',
    windowColor = '#ffd59a',
    lit = 0.35,
    minW = 75,
    maxW = 150,
  } = o;

  if (style === 'ancientTamil' || style === 'temple' || style === 'rural' || style === 'prehistoric') {
    FX.storybookHorizon(g, { style, y, seed, color: '#56856e' });
    return;
  }

  const r = rng(seed);
  let cx = x;
  while (cx < x + w) {
    const bw = minW + r() * (maxW - minW);
    const bh = minH + Math.pow(r(), 1.5) * (maxH - minH);
    g.fillStyle = cylinderGrad(g, cx, y - bh, cx + bw, y, color, -1);

    if (style === 'eastAsian') {
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

    // Only draw skyscraper window grids for 'modern' or 'futuristic'!
    if (lit > 0 && (style === 'modern' || style === 'futuristic')) {
      g.fillStyle = style === 'futuristic' ? '#00f2fe' : windowColor;
      for (let wy = y - bh + 16; wy < y - 16; wy += 18) {
        for (let wx = cx + 14; wx < cx + bw - 14; wx += 16) {
          if (r() < lit) g.fillRect(wx, wy, 7, 10);
        }
      }
    }
    cx += bw + r() * 16;
  }
},

hills(g, o = {}) {
  const { seed = 8, y = 760, amp = 95, color = '#4c855e', freq = 0.0022 } = o;
  // Back distant hill ridge
  g.fillStyle = linGrad(g, 0, y - amp * 1.25, 0, E.H, [shade(color, 0.16), shade(color, -0.12)]);
  g.beginPath();
  g.moveTo(-E.W, E.H * 2);
  for (let x = -E.W; x <= E.W * 2; x += 28) {
    g.lineTo(x, y - 25 - (noise(x * freq * 0.8, seed + 5) * 0.5 + 0.5) * amp * 1.15);
  }
  g.lineTo(E.W * 2, E.H * 2);
  g.closePath();
  g.fill();

  // Front rolling hill ridge
  g.fillStyle = linGrad(g, 0, y - amp, 0, E.H, [shade(color, 0.06), shade(color, -0.24)]);
  g.beginPath();
  g.moveTo(-E.W, E.H * 2);
  for (let x = -E.W; x <= E.W * 2; x += 24) {
    g.lineTo(x, y - (noise(x * freq, seed) * 0.5 + 0.5) * amp);
  }
  g.lineTo(E.W * 2, E.H * 2);
  g.closePath();
  g.fill();
},

// UPGRADED Fluffy 3D Storybook Cumulus Clouds (Vibrant white puffs with sunlit tops!)
clouds(g, o = {}) {
  const { seed = 10, count = 7, y = 140, h = 160, color = '#ffffff', a = 0.88, t = 0, speed = 10 } = o;
  const r = rng(seed);
  g.save();
  for (let i = 0; i < count; i++) {
    const cx = ((r() * (E.W + 500) + t * speed * (0.5 + r() * 0.5)) % (E.W + 500)) - 250;
    const cy = y + r() * h;
    const w = 150 + r() * 190;
    const colTop = color;
    const colBot = shade(color, -0.08);
    // Soft cloud base shadow
    rr(g, cx - w * 0.48, cy - 8, w * 0.96, 36, 18);
    g.fillStyle = alpha(colBot, a * 0.9);
    g.fill();
    // Volumetric puffs
    circle(g, cx - w * 0.24, cy - 12, 34, alpha(colTop, a));
    circle(g, cx + w * 0.02, cy - 24, 46, alpha(colTop, a));
    circle(g, cx + w * 0.25, cy - 10, 32, alpha(colTop, a));
  }
  g.restore();
},

// UPGRADED Multi-Biome Storybook Trees (Curved Coconut Palms with Coconuts & Lush Banyan/Oak Canopies)
tree(g, x, y, s = 1, color = '#3c8e46', kind = 'oak') {
  contactShadow(g, x, y + 4 * s, 45 * s, 9 * s, 0.26);
  if (kind === 'palm' || kind === 'cycad') {
    // Curved Coconut Palm Trunk with Bark Rings
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    seg(g, [[0, 0], [10, -55], [14, -110], [8, -162]], kind === 'cycad' ? 18 : 13, '#6e4c30');
    // Coconuts cluster at crown
    circle(g, 4, -158, 7, '#4a321c');
    circle(g, 13, -156, 7, '#5c3e24');
    // Arched Feathered Palm Fronds
    const fronds = [
      [-78, -135, -45, -182],
      [-64, -172, -32, -195],
      [-18, -205, -6, -190],
      [52, -192, 32, -192],
      [84, -162, 48, -185],
      [76, -124, 45, -162],
    ];
    fronds.forEach(([ex, ey, cx, cy], idx) => {
      g.strokeStyle = shade(color, (idx % 2) * 0.1 - 0.04);
      g.lineWidth = 10;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(8, -162);
      g.quadraticCurveTo(cx, cy, ex, ey);
      g.stroke();
    });
    g.restore();
  } else if (kind === 'pine') {
    seg(g, [[x, y], [x, y - 80 * s]], 12 * s, '#5c3e28');
    for (let tier = 0; tier < 3; tier++) {
      const ty = y - (55 + tier * 42) * s;
      const tw = (65 - tier * 14) * s;
      poly(g, [[x - tw, ty], [x + tw, ty], [x, ty - 68 * s]], shade(color, tier * 0.06));
    }
  } else {
    // Lush Oak / Banyan / Cherry Storybook Tree with Branches & Multi-Sphere Canopy
    const leafCol = kind === 'cherry' ? '#f59eb8' : color;
    seg(g, [[x, y], [x, y - 98 * s]], 16 * s, '#5c3e28');
    seg(g, [[x, y - 68 * s], [x - 32 * s, y - 108 * s]], 9 * s, '#5c3e28');
    seg(g, [[x, y - 74 * s], [x + 34 * s, y - 112 * s]], 9 * s, '#5c3e28');
    if (kind === 'banyan') {
      // Aerial prop roots
      seg(g, [[x - 32 * s, y - 95 * s], [x - 34 * s, y]], 3.5 * s, '#6e4c32');
      seg(g, [[x + 34 * s, y - 95 * s], [x + 36 * s, y]], 3.5 * s, '#6e4c32');
    }
    const blobs = [
      [-38, -112, 42],
      [38, -112, 42],
      [0, -142, 56],
      [-24, -162, 40],
      [26, -158, 40],
    ];
    blobs.forEach(([dx, dy, rad], idx) => {
      circle(g, x + dx * s, y + dy * s, rad * s, sphereGrad(g, x + dx * s, y + dy * s, rad * s, shade(leafCol, idx % 2 ? 0.08 : -0.04)));
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
  contactShadow(g, 0, 4, 150, 10, 0.28);
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

// ---------- 7. Post-Processing: Subtle Vignette & Studio Grain ----------
H.vignette = DK.vignette = function (g, strength = 0.26, color = '0,0,0') {
const gr = g.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.42, E.W / 2, E.H / 2, Math.hypot(E.W, E.H) * 0.62);
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

H.grain = DK.grain = function (g, t = 0, amount = 0.025) {
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
const vig = o.vignette !== undefined ? o.vignette : 0.26;
const grn = o.grain !== undefined ? o.grain : 0.025;
if (vig > 0) DK.vignette(g, vig);
if (grn > 0) DK.grain(g, t, grn);
};
})();





// ============================================================================
// MODULE 2: LUMINA_RIG (lib/lumina_rig.js) — Soft-Volumetric 3D-Shaded Human
// Character Rig (Zero Beards/Mustaches, 11 Sculpted Era Hairstyles), 19
// Full-Body Action & Stillness Presets, Built-In Anti-Treadmill Locomotion
// (moveX), Strict Zero-Anachronism Era Wardrobes/Headwear/Props, Two-Mode
// Expressive Eyes, Independent Pill Eyebrows, Full 2D Mouths, 5-Finger
// Articulated Hands, Crowds & Forward-Walking Storybook Fauna (Horses, Bulls,
// Elephants, Dinosaurs, Dogs, Birds). Requires MODULE 1 (window.DK / window.H).
// ============================================================================
(function () {
'use strict';

const DK = (window.DK = window.DK || {});
const H = (window.H = window.H || DK);
const {
clamp,
lerp,
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


// Natural & Stylistic Hair Colors (Default is always hairEspresso)
hairBlack: '#1A1615',
hairEspresso: '#261C1A',
hairBrown: '#4A2E20',
hairAuburn: '#7C3622',
hairBlonde: '#C8963E',
hairSilver: '#9EA6B8',
hairGrey: '#788092',
hairNavy: '#182854',
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
{ top: '#5A6B5C', bottom: '#364238', skin: '#E8A478', hair: '#4A2E20' },
{ top: '#685878', bottom: '#3E344A', skin: '#7A4E38', hair: '#1A1615' },
{ top: '#786258', bottom: '#4A3B34', skin: '#F2B892', hair: '#788092' },
{ top: '#46627A', bottom: '#283A4A', skin: '#C88C68', hair: '#261C1A' },
];

const HISTORICAL_WARDROBES = {
ancientTamil: true,
indianClassical: true,
indianIndependence: true,
khadi: true,
ancientJapan: true,
samurai: true,
ancientChina: true,
hanfu: true,
victorian: true,
'1900s': true,
roman: true,
medieval: true,
prehistoric: true,
tribal: true,
};

function hashSeed(s) {
let h = 2166136261 ^ (s | 0);
h = Math.imul(h ^ (h >>> 16), 2246822507);
h = Math.imul(h ^ (h >>> 13), 3266489909);
return (h ^ (h >>> 16)) >>> 0;
}

// Resolve Anti-Treadmill Locomotion for Humans (Default unflipped faces RIGHT +x)
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
  if (Math.abs(x1 - x0) > 4) {
    autoFlip = x1 < x0;
    isMovingX = true;
  }
}
if (Array.isArray(o.moveY) && o.moveY.length >= 2) {
  const [y0, y1, ltOrU, dur] = o.moveY;
  const u =
    dur !== undefined && dur > 0
      ? clamp((ltOrU || 0) / dur, 0, 1)
      : clamp(ltOrU || o.u || 0, 0, 1);
  py = lerp(y0, y1, u);
}
return { px, py, flipX: !!autoFlip, isMovingX };


}

// Resolve Forward-Facing Locomotion for Animals (Unflipped animal geometry faces LEFT -x,
// so moving RIGHT [x1 > x0] flips to +x, and moving LEFT [x1 < x0] stays -x!)
function resolveAnimalLocomotion(o) {
let px = o.x !== undefined ? o.x : 960;
let py = o.y !== undefined ? o.y : 840;
let isMovingX = false;
// Default stationary animal faces right (flipX = true) unless flipX: false is explicitly passed
let flipToRight = o.flipX !== undefined ? !o.flipX : true;


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
  if (Math.abs(x1 - x0) > 2) {
    // Always face the direction of travel so animals NEVER walk backwards!
    flipToRight = x1 > x0;
    isMovingX = true;
  }
}
if (Array.isArray(o.moveY) && o.moveY.length >= 2) {
  const [y0, y1, ltOrU, dur] = o.moveY;
  const u =
    dur !== undefined && dur > 0
      ? clamp((ltOrU || 0) / dur, 0, 1)
      : clamp(ltOrU || o.u || 0, 0, 1);
  py = lerp(y0, y1, u);
}
return { px, py, flipToRight, isMovingX };


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
foreheadMark = null, // 'vibhuti' | 'tilak' | 'bindi'
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
  const fy = hy - R * 0.46;
  seg(g, [[hx + gazeX - R * 0.24, fy - R * 0.055], [hx + gazeX + R * 0.24, fy - R * 0.055]], Math.max(2, R * 0.042), '#F4F6FA');
  seg(g, [[hx + gazeX - R * 0.28, fy], [hx + gazeX + R * 0.28, fy]], Math.max(2, R * 0.042), '#F4F6FA');
  seg(g, [[hx + gazeX - R * 0.24, fy + R * 0.055], [hx + gazeX + R * 0.24, fy + R * 0.055]], Math.max(2, R * 0.042), '#F4F6FA');
  circle(g, hx + gazeX, fy, R * 0.05, '#E53935');
} else if (foreheadMark === 'tilak' || foreheadMark === 'bindi') {
  circle(g, hx + gazeX, hy - R * 0.38, R * 0.06, '#E53935');
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
    circle(g, lxCenter, gy, gr, 'rgba(255, 255, 255, 0.07)');
    seg(g, [[lxCenter - gr * 0.45, gy - gr * 0.45], [lxCenter + gr * 0.2, gy + gr * 0.2]], 2.2, 'rgba(255, 255, 255, 0.25)');
    ring(g, lxCenter, gy, gr, Math.max(2.4, R * 0.065), '#3A231E');
  });
  seg(g, [[gx - spacing + gr, gy - R * 0.02], [gx + spacing - gr, gy - R * 0.02]], Math.max(2.4, R * 0.065), '#3A231E');
}


}

// ---------- 3. Full Expressive 2D Mouth Rig (STRICT ZERO BEARDS OR MUSTACHES!) ----------
function drawLuminaMouth(g, hx, hy, R, o = {}) {
const {
mouth = 'neutral',
look = [0, 0],
t = 0,
} = o;


// NOTE: Beards and mustaches are permanently disabled for clean, legible facial expressions.
const mx = hx + clamp(look[0] || 0, -1, 1) * R * 0.22;
const my = hy + R * 0.36 + clamp(look[1] || 0, -0.8, 0.8) * R * 0.1;

g.save();
g.translate(mx, my);

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
  const mw = R * 0.36, mh = R * 0.24;
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

// ---------- 4. 11 Sculpted Era-Authentic Hairstyles + Universal Headwear ----------
function resolveHairStyle(rawStyle, wardrobe, seed) {
const sHash = hashSeed(seed || 1);
const isTamilOrIndian =
wardrobe === 'ancientTamil' || wardrobe === 'indianClassical' || wardrobe === 'indianIndependence' || wardrobe === 'khadi';
const isEastAsian =
wardrobe === 'ancientJapan' || wardrobe === 'samurai' || wardrobe === 'ancientChina' || wardrobe === 'hanfu';


// If generic 'bun' or 'shortCrop' or empty is passed, diversify by seed so characters don't look identical
if (!rawStyle || rawStyle === 'bun') {
  if (isTamilOrIndian) {
    const pool = ['royalBun', 'warriorKnot', 'scholarBun', 'wavyLocks', 'shoulderFlow'];
    return pool[sHash % pool.length];
  }
  if (isEastAsian) {
    const pool = ['topknot', 'warriorKnot', 'shoulderFlow', 'royalBun'];
    return pool[sHash % pool.length];
  }
  return 'royalBun';
}
if (rawStyle === 'shortCrop') {
  if (isTamilOrIndian) {
    const pool = ['wavyLocks', 'warriorKnot', 'sidePart', 'shortCrop', 'scholarBun'];
    return pool[sHash % pool.length];
  }
  const pool = ['sidePart', 'wavyLocks', 'shortCrop', 'curlyCloud'];
  return pool[sHash % pool.length];
}
return rawStyle;


}

function drawHairBack(g, hx, hy, R, style, col) {
g.save();
if (style === 'longStraight' || style === 'shoulderFlow') {
const hLen = style === 'shoulderFlow' ? R * 1.38 : R * 1.75;
rr(g, hx - R * 1.08, hy - R * 0.35, R * 2.16, hLen, R * 0.38);
g.fillStyle = linGrad(g, hx, hy - R, hx, hy + hLen, [shade(col, 0.12), col, shade(col, -0.22)]);
g.fill();
// Sculpted side waves behind ears
circle(g, hx - R * 0.92, hy + R * 0.55, R * 0.34, shade(col, -0.1));
circle(g, hx + R * 0.92, hy + R * 0.55, R * 0.34, shade(col, -0.1));
} else if (style === 'wavyLocks') {
// Layered wavy curls framing back of neck
[
[-R * 0.96, hy + R * 0.12, R * 0.32],
[R * 0.96, hy + R * 0.12, R * 0.32],
[-R * 0.86, hy + R * 0.42, R * 0.28],
[R * 0.86, hy + R * 0.42, R * 0.28],
].forEach(([dx, dy, pr]) => {
circle(g, hx + dx, dy, pr, sphereGrad(g, hx + dx, dy, pr, shade(col, -0.06)));
});
} else if (style === 'royalBun') {
// High sculpted Kondai bun with gold ring & silk tie
circle(g, hx, hy - R * 1.08, R * 0.46, sphereGrad(g, hx, hy - R * 1.08, R * 0.46, col));
ring(g, hx, hy - R * 0.94, R * 0.38, Math.max(3.5, R * 0.085), '#FFD54F');
} else if (style === 'warriorKnot') {
// Dynamic angled warrior knot (Kudumi) tilted slightly back-left with crimson/gold tie
ellipse(g, hx - R * 0.38, hy - R * 1.05, R * 0.42, R * 0.32, sphereGrad(g, hx - R * 0.38, hy - R * 1.05, R * 0.42, col), -0.45);
seg(g, [[hx - R * 0.52, hy - R * 0.82], [hx - R * 0.12, hy - R * 0.98]], Math.max(4, R * 0.09), '#E53935');
} else if (style === 'scholarBun') {
// Low nape bun resting behind the head/ears
circle(g, hx - R * 0.78, hy + R * 0.18, R * 0.38, sphereGrad(g, hx - R * 0.78, hy + R * 0.18, R * 0.38, col));
ring(g, hx - R * 0.68, hy + R * 0.18, R * 0.3, Math.max(3, R * 0.07), '#D99B26');
} else if (style === 'topknot') {
rr(g, hx - R * 0.18, hy - R * 1.42, R * 0.36, R * 0.55, R * 0.14);
g.fillStyle = col;
g.fill();
seg(g, [[hx - R * 0.2, hy - R * 1.05], [hx + R * 0.2, hy - R * 1.05]], 3, '#E53935');
}
g.restore();
}

function drawHairFront(g, hx, hy, R, style, col, wind = 0, t = 0) {
if (style === 'none' || style === 'bald') return;
g.save();
const hiCol = shade(col, 0.16);
const shCol = shade(col, -0.14);


if (style === 'curlyCloud') {
  const puffs = [
    [0, -R * 0.9, R * 0.46],
    [-R * 0.48, -R * 0.74, R * 0.4],
    [R * 0.48, -R * 0.74, R * 0.4],
    [-R * 0.82, -R * 0.38, R * 0.32],
    [R * 0.82, -R * 0.38, R * 0.32],
    [-R * 0.24, -R * 0.64, R * 0.36],
    [R * 0.24, -R * 0.64, R * 0.36],
  ];
  puffs.forEach(([dx, dy, pr], idx) => {
    circle(g, hx + dx, hy + dy, pr, sphereGrad(g, hx + dx, hy + dy, pr, shade(col, (idx % 2) * 0.06)));
  });
} else if (style === 'wavyLocks') {
  // Center/side swept volumetric waves with temple locks
  poly(
    g,
    [
      [hx - R * 1.02, hy - R * 0.1],
      [hx - R * 0.95, hy - R * 0.68],
      [hx - R * 0.55, hy - R * 1.02],
      [hx, hy - R * 1.12],
      [hx + R * 0.58, hy - R * 1.02],
      [hx + R * 0.96, hy - R * 0.65],
      [hx + R * 1.02, hy - R * 0.1],
      [hx + R * 0.72, hy - R * 0.48],
      [hx + R * 0.18, hy - R * 0.62],
      [hx - R * 0.15, hy - R * 0.76],
      [hx - R * 0.68, hy - R * 0.48],
    ],
    linGrad(g, hx, hy - R * 1.15, hx, hy - R * 0.1, [hiCol, col, shCol])
  );
  circle(g, hx - R * 0.35, hy - R * 0.82, R * 0.28, sphereGrad(g, hx - R * 0.35, hy - R * 0.82, R * 0.28, col));
  circle(g, hx + R * 0.38, hy - R * 0.78, R * 0.26, sphereGrad(g, hx + R * 0.38, hy - R * 0.78, R * 0.26, col));
} else if (style === 'sidePart') {
  // Asymmetric swept wave across forehead + clean side part
  poly(
    g,
    [
      [hx - R * 1.0, hy - R * 0.16],
      [hx - R * 0.96, hy - R * 0.72],
      [hx - R * 0.45, hy - R * 1.1],
      [hx + R * 0.35, hy - R * 1.14],
      [hx + R * 0.88, hy - R * 0.82],
      [hx + R * 1.0, hy - R * 0.18],
      [hx + R * 0.68, hy - R * 0.52],
      [hx - R * 0.32, hy - R * 0.68],
      [hx - R * 0.52, hy - R * 0.82],
      [hx - R * 0.78, hy - R * 0.48],
    ],
    linGrad(g, hx - R, hy - R * 1.15, hx + R, hy - R * 0.2, [hiCol, col, shCol])
  );
} else if (style === 'braidedCrown') {
  // Braided plait across crown of head with gold/jasmine accents
  g.beginPath();
  g.arc(hx, hy - R * 0.14, R * 1.02, Math.PI * 1.04, Math.PI * 1.96, false);
  g.quadraticCurveTo(hx, hy - R * 0.68, hx - R * 0.98, hy - R * 0.18);
  g.closePath();
  g.fillStyle = linGrad(g, hx, hy - R * 1.1, hx, hy, [hiCol, col]);
  g.fill();
  for (let i = -3; i <= 3; i++) {
    const bx = hx + i * R * 0.22;
    const by = hy - R * 0.82 + Math.abs(i) * R * 0.05;
    ellipse(g, bx, by, R * 0.16, R * 0.1, shade(col, (i % 2) * 0.08), 0.25);
  }
  circle(g, hx + R * 0.68, hy - R * 0.68, R * 0.09, '#FFD54F');
} else if (style === 'spikyMessy' || style === 'shortCrop') {
  const wOff = wind > 0 ? Math.sin(t * 22) * R * 0.12 * wind : 0;
  const tipScale = style === 'shortCrop' ? 0.88 : 1.05;
  poly(
    g,
    [
      [hx - R * 0.98, hy - R * 0.16],
      [hx - R * 1.05 + wOff, hy - R * 0.58 * tipScale],
      [hx - R * 0.82, hy - R * 0.65],
      [hx - R * 0.84 + wOff, hy - R * 0.98 * tipScale],
      [hx - R * 0.45, hy - R * 0.88],
      [hx - R * 0.22 + wOff, hy - R * 1.16 * tipScale],
      [hx + R * 0.1, hy - R * 0.94],
      [hx + R * 0.46 + wOff, hy - R * 1.14 * tipScale],
      [hx + R * 0.68, hy - R * 0.84],
      [hx + R * 1.02 + wOff, hy - R * 0.88 * tipScale],
      [hx + R * 0.96, hy - R * 0.16],
      [hx + R * 0.58, hy - R * 0.56],
      [hx, hy - R * 0.62],
      [hx - R * 0.58, hy - R * 0.56],
    ],
    linGrad(g, hx, hy - R * 1.2, hx, hy - R * 0.2, [hiCol, col, shCol])
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
  // Sculpted parted hairline for royalBun, warriorKnot, scholarBun, shoulderFlow, topknot
  g.beginPath();
  g.arc(hx, hy - R * 0.14, R * 1.02, Math.PI * 1.03, Math.PI * 1.97, false);
  g.quadraticCurveTo(hx + R * 0.55, hy - R * 0.48, hx, hy - R * 0.68);
  g.quadraticCurveTo(hx - R * 0.55, hy - R * 0.48, hx - R * 0.98, hy - R * 0.18);
  g.closePath();
  g.fillStyle = linGrad(g, hx, hy - R * 1.1, hx, hy, [hiCol, col, shCol]);
  g.fill();
}
g.restore();


}

function drawHeadwear(g, hx, hy, R, kind, primaryCol) {
if (!kind || kind === 'none') return;
g.save();
if (kind === 'crown') {
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
poly(g, [[hx - R * 1.65, hy - R * 0.58], [hx + R * 1.65, hy - R * 0.58], [hx, hy - R * 1.38]], cylinderGrad(g, hx - R * 1.6, hy - R, hx + R * 1.6, hy - R, '#D9B372', -1));
} else if (kind === 'kabuto') {
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

// ---------- 5. Universal Held Action Props (Axe, Vel, Sword, Hammer, Manuscripts, Baby) ----------
function drawHeldProp(g, x, y, s, kind, t = 0) {
if (!kind || kind === 'none') return;
g.save();
g.translate(x, y);
g.scale(s, s);


if (kind === 'axe') {
  // Woodcutter / Iron-Age Axe with Hardwood Handle & Curved Steel/Iron Wedge Blade
  seg(g, [[0, 32], [0, -72]], 8, '#7A4E2D');
  poly(
    g,
    [
      [-6, -68],
      [38, -82],
      [44, -56],
      [36, -34],
      [-6, -46],
    ],
    linGrad(g, -6, -60, 44, -60, ['#546E7A', '#B0BEC5', '#FFFFFF']),
    '#37474F',
    2
  );
} else if (kind === 'vel' || kind === 'spear') {
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
  poly(g, [[-10, -28], [10, -28], [24, 18], [-24, 18]], 'rgba(200, 240, 255, 0.45)', '#DCEEFF', 2.5);
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
const seed = o.seed !== undefined ? o.seed : Math.round((o.x || 500) * 0.13);
const lDir = o.lightDir || [-0.6, -0.75];

// 1. Resolve Anti-Treadmill Locomotion & Direction
const loco = resolveLocomotion(o);
const px = loco.px;
const py = loco.py;
const flipX = loco.flipX;

// 2. Resolve Skin, Varied Era Hair & Wardrobe Colors
const wardrobe = o.wardrobe || (o.era === 'pilot' ? 'pilotUniform' : 'sweater');
const isHistoricalEra = !!HISTORICAL_WARDROBES[wardrobe];

const defaultEraSkin =
  wardrobe === 'ancientTamil' || wardrobe === 'indianClassical' || wardrobe === 'indianIndependence' || wardrobe === 'khadi'
    ? PALETTE.skinOlive
    : wardrobe === 'ancientJapan' || wardrobe === 'samurai' || wardrobe === 'ancientChina' || wardrobe === 'hanfu'
    ? PALETTE.skinPeach
    : PALETTE.skinTan;

const rawSkin = PALETTE[o.skin] || o.skin || defaultEraSkin;
const skinCol = o.hypoxia ? mix(rawSkin, PALETTE.skinHypoxia, clamp(o.hypoxia, 0, 1)) : rawSkin;

let hairStyle = resolveHairStyle(o.hairStyle, wardrobe, seed);
if (isHistoricalEra && !o.allowModern && (hairStyle === 'spikyMessy' || hairStyle === 'curlyCloud')) {
  hairStyle = resolveHairStyle('bun', wardrobe, seed);
}

let hairCol = PALETTE[o.hairColor] || o.hairColor || PALETTE.hairEspresso;
if (isHistoricalEra && !o.allowModern && (hairCol === PALETTE.hairNavy || hairCol === PALETTE.hairOrange || hairCol === '#182854')) {
  hairCol = PALETTE.hairEspresso;
}

const topCol =
  PALETTE[o.topColor] ||
  o.topColor ||
  PALETTE[o.color] ||
  (wardrobe === 'scientist' || wardrobe === 'indianIndependence' || wardrobe === 'khadi' || wardrobe === 'astronaut'
    ? '#F4F6FA'
    : wardrobe === 'ancientTamil' || wardrobe === 'indianClassical'
    ? '#F7B928'
    : wardrobe === 'ancientJapan' || wardrobe === 'samurai'
    ? '#2B3A55'
    : wardrobe === 'ancientChina' || wardrobe === 'hanfu'
    ? '#9E2A2B'
    : wardrobe === 'victorian' || wardrobe === '1900s'
    ? '#2B3040'
    : PALETTE.yellow);

const botCol =
  PALETTE[o.bottomColor] ||
  o.bottomColor ||
  (wardrobe === 'ancientTamil' || wardrobe === 'indianClassical' || wardrobe === 'indianIndependence' || wardrobe === 'khadi' || wardrobe === 'roman'
    ? '#F4EFE6'
    : wardrobe === 'ancientJapan' || wardrobe === 'samurai'
    ? '#1E2436'
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
    expr:
      o.expr ||
      (preset === 'fight' || preset === 'swordFight'
        ? 'fight'
        : preset === 'admire'
        ? 'admire'
        : preset === 'meditate'
        ? 'meditate'
        : 'neutral'),
  })
);

const R = 50 * s;
const torsoH = 104 * s;
const shW = 78 * s;
const isCrouch = preset === 'crouch' || preset === 'dodge' || preset === 'brace';
const legH = (isSeated ? 48 : isCrouch ? 64 : 96) * s;
const legW = 22 * s;
const armW = 20 * s;

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

const bodyRot =
  (o.rot || 0) +
  (isRun
    ? 0.18
    : preset === 'push'
    ? 0.24
    : preset === 'pull'
    ? -0.2
    : preset === 'fight' || preset === 'swordFight'
    ? 0.09
    : preset === 'build'
    ? 0.07
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

  if (preset === 'fight' || preset === 'swordFight' || preset === 'push' || preset === 'pull' || preset === 'build') {
    stride = 18 * s;
  } else if (preset === 'climb') {
    liftL = Math.sin(time * 5) * 18 * s;
    liftR = -Math.sin(time * 5) * 18 * s;
  }

  const isBarefootOrSandal =
    wardrobe === 'ancientTamil' ||
    wardrobe === 'indianClassical' ||
    wardrobe === 'indianIndependence' ||
    wardrobe === 'khadi' ||
    wardrobe === 'prehistoric' ||
    wardrobe === 'tribal' ||
    wardrobe === 'roman' ||
    wardrobe === 'ancientJapan';

  const isDarkBootOrShoe =
    wardrobe === 'samurai' ||
    wardrobe === 'ancientChina' ||
    wardrobe === 'hanfu' ||
    wardrobe === 'medieval' ||
    wardrobe === 'victorian' ||
    wardrobe === '1900s' ||
    wardrobe === 'pilotUniform' ||
    wardrobe === 'shirtTie';

  [
    { hx: -16 * s, fx: -16 * s - stride, fy: liftL },
    { hx: 16 * s, fx: 16 * s + stride, fy: liftR },
  ].forEach((lg) => {
    const kneeX = lerp(lg.hx, lg.fx, 0.5) + (isRun || isCrouch || lg.fy < -4 * s ? 10 * s : 0);
    const kneeY = lerp(hipY, lg.fy - 8 * s, 0.5);
    seg(g, [[lg.hx, hipY], [kneeX, kneeY], [lg.fx, lg.fy - 8 * s]], legW, botCol);

    if (wardrobe === 'ancientTamil' || wardrobe === 'indianClassical') {
      seg(g, [[lg.fx - 9 * s, lg.fy - 16 * s], [lg.fx + 9 * s, lg.fy - 16 * s]], 4 * s, '#FFD54F');
    }

    rr(g, lg.fx - 13 * s, lg.fy - 12 * s, 28 * s, 12 * s, 6 * s);
    g.fillStyle = isBarefootOrSandal ? skinCol : isDarkBootOrShoe ? '#231F1E' : '#F5F7FA';
    g.fill();
    g.fillStyle = isBarefootOrSandal ? '#8C5832' : isDarkBootOrShoe ? '#120F0E' : '#E53935';
    g.fillRect(lg.fx - 12 * s, lg.fy - 3 * s, 26 * s, 3 * s);
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
  const drapeCol = o.topColor || '#F7B928';
  poly(g, [[-shW * 0.52, shoulderY], [-shW * 0.08, shoulderY], [shW * 0.52, hipY - 12 * s], [shW * 0.12, hipY]], drapeCol);
  seg(g, [[-shW * 0.08, shoulderY], [shW * 0.52, hipY - 12 * s]], 5 * s, '#FFD54F');
  g.fillStyle = '#FFD54F';
  g.fillRect(-shW / 2, hipY - 14 * s, shW, 10 * s);
} else if (wardrobe === 'indianIndependence' || wardrobe === 'khadi') {
  seg(g, [[0, shoulderY + 6 * s], [0, shoulderY + 46 * s]], 3 * s, '#CBD5E1');
  if (o.topColor && o.topColor !== '#F4F6FA') {
    g.fillStyle = shade(topCol, -0.15);
    g.fillRect(-shW / 2, shoulderY, shW * 0.34, torsoH);
    g.fillRect(shW * 0.16, shoulderY, shW * 0.34, torsoH);
  }
} else if (wardrobe === 'ancientJapan' || wardrobe === 'samurai' || wardrobe === 'ancientChina' || wardrobe === 'hanfu') {
  seg(g, [[-22 * s, shoulderY], [12 * s, hipY - 22 * s]], 6 * s, '#F4EFE6');
  seg(g, [[22 * s, shoulderY], [-6 * s, shoulderY + 48 * s]], 6 * s, '#F4EFE6');
  g.fillStyle = wardrobe === 'samurai' ? '#9E2A2B' : '#FFD54F';
  g.fillRect(-shW / 2, hipY - 28 * s, shW, 18 * s);
} else if (wardrobe === 'victorian' || wardrobe === '1900s') {
  poly(g, [[-18 * s, shoulderY], [18 * s, shoulderY], [0, shoulderY + 52 * s]], '#F4F6FA');
  poly(g, [[-4 * s, shoulderY + 8 * s], [4 * s, shoulderY + 8 * s], [6 * s, shoulderY + 38 * s], [-6 * s, shoulderY + 38 * s]], '#9E2A2B');
  seg(g, [[-20 * s, shoulderY], [-6 * s, shoulderY + 55 * s]], 5 * s, shade(topCol, -0.25));
  seg(g, [[20 * s, shoulderY], [6 * s, shoulderY + 55 * s]], 5 * s, shade(topCol, -0.25));
} else if (wardrobe === 'roman' || wardrobe === 'medieval') {
  poly(g, [[-shW * 0.5, shoulderY], [shW * 0.2, shoulderY], [shW * 0.5, hipY], [-shW * 0.2, hipY]], '#E53935');
  g.fillStyle = '#B87333';
  g.fillRect(-shW / 2, hipY - 16 * s, shW, 12 * s);
} else if (wardrobe === 'scientist' || wardrobe === 'labCoat') {
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
} else {
  circle(g, headX, shoulderY + 2 * s, 22 * s, shade(topCol, 0.18));
  g.fillStyle = shade(topCol, -0.14);
  g.fillRect(-shW / 2, hipY - 12 * s, shW, 12 * s);
}

if (o.seatbelt && !isHistoricalEra) {
  g.fillStyle = '#254282';
  g.fillRect(-shW * 0.52, hipY - 24 * s, shW * 1.04, 14 * s);
  rr(g, -14 * s, hipY - 26 * s, 28 * s, 18 * s, 4 * s);
  g.fillStyle = '#CBD5E8';
  g.fill();
}
g.restore();

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
if (isHistoricalEra && !o.allowModern && propName === 'phone') propName = 'none';
let rPropRot = 0;

if (preset === 'build' || preset === 'hammer' || preset === 'wrench' || preset === 'chop') {
  const strike = Math.sin(time * 8.5 + seed);
  lHand = [shW * 0.42, shoulderY + 34 * s];
  rHand = [shW * 0.84, shoulderY - 16 * s + strike * 36 * s];
  rPropRot = 0.55 + strike * 0.6;
  if (propName === 'none') propName = preset === 'chop' ? 'axe' : 'hammer';
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
  if (propName === 'none')
    propName =
      wardrobe === 'samurai' || wardrobe === 'ancientJapan'
        ? 'katana'
        : wardrobe === 'ancientTamil'
        ? 'vel'
        : 'sword';
} else if (preset === 'push' || preset === 'pull') {
  const dir = preset === 'push' ? 1 : 0.75;
  lHand = [shW * 0.78 * dir, shoulderY + 22 * s];
  rHand = [shW * 0.92 * dir, shoulderY + 28 * s];
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
    seg(
      g,
      [
        [lerp(a.sx, ex, 0.55) - 8 * s, lerp(a.sy, ey, 0.55)],
        [lerp(a.sx, ex, 0.55) + 8 * s, lerp(a.sy, ey, 0.55)],
      ],
      4.5 * s,
      '#FFD54F'
    );
  }
  circle(g, a.hx, a.hy, 11 * s, sphereGrad(g, a.hx, a.hy, 11 * s, skinCol));
  if (a.isThumb) {
    rr(g, a.hx - 4 * s, a.hy - 22 * s, 8 * s, 14 * s, 4 * s);
    g.fillStyle = skinCol;
    g.fill();
  }
});

if (propName === 'baby') {
  const bx = 6 * s + Math.sin(time * 2.4 + seed) * 5 * s;
  const by = shoulderY + 42 * s;
  g.save();
  g.translate(bx, by);
  g.rotate(-0.18 + Math.sin(time * 2.4) * 0.04);
  ellipse(g, 0, 0, 34 * s, 18 * s, sphereGrad(g, 0, 0, 34 * s, '#FFF3D6'));
  circle(g, -18 * s, -4 * s, 13 * s, sphereGrad(g, -18 * s, -4 * s, 13 * s, skinCol));
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
  glasses: isHistoricalEra && !o.allowModern ? false : o.glasses,
  foreheadMark: o.foreheadMark || (wardrobe === 'ancientTamil' ? 'vibhuti' : null),
  blink: o.blink,
  t: time,
  seed,
});

// 9. Clean-Shaven Expressive 2D Mouth
drawLuminaMouth(g, headX, headY, R, {
  mouth,
  look: o.look || o.lookDir || [0, 0],
  t: time,
});

// 10. Front Sculpted / Era Hair Silhouette
drawHairFront(g, headX, headY, R, hairStyle, hairCol, o.hairWind || (isRun ? 0.55 : 0), time);

// 11. Universal Era Headwear & Oxygen Mask
const headwear = o.headwear || (o.pilotCap ? 'pilotCap' : wardrobe === 'astronaut' ? 'spaceHelmet' : 'none');
drawHeadwear(g, headX, headY, R, headwear, o.topColor);

if (o.oxygenMask && o.oxygenMask !== 'none' && !isHistoricalEra) {
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

// ---------- 9. Tier 3 Crowd Generator ----------
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
const isTamilOrIndian =
wardrobe === 'ancientTamil' || wardrobe === 'indianClassical' || wardrobe === 'indianIndependence' || wardrobe === 'khadi';
const isEastAsian =
wardrobe === 'ancientJapan' || wardrobe === 'samurai' || wardrobe === 'ancientChina' || wardrobe === 'hanfu';


const tamilCrowdTops = ['#F7B928', '#D96B27', '#C92A2A', '#28808C', '#8C5832'];
const eastAsianCrowdTops = ['#2B3A55', '#3E4C5E', '#5C3A38', '#364A42', '#4A3F55'];
const crowdHairPool = ['royalBun', 'warriorKnot', 'scholarBun', 'wavyLocks', 'sidePart', 'shoulderFlow'];

for (let i = 0; i < count; i++) {
  const u = count === 1 ? 0.5 : i / (count - 1);
  const cx = lerp(x0, x1, u) + (r() - 0.5) * 40 * s + moveOffset;
  const cy = y + (r() - 0.5) * 14 * s;
  const pal = TIER3_PALETTE[i % TIER3_PALETTE.length];

  const topColor =
    wardrobe === 'indianIndependence' || wardrobe === 'khadi'
      ? '#F4F6FA'
      : isTamilOrIndian
      ? tamilCrowdTops[i % tamilCrowdTops.length]
      : isEastAsian
      ? eastAsianCrowdTops[i % eastAsianCrowdTops.length]
      : pal.top;

  const bottomColor = isTamilOrIndian ? '#F4EFE6' : isEastAsian ? '#1E2436' : pal.bottom;
  const skin = isTamilOrIndian
    ? i % 2 === 0
      ? PALETTE.skinOlive
      : PALETTE.skinBrown
    : isEastAsian
    ? PALETTE.skinPeach
    : pal.skin;

  drawCutoutChar(g, {
    x: cx,
    y: cy,
    s: s * (0.9 + r() * 0.18),
    skin,
    hairStyle: crowdHairPool[i % crowdHairPool.length],
    hairColor: PALETTE.hairEspresso,
    wardrobe,
    topColor,
    bottomColor,
    pose: { preset: behavior, walk: behavior === 'walk' || behavior === 'march' ? 0.85 : 0 },
    t,
    seed: seed + i * 19,
  });
}


}

// ---------- 10. Forward-Walking Storybook Fauna (Horses, Bulls, Elephants, Dinosaurs, Dogs, Birds) ----------
function drawCutoutAnimal(g, o = {}) {
const {
kind = 'dog', // 'elephant' | 'horse' | 'bull' | 'dinosaur' | 'dog' | 'cat' | 'pigeon' | 'sparrow' | 'goat' | 'redBloodCell'
s = 1,
expr = 'neutral',
o2Count = 3,
t = 0,
} = o;



// Resolve Forward-Walking Locomotion (Animal head is drawn on the -x side, so
// flipToRight = true scales (-1, 1) to make the animal face RIGHT when moving right!)
const loco = resolveAnimalLocomotion(o);
const x = loco.px;
const y = loco.py;

g.save();
g.translate(x, y);
if (loco.flipToRight) g.scale(-1, 1);
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
  contactShadow(g, 0, 6, 130, 18, 0.35);
  const stride = Math.sin(t * 4.2) * 16;
  [
    [-65, -75, stride],
    [-28, -75, -stride],
    [38, -75, stride],
    [72, -75, -stride],
  ].forEach(([lx, ly, st]) => {
    seg(g, [[lx, ly], [lx + st, 0]], 28, '#6E7582');
  });
  ellipse(g, 8, -115, 105, 72, sphereGrad(g, 8, -115, 105, '#7C8494'));
  if (o.royal !== false) {
    rr(g, -45, -168, 105, 78, 16);
    g.fillStyle = '#C92A2A';
    g.fill();
    g.strokeStyle = '#FFD54F';
    g.lineWidth = 5;
    g.stroke();
  }
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
  const bodyCol = o.color || (isBull ? '#E2D2BC' : '#8C5230');
  const darkCol = shade(bodyCol, -0.2);
  const maneCol = isBull ? '#4A3F35' : '#261812';
  contactShadow(g, 0, 5, 92, 13, 0.32);

  const walkFreq = isBull ? 5.5 : 8.5;
  const swing = Math.sin(t * walkFreq + (o.seed || 1)) * (isBull ? 18 : 26);

  // 1. Flowing Tail
  const tailWave = Math.sin(t * 5) * 10;
  if (isBull) {
    seg(g, [[66, -88], [84 + tailWave * 0.5, -42]], 6, darkCol);
    ellipse(g, 85 + tailWave * 0.5, -36, 7, 12, maneCol, 0.2);
  } else {
    poly(
      g,
      [
        [62, -94],
        [92 + tailWave, -72],
        [98 + tailWave, -34],
        [76 + tailWave * 0.5, -48],
      ],
      maneCol
    );
  }

  // 2. Back Pair of Articulated Legs + Hooves
  [
    { hx: -42, ph: -swing },
    { hx: 44, ph: swing },
  ].forEach((lg) => {
    const kx = lg.hx + lg.ph * 0.45 - 6;
    const ky = -42 - Math.max(0, -lg.ph * 0.35);
    const fx = lg.hx + lg.ph;
    const fy = -Math.max(0, -lg.ph * 0.4);
    seg(g, [[lg.hx, -78], [kx, ky], [fx, fy - 6]], 13, darkCol);
    rr(g, fx - 8, fy - 8, 15, 8, 3);
    g.fillStyle = '#1E1816';
    g.fill();
  });

  // 3. Sculpted 3D Barrel Torso, Chest & Haunches
  ellipse(g, 0, -86, 70, 36, sphereGrad(g, 0, -86, 70, bodyCol));
  circle(g, -42, -88, 32, sphereGrad(g, -42, -88, 32, bodyCol));
  circle(g, 42, -88, 32, sphereGrad(g, 42, -88, 32, shade(bodyCol, -0.05)));

  // 4. Front Pair of Articulated Legs + Hooves
  [
    { hx: -34, ph: swing },
    { hx: 50, ph: -swing },
  ].forEach((lg) => {
    const kx = lg.hx + lg.ph * 0.45 - 6;
    const ky = -42 - Math.max(0, lg.ph * 0.35);
    const fx = lg.hx + lg.ph;
    const fy = -Math.max(0, lg.ph * 0.4);
    seg(g, [[lg.hx, -78], [kx, ky], [fx, fy - 6]], 14, bodyCol);
    rr(g, fx - 8, fy - 8, 15, 8, 3);
    g.fillStyle = '#1E1816';
    g.fill();
  });

  if (isBull) {
    // Kangayam / Zebu Muscular Hump, Dewlap, Head & Sweeping Curved Horns
    circle(g, -36, -122, 26, sphereGrad(g, -36, -122, 26, bodyCol));
    poly(g, [[-52, -88], [-82, -108], [-62, -66]], shade(bodyCol, -0.08));
    ellipse(g, -78, -112, 26, 20, sphereGrad(g, -78, -112, 26, bodyCol), -0.35);
    ellipse(g, -98, -102, 14, 11, '#4A3F35', -0.2);
    // Curved Horns & Ears
    seg(g, [[-68, -126], [-78, -162], [-56, -178]], 8, '#3E352F');
    seg(g, [[-62, -124], [-66, -156], [-46, -170]], 7, '#544840');
    ellipse(g, -62, -116, 12, 6, darkCol, 0.4);
    circle(g, -82, -116, 4.5, '#1A1818');
    circle(g, -83, -117, 1.5, '#FFFFFF');
  } else {
    // Optional Saddle & Royal Blanket for Warhorse
    if (o.saddle !== false) {
      rr(g, -24, -122, 52, 34, 10);
      g.fillStyle = '#C92A2A';
      g.fill();
      g.strokeStyle = '#FFD54F';
      g.lineWidth = 3;
      g.stroke();
      ellipse(g, 0, -118, 22, 10, '#5C3824');
    }
    // Muscular Arched Horse Neck, Flowing Mane, Pointed Ears & Sculpted Snout
    poly(
      g,
      [
        [-32, -98],
        [-64, -84],
        [-84, -142],
        [-54, -152],
      ],
      sphereGrad(g, -58, -120, 40, bodyCol)
    );
    // Sculpted Mane Tufts along back of neck
    for (let m = 0; m < 5; m++) {
      const mu = m / 4;
      const mx = lerp(-54, -32, mu);
      const my = lerp(-150, -104, mu);
      ellipse(g, mx + 8, my, 12, 7, maneCol, -0.5);
    }
    // Pointed Ears
    poly(g, [[-74, -148], [-80, -168], [-66, -154]], darkCol);
    poly(g, [[-66, -150], [-70, -170], [-58, -154]], bodyCol);
    // Horse Head & Tapered Muzzle
    ellipse(g, -76, -142, 22, 16, sphereGrad(g, -76, -142, 22, bodyCol), -0.45);
    poly(
      g,
      [
        [-82, -152],
        [-112, -132],
        [-104, -118],
        [-72, -130],
      ],
      sphereGrad(g, -92, -135, 24, bodyCol)
    );
    circle(g, -104, -126, 3, '#261812');
    circle(g, -82, -144, 4.5, '#1A1818');
    circle(g, -83, -145, 1.5, '#FFFFFF');
    // Leather Bridle & Reins
    if (o.saddle !== false) {
      seg(g, [[-100, -124], [-72, -148], [-18, -118]], 2.5, '#3E2723');
    }
  }
  g.restore();
  return;
}

if (kind === 'dinosaur' || kind === 'trex' || kind === 'sauropod') {
  const dinoCol = o.color || '#4E7A52';
  contactShadow(g, 0, 6, 110, 16, 0.34);
  const step = Math.sin(t * 5.5) * 18;
  seg(g, [[-25, -75], [-25 + step, 0]], 26, shade(dinoCol, -0.15));
  seg(g, [[25, -75], [25 - step, 0]], 26, '#4E7A52');
  poly(g, [[20, -105], [145, -75 + Math.sin(t * 4) * 10], [20, -55]], dinoCol);
  ellipse(g, -10, -98, 68, 46, sphereGrad(g, -10, -98, 68, dinoCol));
  seg(g, [[-58, -95], [-82, -82]], 9, dinoCol);
  rr(g, -125, -175, 72, 48, 16);
  g.fillStyle = sphereGrad(g, -90, -150, 50, dinoCol);
  g.fill();
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
  [
    [-24, -14, step],
    [-8, -14, -step],
    [18, -14, step],
    [30, -14, -step],
  ].forEach(([lx, ly, st]) => {
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
  [
    [-24, -22],
    [-10, -22],
    [16, -22],
    [28, -22],
  ].forEach(([lx, ly], idx) => {
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
HISTORICAL_WARDROBES,
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
// MODULE 4: LUMINA_SOUND (engine/lumina_sound.js) — 100% UNIVERSAL GENERATIVE
// MUSIC COMPOSER, MULTI-LAYER AMBIENCE & ACTION-SYNCED FOLEY/SFX ENGINE
// - Zero hardcoded loop repetition: composes unique, phrase-structured 4-bar
//   motifs, counter-melodies, Euclidean rhythms, and dynamic chord progressions
//   for ANY situation, mood, era, culture, or free-form description.
// - 24 World & Cinematic Scales + 16 Harmonic Topologies + 30 Studio Voices
//   with stereo ping-pong delay & lush algorithmic hall reverb.
// - 100+ Action-Synced Foley/SFX Presets + Universal Semantic SFX Synthesizer
//   (synthesizes ANY custom sound string on the fly at frame-accurate time t).
// - Supports live browser playback & offline 48kHz stereo WAV rendering.
// - Clean Track Separation Modes (opts.mixMode):
//     * 'sfxOnly' : Heavy (0.75) + Foley/UI (0.45) + Ambient (0.20), ZERO BGM
//     * 'bgmOnly' : Continuous VO-Ducked Situational BGM (0.18 / 0.55 / 0.00)
//     * 'bgmFull' : Continuous Unducked Situational BGM (0.42 / 0.55 / 0.00)
// ============================================================================
(function () {
  'use strict';

  const SOUND = (window.SOUND = window.SOUND || {});
  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  DK.sound = H.sound = SOUND;

  const TINY = 1e-4;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * clamp(k, 0, 1);

  // Exact Calibrated Broadcast Mixing Levels
  const MIX = (SOUND.MIX = {
    HEAVY_IMPACT: 0.75, // decompressionBang, explosion, thunder, impact, shatter, powerDown, boltSnap, volcanoRumble, dinoRoar
    BGM_SWELL: 0.55,    // Title Cards, Era/Horizon Chapter Dials, Radial Timers, Cosmic/Heroic/Historical Swells
    UI_FOLEY: 0.45,     // swordClash, hammerHit, horseGallop, templeBell, coinClink, recordScratch, alarmBeep, etc.
    AMBIENT_LOOP: 0.20, // cabinHum, supersonicWind, ancientHarbor, monsoonRain, scienceLab, bazaarMarket, ocean
    BGM_VO_BED: 0.18,   // Active narration bed
    BGM_STOP: 0.00,     // DIEGETIC_SILENCE & deadpan comedic punchlines
  });

  // ---------- 1. Deterministic PRNG & Euclidean Rhythm Math ----------
  function rand(key) {
    let h = 2166136261;
    const str = String(key || 'lumina');
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

  // Bjorklund / Euclidean Rhythm Generator: distributes k pulses evenly across n steps
  function euclideanRhythm(k, n, rotation = 0) {
    k = clamp(Math.round(k), 1, n);
    const pattern = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (Math.floor((i * k) / n) !== Math.floor(((i - 1) * k) / n)) {
        pattern[(i + rotation) % n] = 1;
      }
    }
    pattern[0] = 1; // Always anchor downbeat 1 for musical lock
    return pattern;
  }

  // ---------- 2. Universal Pitch, 24 World/Cinematic Scales & 16 Chord Topologies ----------
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
    const m = /^([A-G][#b]?)/.exec(String(keyStr || 'D').trim());
    const rootName = m ? m[1] : 'D';
    return noteToMidi(rootName + '2');
  }

  // 24 Universal Scales & World Ragas (Semitone offsets across 2 octaves)
  const SCALES = (SOUND.SCALES = {
    aeolian:                  [0, 2, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24], // Natural Minor (Drama, History, Survival)
    dorian:                   [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22, 24], // Kurzgesagt / Science / Tech / Hopeful Minor
    harmonicMinor:            [0, 2, 3, 5, 7, 8, 11, 12, 14, 15, 17, 19, 20, 23, 24], // Mystery, Investigation, Classical Tension
    melodicMinor:             [0, 2, 3, 5, 7, 9, 11, 12, 14, 15, 17, 19, 21, 23, 24], // Noir, Deep Thought, Detective
    phrygian:                 [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24], // Dark Tension, Cyber, Crisis
    phrygianDominant:         [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19, 20, 22, 24], // Ancient Desert, Conquest, Intense History
    lydian:                   [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24], // Cosmic Wonder, Space, Eureka Discovery
    mixolydian:               [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17, 19, 21, 22, 24], // Adventure, Exploration, Momentum
    ionian:                   [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24], // Warm Major, Triumph, Resolution
    pentatonicMinor:          [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 27],           // Clean Modern Explainer Groove
    pentatonicMajor:          [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26],            // Pastoral, Morning, Peaceful Village
    carnaticMayamalavagowla:  [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23, 24], // Ancient Tamilakam, Sacred Temple, Keeladi
    carnaticMohanam:          [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26],            // Chola Golden Era, Auspicious Grandeur
    carnaticCharukesi:        [0, 2, 4, 5, 7, 8, 10, 12, 14, 16, 17, 19, 20, 22, 24], // Deep Emotional South Indian Pathos
    carnaticSivaranjani:      [0, 2, 3, 7, 9, 12, 14, 15, 19, 21, 24],                // Solemn Classical Melancholy
    carnaticHamsadhwani:      [0, 2, 4, 7, 11, 12, 14, 16, 19, 23, 24],               // Bright Indian Discovery / Celebration
    hindustaniBhairavi:       [0, 1, 3, 5, 7, 8, 10, 12, 13, 15, 17, 19, 20, 22, 24], // Timeless Subcontinent Epic
    japaneseHirajoshi:        [0, 2, 3, 7, 8, 12, 14, 15, 19, 20, 24],                // Feudal Japan, Samurai, Edo Mystery
    japaneseInSen:            [0, 1, 5, 7, 10, 12, 13, 17, 19, 22, 24],               // Zen, Shinobi, East Asian Tension
    chinesePentatonic:        [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24],                // Imperial Dynasty, Silk Road
    arabicHijaz:              [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23, 24], // Middle East, Trade Caravan
    wholeTone:                [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],        // Quantum Physics, Time Paradox, Dream
    octatonicDiminished:      [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21],  // Espionage, Ticking Bomb, Thriller
    bluesHexatonic:           [0, 3, 5, 6, 7, 10, 12, 15, 17, 18, 19, 22, 24],        // Quirky Satire, Heist, Deadpan Comedy
  });

  // 16 Chord Progression Topologies (Scale degree indices [0..6] + rich extensions)
  const PROGRESSIONS = {
    cinematicMinor:   [[0, 2, 4, 7], [5, 7, 9, 12], [2, 4, 6, 9], [6, 8, 10, 13]], // i - VI - III - VII (Hans Zimmer / Epic)
    kurzgesagtDorian: [[0, 2, 4, 6], [3, 5, 7, 9], [4, 6, 8, 11], [0, 2, 4, 9]],   // i7 - IV7 - v7 - i(add6) (Science / Synth)
    mysteryInquire:   [[0, 2, 4, 7], [1, 3, 5, 8], [4, 6, 8, 11], [0, 2, 4, 7]],   // i - ii° - v - i (Investigation / Lemmino)
    tickingSurvival:  [[0, 4, 7],    [0, 5, 8],    [0, 4, 7],     [6, 9, 13]],     // Pedal i - bVI/i - i - VII (Urgent Crisis)
    darkDread:        [[0, 4, 7],    [1, 4, 8],    [0, 4, 7],     [4, 6, 11]],     // i - bII(Phrygian) - i - V (Catastrophe)
    solemnTragedy:    [[0, 2, 4, 7], [6, 8, 10],   [5, 7, 9, 12], [4, 6, 8]],      // i - VII - VI - v (Andalucian Lament)
    cosmicLydian:     [[0, 2, 4, 6], [1, 3, 5, 8], [5, 7, 9, 12], [0, 2, 4, 9]],   // I(maj7) - II - vi - I(add9) (Space / Awe)
    heroicTriumph:    [[0, 2, 4, 7], [4, 6, 8, 11],[5, 7, 9, 12], [3, 5, 7, 10]],  // I - V - vi - IV (Uplifting Resolution)
    royalGrandeur:    [[0, 2, 4, 7], [6, 8, 10],   [3, 5, 7, 10], [0, 2, 4, 7]],   // I - bVII - IV - I (Imperial / Chola / Epic)
    carnaticPedal:    [[0, 4, 7],    [0, 3, 7],    [0, 4, 9],     [0, 4, 7]],      // Shadja-Panchama Raga Drone Harmony
    eastAsianModal:   [[0, 4, 7],    [2, 5, 9],    [3, 7, 10],    [0, 4, 7]],      // Suspended Pentatonic Quartal Harmony
    quirkyComedy:     [[0, 2, 4],    [3, 5, 7],    [4, 6, 8],     [0, 2, 4]],      // Bouncy i - iv - V - i (OverSimplified Skit)
    heistGroove:      [[0, 2, 4, 6], [2, 4, 6, 9], [3, 5, 7, 9],  [4, 6, 8, 10]],  // Funky Minor 7th Climb
    eerieIsolation:   [[0, 4, 9],    [5, 9, 12],   [3, 7, 11],    [0, 4, 7]],      // Sparse Wide Open 5ths & 9ths
    industrialPulse:  [[0, 7],       [0, 8],       [0, 7],        [5, 12]],        // Power Octaves & Fifths (Hardware / War)
    dreamFloat:       [[0, 2, 4, 6], [3, 5, 7, 9], [0, 2, 4, 6],  [4, 6, 8, 11]],  // Alternating Maj7/Min7 Float
  };

  function buildUniversalHarmony(rootMidi2, scaleName, progName) {
    const scale = SCALES[scaleName] || SCALES.dorian;
    const prog = PROGRESSIONS[progName] || PROGRESSIONS.kurzgesagtDorian;

    const getScaleToneMidi = (degIdx) => {
      const len = 7; // 7-note octave core or scale length
      const baseLen = Math.min(7, scale.length - 1);
      const oct = Math.floor(degIdx / baseLen);
      const idx = ((degIdx % baseLen) + baseLen) % baseLen;
      return rootMidi2 + 12 + oct * 12 + scale[idx];
    };

    const chords = prog.map((degArr) => degArr.map((d) => midiToHz(getScaleToneMidi(d))));
    const subHz = prog.map((degArr) => midiToHz(getScaleToneMidi(degArr[0]) - 12));
    const scaleHz = scale.map((semi) => midiToHz(rootMidi2 + 24 + semi));
    const lowScaleHz = scale.map((semi) => midiToHz(rootMidi2 + 12 + semi));

    return { chords, subHz, scaleHz, lowScaleHz, scale };
  }

  // ---------- 3. Semantic Natural-Language Situation & Mood Analyzer ----------
  // Reads ANY combination of situation, mood, culture, genre, desc, and parameters
  // and outputs a bespoke Musical DNA profile so no two scenes sound identical!
  function analyzeCueDNA(c = {}) {
    const rawSit = String(c.situation || c.archetype || '').toUpperCase();
    const textBlob = [
      c.situation,
      c.archetype,
      c.mood,
      c.genre,
      c.culture,
      c.era,
      c.desc,
      c.title,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Check explicit silence first
    if (
      rawSit === 'DIEGETIC_SILENCE' ||
      rawSit === 'HARD_STOP' ||
      /\b(diegetic_silence|hard_stop|total_silence|mute_bgm)\b/.test(textBlob)
    ) {
      return { silent: true };
    }

    // Defaults
    let tension = c.tension !== undefined ? Number(c.tension) : 0.45;
    let valence = c.valence !== undefined ? Number(c.valence) : 0.05;
    let energy = c.energy !== undefined ? Number(c.energy) : 0.55;
    let quirk = c.quirk !== undefined ? Number(c.quirk) : 0.0;
    let grandeur = c.grandeur !== undefined ? Number(c.grandeur) : 0.4;
    let bpm = c.bpm || 104;

    let scaleName = c.scale || 'dorian';
    let progName = c.progression || 'kurzgesagtDorian';
    let leadVoice = c.lead || 'kurzgesagtPluck';
    let counterVoice = c.counter || 'celestaHarp';
    let padVoice = c.pad || 'analogPad';
    let bassVoice = c.bass || 'subPedal';
    let percStyle = c.perc || 'cinematic';
    let rhythmPulses = c.pulses || 5;
    let rhythmSteps = c.steps || 8;

    // 1. Cultural & Historical Era Detection
    const isTamilIndian =
      c.culture === 'indianClassical' ||
      /\b(tamil|chola|pandya|chera|keeladi|sangam|thanjavur|madurai|india|indian|vedic|mughal|temple|carnatic|raga|sitar|veena|mridangam|kaveri|vaigai)\b/.test(
        textBlob
      );
    const isEastAsian =
      c.culture === 'eastAsian' ||
      /\b(japan|samurai|edo|shogun|ninja|tokyo|kyoto|china|dynasty|ming|han|mongol|korea|koto|shakuhachi|taiko)\b/.test(
        textBlob
      );
    const isMiddleEastern =
      c.culture === 'middleEastern' ||
      /\b(arab|persia|ottoman|egypt|pharaoh|pyramid|mesopotamia|babylon|desert|silk road|caravan|suez|oud|duduk)\b/.test(
        textBlob
      );
    const isEuropeanHistorical =
      c.culture === 'victorianClassical' ||
      /\b(roman|rome|medieval|knight|victorian|colonial|british|renaissance|french|napoleon|1700s|1800s|1900s|baroque|classical|empire|king|queen|palace)\b/.test(
        textBlob
      );

    // 2. Emotional & Narrative Situation Detection
    const isComedyQuirk =
      rawSit === 'PLAYFUL_FREEDOM' ||
      /\b(comedy|funny|joke|gag|deadpan|quirk|satire|silly|absurd|skit|oversimplified| awkward|ironic|playful|bizarre|weird|cartoon)\b/.test(
        textBlob
      );
    const isCrisisSurvival =
      rawSit === 'TICKING_SURVIVAL' ||
      /\b(survival|crisis|panic|emergency|explosion|decompression|crash|meltdown|radiation|chernobyl|virus|pandemic|war|battle|attack|combat|invasion|bomb|countdown|danger|escape|fire|earthquake|volcano|tsunami|storm|hurricane)\b/.test(
        textBlob
      );
    const isTragedySolemn =
      rawSit === 'SOLEMN_TRAGEDY' ||
      /\b(tragedy|tragic|sad|death|extinction|famine|loss|grief|memorial|ruins|collapse|aftermath|victim|solemn|dark|sorrow|Elegy|abandoned)\b/.test(
        textBlob
      );
    const isEerieIsolation =
      rawSit === 'EERIE_ISOLATION' ||
      /\b(eerie|isolation|alone|void|blackout|underground|subterranean|deep sea|submarine|abyss|creepy|haunted|radiation|toxic|vacuum|silent|mystery|secret|conspiracy|shadow)\b/.test(
        textBlob
      );
    const isCosmicAwe =
      rawSit === 'COSMIC_AWE' ||
      /\b(cosmic|space|universe|galaxy|planet|star|nebula|orbit|astronaut|quantum|atom|future|wonder|awe|breathtaking|miracle|infinity|transcend|climax|grand reveal)\b/.test(
        textBlob
      );
    const isHeroicGrandeur =
      rawSit === 'HEROIC_RESCUE' ||
      rawSit === 'HISTORICAL_GRANDEUR' ||
      /\b(hero|heroic|rescue|victory|triumph|golden age|coronation|monument|architecture|great|empire|revolution|freedom|independence|breakthrough|success|champion)\b/.test(
        textBlob
      );
    const isTechHardware =
      /\b(hardware|teardown|microchip|silicon|transistor|cpu|gpu|smartphone|battery|engine|circuit|data|cyber|ai|algorithm|factory|engineering|supply chain|economics|market|finance|stock)\b/.test(
        textBlob
      );

    // 3. Configure Musical DNA Based on Detected Context
    if (isComedyQuirk) {
      quirk = Math.max(quirk, 0.85);
      valence = c.valence !== undefined ? valence : 0.45;
      tension = c.tension !== undefined ? tension : 0.3;
      bpm = c.bpm || 116;
      scaleName = c.scale || 'bluesHexatonic';
      progName = c.progression || 'quirkyComedy';
      leadVoice = c.lead || 'pizzicatoStrings';
      counterVoice = c.counter || 'quirkyOboeBassoon';
      padVoice = c.pad || 'rhodesEP';
      bassVoice = c.bass || 'uprightBassPizz';
      percStyle = c.perc || 'quirkyWoodblock';
      rhythmPulses = 5;
      rhythmSteps = 8;
    } else if (isCrisisSurvival) {
      tension = c.tension !== undefined ? Math.max(0.72, tension) : 0.85;
      valence = c.valence !== undefined ? valence : -0.55;
      energy = Math.max(energy, 0.85);
      bpm = c.bpm || 126;
      scaleName = c.scale || (tension > 0.88 ? 'phrygian' : 'aeolian');
      progName = c.progression || (tension > 0.85 ? 'darkDread' : 'tickingSurvival');
      leadVoice = c.lead || 'pulseOstinato';
      counterVoice = c.counter || 'feltPiano';
      padVoice = c.pad || 'warmStringSection';
      bassVoice = c.bass || 'moogBass';
      percStyle = c.perc || (/\b(war|battle|army|sword|march)\b/.test(textBlob) ? 'warMarch' : 'tickingThriller');
      rhythmPulses = 7;
      rhythmSteps = 16;
    } else if (isTragedySolemn) {
      tension = c.tension !== undefined ? tension : 0.35;
      valence = c.valence !== undefined ? valence : -0.65;
      energy = c.energy !== undefined ? energy : 0.32;
      bpm = c.bpm || 74;
      scaleName = c.scale || (isTamilIndian ? 'carnaticSivaranjani' : 'aeolian');
      progName = c.progression || 'solemnTragedy';
      leadVoice = c.lead || (isTamilIndian ? 'bansuriFlute' : 'soloCello');
      counterVoice = c.counter || 'feltPiano';
      padVoice = c.pad || 'warmStringSection';
      bassVoice = c.bass || 'subPedal';
      percStyle = c.perc || 'none';
      rhythmPulses = 3;
      rhythmSteps = 8;
    } else if (isEerieIsolation) {
      tension = c.tension !== undefined ? tension : 0.62;
      valence = c.valence !== undefined ? valence : -0.4;
      energy = c.energy !== undefined ? energy : 0.28;
      bpm = c.bpm || 82;
      scaleName = c.scale || (/\b(quantum|paradox|time)\b/.test(textBlob) ? 'wholeTone' : 'harmonicMinor');
      progName = c.progression || 'eerieIsolation';
      leadVoice = c.lead || 'vibraphone';
      counterVoice = c.counter || 'feltPiano';
      padVoice = c.pad || 'glassPad';
      bassVoice = c.bass || 'darkDreadDrone';
      percStyle = c.perc || 'minimalClock';
      rhythmPulses = 3;
      rhythmSteps = 12;
    } else if (isCosmicAwe) {
      tension = c.tension !== undefined ? tension : 0.45;
      valence = c.valence !== undefined ? valence : 0.85;
      grandeur = Math.max(grandeur, 0.9);
      bpm = c.bpm || 96;
      scaleName = c.scale || 'lydian';
      progName = c.progression || 'cosmicLydian';
      leadVoice = c.lead || 'celestaHarp';
      counterVoice = c.counter || 'kurzgesagtPluck';
      padVoice = c.pad || 'glassPad';
      bassVoice = c.bass || 'subPedal';
      percStyle = c.perc || 'cinematicSlow';
      rhythmPulses = 6;
      rhythmSteps = 12;
    } else if (isHeroicGrandeur) {
      tension = c.tension !== undefined ? tension : 0.65;
      valence = c.valence !== undefined ? valence : 0.75;
      grandeur = Math.max(grandeur, 0.85);
      energy = Math.max(energy, 0.78);
      bpm = c.bpm || 112;
      scaleName = c.scale || (valence > 0.4 ? 'mixolydian' : 'aeolian');
      progName = c.progression || (valence > 0.4 ? 'heroicTriumph' : 'cinematicMinor');
      leadVoice = c.lead || 'brassHornSwell';
      counterVoice = c.counter || 'grandPiano';
      padVoice = c.pad || 'warmStringSection';
      bassVoice = c.bass || 'subPedal';
      percStyle = c.perc || 'epicDrums';
      rhythmPulses = 5;
      rhythmSteps = 8;
    } else if (isTechHardware) {
      tension = c.tension !== undefined ? tension : 0.5;
      valence = c.valence !== undefined ? valence : 0.15;
      energy = Math.max(energy, 0.65);
      bpm = c.bpm || 114;
      scaleName = c.scale || 'dorian';
      progName = c.progression || 'kurzgesagtDorian';
      leadVoice = c.lead || 'kurzgesagtPluck';
      counterVoice = c.counter || 'kalimbaMarimba';
      padVoice = c.pad || 'analogPad';
      bassVoice = c.bass || 'moogBass';
      percStyle = c.perc || 'techGroove';
      rhythmPulses = 5;
      rhythmSteps = 16;
    } else {
      // Default High-Curiosity Scientific / Historical Inquiry (Kurzgesagt / Fern style)
      scaleName = c.scale || (valence < -0.15 ? 'harmonicMinor' : 'dorian');
      progName = c.progression || (valence < -0.15 ? 'mysteryInquire' : 'kurzgesagtDorian');
      leadVoice = c.lead || 'kalimbaMarimba';
      counterVoice = c.counter || 'feltPiano';
      padVoice = c.pad || 'analogPad';
      bassVoice = c.bass || 'subPedal';
      percStyle = c.perc || (tension > 0.45 ? 'minimalClock' : 'softShaker');
      rhythmPulses = 5;
      rhythmSteps = 8;
    }

    // 4. Overlay Cultural Instrumentation & Modal Scales When Applicable
    if (isTamilIndian && !c.scale) {
      if (isTragedySolemn) {
        scaleName = 'carnaticSivaranjani';
        leadVoice = c.lead || 'bansuriFlute';
      } else if (isHeroicGrandeur) {
        scaleName = 'carnaticMohanam';
        progName = 'royalGrandeur';
        leadVoice = c.lead || 'nadaswaramShehnai';
        counterVoice = c.counter || 'sitarVeena';
      } else if (valence >= 0.25) {
        scaleName = 'carnaticHamsadhwani';
        leadVoice = c.lead || 'sitarVeena';
        counterVoice = c.counter || 'bansuriFlute';
      } else {
        scaleName = 'carnaticMayamalavagowla';
        progName = 'carnaticPedal';
        leadVoice = c.lead || 'sitarVeena';
        counterVoice = c.counter || 'bansuriFlute';
      }
      bassVoice = c.bass || 'tanpuraDrone';
      if (!isTragedySolemn && !c.perc) percStyle = 'indianPerc';
    } else if (isEastAsian && !c.scale) {
      scaleName = valence < 0 ? 'japaneseHirajoshi' : 'chinesePentatonic';
      progName = 'eastAsianModal';
      leadVoice = c.lead || 'kotoGuzheng';
      counterVoice = c.counter || 'shakuhachi';
      if (isCrisisSurvival || isHeroicGrandeur) percStyle = 'taikoPerc';
    } else if (isMiddleEastern && !c.scale) {
      scaleName = 'arabicHijaz';
      progName = 'carnaticPedal';
      leadVoice = c.lead || 'oudLute';
      counterVoice = c.counter || 'dudukReed';
      if (!isTragedySolemn && !c.perc) percStyle = 'indianPerc';
    } else if (isEuropeanHistorical && !c.scale) {
      scaleName = valence < 0 ? 'harmonicMinor' : 'ionian';
      leadVoice = c.lead || 'harpsichordStrings';
      counterVoice = c.counter || 'soloCello';
      padVoice = c.pad || 'warmStringSection';
    }

    // Allow explicit instrument array override: c.instruments = ['sitarVeena', 'bansuriFlute', 'warmStringSection']
    if (Array.isArray(c.instruments) && c.instruments.length > 0) {
      leadVoice = c.instruments[0] || leadVoice;
      if (c.instruments[1]) counterVoice = c.instruments[1];
      if (c.instruments[2]) padVoice = c.instruments[2];
    }

    return {
      silent: false,
      tension: clamp(tension, 0, 1),
      valence: clamp(valence, -1, 1),
      energy: clamp(energy, 0.1, 1),
      quirk: clamp(quirk, 0, 1),
      grandeur: clamp(grandeur, 0, 1),
      bpm: clamp(bpm, 52, 168),
      key: c.key || (valence > 0.35 ? 'C Major' : 'D Minor'),
      scaleName,
      progName,
      leadVoice,
      counterVoice,
      padVoice,
      bassVoice,
      percStyle,
      rhythmPulses,
      rhythmSteps,
      seedStr: String(c.cue_id || '') + '|' + textBlob + '|' + (c.start_time || 0),
    };
  }
  SOUND.analyzeCueDNA = analyzeCueDNA;

  // ---------- 4. Phrase-Based Melodic Motif Composer ----------
  // Generates a memorable, human-sounding 2-bar motif with Call & Response phrasing
  function composeSeededMotif(dna, scaleLen = 12) {
    const r = rand('motif-' + dna.seedStr);
    const steps = dna.rhythmSteps || 8;
    const pulses = clamp(
      Math.round(dna.rhythmPulses * (0.75 + dna.energy * 0.45)),
      2,
      steps
    );
    const gatePattern = euclideanRhythm(pulses, steps, Math.floor(r() * 3));

    // Chord-tone anchors (0 = root, 2 = 3rd, 4 = 5th, 6 = 7th, 7 = octave)
    const anchors = [0, 2, 4, 7, 4, 2];
    const bar1Notes = [];
    const bar2Notes = [];

    let curDeg = anchors[Math.floor(r() * 3)]; // Start on root, 3rd, or 5th
    for (let s = 0; s < steps; s++) {
      if (!gatePattern[s]) {
        bar1Notes.push(null);
        bar2Notes.push(null);
        continue;
      }
      // Strong beats gravitate to consonant chord intervals; offbeats walk stepwise
      if (s === 0) {
        curDeg = anchors[0];
      } else if (s === Math.floor(steps / 2)) {
        curDeg = anchors[2]; // 5th on mid-bar
      } else {
        const stepChoices = dna.quirk > 0.5 ? [-3, -1, 1, 2, 4] : [-2, -1, 1, 2];
        curDeg = clamp(
          curDeg + stepChoices[Math.floor(r() * stepChoices.length)],
          0,
          Math.min(10, scaleLen - 1)
        );
      }
      bar1Notes.push(curDeg);

      // Bar 2 (Response): variation on the second half of the bar
      if (s < steps / 2) {
        bar2Notes.push(curDeg);
      } else if (s === steps - 1) {
        // Resolve toward root (0) or fifth (4)
        bar2Notes.push(r() > 0.4 ? 0 : 4);
      } else {
        bar2Notes.push(clamp(curDeg + (r() > 0.5 ? 1 : -1), 0, Math.min(10, scaleLen - 1)));
      }
    }

    return { steps, gatePattern, bar1Notes, bar2Notes };
  }

  // ---------- 5. Main Synthesizer Kit Factory ----------
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

    // Master Chain: Warm Soft-Clipper -> Dynamics Compressor -> Master Gain
    const master = ctx.createGain();
    master.gain.value = o.master == null ? 0.92 : o.master;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 3.0;
    comp.attack.value = 0.005;
    comp.release.value = 0.18;
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

    // Lush Stereo Hall Convolver (2.4s warm exponentially damped concert hall)
    const verb = ctx.createConvolver();
    {
      const secs = 2.4;
      const len = Math.floor(secs * SR);
      const ir = ctx.createBuffer(2, len, SR);
      for (let c = 0; c < 2; c++) {
        const r = rand('lumina-hall-v2-' + c);
        const d = ir.getChannelData(c);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const u = i / len;
          const early = i < SR * 0.06 && i % Math.floor(SR * 0.009) === 0 ? 0.45 : 0;
          lp += (0.48 - 0.34 * u) * ((r() * 2 - 1) + early - lp);
          d[i] = lp * Math.pow(1 - u, 2.4);
        }
      }
      verb.buffer = ir;
    }
    const verbIn = ctx.createGain();
    verbIn.gain.value = 0.85;
    verbIn.connect(verb);
    verb.connect(comp);

    // Stereo Warm Tape Delay Network (for Kurzgesagt plucks, bells, flutes & arps)
    const delayL = ctx.createDelay(1.0);
    const delayR = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.27;
    delayR.delayTime.value = 0.36;
    const delayFb = ctx.createGain();
    delayFb.gain.value = 0.28;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2100;
    const delayPanL = ctx.createStereoPanner();
    const delayPanR = ctx.createStereoPanner();
    delayPanL.pan.value = -0.55;
    delayPanR.pan.value = 0.55;
    const delayIn = ctx.createGain();
    delayIn.gain.value = 0.75;

    delayIn.connect(delayFilter);
    delayFilter.connect(delayL);
    delayL.connect(delayPanL);
    delayL.connect(delayR);
    delayR.connect(delayPanR);
    delayR.connect(delayFb);
    delayFb.connect(delayFilter);
    delayPanL.connect(bus.music);
    delayPanR.connect(bus.music);

    // Pre-Computed White, Pink & Brown Noise Buffers
    const noiseBuf = {};
    {
      const len = Math.floor(2.8 * SR);
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
      pan.pan.value = clamp(p.pan || 0, -1, 1);
      node.connect(pan);
      const targetBus = bus[p.bus || 'sfx'] || bus.sfx;
      pan.connect(targetBus);
      if (p.verb) {
        const s = ctx.createGain();
        s.gain.value = p.verb;
        pan.connect(s);
        s.connect(verbIn);
      }
      if (p.delay && !isSfxOnly) {
        const dSend = ctx.createGain();
        dSend.gain.value = p.delay;
        pan.connect(dSend);
        dSend.connect(delayIn);
      }
    }

    // Standard Subtractive Oscillator Voice
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

      // Optional Vibrato LFO for expressive strings/winds
      if (p.vibDepth && p.vibRate) {
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = p.vibRate;
        lfoG.gain.value = p.vibDepth;
        lfo.connect(lfoG);
        lfoG.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.02);
      }

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

    // 2-Operator FM Synthesis Voice (for rich bells, Rhodes, marimba, sitar jawari, metallic clang)
    function fmTone(time, p) {
      const dur = p.dur || 0.35;
      const t = at(time);
      if (t + dur < ctx.currentTime || (time < T0 - 0.001 && dur < 1.5)) return;
      const f0 = hz(p.f || 440);
      if (f0 <= 0) return;

      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();

      car.type = p.carType || 'sine';
      mod.type = p.modType || 'sine';
      car.frequency.setValueAtTime(f0, t);
      mod.frequency.setValueAtTime(f0 * (p.ratio || 2.0), t);

      const indexHz = f0 * (p.modIndex || 1.5);
      modGain.gain.setValueAtTime(Math.max(1, indexHz), t);
      modGain.gain.exponentialRampToValueAtTime(
        Math.max(1, indexHz * (p.modEnd || 0.08)),
        t + Math.min(dur, p.modDecay || dur * 0.7)
      );

      mod.connect(modGain);
      modGain.connect(car.frequency);

      const g = ctx.createGain();
      shape(g.gain, t, p.gain == null ? 0.28 : p.gain, dur, p.a || 0.003, p.hold || 0);

      let node = car;
      if (p.filter) {
        const flt = ctx.createBiquadFilter();
        flt.type = p.filter;
        flt.Q.value = p.q || 0.9;
        sweep(flt.frequency, p.f2 || f0 * 4, t);
        car.connect(flt);
        node = flt;
      }
      node.connect(g);
      out(g, p);

      car.start(t);
      mod.start(t);
      car.stop(t + dur + 0.02);
      mod.stop(t + dur + 0.02);
    }

    // Filtered Noise Voice
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

    // =========================================================================
    // 6. 30 STUDIO-GRADE PROCEDURAL INSTRUMENTS (VOICES)
    // =========================================================================
    const VOICES = {
      // --- Bass & Drones ---
      subPedal: (t, f, dur, g = 1) => {
        if (!f) return;
        tone(t, { f, type: 'sine', dur: dur + 0.18, gain: 0.36 * g, a: Math.min(0.18, dur * 0.25), hold: dur * 0.55, bus: 'music' });
        tone(t, { f: f * 2, type: 'triangle', dur, gain: 0.11 * g, a: 0.1, filter: 'lowpass', f2: 240, bus: 'music' });
      },
      moogBass: (t, f, dur, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', detune: -5, dur, gain: 0.26 * g, a: 0.006, filter: 'lowpass', f2: [[0, f * 6.5], [dur * 0.75, f * 1.6]], q: 2.2, bus: 'music', pan });
        tone(t, { f, type: 'square', detune: 5, dur, gain: 0.14 * g, a: 0.006, filter: 'lowpass', f2: f * 3, bus: 'music', pan });
      },
      uprightBassPizz: (t, f, dur = 0.42, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.0, modIndex: 1.8, modEnd: 0.1, dur, gain: 0.34 * g, a: 0.004, filter: 'lowpass', f2: f * 3.5, bus: 'music', verb: 0.15, pan });
      },
      tanpuraDrone: (t, f, dur, g = 1) => {
        if (!f) return;
        fmTone(t, { f: f * 1.5, ratio: 2.0, modIndex: 1.2, modEnd: 0.8, dur: dur + 0.25, gain: 0.11 * g, a: 0.35, hold: dur * 0.55, filter: 'bandpass', f2: f * 4.5, q: 1.8, bus: 'music', verb: 0.5, pan: -0.28 });
        fmTone(t, { f: f * 2.0, ratio: 3.0, modIndex: 1.1, modEnd: 0.7, dur: dur + 0.25, gain: 0.10 * g, a: 0.35, hold: dur * 0.55, filter: 'bandpass', f2: f * 6.0, q: 1.8, bus: 'music', verb: 0.5, pan: 0.28 });
      },
      darkDreadDrone: (t, f, dur, g = 1) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', detune: -9, dur: dur + 0.3, gain: 0.22 * g, a: 0.35, hold: dur * 0.5, filter: 'lowpass', f2: 190, bus: 'music', verb: 0.55, pan: -0.2 });
        tone(t, { f: f * 1.01, type: 'sawtooth', detune: 9, dur: dur + 0.3, gain: 0.22 * g, a: 0.35, hold: dur * 0.5, filter: 'lowpass', f2: 190, bus: 'music', verb: 0.55, pan: 0.2 });
      },

      // --- Lush Pads & Ensembles ---
      analogPad: (t, chordHz, dur, cutoff = 1600, g = 1) => {
        chordHz.forEach((f, idx) => {
          if (!f) return;
          const pan = (idx - (chordHz.length - 1) / 2) * 0.32;
          tone(t, { f, type: 'sawtooth', detune: -7, dur: dur + 0.35, gain: 0.12 * g, a: Math.min(0.45, dur * 0.35), hold: Math.max(0.1, dur - 0.55), filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.52, pan });
          tone(t, { f, type: 'triangle', detune: 7, dur: dur + 0.35, gain: 0.13 * g, a: Math.min(0.45, dur * 0.35), hold: Math.max(0.1, dur - 0.55), filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.45, pan: -pan });
        });
      },
      warmStringSection: (t, chordHz, dur, cutoff = 2200, g = 1) => {
        chordHz.forEach((f, idx) => {
          if (!f) return;
          const pan = (idx - (chordHz.length - 1) / 2) * 0.38;
          tone(t, { f, type: 'sawtooth', detune: -10, vibRate: 4.8, vibDepth: f * 0.004, dur: dur + 0.4, gain: 0.12 * g, a: Math.min(0.55, dur * 0.38), hold: Math.max(0.1, dur - 0.6), filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.6, pan });
          tone(t, { f, type: 'sawtooth', detune: 10, vibRate: 5.1, vibDepth: f * 0.004, dur: dur + 0.4, gain: 0.12 * g, a: Math.min(0.55, dur * 0.38), hold: Math.max(0.1, dur - 0.6), filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.6, pan: -pan * 0.7 });
        });
      },
      glassPad: (t, chordHz, dur, cutoff = 2800, g = 1) => {
        chordHz.forEach((f, idx) => {
          if (!f) return;
          const pan = (idx - (chordHz.length - 1) / 2) * 0.35;
          fmTone(t, { f, ratio: 3.0, modIndex: 0.75, modEnd: 0.25, dur: dur + 0.35, gain: 0.13 * g, a: Math.min(0.45, dur * 0.35), hold: dur * 0.45, filter: 'lowpass', f2: cutoff, bus: 'music', verb: 0.65, pan });
        });
      },

      // --- Pianos, Keys, Synths & Mallets ---
      feltPiano: (t, f, dur = 1.4, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.0, modIndex: 0.85, modEnd: 0.05, modDecay: 0.18, dur, gain: 0.31 * g, a: 0.008, hold: dur * 0.15, filter: 'lowpass', f2: [[0, f * 3.4], [dur, f * 1.1]], bus: 'music', verb: 0.46, pan });
        tone(t, { f: f * 2, type: 'sine', dur: dur * 0.4, gain: 0.06 * g, a: 0.006, bus: 'music', verb: 0.38, pan });
      },
      grandPiano: (t, f, dur = 1.3, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.0, modIndex: 1.45, modEnd: 0.1, modDecay: 0.25, dur, gain: 0.32 * g, a: 0.004, hold: dur * 0.15, filter: 'lowpass', f2: [[0, f * 6.0], [dur, f * 1.5]], bus: 'music', verb: 0.42, pan });
      },
      rhodesEP: (t, f, dur = 1.1, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.0, modIndex: 1.2, modEnd: 0.15, dur, gain: 0.28 * g, a: 0.005, bus: 'music', verb: 0.38, delay: 0.15, pan });
        fmTone(t, { f, ratio: 7.0, modIndex: 0.25, modEnd: 0.01, dur: 0.18, gain: 0.09 * g, a: 0.002, bus: 'music', pan });
      },
      kurzgesagtPluck: (t, f, dur = 0.42, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', detune: -6, dur, gain: 0.24 * g, a: 0.003, filter: 'lowpass', f2: [[0, f * 7.5], [dur * 0.65, f * 1.4]], q: 1.8, bus: 'music', verb: 0.34, delay: 0.28, pan });
        tone(t, { f, type: 'triangle', detune: 6, dur: dur * 1.1, gain: 0.18 * g, a: 0.003, bus: 'music', verb: 0.3, delay: 0.22, pan: -pan * 0.5 });
      },
      kalimbaMarimba: (t, f, dur = 0.36, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 4.0, modIndex: 1.1, modEnd: 0.02, modDecay: 0.06, dur, gain: 0.32 * g, a: 0.002, bus: 'music', verb: 0.34, delay: 0.18, pan });
      },
      vibraphone: (t, f, dur = 1.1, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 3.0, modIndex: 0.9, modEnd: 0.08, dur, gain: 0.27 * g, a: 0.004, bus: 'music', verb: 0.52, delay: 0.2, pan });
      },
      celestaHarp: (t, f, dur = 0.9, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 2.0, modIndex: 0.85, modEnd: 0.05, dur, gain: 0.24 * g, a: 0.003, bus: 'music', verb: 0.58, delay: 0.24, pan });
      },
      harpsichordStrings: (t, f, dur = 0.65, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 2.0, modIndex: 2.2, modEnd: 0.3, dur, gain: 0.24 * g, a: 0.002, filter: 'lowpass', f2: f * 5.0, bus: 'music', verb: 0.38, pan });
      },
      pulseOstinato: (t, f, dur = 0.22, cutoff = 1800, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', dur, gain: 0.27 * g, a: 0.004, filter: 'lowpass', f2: [[0, cutoff * 1.4], [dur, cutoff * 0.45]], q: 2.0, bus: 'music', verb: 0.18, delay: 0.14, pan });
      },

      // --- Bowed & Plucked Strings ---
      pizzicatoStrings: (t, f, dur = 0.22, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.0, modIndex: 1.6, modEnd: 0.05, modDecay: 0.05, dur, gain: 0.32 * g, a: 0.002, filter: 'lowpass', f2: [[0, f * 4.5], [dur, f * 1.2]], bus: 'music', verb: 0.26, pan });
        noise(t, { dur: 0.015, color: 'pink', filter: 'bandpass', f: f * 3, q: 2.5, gain: 0.12 * g, bus: 'music', pan });
      },
      soloCello: (t, f, dur = 1.4, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', vibRate: 5.2, vibDepth: f * 0.006, dur, gain: 0.26 * g, a: Math.min(0.18, dur * 0.28), hold: dur * 0.45, filter: 'lowpass', f2: [[0, f * 3.8], [dur, f * 2.1]], q: 1.1, bus: 'music', verb: 0.52, pan });
      },
      sitarVeena: (t, f, dur = 0.72, g = 1, pan = 0) => {
        if (!f) return;
        // Plucked string with bridge buzz (jawari) & sympathetic resonance
        fmTone(t, { f, ratio: 2.0, modIndex: 2.4, modEnd: 0.35, dur, gain: 0.27 * g, a: 0.003, filter: 'bandpass', f2: [[0, f * 5.2], [dur, f * 1.8]], q: 1.8, bus: 'music', verb: 0.45, delay: 0.16, pan });
        tone(t, { f: f * 2, type: 'triangle', dur: dur * 0.75, gain: 0.11 * g, a: 0.002, bus: 'music', verb: 0.5, pan: -pan * 0.5 });
      },
      kotoGuzheng: (t, f, dur = 0.6, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.5, modIndex: 1.4, modEnd: 0.05, dur, gain: 0.30 * g, a: 0.002, filter: 'lowpass', f2: [[0, f * 5], [dur, f * 1.3]], bus: 'music', verb: 0.48, delay: 0.2, pan });
      },
      oudLute: (t, f, dur = 0.58, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 1.0, modIndex: 1.8, modEnd: 0.12, dur, gain: 0.29 * g, a: 0.003, filter: 'lowpass', f2: [[0, f * 4.2], [dur, f * 1.4]], bus: 'music', verb: 0.42, pan });
      },

      // --- World & Orchestral Winds / Brass ---
      bansuriFlute: (t, f, dur = 1.1, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f: [[0, f * 0.985], [0.1, f]], type: 'sine', vibRate: 4.8, vibDepth: f * 0.005, dur, gain: 0.26 * g, a: 0.075, hold: dur * 0.5, bus: 'music', verb: 0.52, delay: 0.18, pan });
        noise(t, { dur: dur * 0.85, color: 'pink', filter: 'bandpass', f: f * 2, q: 3.8, gain: 0.075 * g, a: 0.06, bus: 'music', verb: 0.4, pan });
      },
      shakuhachi: (t, f, dur = 1.15, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f: [[0, f * 0.97], [0.14, f]], type: 'triangle', vibRate: 4.5, vibDepth: f * 0.006, dur, gain: 0.24 * g, a: 0.08, hold: dur * 0.45, filter: 'lowpass', f2: f * 2.5, bus: 'music', verb: 0.55, pan });
        noise(t, { dur: 0.18, color: 'white', filter: 'bandpass', f: f * 2.5, q: 3.0, gain: 0.11 * g, a: 0.02, bus: 'music', pan });
      },
      dudukReed: (t, f, dur = 1.25, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f: [[0, f * 0.98], [0.12, f]], type: 'square', vibRate: 5.0, vibDepth: f * 0.006, dur, gain: 0.22 * g, a: 0.09, hold: dur * 0.5, filter: 'bandpass', f2: f * 1.8, q: 2.2, bus: 'music', verb: 0.55, pan });
      },
      nadaswaramShehnai: (t, f, dur = 0.95, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f: [[0, f * 0.975], [0.09, f]], type: 'sawtooth', vibRate: 5.5, vibDepth: f * 0.007, dur, gain: 0.23 * g, a: 0.04, hold: dur * 0.45, filter: 'bandpass', f2: f * 2.6, q: 1.8, bus: 'music', verb: 0.48, pan });
      },
      brassHornSwell: (t, f, dur = 1.1, g = 1, pan = 0) => {
        if (!f) return;
        tone(t, { f, type: 'sawtooth', detune: -5, dur, gain: 0.24 * g, a: Math.min(0.18, dur * 0.3), hold: dur * 0.45, filter: 'lowpass', f2: [[0, f * 1.8], [dur * 0.4, f * 4.8], [dur, f * 2.2]], q: 1.4, bus: 'music', verb: 0.5, pan });
      },
      quirkyOboeBassoon: (t, f, dur = 0.28, g = 1, pan = 0) => {
        if (!f) return;
        fmTone(t, { f, ratio: 2.0, modIndex: 1.7, modEnd: 0.9, dur, gain: 0.24 * g, a: 0.008, filter: 'bandpass', f2: f * 2.4, q: 2.0, bus: 'music', verb: 0.22, pan });
      },

      // --- World & Cinematic Percussion ---
      mridangamTabla: (t, isDownbeat, g = 1, pan = 0) => {
        const f0 = isDownbeat ? 146.8 : 293.6;
        tone(t, { f: [[0, f0 * 1.14], [0.05, f0]], type: 'sine', dur: 0.25, gain: 0.32 * g, a: 0.002, bus: 'music', verb: 0.22, pan });
        noise(t, { dur: 0.022, filter: 'bandpass', f: 1850, q: 2.5, gain: 0.17 * g, bus: 'music', pan });
      },
      taikoWarDrum: (t, isDownbeat, g = 1, pan = 0) => {
        const f0 = isDownbeat ? 92 : 138;
        tone(t, { f: [[0, f0 * 1.35], [0.18, f0 * 0.55]], type: 'sine', dur: 0.38, gain: (isDownbeat ? 0.42 : 0.28) * g, a: 0.003, bus: 'music', verb: 0.42, pan });
        noise(t, { dur: 0.04, color: 'brown', filter: 'bandpass', f: 900, q: 1.8, gain: 0.22 * g, bus: 'music', pan });
      },
      cinematicTom: (t, isDownbeat, g = 1) => {
        const f0 = isDownbeat ? 112 : 84;
        tone(t, { f: [[0, f0], [0.15, 40]], dur: 0.24, gain: (isDownbeat ? 0.34 : 0.22) * g, bus: 'music', verb: 0.3 });
      },
      militarySnare: (t, isAccent, g = 1, pan = 0) => {
        tone(t, { f: [[0, 210], [0.06, 115]], dur: 0.08, gain: (isAccent ? 0.24 : 0.14) * g, bus: 'music', pan });
        noise(t, { dur: isAccent ? 0.12 : 0.07, color: 'white', filter: 'highpass', f: 1400, gain: (isAccent ? 0.24 : 0.14) * g, a: 0.002, bus: 'music', verb: 0.22, pan });
      },
      woodblockTick: (t, isAccent, g = 1, pan = 0) => {
        const f0 = isAccent ? 980 : 740;
        fmTone(t, { f: f0, ratio: 2.4, modIndex: 1.2, modEnd: 0.05, dur: 0.065, gain: (isAccent ? 0.26 : 0.16) * g, a: 0.001, bus: 'music', verb: 0.14, pan });
      },
      clockEscapement: (t, isAccent, g = 1, pan = 0) => {
        const pitch = isAccent ? 4200 : 3100;
        noise(t, { dur: 0.015, filter: 'bandpass', f: pitch, q: 3.5, gain: (isAccent ? 0.21 : 0.12) * g, bus: 'music', verb: 0.12, pan });
      },
      brushShaker: (t, isAccent, g = 1, pan = 0) => {
        noise(t, { dur: 0.045, filter: 'highpass', f: 4800, gain: (isAccent ? 0.13 : 0.075) * g, a: 0.005, bus: 'music', pan });
      },
      cymbalSwell: (t, dur = 1.2, g = 1) => {
        noise(t, { dur, color: 'white', filter: 'bandpass', f: [[0, 1200], [dur, 6200]], q: 1.1, gain: 0.22 * g, a: dur * 0.85, bus: 'music', verb: 0.55 });
      },
    };

    // =========================================================================
    // 7. 100+ ACTION-SYNCED UNIVERSAL SFX PRESETS + SEMANTIC SYNTHESIZER
    // =========================================================================
    const S = {
      // --- Heavy Impacts, Disasters & Geological Forces (bus: 'heavy' @ 0.75) ---
      decompressionBang: (t, o) => {
        tone(t, { f: [[0, 195], [0.24, 32]], dur: 0.38, gain: 0.85 * o.g, bus: 'heavy', pan: o.pan });
        noise(t, { dur: 0.15, color: 'white', filter: 'bandpass', f: 2200, q: 0.9, gain: 0.75 * o.g, a: 0.001, bus: 'heavy', verb: 0.25, pan: o.pan });
        noise(t + 0.03, { dur: 0.88, color: 'pink', filter: 'bandpass', f: [[0, 2900], [0.85, 520]], q: 0.8, gain: 0.55 * o.g, a: 0.01, bus: 'heavy', verb: 0.35, pan: o.pan });
      },
      explosion: (t, o) => {
        const d = o.dur || 1.4;
        tone(t, { f: [[0, 160], [0.35, 28]], dur: 0.55, gain: 0.88 * o.g, bus: 'heavy', pan: o.pan });
        noise(t, { dur: d, color: 'brown', filter: 'lowpass', f: [[0, 1800], [d, 140]], gain: 0.8 * o.g, a: 0.003, hold: 0.12, bus: 'heavy', verb: 0.45, pan: o.pan });
        noise(t + 0.02, { dur: d * 0.6, color: 'white', filter: 'bandpass', f: 2400, q: 0.8, gain: 0.5 * o.g, bus: 'heavy', pan: o.pan });
      },
      volcanoRumble: (t, o) => {
        const d = o.dur || 1.8;
        tone(t, { f: [[0, 95], [d, 28]], type: 'sawtooth', filter: 'lowpass', f2: 180, dur: d, gain: 0.75 * o.g, a: 0.04, bus: 'heavy', verb: 0.4, pan: o.pan });
        noise(t, { dur: d, color: 'brown', filter: 'lowpass', f: 380, gain: 0.7 * o.g, a: 0.04, hold: d * 0.4, bus: 'heavy', verb: 0.45, pan: o.pan });
      },
      earthquakeSub: (t, o) => {
        const d = o.dur || 2.0;
        tone(t, { f: [[0, 68], [d * 0.5, 42], [d, 26]], type: 'triangle', dur: d, gain: 0.82 * o.g, a: 0.08, hold: d * 0.5, bus: 'heavy', pan: o.pan });
        noise(t, { dur: d, color: 'brown', filter: 'lowpass', f: 240, gain: 0.68 * o.g, a: 0.08, bus: 'heavy', verb: 0.4, pan: o.pan });
      },
      dinoRoar: (t, o) => {
        const d = o.dur || 1.2;
        tone(t, { f: [[0, 160], [d * 0.3, 240], [d, 72]], type: 'sawtooth', filter: 'bandpass', f2: [[0, 420], [d, 180]], q: 2.2, dur: d, gain: 0.72 * o.g, a: 0.05, bus: 'heavy', verb: 0.45, pan: o.pan });
        noise(t, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 650], [d, 260]], q: 1.4, gain: 0.52 * o.g, a: 0.05, bus: 'heavy', verb: 0.35, pan: o.pan });
      },
      powerDown: (t, o) => {
        const d = o.dur || 0.95;
        tone(t, { f: [[0, 260], [d, 38]], type: 'sawtooth', filter: 'lowpass', f2: [[0, 900], [d, 90]], dur: d, gain: 0.58 * o.g, a: 0.01, bus: 'heavy', verb: 0.3, pan: o.pan });
        noise(t, { dur: 0.04, filter: 'bandpass', f: 1600, q: 2, gain: 0.4 * o.g, bus: 'heavy', pan: o.pan });
      },
      powerUp: (t, o) => {
        const d = o.dur || 0.85;
        tone(t, { f: [[0, 55], [d, 440]], type: 'sawtooth', filter: 'lowpass', f2: [[0, 180], [d, 2400]], dur: d, gain: 0.52 * o.g, a: 0.04, bus: 'heavy', verb: 0.3, pan: o.pan });
      },
      boltSnap: (t, o) => {
        fmTone(t, { f: 1650, ratio: 2.4, modIndex: 3.5, modEnd: 0.2, dur: 0.14, gain: 0.65 * o.g, bus: 'heavy', verb: 0.25, pan: o.pan });
        noise(t, { dur: 0.035, filter: 'highpass', f: 2600, gain: 0.55 * o.g, bus: 'heavy', pan: o.pan });
      },
      shatter: (t, o) => {
        const r = rand('shatter' + t);
        noise(t, { dur: 0.16, filter: 'highpass', f: 2200, gain: 0.55 * o.g, bus: 'heavy', pan: o.pan });
        for (let i = 0; i < 10; i++) {
          fmTone(t + i * 0.024 + r() * 0.015, { f: 1800 + r() * 3400, ratio: 1.7, modIndex: 2.0, dur: 0.095, gain: 0.24 * o.g, bus: 'heavy', verb: 0.22, pan: (r() - 0.5) * 0.65 });
        }
      },
      stoneCollapse: (t, o) => {
        const r = rand('stone' + t);
        S.thud(t, o);
        for (let i = 0; i < 6; i++) {
          const ti = t + i * 0.09 + r() * 0.04;
          tone(ti, { f: [[0, 180 - i * 15], [0.14, 48]], dur: 0.18, gain: 0.48 * o.g, bus: 'heavy', pan: (r() - 0.5) * 0.5 });
          noise(ti, { dur: 0.12, color: 'brown', filter: 'bandpass', f: 650 + r() * 500, q: 1.4, gain: 0.42 * o.g, bus: 'heavy', verb: 0.25 });
        }
      },
      treeTimber: (t, o) => {
        // Wood crack + leafy whoosh + ground thud
        noise(t, { dur: 0.18, color: 'white', filter: 'bandpass', f: 1900, q: 2.2, gain: 0.48 * o.g, bus: 'heavy', pan: o.pan });
        noise(t + 0.12, { dur: 0.45, color: 'pink', filter: 'bandpass', f: [[0, 600], [0.45, 1800]], q: 1.0, gain: 0.45 * o.g, bus: 'heavy', pan: o.pan });
        S.thud(t + 0.52, o);
      },
      thud: (t, o) => {
        tone(t, { f: [[0, o.f || 135], [0.16, 40]], dur: 0.26, gain: 0.68 * o.g, bus: 'heavy', pan: o.pan });
        noise(t, { dur: 0.09, color: 'brown', filter: 'lowpass', f: 500, gain: 0.42 * o.g, bus: 'heavy', pan: o.pan });
      },
      impact: (t, o) => {
        S.thud(t, o);
        noise(t, { dur: 0.65, color: 'pink', filter: 'lowpass', f: [[0, 2400], [0.6, 280]], gain: 0.44 * o.g, bus: 'heavy', verb: 0.35, pan: o.pan });
      },
      subDrop: (t, o) => {
        const d = o.dur || 1.1;
        tone(t, { f: [[0, 110], [d, 28]], type: 'sine', dur: d, gain: 0.78 * o.g, a: 0.005, bus: 'heavy', verb: 0.25, pan: o.pan });
      },
      thunder: (t, o) => {
        const d = o.dur || 1.8;
        noise(t, { dur: d, color: 'brown', filter: 'lowpass', f: [[0, 520], [d, 85]], gain: 0.75 * o.g, a: 0.02, hold: 0.2, bus: 'heavy', verb: 0.48, pan: o.pan });
      },
      teleportPop: (t, o) => {
        tone(t, { f: [[0, 340], [0.09, 58]], dur: 0.14, gain: 0.65 * o.g, bus: 'heavy', pan: o.pan });
      },
      cannonFire: (t, o) => {
        S.explosion(t, Object.assign({}, o, { dur: 0.9 }));
      },
      sonicBoom: (t, o) => {
        S.decompressionBang(t, o);
      },

      // --- Combat, Weapons & Physical Action (bus: 'sfx' @ 0.45) ---
      swordClash: (t, o) => {
        noise(t, { dur: 0.055, filter: 'bandpass', f: 3600, q: 2.5, gain: 0.55 * o.g, pan: o.pan });
        fmTone(t, { f: 2840, ratio: 1.41, modIndex: 2.2, modEnd: 0.1, dur: 0.38, gain: 0.36 * o.g, verb: 0.35, pan: o.pan });
        tone(t, { f: 4180, type: 'triangle', dur: 0.24, gain: 0.24 * o.g, verb: 0.3, pan: o.pan });
      },
      swordDraw: (t, o) => {
        noise(t, { dur: 0.28, color: 'white', filter: 'bandpass', f: [[0, 2200], [0.28, 5400]], q: 3.2, gain: 0.38 * o.g, a: 0.02, verb: 0.25, pan: o.pan });
      },
      arrowWhoosh: (t, o) => {
        noise(t, { dur: 0.16, color: 'pink', filter: 'bandpass', f: [[0, 900], [0.08, 3200], [0.16, 1100]], q: 1.8, gain: 0.42 * o.g, a: 0.02, pan: o.pan });
        tone(t + 0.14, { f: [[0, 220], [0.05, 85]], dur: 0.06, gain: 0.35 * o.g, pan: o.pan });
      },
      shieldBash: (t, o) => {
        tone(t, { f: [[0, 240], [0.12, 68]], dur: 0.16, gain: 0.48 * o.g, pan: o.pan });
        fmTone(t, { f: 520, ratio: 1.6, modIndex: 2.5, dur: 0.18, gain: 0.35 * o.g, verb: 0.2, pan: o.pan });
      },
      punchHit: (t, o) => {
        tone(t, { f: [[0, 185], [0.09, 52]], dur: 0.12, gain: 0.52 * o.g, pan: o.pan });
        noise(t, { dur: 0.045, color: 'pink', filter: 'bandpass', f: 1450, q: 1.6, gain: 0.45 * o.g, pan: o.pan });
      },
      whipCrack: (t, o) => {
        noise(t, { dur: 0.09, color: 'white', filter: 'bandpass', f: [[0, 600], [0.09, 4200]], q: 1.5, gain: 0.35 * o.g, pan: o.pan });
        noise(t + 0.085, { dur: 0.03, color: 'white', filter: 'highpass', f: 2800, gain: 0.62 * o.g, verb: 0.25, pan: o.pan });
      },

      // --- Construction, Craft & Physics (bus: 'sfx' @ 0.45) ---
      hammerHit: (t, o) => {
        const n = o.n || 1;
        const rate = o.rate || 0.42;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          fmTone(ti, { f: 1480, ratio: 1.8, modIndex: 2.2, dur: 0.12, gain: 0.45 * o.g, verb: 0.2, pan: o.pan });
          noise(ti, { dur: 0.035, filter: 'bandpass', f: 2400, q: 2.0, gain: 0.42 * o.g, pan: o.pan });
        }
      },
      anvilStrike: (t, o) => {
        const n = o.n || 1;
        const rate = o.rate || 0.48;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          fmTone(ti, { f: 2120, ratio: 1.414, modIndex: 3.0, modEnd: 0.15, dur: 0.42, gain: 0.46 * o.g, verb: 0.35, pan: o.pan });
          noise(ti, { dur: 0.03, filter: 'highpass', f: 3000, gain: 0.38 * o.g, pan: o.pan });
        }
      },
      axeChop: (t, o) => {
        const n = o.n || 1;
        const rate = o.rate || 0.52;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          tone(ti, { f: [[0, 240], [0.07, 82]], dur: 0.09, gain: 0.48 * o.g, pan: o.pan });
          noise(ti, { dur: 0.045, color: 'pink', filter: 'bandpass', f: 1250, q: 2.2, gain: 0.45 * o.g, verb: 0.15, pan: o.pan });
        }
      },
      digShovel: (t, o) => {
        noise(t, { dur: 0.18, color: 'pink', filter: 'bandpass', f: [[0, 2200], [0.18, 900]], q: 1.5, gain: 0.42 * o.g, a: 0.01, pan: o.pan });
      },
      ropeSnap: (t, o) => {
        tone(t, { f: [[0, 520], [0.09, 140]], type: 'triangle', dur: 0.11, gain: 0.48 * o.g, pan: o.pan });
        noise(t, { dur: 0.04, filter: 'bandpass', f: 2600, q: 2.0, gain: 0.44 * o.g, pan: o.pan });
      },
      dominoClick: (t, o) => {
        const n = o.n || 6;
        const rate = o.rate || 0.11;
        for (let i = 0; i < n; i++) {
          const ti = t + i * rate;
          fmTone(ti, { f: 1150 + i * 45, ratio: 2.3, modIndex: 1.5, dur: 0.055, gain: 0.36 * o.g, pan: ((i / Math.max(1, n)) - 0.5) * 0.6 });
        }
      },
      fireIgnite: (t, o) => {
        noise(t, { dur: 0.42, color: 'pink', filter: 'bandpass', f: [[0, 320], [0.12, 1600], [0.42, 580]], q: 0.9, gain: 0.46 * o.g, a: 0.03, pan: o.pan });
      },
      steamHiss: (t, o) => {
        const d = o.dur || 0.55;
        noise(t, { dur: d, color: 'white', filter: 'highpass', f: 2800, gain: 0.36 * o.g, a: 0.02, pan: o.pan });
      },

      // --- Locomotion, Vehicles & Animals (bus: 'sfx' @ 0.45) ---
      footstep: (t, o) => {
        const n = o.n || 1;
        const stepRate = o.rate || 0.38;
        for (let i = 0; i < n; i++) {
          const ti = t + i * stepRate;
          tone(ti, { f: [[0, 140], [0.06, 55]], dur: 0.08, gain: 0.32 * o.g, pan: o.pan });
          noise(ti, { dur: 0.045, color: 'brown', filter: 'bandpass', f: 900 + (i % 2) * 180, q: 1.4, gain: 0.28 * o.g, pan: o.pan });
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
      elephantTrumpet: (t, o) => {
        const d = o.dur || 0.85;
        tone(t, { f: [[0, 340], [d * 0.25, 680], [d, 490]], type: 'sawtooth', filter: 'bandpass', f2: 1400, q: 2.0, dur: d, gain: 0.42 * o.g, a: 0.04, verb: 0.35, pan: o.pan });
        tone(t, { f: [[0, 680], [d * 0.25, 1360], [d, 980]], type: 'triangle', dur: d, gain: 0.25 * o.g, a: 0.04, verb: 0.35, pan: o.pan });
      },
      birdSong: (t, o) => {
        tone(t, { f: [[0, 2400], [0.09, 3200], [0.18, 2800]], dur: 0.2, gain: 0.25 * o.g, verb: 0.3, pan: o.pan });
        tone(t + 0.24, { f: [[0, 2900], [0.12, 3600]], dur: 0.15, gain: 0.25 * o.g, verb: 0.3, pan: o.pan });
      },
      dogWhimper: (t, o) => {
        const d = o.dur || 0.42;
        tone(t, { f: [[0, 680], [d * 0.4, 820], [d, 490]], type: 'triangle', dur: d, gain: 0.24 * o.g, a: 0.03, verb: 0.2, pan: o.pan });
      },
      dogBark: (t, o) => {
        tone(t, { f: [[0, 420], [0.06, 580], [0.14, 260]], type: 'sawtooth', filter: 'bandpass', f2: 950, q: 1.8, dur: 0.15, gain: 0.38 * o.g, pan: o.pan });
      },
      waterSplash: (t, o) => {
        noise(t, { dur: 0.42, color: 'pink', filter: 'bandpass', f: [[0, 1800], [0.42, 650]], q: 1.1, gain: 0.44 * o.g, a: 0.01, verb: 0.25, pan: o.pan });
      },
      steamWhistle: (t, o) => {
        const d = o.dur || 0.85;
        tone(t, { f: 587.33, type: 'sawtooth', filter: 'lowpass', f2: 1800, dur: d, gain: 0.28 * o.g, a: 0.06, hold: d * 0.6, verb: 0.35, pan: o.pan });
        tone(t, { f: 739.99, type: 'sawtooth', filter: 'lowpass', f2: 1800, dur: d, gain: 0.24 * o.g, a: 0.06, hold: d * 0.6, verb: 0.35, pan: o.pan });
        noise(t, { dur: d, color: 'white', filter: 'bandpass', f: 2400, q: 1.8, gain: 0.25 * o.g, a: 0.04, pan: o.pan });
      },
      engineSpoolDown: (t, o) => {
        const d = o.dur || 1.4;
        tone(t, { f: [[0, 480], [d, 110]], type: 'sawtooth', filter: 'bandpass', f2: [[0, 1200], [d, 260]], dur: d, gain: 0.34 * o.g, a: 0.05, verb: 0.25, pan: o.pan });
      },
      submarineSonar: (t, o) => {
        const f0 = o.f || 1320;
        tone(t, { f: f0, type: 'sine', dur: 1.4, gain: 0.38 * o.g, a: 0.004, verb: 0.75, delay: 0.35, pan: o.pan });
      },
      carHorn: (t, o) => {
        const d = o.dur || 0.38;
        tone(t, { f: 415, type: 'sawtooth', filter: 'lowpass', f2: 1600, dur: d, gain: 0.3 * o.g, a: 0.01, hold: d * 0.7, pan: o.pan });
        tone(t, { f: 523.25, type: 'sawtooth', filter: 'lowpass', f2: 1600, dur: d, gain: 0.3 * o.g, a: 0.01, hold: d * 0.7, pan: o.pan });
      },

      // --- Science, Medical, Tech & UI (bus: 'sfx' @ 0.45) ---
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
      timerChime: (t, o) => {
        const f0 = hz(o.f || 'A5');
        fmTone(t, { f: f0, ratio: 2.0, modIndex: 1.1, modEnd: 0.05, dur: 0.65, gain: 0.38 * o.g, a: 0.002, verb: 0.42, pan: o.pan });
      },
      alarmBeep: (t, o) => {
        const n = o.n || 3;
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.48;
          tone(ti, { f: 2048, type: 'square', filter: 'bandpass', f2: 2048, q: 4, dur: 0.08, gain: 0.32 * o.g, a: 0.002, pan: o.pan });
          tone(ti + 0.11, { f: 2048, type: 'square', filter: 'bandpass', f2: 2048, q: 4, dur: 0.08, gain: 0.32 * o.g, a: 0.002, pan: o.pan });
        }
      },
      heartbeatSub: (t, o) => {
        tone(t, { f: [[0, 82], [0.11, 38]], dur: 0.16, gain: 0.62 * o.g, pan: o.pan });
        tone(t + 0.21, { f: [[0, 74], [0.14, 34]], dur: 0.18, gain: 0.48 * o.g, pan: o.pan });
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
      liquidBubble: (t, o) => {
        const n = o.n || 5;
        const r = rand('bub' + t);
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.08 + r() * 0.03;
          const f0 = 380 + r() * 420;
          tone(ti, { f: [[0, f0], [0.065, f0 * 2.1]], type: 'sine', dur: 0.075, gain: 0.28 * o.g, pan: o.pan });
        }
      },
      geigerClicks: (t, o) => {
        const d = o.dur || 0.8;
        const r = rand('geiger' + t);
        let cur = 0;
        while (cur < d) {
          noise(t + cur, { dur: 0.008, filter: 'bandpass', f: 4200, q: 3.5, gain: 0.38 * o.g, pan: (r() - 0.5) * 0.4 });
          cur += 0.025 + r() * 0.085;
        }
      },
      electricSpark: (t, o) => {
        const r = rand('spark' + t);
        for (let i = 0; i < 4; i++) {
          noise(t + i * 0.035, { dur: 0.028, filter: 'bandpass', f: 2600 + r() * 2200, q: 2.5, gain: 0.42 * o.g, pan: o.pan });
          tone(t + i * 0.035, { f: 120, type: 'sawtooth', dur: 0.03, gain: 0.25 * o.g, pan: o.pan });
        }
      },
      dataStream: (t, o) => {
        const n = o.n || 8;
        const r = rand('data' + t);
        for (let i = 0; i < n; i++) {
          tone(t + i * 0.045, { f: 1200 + Math.floor(r() * 8) * 280, type: 'sine', dur: 0.038, gain: 0.22 * o.g, pan: (r() - 0.5) * 0.6 });
        }
      },
      cameraShutter: (t, o) => {
        noise(t, { dur: 0.015, filter: 'bandpass', f: 3200, q: 2.0, gain: 0.45 * o.g, pan: o.pan });
        noise(t + 0.038, { dur: 0.02, filter: 'bandpass', f: 2400, q: 2.0, gain: 0.38 * o.g, pan: o.pan });
      },
      phoneDial: (t, o) => {
        tone(t, { f: 440, dur: 0.8, gain: 0.22 * o.g, a: 0.01, hold: 0.7, pan: o.pan });
        tone(t, { f: 480, dur: 0.8, gain: 0.22 * o.g, a: 0.01, hold: 0.7, pan: o.pan });
      },

      // --- Historical, Cultural & Everyday (bus: 'sfx' @ 0.45) ---
      templeBell: (t, o) => {
        const f0 = hz(o.f || 'C5');
        fmTone(t, { f: f0, ratio: 2.756, modIndex: 1.8, modEnd: 0.08, dur: 2.3, gain: 0.42 * o.g, a: 0.002, verb: 0.65, pan: o.pan });
        tone(t, { f: f0 * 0.5, type: 'sine', dur: 2.5, gain: 0.22 * o.g, a: 0.004, verb: 0.6, pan: o.pan });
      },
      conchShell: (t, o) => {
        const d = o.dur || 1.6;
        tone(t, { f: [[0, 370], [0.25, 440], [d, 432]], type: 'sawtooth', filter: 'bandpass', f2: 880, q: 3.2, dur: d, gain: 0.42 * o.g, a: 0.18, hold: d * 0.55, verb: 0.6, pan: o.pan });
      },
      warHorn: (t, o) => {
        const d = o.dur || 1.8;
        tone(t, { f: [[0, 105], [0.2, 116.5], [d, 110]], type: 'sawtooth', filter: 'lowpass', f2: 620, dur: d, gain: 0.48 * o.g, a: 0.15, hold: d * 0.6, verb: 0.6, pan: o.pan });
        tone(t, { f: [[0, 210], [0.2, 233], [d, 220]], type: 'triangle', dur: d, gain: 0.28 * o.g, a: 0.15, hold: d * 0.6, verb: 0.6, pan: o.pan });
      },
      gavelBang: (t, o) => {
        const n = o.n || 2;
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.28;
          tone(ti, { f: [[0, 320], [0.07, 95]], dur: 0.09, gain: 0.52 * o.g, verb: 0.3, pan: o.pan });
          noise(ti, { dur: 0.03, filter: 'bandpass', f: 1850, q: 2.2, gain: 0.45 * o.g, pan: o.pan });
        }
      },
      coinClink: (t, o) => {
        const n = o.n || 3;
        for (let i = 0; i < n; i++) {
          const ti = t + i * 0.075;
          fmTone(ti, { f: 3400 + (i % 2) * 520, ratio: 2.1, modIndex: 1.5, dur: 0.18, gain: 0.32 * o.g, a: 0.001, verb: 0.25, pan: o.pan });
        }
      },
      paperTear: (t, o) => {
        const d = o.dur || 0.35;
        noise(t, { dur: d, color: 'white', filter: 'bandpass', f: [[0, 1800], [d, 4200]], q: 1.4, gain: 0.38 * o.g, a: 0.02, pan: o.pan });
      },
      penScratch: (t, o) => {
        const d = o.dur || 0.45;
        const r = rand('pen' + t);
        for (let x = 0; x < d; x += 0.038 + r() * 0.035) {
          const gd = 0.032 + r() * 0.025;
          noise(t + x, { dur: gd, filter: 'bandpass', f: 3400 + r() * 1400, q: 1.6, gain: 0.24 * o.g, a: gd * 0.3, pan: o.pan });
        }
      },
      seismographScratch: (t, o) => {
        S.penScratch(t, o);
      },
      jailCellSlam: (t, o) => {
        fmTone(t, { f: 420, ratio: 1.73, modIndex: 4.0, dur: 0.55, gain: 0.52 * o.g, verb: 0.45, pan: o.pan });
        S.thud(t, o);
      },
      toasterPop: (t, o) => {
        noise(t, { dur: 0.03, filter: 'bandpass', f: 1600, q: 1.5, gain: 0.4 * o.g, pan: o.pan });
        tone(t + 0.01, { f: [[0, 320], [0.08, 580]], dur: 0.09, gain: 0.32 * o.g, pan: o.pan });
      },

      // --- Deadpan Comedy, Slapstick & Visual Gag SFX (bus: 'sfx' @ 0.45) ---
      recordScratch: (t, o) => {
        const d = o.dur || 0.32;
        tone(t, { f: [[0, 920], [d * 0.4, 2100], [d, 140]], type: 'sawtooth', filter: 'bandpass', f2: [[0, 1400], [d, 400]], q: 2.0, dur: d, gain: 0.48 * o.g, a: 0.005, pan: o.pan });
        noise(t, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 1800], [d, 500]], q: 1.5, gain: 0.42 * o.g, pan: o.pan });
      },
      sadTrombone: (t, o) => {
        const notes = [
          [0.0, 293.66, 0.32],
          [0.34, 277.18, 0.32],
          [0.68, 261.63, 0.32],
          [1.02, [[0, 246.94], [0.65, 220.0]], 0.72],
        ];
        notes.forEach(([off, fVal, dur]) => {
          tone(t + off, { f: fVal, type: 'sawtooth', vibRate: 5.5, vibDepth: 4, filter: 'lowpass', f2: 1100, dur, gain: 0.36 * o.g, a: 0.02, hold: dur * 0.6, verb: 0.25, pan: o.pan });
        });
      },
      rimshot: (t, o) => {
        // Ba-dum Tsss!
        tone(t, { f: [[0, 180], [0.09, 75]], dur: 0.11, gain: 0.42 * o.g, pan: -0.15 });
        tone(t + 0.14, { f: [[0, 145], [0.11, 58]], dur: 0.13, gain: 0.45 * o.g, pan: 0.0 });
        noise(t + 0.30, { dur: 0.55, color: 'white', filter: 'highpass', f: 3800, gain: 0.36 * o.g, a: 0.002, verb: 0.3, pan: 0.2 });
      },
      comicBoing: (t, o) => {
        const d = o.dur || 0.48;
        tone(t, { f: [[0, 160], [d * 0.25, 540], [d * 0.5, 220], [d, 460]], type: 'triangle', vibRate: 18, vibDepth: 35, dur: d, gain: 0.42 * o.g, a: 0.004, pan: o.pan });
      },
      cricketChirp: (t, o) => {
        const n = o.n || 2;
        for (let c = 0; c < n; c++) {
          const b = t + c * 0.42;
          for (let i = 0; i < 4; i++) {
            tone(b + i * 0.032, { f: 4450, type: 'sine', dur: 0.022, gain: 0.24 * o.g, a: 0.002, pan: o.pan });
          }
        }
      },
      awkwardPluck: (t, o) => {
        fmTone(t, { f: o.f || 311.13, ratio: 1.5, modIndex: 2.0, modEnd: 0.05, dur: 0.22, gain: 0.4 * o.g, a: 0.002, verb: 0.18, pan: o.pan });
      },
      slideWhistleUp: (t, o) => {
        const d = o.dur || 0.45;
        tone(t, { f: [[0, 380], [d, 1480]], type: 'sine', dur: d, gain: 0.34 * o.g, a: 0.02, verb: 0.2, pan: o.pan });
      },
      slideWhistleDown: (t, o) => {
        const d = o.dur || 0.45;
        tone(t, { f: [[0, 1480], [d, 340]], type: 'sine', dur: d, gain: 0.34 * o.g, a: 0.02, verb: 0.2, pan: o.pan });
      },

      // --- Cinematic Transitions, Shimmers & UI Micro-Cues (bus: 'sfx' @ 0.45) ---
      whoosh: (t, o) => {
        const d = o.dur || 0.38;
        noise(t, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 320], [d * 0.55, o.top || 2200], [d, 580]], q: 0.9, gain: 0.42 * o.g, a: d * 0.45, pan: o.pan, verb: 0.15 });
      },
      swish: (t, o) => {
        const d = o.dur || 0.18;
        noise(t, { dur: d, filter: 'highpass', f: [[0, 1800], [d, 5200]], q: 0.7, gain: 0.28 * o.g, a: d * 0.35, pan: o.pan });
      },
      riserTension: (t, o) => {
        const d = o.dur || 1.5;
        tone(t, { f: [[0, 110], [d, 880]], type: 'sawtooth', filter: 'lowpass', f2: [[0, 240], [d, 4800]], dur: d, gain: 0.38 * o.g, a: d * 0.75, verb: 0.45, pan: o.pan });
        noise(t, { dur: d, color: 'pink', filter: 'bandpass', f: [[0, 400], [d, 3800]], q: 1.5, gain: 0.34 * o.g, a: d * 0.8, verb: 0.4, pan: o.pan });
      },
      starShimmer: (t, o) => {
        const notes = ['C5', 'E5', 'G5', 'B5', 'D6', 'E6', 'G6', 'B6'];
        notes.forEach((n, idx) => {
          fmTone(t + idx * 0.055, { f: n, ratio: 2.0, modIndex: 0.8, dur: 0.85, gain: 0.22 * o.g, a: 0.003, verb: 0.55, pan: (idx - 3.5) * 0.18 });
        });
      },
      sparkle: (t, o) => {
        S.starShimmer(t, o);
      },
      ding: (t, o) => {
        const f = hz(o.f || 'E6');
        fmTone(t, { f, ratio: 2.0, modIndex: 0.9, dur: 1.1, gain: 0.28 * o.g, verb: 0.35, pan: o.pan });
      },
      pop: (t, o) => {
        tone(t, { f: [[0, o.f || 620], [0.07, (o.f || 620) * 0.45]], dur: 0.1, gain: 0.42 * o.g, pan: o.pan });
      },
      blip: (t, o) => {
        tone(t, { f: o.f || 'E6', type: 'triangle', dur: 0.07, gain: 0.22 * o.g, a: 0.002, pan: o.pan });
      },
      tick: (t, o) => {
        noise(t, { dur: 0.016, filter: 'bandpass', f: o.f || 4200, q: 2.8, gain: 0.3 * o.g, pan: o.pan });
      },
    };

    // Universal Semantic SFX Synthesizer: if a shot calls k.play('any_custom_sound', t, opts),
    // automatically match semantic tokens so it NEVER falls back to a generic pop unless intended!
    function synthesizeSemanticSFX(name, t, o) {
      const k = String(name || '').toLowerCase();
      if (/explode|blast|bomb|cannon|detonat/.test(k)) return S.explosion(t, o);
      if (/shatter|glass|break|smash|pottery|ceramic/.test(k)) return S.shatter(t, o);
      if (/sword|blade|slash|katana|spear|dagger|clash/.test(k)) return S.swordClash(t, o);
      if (/hammer|forge|anvil|metal|smith|clink/.test(k)) return S.anvilStrike(t, o);
      if (/axe|chop|wood|tree|timber|cut/.test(k)) return S.axeChop(t, o);
      if (/stone|rock|boulder|collapse|crumble|brick/.test(k)) return S.stoneCollapse(t, o);
      if (/horse|gallop|cavalry|chariot/.test(k)) return S.horseGallop(t, o);
      if (/elephant|mammoth|trumpet/.test(k)) return S.elephantTrumpet(t, o);
      if (/roar|dino|monster|beast|growl|tiger|lion/.test(k)) return S.dinoRoar(t, o);
      if (/march|army|troop|stomp/.test(k)) return S.marchSteps(t, o);
      if (/step|walk|run|foot/.test(k)) return S.footstep(t, o);
      if (/bell|temple|sacred|chime|gong/.test(k)) return S.templeBell(t, o);
      if (/horn|conch|bugle|trumpet/.test(k)) return S.warHorn(t, o);
      if (/coin|gold|money|cash|trade|treasure/.test(k)) return S.coinClink(t, o);
      if (/water|splash|wave|oar|swim|river|dive/.test(k)) return S.waterSplash(t, o);
      if (/fire|flame|torch|burn|ignite/.test(k)) return S.fireIgnite(t, o);
      if (/thunder|lightning|storm/.test(k)) return S.thunder(t, o);
      if (/quake|rumble|tremor|tectonic|volcano/.test(k)) return S.volcanoRumble(t, o);
      if (/alarm|siren|alert|warning|emergency/.test(k)) return S.alarmBeep(t, o);
      if (/heart|pulse|beat/.test(k)) return S.heartbeatSub(t, o);
      if (/geiger|radiation|nuclear/.test(k)) return S.geigerClicks(t, o);
      if (/spark|zap|electric|short|shock|laser/.test(k)) return S.electricSpark(t, o);
      if (/data|scan|cyber|compute|type|keyboard|glitch/.test(k)) return S.dataStream(t, o);
      if (/sonar|ping|radar|sub/.test(k)) return S.submarineSonar(t, o);
      if (/scratch|record|stop|freeze/.test(k)) return S.recordScratch(t, o);
      if (/sad|fail|trombone|womp/.test(k)) return S.sadTrombone(t, o);
      if (/joke|gag|boing|bounce|funny|comedy/.test(k)) return S.comicBoing(t, o);
      if (/cricket|awkward/.test(k)) return S.cricketChirp(t, o);
      if (/whoosh|fly|pan|zoom|swipe|wind/.test(k)) return S.whoosh(t, o);
      if (/riser|build|swell/.test(k)) return S.riserTension(t, o);
      if (/thud|hit|punch|drop|fall|slam|impact/.test(k)) return S.impact(t, o);
      if (/write|quill|pen|scroll|chalk|draw/.test(k)) return S.penScratch(t, o);
      if (/bubble|boil|acid|chemical|lab/.test(k)) return S.liquidBubble(t, o);
      if (/badge|label|callout|ui|hud/.test(k)) return S.pillBadge(t, o);
      if (/count|ticker|number|chart/.test(k)) return S.counterTick(t, o);
      return S.pop(t, o);
    }

    function play(name, t, opts) {
      if (isBgmOnly) return;
      const o2 = Object.assign({}, opts);
      o2.g = o2.gain == null ? 1 : o2.gain;
      if (S[name]) {
        S[name](t, o2);
      } else {
        synthesizeSemanticSFX(name, t, o2);
      }
    }

    // =========================================================================
    // 8. UNIVERSAL MULTI-LAYER AMBIENT BED ENGINE (bus: 'amb' @ 0.20)
    // =========================================================================
    function bed(name, t0, t1, p) {
      if (isBgmOnly) return;
      p = p || {};
      const g = p.gain == null ? 1 : p.gain;
      const d = Math.max(0.1, t1 - t0);
      const fade = Math.min(0.4, d / 4);
      const long = (q) => Object.assign({ dur: d, a: fade, hold: Math.max(0, d - fade * 2), bus: 'amb' }, q);
      const k = String(name || '').toLowerCase();
      const r = rand('bed-' + k + '-' + t0);

      if (k === 'cabinhum' || /cabin|airplane|flight/.test(k)) {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 240, gain: 0.48 * g }));
        tone(t0, long({ f: 92, type: 'sine', gain: 0.16 * g }));
      } else if (k === 'supersonicwind' || k === 'cabinroar' || /storm|hurricane|blizzard|gale|jetstream/.test(k)) {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 1150, q: 0.55, gain: 0.58 * g }));
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 360, gain: 0.45 * g }));
      } else if (/ocean|sea|harbor|port|beach|coast|ship|naval/.test(k)) {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 420, gain: 0.45 * g }));
        // Gentle rhythmic wave surf washes
        for (let tw = t0 + 0.4; tw < t1 - 0.8; tw += 2.6) {
          noise(tw, { dur: 1.8, color: 'pink', filter: 'bandpass', f: [[0, 350], [0.9, 950], [1.8, 300]], q: 0.8, gain: 0.22 * g, a: 0.7, bus: 'amb', pan: (r() - 0.5) * 0.5 });
        }
      } else if (/rain|monsoon|downpour/.test(k)) {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 2400, q: 0.45, gain: 0.38 * g }));
        noise(t0, long({ color: 'white', filter: 'highpass', f: 5200, gain: 0.14 * g }));
      } else if (/jungle|forest|village|farm|nature|morning/.test(k)) {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 620, q: 1.1, gain: 0.22 * g }));
        for (let tb = t0 + 0.5; tb < t1 - 0.4; tb += 1.4 + r() * 1.2) {
          tone(tb, { f: [[0, 2400 + r() * 600], [0.12, 3100 + r() * 500]], dur: 0.14, gain: 0.12 * g, bus: 'amb', verb: 0.35, pan: (r() - 0.5) * 0.7 });
        }
      } else if (/night|cricket|camp/.test(k)) {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 260, gain: 0.22 * g }));
        for (let tc = t0 + 0.3; tc < t1 - 0.3; tc += 0.65) {
          tone(tc, { f: 4350 + (r() - 0.5) * 120, type: 'sine', dur: 0.04, gain: 0.1 * g, bus: 'amb', pan: (r() - 0.5) * 0.6 });
        }
      } else if (/temple|sacred|palace|courtyard|monastery/.test(k)) {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 420, q: 1.4, gain: 0.2 * g }));
        tone(t0, long({ f: 130.81, type: 'sine', gain: 0.12 * g, verb: 0.6 }));
      } else if (/lab|server|tech|studio|office|hospital|icu|bunker/.test(k)) {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 180, gain: 0.32 * g }));
        tone(t0, long({ f: 120, type: 'sine', gain: 0.1 * g }));
      } else if (/volcano|lava|fire|forge|furnace|battlefield/.test(k)) {
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 210, gain: 0.52 * g }));
        for (let tf = t0 + 0.2; tf < t1 - 0.2; tf += 0.35 + r() * 0.4) {
          noise(tf, { dur: 0.04, color: 'white', filter: 'bandpass', f: 2800 + r() * 1800, q: 2.0, gain: 0.14 * g, bus: 'amb', pan: (r() - 0.5) * 0.6 });
        }
      } else if (/space|cosmic|void|underwater|submarine|abyss/.test(k)) {
        tone(t0, long({ f: 55, type: 'sine', gain: 0.28 * g }));
        noise(t0, long({ color: 'brown', filter: 'lowpass', f: 150, gain: 0.35 * g }));
      } else if (k === 'fountainwater' || /river|stream|water|canal/.test(k)) {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 1850, q: 0.6, gain: 0.32 * g }));
      } else {
        noise(t0, long({ color: 'pink', filter: 'bandpass', f: 480, q: 1.2, gain: 0.26 * g }));
      }
    }

    // =========================================================================
    // 9. UNIVERSAL GENERATIVE COMPOSER (situationalCue)
    // =========================================================================
    function dispatchLeadNote(voiceName, t, f, dur, cutoff, g, pan) {
      const fn = VOICES[voiceName];
      if (!fn) return VOICES.kalimbaMarimba(t, f, dur, g, pan);
      if (voiceName === 'pulseOstinato') {
        return VOICES.pulseOstinato(t, f, dur, cutoff, g, pan);
      }
      return fn(t, f, dur, g, pan);
    }

    function dispatchPadChord(voiceName, t, ch, dur, cutoff, g) {
      if (voiceName === 'warmStringSection') return VOICES.warmStringSection(t, ch, dur, cutoff * 1.2, g);
      if (voiceName === 'glassPad') return VOICES.glassPad(t, ch, dur, cutoff * 1.3, g);
      if (voiceName === 'rhodesEP') {
        ch.forEach((f, i) => VOICES.rhodesEP(t, f, dur * 0.9, g * 0.55, (i - 1.5) * 0.25));
        return;
      }
      return VOICES.analogPad(t, ch, dur, cutoff, g);
    }

    function situationalCue(c) {
      if (isSfxOnly || !c) return;
      const t0 = c.start_time !== undefined ? c.start_time : 0;
      const t1 = c.end_time !== undefined ? c.end_time : t0 + 10;
      if (t1 <= t0) return;

      const dna = analyzeCueDNA(c);
      if (dna.silent) return;

      const g = c.gain == null ? 1 : c.gain;
      const rootMidi2 = parseRootMidi(dna.key);
      const { chords, subHz, scaleHz, lowScaleHz } = buildUniversalHarmony(
        rootMidi2,
        dna.scaleName,
        dna.progName
      );

      // Compose a bespoke 2-bar Call & Response Motif for this cue
      const motif = composeSeededMotif(dna, scaleHz.length);
      const r = rand('arr-' + dna.seedStr);

      // Optional Custom Motif Override: c.motif = ['D4', 'F4', 'A4', 'G4']
      const customMotifHz = Array.isArray(c.motif)
        ? c.motif.map((n) => (n ? hz(n) : null))
        : null;

      // Stem Activation Flags (can be overridden via c.layerStems)
      const stems = Object.assign(
        {
          sub: true,
          pad: dna.quirk < 0.75,
          lead: true,
          counter: dna.energy > 0.38 || dna.grandeur > 0.5,
          pulse: dna.tension > 0.62 || dna.energy > 0.72,
          perc: dna.percStyle !== 'none' && (dna.energy > 0.42 || dna.quirk > 0.5),
          clock: dna.percStyle === 'minimalClock' || dna.percStyle === 'tickingThriller' || c.timerChime,
        },
        c.layerStems || {}
      );

      // Entry Accent: Chime, Temple Bell, or Cinematic Sub-Drop
      if (c.timerChime || c.chapter_chime) {
        if (dna.scaleName.startsWith('carnatic') || dna.scaleName.startsWith('japanese')) {
          S.templeBell(t0, { f: scaleHz[0] || 523.25, g: 0.85 * g });
        } else {
          VOICES.celestaHarp(t0, scaleHz[4] || 587.33, 1.2, 1.1 * g, -0.15);
          VOICES.kalimbaMarimba(t0 + 0.08, scaleHz[7] || 880, 0.65, 1.0 * g, 0.15);
        }
      } else if (c.subDrop || dna.tension > 0.8) {
        VOICES.subPedal(t0, subHz[0] * 0.5, 1.2, g * 1.15);
      }

      // Optional Pre-Transition Cymbal/Synth Swell at the tail of the cue
      if (c.riser || (dna.grandeur > 0.7 && t1 - t0 >= 6.0)) {
        const swellDur = Math.min(1.4, (t1 - t0) * 0.25);
        VOICES.cymbalSwell(t1 - swellDur, swellDur, g * 0.85);
      }

      let tb = t0;
      let barIdx = 0;

      while (tb < t1 - 0.04) {
        const uCue = clamp((tb - t0) / Math.max(0.1, t1 - t0), 0, 1);
        const curBpm = Array.isArray(c.tempoCurve)
          ? lerp(c.tempoCurve[0][1], c.tempoCurve[c.tempoCurve.length - 1][1], uCue)
          : dna.bpm;
        const beat = 60 / clamp(curBpm, 48, 176);
        const bar = beat * 4;
        const barLen = Math.min(bar, t1 - tb);

        // Dynamic filter evolution across the cue
        const filterCutoff = lerp(
          520,
          3400,
          clamp(dna.tension * 0.7 + dna.energy * 0.3 + Math.sin(uCue * Math.PI) * 0.18, 0.1, 1)
        );

        const ch = chords[barIdx % chords.length];
        const rootSub = subHz[barIdx % subHz.length];
        const chordDegreeOffset = barIdx % 4 === 1 ? 2 : barIdx % 4 === 2 ? 4 : 0;

        // 1. BASS & DRONE LAYER
        if (stems.sub) {
          if (dna.bassVoice === 'tanpuraDrone') {
            VOICES.subPedal(tb, rootSub, barLen, g * 0.85);
            VOICES.tanpuraDrone(tb, rootSub, barLen, g * 0.85);
          } else if (dna.bassVoice === 'darkDreadDrone') {
            VOICES.darkDreadDrone(tb, rootSub, barLen, g * 0.9);
          } else if (dna.bassVoice === 'uprightBassPizz') {
            // Walking 4-beat pizzicato bassline for comedy / quirk / jazz
            const walkNotes = [rootSub * 2, ch[1] * 0.5, ch[2] * 0.5, ch[0] * 0.5];
            for (let b = 0; b < 4 && tb + b * beat < t1 - 0.02; b++) {
              VOICES.uprightBassPizz(tb + b * beat, walkNotes[b % walkNotes.length], beat * 0.85, g * 0.9, -0.1);
            }
          } else if (dna.bassVoice === 'moogBass') {
            // Rhythmic analog bass pulse on beats
            for (let b = 0; b < 4 && tb + b * beat < t1 - 0.02; b++) {
              VOICES.moogBass(tb + b * beat, rootSub * 2, beat * 0.82, g * (b % 2 === 0 ? 0.95 : 0.7), 0);
            }
          } else {
            VOICES.subPedal(tb, rootSub, barLen, g * (dna.grandeur > 0.7 ? 1.1 : 0.9));
          }
        }

        // 2. HARMONIC PAD & STRING SECTION LAYER
        if (stems.pad) {
          const padGain = dna.grandeur > 0.7 ? 1.15 : 0.82;
          dispatchPadChord(dna.padVoice, tb, ch, barLen, filterCutoff, g * padGain);
        }

        // 3. DRIVING PULSE OSTINATO LAYER (High-Tension / Tech / Action)
        if (stems.pulse && dna.leadVoice !== 'pulseOstinato') {
          const subDiv = dna.tension > 0.7 ? 16 : 8;
          const stepDur = bar / subDiv;
          for (let s = 0; s < subDiv && tb + s * stepDur < t1 - 0.02; s++) {
            const ts = tb + s * stepDur;
            const noteF = ch[s % ch.length] * 0.5;
            const accent = s % 4 === 0 ? 0.9 : s % 2 === 0 ? 0.62 : 0.45;
            VOICES.pulseOstinato(ts, noteF, stepDur * 0.85, filterCutoff, g * accent * 0.7, ((s % 2) - 0.5) * 0.28);
          }
        }

        // 4. CLOCK / PRECISION TICK LAYER
        if (stems.clock) {
          for (let s = 0; s < 8 && tb + s * (beat / 2) < t1 - 0.02; s++) {
            const ts = tb + s * (beat / 2);
            VOICES.clockEscapement(ts, s % 2 === 0, g * (0.6 + dna.tension * 0.35), (s % 2 === 0 ? -1 : 1) * 0.32);
          }
        }

        // 5. WORLD & CINEMATIC PERCUSSION GROOVE LAYER
        if (stems.perc) {
          for (let b = 0; b < 4 && tb + b * beat < t1 - 0.02; b++) {
            const tBeat = tb + b * beat;
            if (dna.percStyle === 'indianPerc') {
              VOICES.mridangamTabla(tBeat, b === 0 || b === 2, g * 0.9, -0.18);
              if (tBeat + beat * 0.5 < t1) {
                VOICES.mridangamTabla(tBeat + beat * 0.5, false, g * 0.68, 0.18);
              }
            } else if (dna.percStyle === 'taikoPerc' || dna.percStyle === 'epicDrums') {
              VOICES.taikoWarDrum(tBeat, b === 0 || b === 2, g * 0.92, (b % 2 - 0.5) * 0.25);
              if (b === 3 && tBeat + beat * 0.5 < t1) {
                VOICES.taikoWarDrum(tBeat + beat * 0.5, false, g * 0.7, 0.2);
              }
            } else if (dna.percStyle === 'warMarch') {
              VOICES.cinematicTom(tBeat, b === 0 || b === 2, g * 0.88);
              VOICES.militarySnare(tBeat + beat * 0.5, b % 2 === 1, g * 0.8, 0.15);
              if (b === 3 && tBeat + beat * 0.75 < t1) {
                VOICES.militarySnare(tBeat + beat * 0.75, false, g * 0.65, -0.15);
              }
            } else if (dna.percStyle === 'quirkyWoodblock') {
              VOICES.woodblockTick(tBeat, b % 2 === 0, g * 0.85, (b % 2 - 0.5) * 0.35);
              VOICES.brushShaker(tBeat + beat * 0.5, false, g * 0.75, 0.2);
            } else if (dna.percStyle === 'techGroove') {
              if (b === 0 || b === 2) VOICES.cinematicTom(tBeat, true, g * 0.65);
              VOICES.brushShaker(tBeat + beat * 0.5, b % 2 === 1, g * 0.8, (b % 2 - 0.5) * 0.3);
            } else if (dna.percStyle === 'softShaker') {
              VOICES.brushShaker(tBeat, b === 0, g * 0.7, -0.2);
              if (tBeat + beat * 0.5 < t1) VOICES.brushShaker(tBeat + beat * 0.5, false, g * 0.5, 0.2);
            } else if (dna.percStyle !== 'minimalClock') {
              VOICES.cinematicTom(tBeat, b === 0 || b === 2, g * (0.68 + dna.tension * 0.3));
            }
          }
        }

        // 6. PHRASE-STRUCTURED LEAD MOTIF & CALL-AND-RESPONSE COUNTER-MELODY
        if (stems.lead) {
          const isResponseBar = barIdx % 2 === 1;
          const notePattern = isResponseBar ? motif.bar2Notes : motif.bar1Notes;
          const steps = customMotifHz ? customMotifHz.length : motif.steps;
          const stepDur = bar / steps;

          for (let s = 0; s < steps && tb + s * stepDur < t1 - 0.02; s++) {
            const ts = tb + s * stepDur;
            let fNote = null;

            if (customMotifHz) {
              fNote = customMotifHz[(s + barIdx * 2) % customMotifHz.length];
            } else {
              const deg = notePattern[s];
              if (deg !== null && deg !== undefined) {
                const shiftedIdx = clamp(deg + chordDegreeOffset, 0, scaleHz.length - 1);
                fNote = scaleHz[shiftedIdx];
              }
            }

            if (fNote) {
              const isStrongBeat = s === 0 || s === Math.floor(steps / 2);
              const vel = (isStrongBeat ? 0.95 : 0.72) * (0.92 + r() * 0.14);
              const pan = Math.sin((s + barIdx) * 1.1) * 0.32;
              const noteDur = stepDur * (dna.energy < 0.45 ? 1.85 : 1.25);

              dispatchLeadNote(dna.leadVoice, ts, fNote, noteDur, filterCutoff, g * vel, pan);
            }
          }
        }

        // 7. HARMONIC COUNTER-MELODY / ANSWER PHRASE (Enters on response bars or high grandeur)
        if (stems.counter && (barIdx % 2 === 1 || dna.grandeur > 0.65)) {
          const answerBeats = [0, 2];
          answerBeats.forEach((bOff, idx) => {
            const tAns = tb + bOff * beat;
            if (tAns < t1 - 0.05) {
              const ansFreq = ch[(idx + barIdx) % ch.length] * 2;
              dispatchLeadNote(
                dna.counterVoice,
                tAns,
                ansFreq,
                beat * 1.65,
                filterCutoff,
                g * 0.68,
                idx === 0 ? -0.28 : 0.28
              );
            }
          });
        }

        tb += bar;
        barIdx++;
      }
    }

    // Backward-Compatible Legacy Archetype Wrapper
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

    // Master Episode BGM Score Runner (with Smooth Volume Ducking / Swells / 0.00 Silence Drops)
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
      sfx: play,
      bed,
      situationalCue,
      cue,
      bgmScore,
      tone,
      fmTone,
      noise,
      hz,
      MIX,
      vo: VO,
      sounds: Object.keys(S),
      instruments: Object.keys(VOICES),
      scales: Object.keys(SCALES),
    };
  };

  // ---------- 10. Live Browser Playback & Offline 48kHz Stereo WAV Renderer ----------
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


// Legacy Alias Mappings (so older transition names work seamlessly)
ZOOM_THROUGH: { outDur: 0.34, inDur: 0.28, matchIn: 'CAMERA_DOLLY_IN', sfx: 'whoosh', sfxOpts: { dur: 0.32, top: 1800, gain: 0.85 } },
ZOOM_OUT_SNAP: { outDur: 0.30, inDur: 0.24, matchIn: 'CAMERA_DOLLY_OUT', sfx: 'swish', sfxOpts: { dur: 0.26, gain: 0.85 } },
WHIP_LEFT: { outDur: 0.24, inDur: 0.22, matchIn: 'WHIP_PAN_LEFT', sfx: 'whoosh', sfxOpts: { dur: 0.26, top: 2400, pan: -0.45, gain: 0.9 } },
WHIP_RIGHT: { outDur: 0.24, inDur: 0.22, matchIn: 'WHIP_PAN_RIGHT', sfx: 'whoosh', sfxOpts: { dur: 0.26, top: 2400, pan: 0.45, gain: 0.9 } },
WHIP_UP: { outDur: 0.26, inDur: 0.24, matchIn: 'WHIP_TILT_UP', sfx: 'whoosh', sfxOpts: { dur: 0.28, top: 2800, gain: 0.9 } },
WHIP_DOWN: { outDur: 0.26, inDur: 0.24, matchIn: 'WHIP_TILT_DOWN', sfx: 'whoosh', sfxOpts: { dur: 0.28, top: 1500, gain: 0.9 } },
FLASH_POP: { outDur: 0.18, inDur: 0.24, matchIn: 'FLASH_BLOOM', sfx: 'whoosh', sfxOpts: { dur: 0.22, gain: 0.85 } },


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


}

// ---------- 3. Pre-Draw 3D Perspective Camera Transform ----------
function applyKinematicTransform(g, spec, progVal, phase) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;


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


}

// ---------- 4. Post-Draw 3D Bokeh, X-Ray Portal & Atmospheric Overlays ----------
function renderTransitionOverlay(g, spec, progVal, phase, gt) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;


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


}

// ---------- 5. Master Shot Wrapper: DK.drawShot(g, shot, lt, gt, u, opts) ----------
function drawShot(g, shot, lt, gt, u, opts = {}) {
if (!shot || typeof shot.draw !== 'function') return;


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


}

// ---------- 6. Automatic Transition SFX Scheduler for scoreSound(k) ----------
function scheduleTransitions(k, shots, batchStart = 0, theme = null) {
if (!k || typeof k.play !== 'function' || !Array.isArray(shots)) return;
linkShotTransitions(shots, theme);


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


}

// ---------- 3. Pre-Draw Kinematic 3D Camera Transform (Dollies & Whips) ----------
function applyKinematicTransform(g, spec, progVal, phase) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;


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


}

// ---------- 4. Post-Draw Volumetric & Tactile 2.5D/3D Transition Overlays ----------
function renderTransitionOverlay(g, spec, progVal, phase, gt) {
if (!spec || spec.type === 'HARD_CUT' || progVal <= 0.0001) return;
const t = spec.type;


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


}

// ---------- 5. Master Shot Wrapper: DK.drawShot(g, shot, lt, gt, u, opts) ----------
function drawShot(g, shot, lt, gt, u, opts = {}) {
if (!shot || typeof shot.draw !== 'function') return;


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


}

// ---------- 6. Automatic Transition SFX Scheduler for scoreSound(k) ----------
function scheduleTransitions(k, shots, batchStart = 0, theme = null) {
if (!k || typeof k.play !== 'function' || !Array.isArray(shots)) return;
linkShotTransitions(shots, theme);


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


}

// Export to DK, H, and SOUND namespaces
DK.TRANS_PRESETS = H.TRANS_PRESETS = TRANS_PRESETS;
DK.normalizeTrans = H.normalizeTrans = normalizeTrans;
DK.linkShotTransitions = H.linkShotTransitions = linkShotTransitions;
DK.drawShot = H.drawShot = drawShot;
DK.scheduleTransitions = H.scheduleTransitions = SOUND.scheduleTransitions = scheduleTransitions;
})();


// ============================================================================
// UNIVERSAL LUMINA COMPATIBILITY & ENVIRONMENT EXTENSION PATCH
// (Supports all DK.mood calling styles + FX.envExterior / FX.envInterior /
// FX.infographicEnv / FX.prop3D + extended FX.interactiveProp + UI.eraChapterDial)
// ============================================================================
(function () {
  'use strict';
  if (!window.DK) return;
  const DK = window.DK;
  const H = window.H || DK;
  const FX = (window.FX = DK.fx = window.FX || {});
  const UI = (window.UI = DK.ui = window.UI || {});
  const E = window.E || { W: 1920, H: 1080 };
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
    sphereGrad,
    cylinderGrad,
    contactShadow,
    glow,
    text,
    FONTS,
  } = DK;

  // ---------- 1. Universal DK.mood (Supports all calling conventions) ----------
  const _origMood = DK.mood;
  const FALLBACK_SKIES = {
    clearDay: ['#1e68c8', '#4298e8', '#82c8f8', '#dff2ff'],
    tropicalDay: ['#1672c8', '#389ee8', '#78ccf5', '#e4f7ff'],
    coastalDay: ['#145eb8', '#328ce0', '#72bef5', '#dff4ff'],
    goldenHour: ['#2b589e', '#5886c4', '#f2a668', '#ffe29e'],
    monsoonLush: ['#1c6ec2', '#4298de', '#84c8f2', '#e2f4fc'],
    ancientTemple: ['#226ac4', '#4e96e0', '#96c8f2', '#ffebc2'],
    ancientInterior: ['#38261c', '#523828', '#6e4c36', '#8c6244'],
    parchmentGold: ['#286ec2', '#569ce2', '#9cd0f5', '#f7ecd0'],
    edoMist: ['#2c6eb8', '#5c98d8', '#a2ccf2', '#f7e6e6'],
    victorianFog: ['#3a5878', '#5e7e9e', '#8ca8c4', '#c8d8e6'],
    primordialLava: ['#263a6e', '#584e7c', '#b85c38', '#f29848'],
    prehistoricJungle: ['#1e72c4', '#469ee2', '#88cef5', '#e8f7fc'],
    cabinNight: ['#141836', '#222852', '#333b6e'],
    stratosphereDay: ['#1462c4', '#368ee2', '#74bef5', '#dcf2ff'],
    stratosphereNight: ['#060b21', '#0e1d4a', '#1d3b82', '#355ca8'],
    sunriseFlight: ['#26529c', '#5282c8', '#f29864', '#ffe094'],
    urbanMorning: ['#1e6ec8', '#489ce8', '#88ccf8', '#e6f5ff'],
    urbanSunset: ['#2c4e8c', '#6878b4', '#e68862', '#ffd288'],
    blackoutNight: ['#0b132b', '#162447', '#243b6b'],
    nightSky: ['#09122c', '#14244d', '#243b6e', '#36528a'],
    storm: ['#1e2a4a', '#324268', '#4c6088', '#6e82a6'],
    deepSpace: ['#03050d', '#070b1c', '#0e1634', '#16224c'],
    xrayBlue: ['#0a1632', '#122652', '#1d3a78'],
  };

  function paintSky(g, pal) {
    if (!g || typeof g.createLinearGradient !== 'function') return;
    const cols =
      (pal && Array.isArray(pal.sky) && pal.sky) ||
      (pal && pal.top && [pal.top, pal.mid || pal.top, pal.bot || pal.bottom || pal.top]) ||
      FALLBACK_SKIES.clearDay;
    if (DK.backdrop) {
      DK.backdrop(g, cols, [-E.W, -E.H, E.W * 3, E.H * 3], { clouds: pal && pal.autoClouds !== false });
    } else {
      const grad = g.createLinearGradient(0, 0, 0, E.H);
      cols.forEach((c, idx) => grad.addColorStop(idx / Math.max(1, cols.length - 1), c));
      g.save();
      g.fillStyle = grad;
      g.fillRect(-E.W, -E.H, E.W * 3, E.H * 3);
      g.restore();
    }
  }

  DK.mood = H.mood = function universalMood(arg1, arg2) {
    const isCtxFirst = arg1 && typeof arg1.createLinearGradient === 'function';
    const ctx = isCtxFirst ? arg1 : null;
    const moodName = isCtxFirst
      ? arg2 || 'clearDay'
      : typeof arg1 === 'string'
      ? arg1
      : 'clearDay';

    let raw = null;
    if (typeof _origMood === 'function') {
      try {
        raw = isCtxFirst ? _origMood(moodName) : _origMood(arg1);
      } catch (e) {}
    }

    const basePal = (DK.BASE_MOODS && DK.BASE_MOODS[moodName]) || {};
    const skyArr = basePal.sky || FALLBACK_SKIES[moodName] || FALLBACK_SKIES.clearDay;
    const pal = Object.assign(
      {
        moodName,
        sky: skyArr,
        top: skyArr[0],
        mid: skyArr[1],
        bot: skyArr[skyArr.length - 1],
        bottom: skyArr[skyArr.length - 1],
        fog: skyArr[skyArr.length - 1],
        ground: basePal.floor || '#7c5c42',
      },
      basePal,
      typeof raw === 'object' && raw !== null ? raw : {}
    );

    if (ctx) paintSky(ctx, pal);

    const callable = function (g) {
      paintSky(g, pal);
      return pal;
    };

    Object.keys(pal).forEach((k) => {
      if (k !== 'name' && k !== 'length' && k !== 'arguments' && k !== 'caller') {
        try {
          callable[k] = pal[k];
        } catch (_) {}
      }
    });

    return callable;
  };

  // ---------- 2. 3D-Shaded Situational Prop Library (FX.prop3D) ----------
  const _origProp3D = FX.prop3D;
  FX.prop3D = H.prop3D = DK.prop3D = function (g, xOrOpts, y = 840, s = 1, maybeOpts = {}) {
    let px = xOrOpts;
    let py = y;
    let sc = s;
    let o = maybeOpts || {};
    if (typeof xOrOpts === 'object' && xOrOpts !== null) {
      o = xOrOpts;
      px = o.x !== undefined ? o.x : 960;
      py = o.y !== undefined ? o.y : 840;
      sc = o.s !== undefined ? o.s : 1;
    }
    if (typeof _origProp3D === 'function') {
      try {
        return _origProp3D(g, px, py, sc, o);
      } catch (_) {}
    }

    const kind = o.kind || 'trenchGrid';
    const col = o.color || '#38BDF8';
    const t = o.t || 0;

    g.save();
    g.translate(px, py);
    g.scale(sc, sc);
    contactShadow(g, 0, 4, 70, 12, 0.28);

    if (kind === 'trenchGrid') {
      // Stepped Archaeological Excavation Trench Pit with White Survey String Grid & Artifacts
      poly(
        g,
        [
          [-110, 0],
          [110, 0],
          [135, 38],
          [-135, 38],
        ],
        '#5C3A24',
        '#8C5A38',
        3
      );
      poly(
        g,
        [
          [-92, 6],
          [92, 6],
          [108, 32],
          [-108, 32],
        ],
        '#3D2414'
      );
      // Corner wooden stakes
      [
        [-112, -2],
        [112, -2],
        [-130, 34],
        [130, 34],
      ].forEach(([sx, sy]) => {
        rr(g, sx - 4, sy - 26, 8, 28, 2);
        g.fillStyle = '#D99B26';
        g.fill();
      });
      // Survey grid strings across trench
      g.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      g.lineWidth = 1.8;
      for (let gx = -80; gx <= 80; gx += 40) {
        seg(g, [[gx, -14], [gx * 1.15, 22]], 1.5, 'rgba(255,255,255,0.75)');
      }
      seg(g, [[-110, -14], [110, -14]], 2, '#F8FAFC');
      seg(g, [[-126, 18], [126, 18]], 2, '#F8FAFC');
      // Partially exposed terracotta potsherd & iron blade inside grid
      circle(g, -28, 16, 11, '#B84C2E');
      seg(g, [[12, 18], [52, 12]], 6, '#94A3B8');
    } else if (kind === 'amphoraStack') {
      // Stacked Roman / Ancient Tamil Terracotta Amphorae & Black-and-Red Ware Jars
      [
        [-28, 0, '#B84C2E'],
        [24, 0, '#9A3412'],
        [0, -34, '#C2593F'],
      ].forEach(([ax, ay, acol]) => {
        ellipse(g, ax, ay - 28, 22, 30, sphereGrad(g, ax, ay - 28, 28, acol));
        rr(g, ax - 8, ay - 66, 16, 16, 4);
        g.fillStyle = acol;
        g.fill();
      });
    } else if (kind === 'spiceCrates' || kind === 'marketCanopy') {
      rr(g, -55, -52, 52, 52, 6);
      g.fillStyle = '#8C5834';
      g.fill();
      rr(g, 4, -44, 48, 44, 6);
      g.fillStyle = '#704224';
      g.fill();
      circle(g, -28, -56, 18, '#F59E0B');
      circle(g, 28, -48, 16, '#DC2626');
    } else if (kind === 'suvCar' || kind === 'policeCruiser' || kind === 'ambulance') {
      // Modern 2.5D Vehicle
      const bodyCol = kind === 'policeCruiser' ? '#1E293B' : kind === 'ambulance' ? '#F8FAFC' : col;
      rr(g, -115, -62, 230, 44, 14);
      g.fillStyle = cylinderGrad(g, -115, -62, 115, -18, bodyCol, -1);
      g.fill();
      poly(
        g,
        [
          [-68, -62],
          [-38, -104],
          [52, -104],
          [78, -62],
        ],
        shade(bodyCol, 0.12)
      );
      poly(
        g,
        [
          [-58, -64],
          [-34, -96],
          [44, -96],
          [66, -64],
        ],
        '#38BDF8'
      );
      circle(g, -68, -18, 22, '#0F172A');
      circle(g, -68, -18, 10, '#94A3B8');
      circle(g, 68, -18, 22, '#0F172A');
      circle(g, 68, -18, 10, '#94A3B8');
    } else if (kind === 'microscope' || kind === 'centrifuge' || kind === '3dPrinter') {
      rr(g, -48, -68, 96, 68, 8);
      g.fillStyle = '#334155';
      g.fill();
      rr(g, -18, -124, 36, 56, 8);
      g.fillStyle = '#E2E8F0';
      g.fill();
      circle(g, 0, -105, 10, col);
    } else if (kind === 'dualMonitorDesk' || kind === 'serverRack') {
      rr(g, -75, -72, 150, 12, 4);
      g.fillStyle = '#475569';
      g.fill();
      seg(g, [[-58, -60], [-58, 0]], 8, '#334155');
      seg(g, [[58, -60], [58, 0]], 8, '#334155');
      rr(g, -64, -128, 58, 42, 4);
      rr(g, 6, -128, 58, 42, 4);
      g.fillStyle = '#0F172A';
      g.fill();
      glow(g, 0, -108, 48, col, 0.35);
    } else {
      // Generic 3D Pedestal / Crate Prop
      rr(g, -45, -60, 90, 60, 8);
      g.fillStyle = cylinderGrad(g, -45, -60, 45, 0, col, -1);
      g.fill();
    }
    g.restore();
  };

  // ---------- 3. Extended FX.interactiveProp (Adds plowField, brickWallBuild, crumblingPillar) ----------
  const _origInteractiveProp = FX.interactiveProp;
  FX.interactiveProp = H.interactiveProp = DK.interactiveProp = function (g, o = {}) {
    const { kind = 'choppableTree', x = 565, y = 840, cutTime = 1.8, lt = 0, gt = 0 } = o;

    if (kind === 'plowField') {
      g.save();
      g.translate(x, y);
      contactShadow(g, 0, 4, 65, 10, 0.25);
      // Turned earth furrow mounds behind the plowshare
      for (let i = -3; i <= 1; i++) {
        ellipse(g, i * 26, 4, 22, 8, i % 2 === 0 ? '#5C3A21' : '#4A2E1B');
      }
      // Wooden Yoke Beam & Curved Iron Plowshare (Kalappai)
      seg(g, [[-52, -58], [18, -4]], 8, '#7A4E2D');
      seg(g, [[-52, -58], [-64, -84]], 7, '#5C3A21');
      seg(g, [[8, -14], [88, -56]], 6, '#8C5A32');
      poly(g, [[6, -12], [28, -4], [14, 8], [-6, 4]], '#94A3B8');
      g.restore();
      return;
    }

    if (kind === 'brickWallBuild') {
      g.save();
      g.translate(x, y);
      contactShadow(g, 0, 4, 85, 12, 0.28);
      const courses = lt >= cutTime ? 5 : 3;
      const bw = 38;
      const bh = 20;
      for (let r = 0; r < courses; r++) {
        const isNewRow = r >= 3;
        const popS = isNewRow ? clamp((lt - cutTime) / 0.25, 0, 1) : 1;
        if (popS <= 0.01) continue;
        const rowOffset = (r % 2) * (bw * 0.45);
        for (let c = -2; c <= 1; c++) {
          const bx = c * (bw + 4) + rowOffset - 10;
          const by = -(r + 1) * (bh + 3);
          rr(g, bx, by, bw * popS, bh * popS, 3);
          g.fillStyle = r % 2 === 0 ? '#B84C2E' : '#A83E22';
          g.fill();
          g.strokeStyle = '#D9C2A6';
          g.lineWidth = 1.5;
          g.stroke();
        }
      }
      if (lt >= cutTime && lt < cutTime + 0.5) {
        glow(g, 0, -courses * 22, 55, '#FFD54F', 0.55);
      }
      g.restore();
      return;
    }

    if (kind === 'crumblingPillar') {
      g.save();
      g.translate(x, y);
      contactShadow(g, 0, 4, 52, 10, 0.28);
      // Base Plinth
      rr(g, -42, -28, 84, 28, 4);
      g.fillStyle = '#8C7A68';
      g.fill();
      // Carved Sangam Era Milestone Pillar
      const fall = lt >= cutTime ? clamp((lt - cutTime) / 0.5, 0, 1) * 0.45 : 0;
      g.save();
      g.translate(0, -28);
      g.rotate(fall);
      rr(g, -26, -155, 52, 155, 6);
      g.fillStyle = cylinderGrad(g, -26, -155, 26, 0, '#B8A692', -1);
      g.fill();
      rr(g, -36, -172, 72, 20, 4);
      g.fillStyle = '#9C8A76';
      g.fill();
      // Tamil-Brahmi inscription lines carved on pillar face
      seg(g, [[-14, -115], [14, -115]], 3, '#5C4E40');
      seg(g, [[-16, -95], [12, -95]], 3, '#5C4E40');
      seg(g, [[-12, -75], [16, -75]], 3, '#5C4E40');
      g.restore();
      g.restore();
      return;
    }

    if (typeof _origInteractiveProp === 'function') {
      return _origInteractiveProp(g, o);
    }
  };

  // ---------- 4. High-Density Exterior / Interior Builders (FX.envExterior, FX.envInterior, FX.infographicEnv) ----------
  if (typeof FX.envExterior !== 'function') {
    FX.envExterior = H.envExterior = DK.envExterior = function (g, t = 0, o = {}) {
      const { preset = 'modernDowntown', y = 840, seed = 7 } = o;

      if (preset === 'modernDowntown' || preset === 'suburbanStreet') {
        // Modern Chennai / Urban Avenue with Glass Towers, Ripon/Central Heritage Silhouette, Palms & Asphalt Street
        FX.skyline(g, {
          style: 'modern',
          seed,
          y: y - 40,
          minH: 130,
          maxH: 340,
          color: '#4A6282',
          lit: 0.25,
        });
        const r = rng(seed + 19);
        [240, 620, 1180, 1580].forEach((bx, idx) => {
          const bw = 175 + (idx % 2) * 35;
          const bh = 230 + (idx % 3) * 55;
          const bCol = idx === 1 ? '#C2593F' : idx % 2 === 0 ? '#5B7696' : '#64748B';
          rr(g, bx - bw / 2, y - bh, bw, bh, 6);
          g.fillStyle = cylinderGrad(g, bx - bw / 2, y - bh, bx + bw / 2, y, bCol, -1);
          g.fill();
          // Window grid
          g.fillStyle = 'rgba(224, 242, 254, 0.55)';
          for (let wy = y - bh + 22; wy < y - 36; wy += 32) {
            for (let wx = bx - bw / 2 + 18; wx < bx + bw / 2 - 24; wx += 28) {
              g.fillRect(wx, wy, 14, 18);
            }
          }
        });
        FX.tree(g, 410, y, 1.05, '#2E7D32', 'palm');
        FX.tree(g, 920, y, 1.1, '#388E3C', 'banyan');
        FX.tree(g, 1410, y, 1.05, '#2E7D32', 'palm');
        FX.storybookGround(g, y, { style: 'cobblestone', baseCol: '#475569', grassCol: '#489C4E' });
      } else if (preset === 'archaeologyDigSite') {
        // Coconut Grove Archaeological Dig Site (Keeladi / Mayiladumparai / Adichanallur)
        FX.storybookHorizon(g, { style: 'rural', y: y - 70, seed });
        FX.tree(g, 280, y, 1.12, '#2E7D32', 'palm');
        FX.tree(g, 1140, y, 1.08, '#388E3C', 'banyan');
        FX.tree(g, 1620, y, 1.15, '#2E7D32', 'palm');
        // Archeological Survey Canopy Tent in Midground
        poly(g, [[420, y - 165], [680, y - 165], [710, y - 120], [390, y - 120]], '#D97706', '#92400E', 2);
        seg(g, [[415, y - 120], [415, y]], 5, '#78350F');
        seg(g, [[685, y - 120], [685, y]], 5, '#78350F');
        FX.storybookGround(g, y, { style: 'earthPath', baseCol: '#7C5436', grassCol: '#4A8C4A' });
      } else if (preset === 'ancientHarbor') {
        FX.storybookScene(g, t, { preset: 'harborWharf', y, seed });
        FX.storybookGround(g, y, { style: 'flagstone', baseCol: '#786858', grassCol: '#489C4E' });
      } else if (preset === 'templeBazaar') {
        FX.storybookScene(g, t, { preset: 'templeCourtyard', y, seed });
        FX.storybookGround(g, y, { style: 'flagstone', baseCol: '#7C5C42', grassCol: '#489C4E' });
      } else {
        FX.storybookScene(g, t, { preset: 'ancientVillage', y, seed });
        FX.storybookGround(g, y, { style: 'earthPath', baseCol: '#7C5C42', grassCol: '#489C4E' });
      }
    };
  }

  if (typeof FX.envInterior !== 'function') {
    FX.envInterior = H.envInterior = DK.envInterior = function (g, t = 0, o = {}) {
      const { preset = 'scienceLab', y = 840 } = o;
      // High-density interior wall & floor
      const wallCols =
        preset === 'scienceLab' || preset === 'hospitalICU'
          ? ['#1E293B', '#334155', '#1E293B']
          : ['#261C16', '#3E2C22', '#261C16'];
      g.fillStyle = linGrad(g, 0, 0, 0, y, wallCols);
      g.fillRect(-E.W, -200, E.W * 3, y + 200);

      // Lab / Studio Windows & Equipment Panels
      [360, 960, 1560].forEach((wx) => {
        rr(g, wx - 140, 180, 280, 320, 12);
        g.fillStyle = 'rgba(56, 189, 248, 0.14)';
        g.fill();
        g.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        g.lineWidth = 4;
        g.stroke();
      });

      FX.storybookGround(g, y, { style: 'flagstone', baseCol: '#334155', grassCol: '#1E293B' });
    };
  }

  if (typeof FX.infographicEnv !== 'function') {
    FX.infographicEnv = H.infographicEnv = DK.infographicEnv = function (g, t = 0, o = {}) {
      const { preset = 'archaeologyDigSite', cam = { x: 960, y: 540, z: 1 }, y = 840, seed = 12, hero = null } = o;
      const isInterior =
        preset === 'scienceLab' ||
        preset === 'techStudio' ||
        preset === 'modernBedroom' ||
        preset === 'hospitalICU' ||
        preset === 'militaryBunker' ||
        preset === 'prisonCell' ||
        preset === 'courtroom' ||
        preset === 'corporateOffice';

      const normCam = {
        x: (cam.x !== undefined ? cam.x : 960) - 960,
        y: (cam.y !== undefined ? cam.y : 540) - 540,
        z: cam.z !== undefined ? cam.z : 1,
        r: cam.r || 0,
      };

      DK.fivePlane(g, normCam, {
        bgSky: (g) => {
          const m = DK.mood(isInterior ? 'ancientInterior' : 'clearDay');
          m(g);
          if (!isInterior) {
            FX.sun(g, 1480, 195, 58);
            FX.clouds(g, { seed: seed + 3, count: 6, y: 140, h: 135, color: '#FFFFFF', a: 0.88, t, speed: 11 });
          }
        },
        bgFar: (g) => {
          if (!isInterior) {
            FX.Hills ? FX.Hills(g, { seed, y: y - 80 }) : FX.hills(g, { seed, y: y - 80, amp: 95, color: '#5A8F68' });
          }
        },
        bgFarDepth: 0.35,
        bgFarBlur: 1.8,
        mgBack: (g) => {
          if (isInterior) FX.envInterior(g, t, { preset, y, seed });
          else FX.envExterior(g, t, { preset, y, seed });
        },
        mgBackDepth: 0.72,
        mgHero: (g) => {
          if (typeof hero === 'function') hero(g);
        },
        fgBokeh: (g) => {
          FX.bokehOrbs(g, t, { count: 10, color: '#FFE082', a: 0.14 });
        },
        fgBokehDepth: 1.45,
        fgBokehBlur: 9,
      });
    };
  }

  // ---------- 5. Normalize 5-Plane Camera Coordinates (Supports both 0-based & 960,540-centered cameras) ----------
  const _origLayer = DK.layer;
  DK.layer = H.layer = function (g, cam, depth, fn) {
    if (cam && (Math.abs(cam.x || 0) > 400 || Math.abs(cam.y || 0) > 250)) {
      const normCam = {
        x: (cam.x !== undefined ? cam.x : 960) - 960,
        y: (cam.y !== undefined ? cam.y : 540) - 540,
        z: cam.z !== undefined ? cam.z : 1,
        r: cam.r || 0,
      };
      return _origLayer(g, normCam, depth, fn);
    }
    return _origLayer(g, cam, depth, fn);
  };

  // ---------- 6. Enhanced UI.eraChapterDial & UI.pillBadge Parameter Mapping ----------
  const _origHorizonDial = UI.horizonChapterDial;
  UI.horizonChapterDial = UI.eraChapterDial = DK.horizonChapterDial = DK.eraChapterDial = H.horizonChapterDial = H.eraChapterDial = function (g, t = 0, o = {}) {
    const mapped = Object.assign({}, o, {
      hourText: o.hourText || o.era || o.partText || 'HISTORICAL ERA',
      titleText: o.titleText || o.year || o.title || 'TIMELINE',
      subText: o.subText || o.subTitle || '',
      portholeStyle: o.portholeStyle || (o.era ? 'ancientTemple' : 'city'),
    });
    return _origHorizonDial(g, t, mapped);
  };

  const _origPillBadge = UI.pillBadge;
  UI.pillBadge = DK.pillBadge = H.pillBadge = function (g, t = 1, o = {}) {
    const mapped = Object.assign({}, o, {
      border: o.border || o.accent || '#F5B041',
    });
    return _origPillBadge(g, t, mapped);
  };
})();

// ============================================================================
// LUMINA STUDIO — RUNTIME AUTO-GUARDRAIL (PREVENTS CAMERA & HUD BUGS FOREVER)
// Paste at the very bottom of engine/lumina_base.js
// ============================================================================
(function installLuminaGuardrails() {
  if (!window.DK || !window.UI) return;

  // 1. AUTO-FIX CAMERA OFFSET BUG (Converts cam.x ~ 960, cam.y ~ 540 -> 0, 0)
  const _origFivePlane = DK.fivePlane;
  if (typeof _origFivePlane === 'function') {
    DK.fivePlane = function (g, cam, planes) {
      let safeCam = { x: 0, y: 0, z: 1, rot: 0 };
      if (cam && typeof cam === 'object') {
        let cx = Number(cam.x) || 0;
        let cy = Number(cam.y) || 0;
        // If LLM passed screen center (~960, ~540) instead of pan offset (0, 0), normalize it!
        if (Math.abs(cx - 960) <= 360 && Math.abs(cy - 540) <= 260) {
          cx -= 960;
          cy -= 540;
        } else if (Math.abs(cy - 540) <= 180 && Math.abs(cx) <= 300) {
          cy -= 540;
        }
        safeCam = Object.assign({}, cam, { x: cx, y: cy });
      }
      return _origFivePlane.call(this, g, safeCam, planes);
    };
  }

  // 2. AUTO-FIX UI.titleCard FALLBACK TEXT BUG (Never prints "LAST PERSON ON EARTH")
  UI.titleCard = function (g, lt, opts) {
    opts = opts || {};
    const t0 = opts.t0 !== undefined ? opts.t0 : 0.4;
    const p = DK.pop(lt, t0, 0.45);
    if (p <= 0.01) return;

    const kicker = opts.kicker || opts.top || 'CHRONOLOGICAL DOCUMENTARY';
    const mainTitle = opts.title || [opts.line1, opts.line2].filter(Boolean).join(' ') || 'LUMINA STUDIO';
    const subTitle = opts.sub || opts.subTitle || opts.tag || '';
    const cy = opts.y !== undefined ? opts.y : 175;

    g.save();
    g.translate(opts.x !== undefined ? opts.x : 960, cy);
    g.scale(p, p);

    g.fillStyle = 'rgba(11, 16, 30, 0.90)';
    g.strokeStyle = opts.accent || '#FF851B';
    g.lineWidth = 3;
    g.shadowColor = 'rgba(0, 0, 0, 0.55)';
    g.shadowBlur = 28;
    g.beginPath();
    g.roundRect(-460, -82, 920, 164, 18);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    g.fillStyle = '#38BDF8';
    g.font = '800 16px "Space Mono", monospace';
    g.textAlign = 'center';
    g.fillText(String(kicker).toUpperCase(), 0, -42);

    g.fillStyle = '#FFD54F';
    g.font = '900 42px "Playfair Display", serif';
    g.fillText(String(mainTitle), 0, 10);

    if (subTitle) {
      g.fillStyle = '#F8FAFC';
      g.font = '800 20px "Nunito", sans-serif';
      g.fillText(String(subTitle), 0, 52);
    }
    g.restore();
  };

  // 3. AUTO-FIX UI.eraChapterDial & UI.horizonChapterDial (Non-Destructive Floating HUD!)
  function renderFloatingChapterDial(g, lt, opts) {
    opts = opts || {};
    const t0 = opts.t0 !== undefined ? opts.t0 : 0.25;
    const p = DK.pop(lt, t0, 0.45);
    if (p <= 0.01) return;

    const eraLabel = opts.era || opts.kicker || opts.sub || 'HISTORICAL ERA';
    const yearLabel = opts.year || opts.title || 'TIMELINE MILESTONE';

    g.save();
    g.translate(opts.x !== undefined ? opts.x : 960, opts.y !== undefined ? opts.y : 130);
    g.scale(p, p);

    g.fillStyle = 'rgba(12, 20, 38, 0.90)';
    g.strokeStyle = 'rgba(255, 184, 77, 0.78)';
    g.lineWidth = 2.5;
    g.shadowColor = 'rgba(0, 0, 0, 0.5)';
    g.shadowBlur = 24;
    g.beginPath();
    g.roundRect(-350, -56, 700, 112, 56);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;

    const dx = -275, dy = 0, dr = 40;
    g.save();
    g.beginPath();
    g.arc(dx, dy, dr, 0, Math.PI * 2);
    g.fillStyle = '#1B2A4A';
    g.fill();
    g.strokeStyle = '#FF851B';
    g.lineWidth = 2.5;
    g.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + lt * 0.45;
      g.strokeStyle = i % 3 === 0 ? '#FFD54F' : 'rgba(255,255,255,0.35)';
      g.lineWidth = i % 3 === 0 ? 2 : 1;
      g.beginPath();
      g.moveTo(dx + Math.cos(a) * (dr - 7), dy + Math.sin(a) * (dr - 7));
      g.lineTo(dx + Math.cos(a) * (dr - 2), dy + Math.sin(a) * (dr - 2));
      g.stroke();
    }

    g.fillStyle = '#FFD54F';
    g.beginPath();
    g.moveTo(dx - 12, dy + 16);
    g.lineTo(dx - 6, dy - 16);
    g.lineTo(dx + 6, dy - 16);
    g.lineTo(dx + 12, dy + 16);
    g.closePath();
    g.fill();
    g.restore();

    g.textAlign = 'left';
    g.fillStyle = '#FFB074';
    g.font = '800 15px "Space Mono", monospace';
    g.fillText(String(eraLabel).toUpperCase(), -205, -12);

    g.fillStyle = '#FFFFFF';
    g.font = '900 32px "Playfair Display", serif';
    g.fillText(String(yearLabel), -205, 28);
    g.restore();
  }

  UI.eraChapterDial = renderFloatingChapterDial;
  UI.horizonChapterDial = renderFloatingChapterDial;
})();