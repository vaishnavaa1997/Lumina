// ============================================================================
// MODULE 8: LUMINA_TEARDOWN (engine/lumina_teardown.js) — "hardcore-info"
// Inspired 2.5D Isometric Hardware Component Breakdowns, Spotlight Layer
// Isolation, Internal Physics Flows (Electrons, Thermal, Acoustic, Airflow),
// Orthogonal Leader-Line Callouts (UI.techCallout) & Generation Upgrade Diff
// Cards (UI.upgradeDiff). Soft-Volumetric 3D Gradients, Zero Black Outlines.
// Logical Stage: 1920x1080 (16:9). Deterministic fn(lt).
// Requires MODULE 1 (window.DK) & MODULE 3 (window.UI).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const UI = (window.UI = window.UI || {});
  const E = (window.E = DK.E || { W: 1920, H: 1080 });

  const {
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
    contactShadow,
    glow,
    text,
    measure,
    FONTS,
  } = DK;

  // ---------- 1. 2.5D Isometric Projection & Extruded 3D Slab Primitives ----------
  // Converts local isometric (ix, iy, iz) coordinates into 2D screen space
  const ISO_COS = Math.cos(Math.PI / 6); // ~0.866
  const ISO_SIN = Math.sin(Math.PI / 6); // 0.500

  function isoPt(ix, iy, iz = 0) {
    return [(ix - iy) * ISO_COS, (ix + iy) * ISO_SIN - iz];
  }

  // Draws a soft-volumetric 3D extruded isometric rectangular/rounded slab
  function isoSlab(g, w, d, h, o = {}) {
    const col = o.color || '#64748B';
    const topCol = o.topColor || shade(col, 0.16);
    const leftCol = o.leftColor || shade(col, -0.12);
    const rightCol = o.rightColor || shade(col, -0.26);
    const rimCol = o.rimColor || shade(col, 0.32);
    const hw = w * 0.5;
    const hd = d * 0.5;

    const pTop = isoPt(-hw, -hd, h);
    const pRight = isoPt(hw, -hd, h);
    const pFront = isoPt(hw, hd, h);
    const pLeft = isoPt(-hw, hd, h);

    const bRight = isoPt(hw, -hd, 0);
    const bFront = isoPt(hw, hd, 0);
    const bLeft = isoPt(-hw, hd, 0);

    // Left vertical extrusion face
    poly(g, [pLeft, pFront, bFront, bLeft], linGrad(g, pLeft[0], pLeft[1], bFront[0], bFront[1], [leftCol, shade(leftCol, -0.12)]));

    // Right vertical extrusion face
    poly(g, [pFront, pRight, bRight, bFront], linGrad(g, pFront[0], pFront[1], bRight[0], bRight[1], [rightCol, shade(rightCol, -0.12)]));

    // Top surface face with 3D metallic/glass gradient
    poly(
      g,
      [pTop, pRight, pFront, pLeft],
      linGrad(g, pTop[0], pTop[1], pFront[0], pFront[1], [shade(topCol, 0.1), topCol, shade(topCol, -0.08)]),
      rimCol,
      o.rimWidth !== undefined ? o.rimWidth : 1.5
    );

    // Optional glass specular sheen across top face
    if (o.glass) {
      poly(
        g,
        [
          isoPt(-hw * 0.75, -hd * 0.85, h),
          isoPt(-hw * 0.15, -hd * 0.85, h),
          isoPt(hw * 0.65, hd * 0.85, h),
          isoPt(hw * 0.05, hd * 0.85, h),
        ],
        'rgba(255, 255, 255, 0.22)'
      );
    }
  }

  // Draws an extruded 2.5D isometric cylinder/disc (for fans, magnets, turbine stages, lenses)
  function isoDisc(g, cx, cy, cz, rx, ry, h, o = {}) {
    const [sx, sy] = isoPt(cx, cy, cz);
    const col = o.color || '#94A3B8';
    g.save();
    g.translate(sx, sy);

    // Cylinder side wall
    if (h > 0) {
      g.fillStyle = cylinderGrad(g, -rx, -h, rx, 0, shade(col, -0.16), -1);
      g.beginPath();
      g.ellipse(0, -h, rx, ry, 0, 0, Math.PI, false);
      g.lineTo(-rx, 0);
      g.ellipse(0, 0, rx, ry, 0, Math.PI, 0, true);
      g.closePath();
      g.fill();
    }

    // Top ellipse face
    ellipse(g, 0, -h, rx, ry, sphereGrad(g, -rx * 0.2, -h - ry * 0.2, rx, shade(col, 0.14)));
    if (o.ringColor) {
      g.strokeStyle = o.ringColor;
      g.lineWidth = o.ringWidth || 2;
      g.beginPath();
      g.ellipse(0, -h, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2);
      g.stroke();
    }
    if (o.holeR) {
      ellipse(g, 0, -h, rx * o.holeR, ry * o.holeR, o.holeColor || '#0F172A');
    }
    g.restore();
  }

  // Draws animated electron / signal pulses along an array of isometric points
  function drawIsoTraces(g, traces, z, t, o = {}) {
    const traceCol = o.traceColor || 'rgba(56, 189, 248, 0.38)';
    const pulseCol = o.pulseColor || '#38BDF8';
    const active = o.internalFlow !== false;

    traces.forEach((pts, idx) => {
      const screenPts = pts.map(([ix, iy]) => isoPt(ix, iy, z));
      seg(g, screenPts, o.width || 2.5, traceCol);

      if (active && screenPts.length >= 2) {
        const u = ((t * (1.2 + (idx % 3) * 0.35) + idx * 0.27) % 1);
        const segIdx = Math.min(screenPts.length - 2, Math.floor(u * (screenPts.length - 1)));
        const localU = u * (screenPts.length - 1) - segIdx;
        const px = lerp(screenPts[segIdx][0], screenPts[segIdx + 1][0], localU);
        const py = lerp(screenPts[segIdx][1], screenPts[segIdx + 1][1], localU);
        glow(g, px, py, 16, pulseCol, 0.85);
        circle(g, px, py, 3.8, '#FFFFFF');
      }
    });
  }

  // ---------- 2. Orthogonal Leader-Line Technical Callout (UI.techCallout) ----------
  function techCallout(g, t = 1, o = {}) {
    const t0 = o.t0 !== undefined ? o.t0 : 0.1;
    const u = ease.outBack(clamp((t - t0) / (o.dur || 0.45), 0, 1));
    if (u <= 0.001) return;

    const [tx, ty] = o.target || [960, 540];
    const x = o.x !== undefined ? o.x : tx + 260;
    const y = o.y !== undefined ? o.y : ty - 90;
    const accent = o.accent || '#38BDF8';
    const title = String(o.title || 'COMPONENT');
    const metric = String(o.metric || '');
    const sub = String(o.subText || o.tag || '');

    // Compute 45-degree / orthogonal elbow joint
    const dirX = x >= tx ? 1 : -1;
    const elbowX = tx + dirX * Math.min(72, Math.abs(x - tx) * 0.42);
    const elbowY = y;

    g.save();
    g.globalAlpha *= clamp(u, 0, 1);

    // 1. Pulsing Target Reticle on Component
    const pulse = 1 + 0.22 * Math.sin(t * 6);
    glow(g, tx, ty, 24 * pulse, accent, 0.65);
    ring(g, tx, ty, 10 * pulse, 2.2, accent);
    circle(g, tx, ty, 4.5, '#FFFFFF');

    // 2. Orthogonal 2-Segment Leader Line + Travelling Telemetry Dot
    const lineProg = clamp((t - t0) / 0.32, 0, 1);
    const curElbowX = lerp(tx, elbowX, clamp(lineProg * 2, 0, 1));
    const curElbowY = lerp(ty, elbowY, clamp(lineProg * 2, 0, 1));
    const curEndX = lineProg > 0.5 ? lerp(elbowX, x, (lineProg - 0.5) * 2) : curElbowX;
    const curEndY = lineProg > 0.5 ? lerp(elbowY, y, (lineProg - 0.5) * 2) : curElbowY;

    seg(g, [[tx, ty], [curElbowX, curElbowY], [curEndX, curEndY]], 2.5, accent);
    circle(g, elbowX, elbowY, 3.5, accent);

    const sigU = (t * 1.4) % 1;
    const sx = sigU < 0.4 ? lerp(tx, elbowX, sigU / 0.4) : lerp(elbowX, x, (sigU - 0.4) / 0.6);
    const sy = sigU < 0.4 ? lerp(ty, elbowY, sigU / 0.4) : elbowY;
    circle(g, sx, sy, 3.5, '#FFFFFF');

    // 3. Hardcore-Info Spec Card
    const cardW = Math.max(o.w || 250, measure(g, title, 21, FONTS.ui, 900) + 44, measure(g, metric, 25, FONTS.mono, 700) + 44);
    const cardH = sub ? 94 : metric ? 74 : 52;
    const cardX = dirX > 0 ? x : x - cardW;
    const cardY = y - cardH * 0.5;

    g.save();
    g.translate(dirX > 0 ? cardX : cardX + cardW, y);
    g.scale(u, u);
    g.translate(dirX > 0 ? -cardX : -(cardX + cardW), -y);

    // Card backdrop + glowing accent edge bar
    rr(g, cardX, cardY, cardW, cardH, 10);
    g.fillStyle = 'rgba(13, 20, 38, 0.94)';
    g.fill();
    g.strokeStyle = alpha(accent, 0.65);
    g.lineWidth = 2;
    g.stroke();

    rr(g, dirX > 0 ? cardX : cardX + cardW - 6, cardY, 6, cardH, 3);
    g.fillStyle = accent;
    g.fill();

    const padX = cardX + 18;
    text(g, title, padX, cardY + 22, {
      size: 19,
      font: FONTS.ui,
      weight: 900,
      color: '#F8FAFC',
      align: 'left',
      spacing: 0.8,
    });

    if (metric) {
      text(g, metric, padX, cardY + 50, {
        size: 23,
        font: FONTS.mono,
        weight: 700,
        color: accent,
        align: 'left',
      });
    }

    if (sub) {
      text(g, sub, padX, cardY + 76, {
        size: 14,
        font: FONTS.ui,
        weight: 700,
        color: '#94A3B8',
        align: 'left',
        spacing: 1.0,
      });
    }

    if (o.barProg !== undefined) {
      const bw = cardW - 36;
      const bx = padX;
      const by = cardY + cardH - 11;
      rr(g, bx, by, bw, 5, 2.5);
      g.fillStyle = 'rgba(148, 163, 184, 0.22)';
      g.fill();
      rr(g, bx, by, bw * clamp(o.barProg * u, 0, 1), 5, 2.5);
      g.fillStyle = accent;
      g.fill();
    }

    g.restore();
    g.restore();
  }

  // ---------- 3. Built-In Hardware Layer Definitions (7 Devices) ----------
  function getDeviceLayers(device, opts = {}) {
    const dev = String(device || 'smartphone').toLowerCase();

    // ==================== 1. SMARTPHONE / IPHONE (6 LAYERS) ====================
    if (dev === 'smartphone' || dev === 'iphone') {
      return [
        {
          id: 'chassis',
          name: 'GRADE 5 TITANIUM UNIBODY',
          metric: 'Ti-6Al-4V · 1.2mm CNC Frame',
          tag: 'STRUCTURAL CHASSIS',
          accent: '#94A3B8',
          calloutOffset: [-340, 80],
          draw: (g, t) => {
            isoSlab(g, 250, 136, 16, { color: '#475569', rimColor: '#CBD5E1' });
            isoSlab(g, 232, 120, 17, { color: '#1E293B', rimWidth: 0 });
            // MagSafe wireless charging coil ring
            isoDisc(g, 0, 0, 18, 38, 22, 2, { color: '#334155', ringColor: '#F59E0B', ringWidth: 3, holeR: 0.65 });
          },
        },
        {
          id: 'battery',
          name: 'L-SHAPED LI-ION BATTERY CELL',
          metric: '4,685 mAh · 18.1 Wh Density',
          tag: 'ENERGY STORAGE',
          accent: '#38C878',
          calloutOffset: [340, 95],
          draw: (g, t, flow) => {
            // Main battery block + L-wing extension
            g.save();
            const [ox, oy] = isoPt(18, 10, 0);
            g.translate(ox, oy);
            isoSlab(g, 145, 78, 14, { color: '#1E293B', topColor: '#0F172A', rimColor: '#38C878' });
            if (flow) {
              const chargeW = 90 * (0.35 + 0.65 * ((t * 0.45) % 1));
              isoSlab(g, chargeW, 52, 15, { color: '#10B981', topColor: '#34D399', rimWidth: 0 });
            }
            text(g, 'Li-Ion 18.1Wh', 0, -16, { size: 13, font: FONTS.mono, color: '#38C878', weight: 700 });
            g.restore();
          },
        },
        {
          id: 'pcb',
          name: '3NM A18 PRO / SNAPDRAGON SOC',
          metric: '19 Billion Transistors · 16-Core NPU',
          tag: 'STACKED LOGIC PCB',
          accent: '#38BDF8',
          calloutOffset: [-360, -25],
          draw: (g, t, flow) => {
            const [ox, oy] = isoPt(-42, -16, 0);
            g.save();
            g.translate(ox, oy);
            isoSlab(g, 118, 92, 10, { color: '#064E3B', topColor: '#047857', rimColor: '#10B981' });
            // 3nm SoC Silicon Die in center of PCB
            isoSlab(g, 48, 42, 14, { color: '#1E293B', topColor: '#090D16', rimColor: '#38BDF8' });
            glow(g, 0, -14, 34, '#38BDF8', 0.55);
            text(g, '3nm SoC', 0, -15, { size: 11, font: FONTS.mono, color: '#38BDF8', weight: 700 });
            drawIsoTraces(
              g,
              [
                [[-52, -32], [-18, -12]],
                [[52, -28], [18, -10]],
                [[-48, 28], [-16, 12]],
                [[48, 30], [16, 10]],
              ],
              12,
              t,
              { internalFlow: flow, pulseColor: '#38BDF8' }
            );
            g.restore();
          },
        },
        {
          id: 'camera',
          name: 'TRIPLE 48MP TETRAPRISM CAMERA',
          metric: '5x Optical Zoom · Sensor-Shift OIS',
          tag: 'OPTICAL SENSOR ARRAY',
          accent: '#F59E0B',
          calloutOffset: [350, -35],
          draw: (g, t) => {
            const [ox, oy] = isoPt(-68, -28, 0);
            g.save();
            g.translate(ox, oy);
            isoSlab(g, 76, 76, 16, { color: '#334155', rimColor: '#94A3B8' });
            [
              [-18, -18],
              [18, -14],
              [-14, 18],
            ].forEach(([lx, ly]) => {
              isoDisc(g, lx, ly, 16, 15, 9, 10, { color: '#1E293B', ringColor: '#38BDF8', holeR: 0.45, holeColor: '#0284C7' });
            });
            g.restore();
          },
        },
        {
          id: 'thermal',
          name: 'GRAPHENE & COPPER VAPOR CHAMBER',
          metric: '420 W/m·K Thermal Conductivity',
          tag: 'THERMAL DISSIPATION',
          accent: '#F97316',
          calloutOffset: [-340, -135],
          draw: (g, t, flow) => {
            const heatCol = flow ? mix('#D97706', '#EF4444', 0.5 + 0.5 * Math.sin(t * 3.5)) : '#D97706';
            isoSlab(g, 195, 106, 6, { color: '#B45309', topColor: heatCol, rimColor: '#FBBF24' });
            if (flow) glow(g, 0, -6, 85, '#F97316', 0.42);
          },
        },
        {
          id: 'display',
          name: 'LTPO SUPER RETINA XDR OLED',
          metric: '2,000 Nits Peak · 1–120Hz ProMotion',
          tag: 'CERAMIC SHIELD DISPLAY',
          accent: '#A855F7',
          calloutOffset: [340, -155],
          draw: (g, t) => {
            isoSlab(g, 246, 132, 9, { color: '#0F172A', topColor: '#1E1B4B', rimColor: '#38BDF8', glass: true });
            // Dynamic Island pill cutout
            const [dx, dy] = isoPt(-92, 0, 10);
            ellipse(g, dx, dy, 9, 18, '#05070D', -0.52);
          },
        },
      ];
    }

    // ==================== 2. HEADPHONES / EARBUDS (6 LAYERS) ====================
    if (dev === 'headphones' || dev === 'earbuds') {
      return [
        {
          id: 'shell',
          name: 'ANODIZED ALUMINUM ACOUSTIC CUP',
          metric: 'CNC Bead-Blasted Rear Chamber',
          tag: 'OUTER ENCLOSURE',
          accent: '#94A3B8',
          calloutOffset: [-340, 95],
          draw: (g) => {
            isoDisc(g, 0, 0, 0, 118, 68, 28, { color: '#475569', ringColor: '#CBD5E1' });
          },
        },
        {
          id: 'dsp',
          name: 'H2 / ULTRA-LOW LATENCY ANC DSP',
          metric: '48,000x/sec Noise Cancellation',
          tag: 'ACTIVE NOISE CONTROL PCB',
          accent: '#38BDF8',
          calloutOffset: [340, 80],
          draw: (g, t, flow) => {
            isoDisc(g, 0, 0, 0, 92, 54, 10, { color: '#065F46', ringColor: '#10B981' });
            isoSlab(g, 42, 42, 14, { color: '#0F172A', rimColor: '#38BDF8' });
            drawIsoTraces(g, [[[-45, 0], [45, 0]], [[0, -45], [0, 45]]], 12, t, { internalFlow: flow });
          },
        },
        {
          id: 'battery',
          name: 'TOROIDAL LITHIUM-POLYMER CELL',
          metric: '30-Hour ANC Playback Capacity',
          tag: 'RING BATTERY',
          accent: '#38C878',
          calloutOffset: [-350, -15],
          draw: (g) => {
            isoDisc(g, 0, 0, 0, 86, 50, 14, { color: '#1E293B', ringColor: '#38C878', holeR: 0.55 });
          },
        },
        {
          id: 'magnet',
          name: 'N52 NEODYMIUM RING MAGNET',
          metric: '1.4 Tesla High-Flux Magnetic Gap',
          tag: 'MAGNETIC MOTOR',
          accent: '#F59E0B',
          calloutOffset: [350, -35],
          draw: (g) => {
            isoDisc(g, 0, 0, 0, 76, 44, 18, { color: '#CBD5E1', ringColor: '#F59E0B', holeR: 0.42 });
          },
        },
        {
          id: 'driver',
          name: '40MM BERYLLIUM DOME DIAPHRAGM',
          metric: '20Hz – 40kHz <0.1% THD Excursion',
          tag: 'TRANSDUCER & VOICE COIL',
          accent: '#F43F5E',
          calloutOffset: [-340, -130],
          draw: (g, t, flow) => {
            const vib = flow ? Math.sin(t * 28) * 4 : 0;
            // Copper voice coil cylinder underneath dome
            isoDisc(g, 0, 0, vib, 48, 28, 16, { color: '#D97706', ringColor: '#FBBF24' });
            // Beryllium metallic dome
            isoDisc(g, 0, 0, 16 + vib, 96, 56, 8, { color: '#94A3B8', ringColor: '#F43F5E' });
            if (flow) {
              for (let w = 0; w < 3; w++) {
                const wu = ((t * 1.6 + w * 0.33) % 1);
                g.strokeStyle = alpha('#F43F5E', (1 - wu) * 0.75);
                g.lineWidth = 3;
                g.beginPath();
                g.ellipse(0, -24 - wu * 55, 45 + wu * 65, 26 + wu * 38, 0, 0, Math.PI * 2);
                g.stroke();
              }
            }
          },
        },
        {
          id: 'cushion',
          name: 'VISCOELASTIC MEMORY-FOAM CUSHION',
          metric: 'Passive Acoustic Seal · Breathable Mesh',
          tag: 'EARPAD & BAFFLE',
          accent: '#A855F7',
          calloutOffset: [340, -155],
          draw: (g) => {
            isoDisc(g, 0, 0, 0, 122, 70, 24, { color: '#334155', ringColor: '#94A3B8', holeR: 0.52, holeColor: '#1E293B' });
          },
        },
      ];
    }

    // ==================== 3. GRAPHICS CARD / GPU (5 LAYERS) ====================
    if (dev === 'gpu' || dev === 'graphicsCard') {
      return [
        {
          id: 'backplate',
          name: 'FLOW-THROUGH ALUMINUM BACKPLATE',
          metric: 'Structural Rigidity & Rear Pass-Through',
          tag: 'REAR ARMOR',
          accent: '#94A3B8',
          calloutOffset: [-360, 95],
          draw: (g) => {
            isoSlab(g, 290, 145, 10, { color: '#334155', rimColor: '#94A3B8' });
            isoSlab(g, 95, 95, 11, { color: '#0F172A', rimWidth: 0 });
          },
        },
        {
          id: 'pcb',
          name: '14-LAYER HIGH-TG PCIE 5.0 PCB',
          metric: '24-Phase VRM · 600W 12VHPWR Delivery',
          tag: 'POWER & SIGNAL BOARD',
          accent: '#10B981',
          calloutOffset: [360, 75],
          draw: (g, t, flow) => {
            isoSlab(g, 240, 135, 10, { color: '#0F172A', topColor: '#111827', rimColor: '#10B981' });
            // VRM power chokes along left & right edges
            for (let i = -3; i <= 3; i++) {
              const [vx, vy] = isoPt(-88, i * 16, 10);
              g.save();
              g.translate(vx, vy);
              isoSlab(g, 18, 12, 10, { color: '#475569' });
              g.restore();
            }
            drawIsoTraces(g, [[[-90, 0], [0, 0]], [[0, -50], [0, 50]], [[85, -30], [15, -10]]], 11, t, { internalFlow: flow, pulseColor: '#10B981' });
          },
        },
        {
          id: 'die',
          name: 'MONOLITHIC 4NM GPU DIE + GDDR7 VRAM',
          metric: '76B Transistors · 1,792 GB/s Memory Bus',
          tag: 'SILICON COMPUTE ENGINE',
          accent: '#38BDF8',
          calloutOffset: [-370, -25],
          draw: (g, t, flow) => {
            // Central mirror-finish GPU silicon die
            isoSlab(g, 74, 74, 12, { color: '#0284C7', topColor: '#0369A1', rimColor: '#38BDF8', glass: true });
            if (flow) glow(g, 0, -12, 65, '#38BDF8', 0.65);
            // 8 surrounding GDDR7 / HBM3e VRAM chips
            const vramPos = [
              [-62, -26], [-62, 26], [62, -26], [62, 26],
              [-26, -62], [26, -62], [-26, 62], [26, 62],
            ];
            vramPos.forEach(([vx, vy]) => {
              const [sx, sy] = isoPt(vx, vy, 0);
              g.save();
              g.translate(sx, sy);
              isoSlab(g, 24, 24, 9, { color: '#1E293B', rimColor: '#64748B' });
              g.restore();
            });
          },
        },
        {
          id: 'heatsink',
          name: 'COPPER VAPOR CHAMBER & FIN STACK',
          metric: '8x Sintered Heatpipes · 112 Aluminum Fins',
          tag: 'THERMAL DISSIPATION',
          accent: '#F97316',
          calloutOffset: [370, -45],
          draw: (g, t, flow) => {
            // Copper heatpipes
            [-36, -12, 12, 36].forEach((py) => {
              const p0 = isoPt(-135, py, 4);
              const p1 = isoPt(135, py, 4);
              seg(g, [p0, p1], 8, flow ? '#F97316' : '#D97706');
            });
            isoSlab(g, 285, 138, 24, { color: '#94A3B8', topColor: '#CBD5E1', rimColor: '#E2E8F0' });
            if (flow) glow(g, 0, -14, 95, '#F97316', 0.42);
          },
        },
        {
          id: 'shroud',
          name: 'TRIPLE AXIAL-TECH COOLING SHROUD',
          metric: 'Counter-Rotating Dual-Ball Bearing Fans',
          tag: 'ACTIVE AIRFLOW',
          accent: '#A855F7',
          calloutOffset: [-360, -155],
          draw: (g, t, flow) => {
            isoSlab(g, 295, 148, 18, { color: '#1E293B', topColor: '#0F172A', rimColor: '#38BDF8' });
            [-92, 0, 92].forEach((fx, idx) => {
              isoDisc(g, fx, 0, 18, 42, 24, 4, { color: '#334155', ringColor: '#38BDF8' });
              const [cx, cy] = isoPt(fx, 0, 22);
              const spin = flow ? t * 14 * (idx === 1 ? -1 : 1) : 0;
              for (let b = 0; b < 7; b++) {
                const ang = spin + (b / 7) * Math.PI * 2;
                seg(g, [[cx, cy], [cx + Math.cos(ang) * 34, cy + Math.sin(ang) * 19]], 4.5, '#64748B');
              }
              circle(g, cx, cy, 9, '#0F172A');
            });
          },
        },
      ];
    }

    // ==================== 4. LAPTOP (5 LAYERS) ====================
    if (dev === 'laptop') {
      return [
        {
          id: 'base',
          name: 'CNC RECYCLED ALUMINUM UNIBODY',
          metric: 'Acoustic Side Vents & Anti-Slip Feet',
          tag: 'BOTTOM ENCLOSURE',
          accent: '#94A3B8',
          calloutOffset: [-360, 95],
          draw: (g) => isoSlab(g, 310, 210, 12, { color: '#64748B', topColor: '#94A3B8', rimColor: '#E2E8F0' }),
        },
        {
          id: 'battery',
          name: '100WH 6-CELL LITHIUM-POLYMER ARRAY',
          metric: 'Up to 22 Hours Video Playback',
          tag: 'POWER SUBSYSTEM',
          accent: '#38C878',
          calloutOffset: [360, 75],
          draw: (g) => {
            const [ox, oy] = isoPt(0, 42, 0);
            g.save();
            g.translate(ox, oy);
            isoSlab(g, 275, 85, 12, { color: '#1E293B', topColor: '#0F172A', rimColor: '#38C878' });
            g.restore();
          },
        },
        {
          id: 'logic',
          name: 'UNIFIED MEMORY SOC & DUAL BLOWERS',
          metric: '128GB Unified RAM · 400GB/s Bandwidth',
          tag: 'MAIN LOGIC BOARD',
          accent: '#38BDF8',
          calloutOffset: [-360, -25],
          draw: (g, t, flow) => {
            const [ox, oy] = isoPt(0, -38, 0);
            g.save();
            g.translate(ox, oy);
            isoSlab(g, 240, 88, 10, { color: '#0F172A', rimColor: '#38BDF8' });
            isoSlab(g, 52, 52, 14, { color: '#0284C7', rimColor: '#BAE6FD' });
            isoDisc(g, -92, 0, 10, 34, 20, 6, { color: '#334155', ringColor: '#94A3B8' });
            isoDisc(g, 92, 0, 10, 34, 20, 6, { color: '#334155', ringColor: '#94A3B8' });
            if (flow) glow(g, 0, -14, 55, '#38BDF8', 0.55);
            g.restore();
          },
        },
        {
          id: 'keyboard',
          name: 'BACKLIT SCISSOR KEYBOARD & FORCE TOUCH',
          metric: '1.0mm Key Travel · Haptic Glass Trackpad',
          tag: 'TOP CASE INPUT DECK',
          accent: '#F59E0B',
          calloutOffset: [360, -55],
          draw: (g) => {
            isoSlab(g, 310, 210, 10, { color: '#94A3B8', topColor: '#CBD5E1', rimColor: '#F8FAFC' });
            const [kx, ky] = isoPt(0, -28, 11);
            g.save();
            g.translate(kx, ky);
            isoSlab(g, 255, 92, 3, { color: '#1E293B', topColor: '#0F172A' });
            g.restore();
            const [tx, ty] = isoPt(0, 58, 11);
            g.save();
            g.translate(tx, ty);
            isoSlab(g, 105, 64, 2, { color: '#94A3B8', topColor: '#BAC8D9' });
            g.restore();
          },
        },
        {
          id: 'display',
          name: 'LIQUID RETINA XDR MINI-LED DISPLAY',
          metric: '10,000 Mini-LEDs · 1,000,000:1 Contrast',
          tag: 'DISPLAY ASSEMBLY',
          accent: '#A855F7',
          calloutOffset: [-360, -155],
          draw: (g) => isoSlab(g, 310, 210, 8, { color: '#0F172A', topColor: '#1E1B4B', rimColor: '#38BDF8', glass: true }),
        },
      ];
    }

    // ==================== 5. CPU / SILICON SOC PACKAGE (5 LAYERS) ====================
    if (dev === 'cpu' || dev === 'soc') {
      return [
        {
          id: 'socket',
          name: 'LGA 1851 / AM5 ZIF SOCKET ARRAY',
          metric: '1,851 Gold-Plated Spring Contact Pins',
          tag: 'MOTHERBOARD SOCKET',
          accent: '#F59E0B',
          calloutOffset: [-350, 95],
          draw: (g) => isoSlab(g, 210, 210, 14, { color: '#1E293B', topColor: '#B45309', rimColor: '#F59E0B' }),
        },
        {
          id: 'substrate',
          name: '12-LAYER ABF ORGANIC SUBSTRATE',
          metric: 'Sub-Micron Power & PCIe Signal Routing',
          tag: 'PACKAGE SUBSTRATE',
          accent: '#10B981',
          calloutOffset: [350, 75],
          draw: (g, t, flow) => {
            isoSlab(g, 190, 190, 10, { color: '#064E3B', topColor: '#047857', rimColor: '#34D399' });
            drawIsoTraces(g, [[[-75, -75], [75, 75]], [[-75, 75], [75, -75]], [[-80, 0], [80, 0]]], 11, t, { internalFlow: flow, pulseColor: '#34D399' });
          },
        },
        {
          id: 'chiplets',
          name: '3NM COMPUTE CHIPLETS + 3D V-CACHE',
          metric: '16 Performance Cores + 144MB L3 Cache',
          tag: 'SILICON DIE COMPLEX',
          accent: '#38BDF8',
          calloutOffset: [-360, -25],
          draw: (g, t, flow) => {
            // Central I/O Die + 2 CCD Compute Chiplets
            isoSlab(g, 82, 96, 12, { color: '#0284C7', topColor: '#0369A1', rimColor: '#38BDF8', glass: true });
            [-58, 58].forEach((cx) => {
              const [sx, sy] = isoPt(cx, 0, 0);
              g.save();
              g.translate(sx, sy);
              isoSlab(g, 38, 68, 14, { color: '#312E81', topColor: '#4338CA', rimColor: '#A855F7', glass: true });
              g.restore();
            });
            if (flow) glow(g, 0, -14, 75, '#38BDF8', 0.6);
          },
        },
        {
          id: 'stim',
          name: 'INDIUM SOLDER THERMAL INTERFACE (STIM)',
          metric: '86 W/m·K Die-to-IHS Heat Transfer',
          tag: 'THERMAL BOND LAYER',
          accent: '#F97316',
          calloutOffset: [360, -45],
          draw: (g, t, flow) => {
            isoSlab(g, 135, 110, 6, { color: '#D97706', topColor: flow ? '#F97316' : '#F59E0B', rimColor: '#FDE68A' });
          },
        },
        {
          id: 'ihs',
          name: 'NICKEL-PLATED COPPER HEAT SPREADER',
          metric: 'Precision-Lapped Thermal Contact Surface',
          tag: 'INTEGRATED HEAT SPREADER (IHS)',
          accent: '#CBD5E1',
          calloutOffset: [-350, -155],
          draw: (g) => {
            isoSlab(g, 175, 175, 16, { color: '#64748B', topColor: '#CBD5E1', rimColor: '#F8FAFC' });
            isoSlab(g, 138, 138, 22, { color: '#94A3B8', topColor: '#E2E8F0', rimColor: '#FFFFFF' });
            text(g, 'LUMINA PRO X', 0, -24, { size: 13, font: FONTS.mono, color: '#334155', weight: 700 });
          },
        },
      ];
    }

    // ==================== 6. JET ENGINE / TURBOFAN (5 STAGES) ====================
    if (dev === 'jetengine' || dev === 'turbofan') {
      return [
        {
          id: 'fan',
          name: 'WIDE-CHORD TITANIUM INTAKE FAN',
          metric: '10:1 High-Bypass Ratio · 2,400 RPM',
          tag: 'STAGE 1 · COLD BYPASS INTAKE',
          accent: '#38BDF8',
          calloutOffset: [-340, -150],
          draw: (g, t, flow) => {
            isoDisc(g, 0, 0, 0, 115, 68, 24, { color: '#334155', ringColor: '#38BDF8' });
            const spin = flow ? t * 12 : 0;
            for (let b = 0; b < 14; b++) {
              const ang = spin + (b / 14) * Math.PI * 2;
              seg(g, [[0, -12], [Math.cos(ang) * 98, -12 + Math.sin(ang) * 56]], 6, '#CBD5E1');
            }
            circle(g, 0, -12, 22, sphereGrad(g, 0, -12, 22, '#0F172A'));
          },
        },
        {
          id: 'compressor',
          name: '14-STAGE HIGH-PRESSURE COMPRESSOR',
          metric: '50:1 Overall Pressure Ratio',
          tag: 'STAGE 2 · AXIAL COMPRESSION',
          accent: '#60A5FA',
          calloutOffset: [340, -90],
          draw: (g) => {
            isoDisc(g, 0, 0, 0, 88, 52, 22, { color: '#475569', ringColor: '#93C5FD' });
            isoDisc(g, 0, 0, 18, 76, 45, 16, { color: '#64748B', ringColor: '#BAE6FD' });
          },
        },
        {
          id: 'combustor',
          name: 'TWIN-ANNULAR SWIRL COMBUSTOR',
          metric: '2,100°C Jet-A1 Fuel Ignition Ring',
          tag: 'STAGE 3 · COMBUSTION CHAMBER',
          accent: '#F97316',
          calloutOffset: [-350, 0],
          draw: (g, t, flow) => {
            isoDisc(g, 0, 0, 0, 82, 48, 26, { color: '#7C2D12', ringColor: '#F97316', holeR: 0.48, holeColor: '#431407' });
            if (flow) {
              glow(g, 0, -14, 115, '#F97316', 0.85);
              for (let f = 0; f < 8; f++) {
                const ang = t * 5 + (f / 8) * Math.PI * 2;
                circle(g, Math.cos(ang) * 56, -14 + Math.sin(ang) * 32, 9, '#FEF08A');
              }
            }
          },
        },
        {
          id: 'turbine',
          name: 'SINGLE-CRYSTAL NICKEL SUPERALLOY TURBINE',
          metric: 'Laser-Drilled Film-Cooled Airfoils',
          tag: 'STAGE 4 · ENERGY EXTRACTION',
          accent: '#F43F5E',
          calloutOffset: [350, 70],
          draw: (g) => {
            isoDisc(g, 0, 0, 0, 92, 54, 22, { color: '#881337', ringColor: '#FB7185' });
          },
        },
        {
          id: 'nozzle',
          name: 'CHEVRON ACOUSTIC EXHAUST NOZZLE',
          metric: '120,000 lbf Mach 1.8 Core Thrust',
          tag: 'STAGE 5 · PROPULSIVE EXHAUST',
          accent: '#A855F7',
          calloutOffset: [-340, 145],
          draw: (g, t, flow) => {
            isoDisc(g, 0, 0, 0, 74, 44, 32, { color: '#1E293B', ringColor: '#A855F7' });
            if (flow) glow(g, 0, 20, 95, '#38BDF8', 0.65);
          },
        },
      ];
    }

    // ==================== 7. EV / LITHIUM BATTERY PACK (5 LAYERS) ====================
    return [
      {
        id: 'tray',
        name: 'BALLISTIC TITANIUM-ALUMINUM SKID TRAY',
        metric: 'Underbody Impact & Thermal Runaway Shield',
        tag: 'STRUCTURAL FLOOR TRAY',
        accent: '#94A3B8',
        calloutOffset: [-360, 95],
        draw: (g) => isoSlab(g, 310, 185, 14, { color: '#334155', rimColor: '#94A3B8' }),
      },
      {
        id: 'cooling',
        name: 'MICRO-CHANNEL GLYCOL COOLING RIBBON',
        metric: 'Active Bi-Directional Thermal Regulation',
        tag: 'LIQUID COOLING LOOP',
        accent: '#38BDF8',
        calloutOffset: [360, 75],
        draw: (g, t, flow) => {
          isoSlab(g, 290, 165, 8, { color: '#0369A1', topColor: '#0284C7', rimColor: '#38BDF8' });
          drawIsoTraces(g, [[[-120, -55], [120, -55], [120, 0], [-120, 0], [-120, 55], [120, 55]]], 9, t, { internalFlow: flow, pulseColor: '#BAE6FD' });
        },
      },
      {
        id: 'cells',
        name: '4680 TABLESS SILICON-ANODE CELL ARRAY',
        metric: '300 Wh/kg Gravimetric Energy Density',
        tag: 'ELECTROCHEMICAL CORE',
        accent: '#38C878',
        calloutOffset: [-360, -25],
        draw: (g, t, flow) => {
          for (let ix = -105; ix <= 105; ix += 42) {
            for (let iy = -52; iy <= 52; iy += 34) {
              isoDisc(g, ix, iy, 0, 15, 9, 26, { color: '#059669', ringColor: '#6EE7B7' });
            }
          }
          if (flow) glow(g, 0, -18, 95, '#38C878', 0.45);
        },
      },
      {
        id: 'busbar',
        name: '800V LASER-WELDED COPPER BUSBARS',
        metric: '350kW Ultra-Fast DC Peak Current Path',
        tag: 'HIGH-VOLTAGE INTERCONNECT',
        accent: '#F59E0B',
        calloutOffset: [360, -50],
        draw: (g) => isoSlab(g, 285, 160, 6, { color: '#B45309', topColor: '#F59E0B', rimColor: '#FDE68A' }),
      },
      {
        id: 'bms',
        name: 'AI BATTERY MANAGEMENT SYSTEM (BMS)',
        metric: 'Real-Time Cell Balancing & Pyro-Fuse',
        tag: 'TOP FIREPROOF COVER & BMS',
        accent: '#A855F7',
        calloutOffset: [-360, -155],
        draw: (g) => isoSlab(g, 310, 185, 10, { color: '#1E293B', topColor: '#0F172A', rimColor: '#A855F7' }),
      },
    ];
  }

  // ---------- 4. Universal Exploded Assembly & Hardware Teardown Renderer ----------
  function explodedAssembly(g, t = 0, o = {}) {
    const x = o.x !== undefined ? o.x : E.W * 0.5;
    const y = o.y !== undefined ? o.y : E.H * 0.56;
    const s = o.s !== undefined ? o.s : 1.0;
    const explode = clamp(o.explode !== undefined ? o.explode : 0.85, 0, 1.5);
    const spacing = (o.spacing !== undefined ? o.spacing : 92) * explode;
    const axis = o.axis || 'y'; // 'y' (vertical stack) | 'x' (horizontal axial)
    const layers = Array.isArray(o.layers) ? o.layers : [];
    const focusLayer = o.focusLayer !== undefined && o.focusLayer !== null ? o.focusLayer : null;
    const internalFlow = o.internalFlow !== false;
    const showGuidelines = o.guidelines !== false && explode > 0.08;
    const showCallouts = o.showCallouts !== false && explode > 0.25;

    if (!layers.length) return;

    const midIdx = (layers.length - 1) * 0.5;
    const layerCoords = [];

    g.save();

    // 1. Optional Central Dashed Isometric Alignment Axis Spine
    if (showGuidelines) {
      const p0 = axis === 'x' ? [x - midIdx * spacing * s, y] : [x, y + midIdx * spacing * s];
      const p1 = axis === 'x' ? [x + midIdx * spacing * s, y] : [x, y - midIdx * spacing * s];
      g.save();
      g.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      g.lineWidth = 2;
      g.setLineDash([8, 8]);
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.stroke();
      g.restore();
    }

    // 2. Render Layers Bottom-to-Top with Spotlight Isolation Support
    layers.forEach((lyr, idx) => {
      const offset = (idx - midIdx) * spacing * s;
      const lx = axis === 'x' ? x + offset : x;
      const ly = axis === 'x' ? y : y - offset;
      layerCoords.push({ lx, ly, lyr, idx });

      const isFocused =
        focusLayer === null ||
        focusLayer === idx ||
        focusLayer === lyr.id ||
        focusLayer === lyr.name;

      const layerAlpha = focusLayer === null ? 1.0 : isFocused ? 1.0 : 0.18;
      const layerScale = focusLayer !== null && isFocused ? s * 1.08 : s;

      g.save();
      g.globalAlpha *= layerAlpha;
      g.translate(lx, ly);
      g.scale(layerScale, layerScale);

      if (focusLayer !== null && isFocused) {
        glow(g, 0, -10, 145, lyr.accent || '#38BDF8', 0.45);
      }

      if (typeof lyr.draw === 'function') {
        lyr.draw(g, t, internalFlow && isFocused, idx);
      } else {
        isoSlab(g, lyr.w || 220, lyr.d || 140, lyr.h || 14, lyr);
      }

      g.restore();
    });

    // 3. Render Orthogonal Leader-Line Callouts
    if (showCallouts) {
      layerCoords.forEach(({ lx, ly, lyr, idx }) => {
        const isFocused =
          focusLayer === null ||
          focusLayer === idx ||
          focusLayer === lyr.id ||
          focusLayer === lyr.name;

        if (focusLayer !== null && !isFocused) return;
        if (lyr.hideCallout) return;

        const [ox, oy] = lyr.calloutOffset || [idx % 2 === 0 ? -350 : 350, 0];
        techCallout(g, t, {
          t0: (o.calloutStart || 0.15) + idx * 0.08,
          target: [lx, ly - 10 * s],
          x: lx + ox * s,
          y: ly + oy * s,
          title: lyr.name,
          metric: lyr.metric,
          subText: lyr.tag,
          accent: lyr.accent || '#38BDF8',
        });
      });
    }

    g.restore();
  }

  function hardwareTeardown(g, t = 0, o = {}) {
    const layers = o.layers || getDeviceLayers(o.device || 'smartphone', o);
    explodedAssembly(g, t, Object.assign({}, o, { layers }));
  }

  // ---------- 5. Old-vs-New Generation Upgrade Diff Card (UI.upgradeDiff) ----------
  function upgradeDiff(g, t = 0, o = {}) {
    const t0 = o.t0 !== undefined ? o.t0 : 0.1;
    const u = ease.outBack(clamp((t - t0) / 0.5, 0, 1));
    if (u <= 0.001) return;

    const x = o.x !== undefined ? o.x : E.W * 0.5;
    const y = o.y !== undefined ? o.y : E.H * 0.5;
    const w = o.w || 860;
    const h = o.h || 340;
    const title = String(o.title || 'ARCHITECTURE UPGRADE');
    const oldLabel = String(o.oldLabel || 'PREVIOUS GEN');
    const newLabel = String(o.newLabel || 'NEXT-GEN PRO');
    const oldVal = String(o.oldVal || '5nm · 120 GB/s');
    const newVal = String(o.newVal || '3nm · 273 GB/s');
    const delta = String(o.delta || '+127% BANDWIDTH');
    const oldBar = clamp(o.oldBar !== undefined ? o.oldBar : 0.44, 0.05, 1);
    const newBar = clamp(o.newBar !== undefined ? o.newBar : 0.94, 0.05, 1);
    const accent = o.accent || '#38C878';

    g.save();
    g.translate(x, y);
    g.scale(u, u);

    // Main Glassmorphic Comparison Panel
    rr(g, -w / 2, -h / 2, w, h, 22);
    g.fillStyle = 'rgba(12, 18, 34, 0.94)';
    g.fill();
    g.strokeStyle = alpha(accent, 0.65);
    g.lineWidth = 3;
    g.stroke();

    // Header Title + Glowing Delta Pill Badge
    text(g, title, -w * 0.44, -h * 0.34, {
      size: 26,
      font: FONTS.ui,
      weight: 900,
      color: '#F8FAFC',
      align: 'left',
      spacing: 1.5,
    });

    const dW = measure(g, delta, 22, FONTS.mono, 700) + 42;
    rr(g, w * 0.44 - dW, -h * 0.34 - 22, dW, 44, 22);
    g.fillStyle = alpha(accent, 0.18);
    g.fill();
    g.strokeStyle = accent;
    g.lineWidth = 2.2;
    g.stroke();
    text(g, delta, w * 0.44 - dW * 0.5, -h * 0.34 + 1, {
      size: 21,
      font: FONTS.mono,
      weight: 700,
      color: accent,
    });

    // Row 1: Previous Generation (Muted Slate)
    const r1Y = -18;
    text(g, oldLabel, -w * 0.44, r1Y - 22, { size: 18, font: FONTS.ui, weight: 800, color: '#94A3B8', align: 'left' });
    text(g, oldVal, w * 0.44, r1Y - 22, { size: 22, font: FONTS.mono, weight: 700, color: '#CBD5E1', align: 'right' });
    rr(g, -w * 0.44, r1Y, w * 0.88, 22, 11);
    g.fillStyle = 'rgba(148, 163, 184, 0.15)';
    g.fill();
    const barU = ease.out(clamp((t - t0 - 0.15) / 0.65, 0, 1));
    rr(g, -w * 0.44, r1Y, w * 0.88 * oldBar * barU, 22, 11);
    g.fillStyle = '#64748B';
    g.fill();

    // Row 2: New Generation (Glowing Accent Gradient)
    const r2Y = 88;
    text(g, newLabel, -w * 0.44, r2Y - 22, { size: 20, font: FONTS.ui, weight: 900, color: '#FFFFFF', align: 'left' });
    text(g, newVal, w * 0.44, r2Y - 22, { size: 26, font: FONTS.mono, weight: 700, color: accent, align: 'right' });
    rr(g, -w * 0.44, r2Y, w * 0.88, 26, 13);
    g.fillStyle = 'rgba(148, 163, 184, 0.15)';
    g.fill();
    const newW = w * 0.88 * newBar * barU;
    rr(g, -w * 0.44, r2Y, newW, 26, 13);
    g.fillStyle = linGrad(g, -w * 0.44, r2Y, -w * 0.44 + newW, r2Y, [shade(accent, -0.15), accent, shade(accent, 0.25)]);
    g.fill();
    glow(g, -w * 0.44 + newW, r2Y + 13, 38, accent, 0.65);

    g.restore();
  }

  // ---------- 6. Export to Global Namespaces ----------
  const TEARDOWN = (window.TEARDOWN = {
    isoPt,
    isoSlab,
    isoDisc,
    drawIsoTraces,
    getDeviceLayers,
    explodedAssembly,
    hardwareTeardown,
    techCallout,
    upgradeDiff,
  });

  UI.hardwareTeardown = DK.hardwareTeardown = H.hardwareTeardown = hardwareTeardown;
  UI.explodedAssembly = DK.explodedAssembly = H.explodedAssembly = explodedAssembly;
  UI.techCallout = DK.techCallout = H.techCallout = techCallout;
  UI.upgradeDiff = DK.upgradeDiff = H.upgradeDiff = upgradeDiff;
})();