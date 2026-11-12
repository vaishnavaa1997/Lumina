// ============================================================================
// MODULE 7: LUMINA_ENVS (engine/lumina_envs.js) — "The Infographics Show" &
// Kurzgesagt-Grade High-Density 5-Plane Storybook & Modern Environments
// (15 Multi-Prop Interior/Exterior Presets + 32 Modular 3D-Shaded Props +
// Cause-and-Effect Interactive Target Extensions).
// Soft-Volumetric 3D Gradients, Zero Black Outlines. Deterministic fn(t).
// Requires MODULE 1 (window.DK / window.FX).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const FX = (window.FX = window.FX || DK.fx || {});
  const E = (window.E = DK.E || { W: 1920, H: 1080 });

  const {
    clamp,
    lerp,
    ease,
    rng,
    noise,
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
    backdrop,
    text,
    fivePlane,
    FONTS,
  } = DK;

  // ---------- 1. Modular 3D-Shaded Situational Prop Library (FX.prop3D) ----------
  function prop3D(g, x = 960, y = 840, s = 1, o = {}) {
    const kind = o.kind || 'labBench';
    const t = o.t !== undefined ? o.t : 0;
    const seed = o.seed || 17;
    const col = o.color || null;

    g.save();
    g.translate(x, y);
    if (o.flipX) g.scale(-1, 1);
    g.scale(s, s);

    if (o.shadow !== false) {
      contactShadow(g, 0, 4, (o.shadowW || 95), 11, 0.28);
    }

    switch (kind) {
      // ==================== SCIENCE & MEDICAL PROPS ====================
      case 'labBench': {
        const w = o.w || 280;
        const h = o.h || 115;
        // Brushed steel legs
        rr(g, -w * 0.44, -h, 16, h, 4);
        rr(g, w * 0.44 - 16, -h, 16, h, 4);
        g.fillStyle = cylinderGrad(g, -w * 0.44, -h, w * 0.44, 0, '#64748B', -1);
        g.fill();
        // Cabinet body with soft 3D bevel
        rr(g, -w * 0.42, -h + 18, w * 0.84, h - 28, 8);
        g.fillStyle = cylinderGrad(g, -w * 0.42, -h, w * 0.42, 0, col || '#DCE6F2', -1);
        g.fill();
        // Drawer seams & handles (tonal shading, zero black outlines)
        [-w * 0.21, w * 0.21].forEach((dx) => {
          rr(g, dx - w * 0.18, -h + 28, w * 0.36, 32, 5);
          g.fillStyle = '#C8D6E8';
          g.fill();
          rr(g, dx - 18, -h + 41, 36, 6, 3);
          g.fillStyle = '#64748B';
          g.fill();
        });
        // Epoxy resin chemical-resistant top slab
        rr(g, -w * 0.5, -h - 14, w, 18, 6);
        g.fillStyle = linGrad(g, -w * 0.5, -h - 14, w * 0.5, -h + 4, ['#334155', '#1E293B', '#0F172A']);
        g.fill();
        break;
      }

      case 'microscope': {
        // Heavy base
        rr(g, -32, -14, 64, 14, 6);
        g.fillStyle = cylinderGrad(g, -32, -14, 32, 0, '#334155', -1);
        g.fill();
        // Curved C-arm
        g.strokeStyle = '#CBD5E1';
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(-6, -48, 32, Math.PI * 0.5, Math.PI * 1.45, false);
        g.stroke();
        // Stage & slide
        rr(g, -22, -46, 44, 7, 3);
        g.fillStyle = '#1E293B';
        g.fill();
        glow(g, 0, -40, 18, '#38BDF8', 0.65);
        // Eyepiece tube
        g.save();
        g.translate(4, -78);
        g.rotate(-0.35);
        rr(g, -8, -28, 16, 36, 4);
        g.fillStyle = cylinderGrad(g, -8, -28, 8, 8, '#94A3B8', -1);
        g.fill();
        rr(g, -10, -34, 20, 8, 3);
        g.fillStyle = '#1E293B';
        g.fill();
        g.restore();
        break;
      }

      case 'centrifuge': {
        rr(g, -46, -68, 92, 68, 14);
        g.fillStyle = cylinderGrad(g, -46, -68, 46, 0, '#E2E8F0', -1);
        g.fill();
        // Dome lid
        ellipse(g, 0, -68, 42, 14, sphereGrad(g, 0, -68, 42, '#38BDF8'));
        // Digital readout panel
        rr(g, -28, -42, 56, 22, 5);
        g.fillStyle = '#0F172A';
        g.fill();
        const rpm = 4000 + Math.round(Math.sin(t * 6) * 150);
        text(g, rpm + ' RPM', 0, -31, { size: 11, font: FONTS.mono, color: '#38C878', weight: 700 });
        break;
      }

      case 'fumeHood': {
        const w = o.w || 260;
        const h = o.h || 340;
        // Main enclosure
        rr(g, -w / 2, -h, w, h, 10);
        g.fillStyle = cylinderGrad(g, -w / 2, -h, w / 2, 0, '#CBD5E1', -1);
        g.fill();
        // Interior chamber with glowing UV/cyan work light
        rr(g, -w * 0.44, -h + 36, w * 0.88, h * 0.52, 6);
        g.fillStyle = linGrad(g, 0, -h + 36, 0, -h * 0.4, ['#1E293B', '#0F172A']);
        g.fill();
        glow(g, 0, -h + 65, 130, '#38BDF8', 0.45);
        // Bubbling flasks inside hood
        [-55, 0, 55].forEach((fx, i) => {
          const fy = -h * 0.44;
          const liqCol = i === 0 ? '#38C878' : i === 1 ? '#F43F5E' : '#38BDF8';
          poly(g, [[fx - 8, fy - 38], [fx + 8, fy - 38], [fx + 22, fy], [fx - 22, fy]], 'rgba(220,242,255,0.35)');
          poly(g, [[fx - 16, fy - 18], [fx + 16, fy - 18], [fx + 21, fy - 2], [fx - 21, fy - 2]], liqCol);
          glow(g, fx, fy - 12, 26, liqCol, 0.55);
          for (let b = 0; b < 3; b++) {
            const by = fy - 14 - ((t * 28 + b * 11 + i * 7) % 28);
            circle(g, fx + Math.sin(t * 5 + b) * 6, by, 3.5, shade(liqCol, 0.35));
          }
        });
        // Sliding tempered glass sash
        const sashH = h * 0.36;
        rr(g, -w * 0.45, -h + 34, w * 0.9, sashH, 4);
        g.fillStyle = 'rgba(186, 230, 253, 0.22)';
        g.fill();
        rr(g, -w * 0.45, -h + 34 + sashH - 8, w * 0.9, 8, 3);
        g.fillStyle = '#F59E0B';
        g.fill();
        break;
      }

      case 'dnaHelix': {
        const h = o.h || 240;
        const turns = 14;
        for (let i = 0; i <= turns; i++) {
          const u = i / turns;
          const py = -h * u;
          const ph = t * 2.4 + u * Math.PI * 3.2;
          const x1 = Math.sin(ph) * 38;
          const x2 = Math.sin(ph + Math.PI) * 38;
          const zOrder = Math.cos(ph);
          seg(g, [[x1, py], [x2, py]], 3.5, i % 2 === 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(244, 63, 94, 0.55)');
          const r1 = zOrder > 0 ? 7.5 : 5.5;
          const r2 = zOrder <= 0 ? 7.5 : 5.5;
          circle(g, x1, py, r1, sphereGrad(g, x1, py, r1, '#38BDF8'));
          circle(g, x2, py, r2, sphereGrad(g, x2, py, r2, '#F43F5E'));
        }
        break;
      }

      case 'hospitalBed': {
        const w = 310;
        // Rolling casters & frame
        [-w * 0.38, w * 0.38].forEach((lx) => {
          rr(g, lx - 8, -75, 16, 65, 4);
          g.fillStyle = '#94A3B8';
          g.fill();
          circle(g, lx, -8, 10, '#334155');
          circle(g, lx, -8, 5, '#CBD5E1');
        });
        // Bed base
        rr(g, -w * 0.46, -82, w * 0.92, 18, 6);
        g.fillStyle = cylinderGrad(g, -w * 0.46, -82, w * 0.46, -64, '#CBD5E1', -1);
        g.fill();
        // Inclined head mattress & flat mattress
        poly(g, [[-w * 0.44, -82], [-w * 0.12, -82], [-w * 0.22, -138], [-w * 0.46, -132]], sphereGrad(g, -w * 0.3, -110, 65, '#F8FAFC'));
        rr(g, -w * 0.44, -106, w * 0.88, 26, 12);
        g.fillStyle = cylinderGrad(g, -w * 0.44, -106, w * 0.44, -80, '#F1F5F9', -1);
        g.fill();
        // Medical blue blanket sheet
        rr(g, -w * 0.1, -108, w * 0.54, 28, 10);
        g.fillStyle = cylinderGrad(g, -w * 0.1, -108, w * 0.44, -80, '#38BDF8', -1);
        g.fill();
        // Soft pillow
        ellipse(g, -w * 0.32, -122, 28, 14, sphereGrad(g, -w * 0.32, -122, 28, '#FFFFFF'), 0.35);
        // Side guard rails
        rr(g, -w * 0.25, -124, w * 0.52, 8, 4);
        g.fillStyle = '#E2E8F0';
        g.fill();
        break;
      }

      case 'icuMonitor': {
        // Rolling stand pole
        rr(g, -6, -185, 12, 185, 4);
        g.fillStyle = cylinderGrad(g, -6, -185, 6, 0, '#94A3B8', -1);
        g.fill();
        rr(g, -36, -10, 72, 10, 5);
        g.fillStyle = '#475569';
        g.fill();
        // Monitor bezel
        rr(g, -78, -265, 156, 108, 14);
        g.fillStyle = cylinderGrad(g, -78, -265, 78, -157, '#1E293B', -1);
        g.fill();
        rr(g, -68, -255, 136, 88, 8);
        g.fillStyle = '#090D16';
        g.fill();
        // Live animated ECG & SpO2 waveforms
        const ptsEcg = [];
        for (let i = 0; i <= 28; i++) {
          const u = i / 28;
          const px = lerp(-62, 32, u);
          const phase = (u * 3 - t * 1.8) % 1;
          const spike = phase > 0.45 && phase < 0.55 ? Math.sin((phase - 0.45) * 10 * Math.PI) * -22 : Math.sin(u * 12 + t * 4) * 2;
          ptsEcg.push([px, -225 + spike]);
        }
        seg(g, ptsEcg, 2.5, '#38C878');
        text(g, '98', 48, -232, { size: 20, font: FONTS.mono, color: '#38C878', weight: 700 });
        text(g, '120/80', 44, -192, { size: 13, font: FONTS.mono, color: '#38BDF8', weight: 700 });
        glow(g, 0, -210, 85, '#38C878', 0.22);
        break;
      }

      case 'ivDrip': {
        seg(g, [[0, 0], [0, -245]], 7, '#CBD5E1');
        seg(g, [[-24, -245], [24, -245]], 5, '#CBD5E1');
        rr(g, -28, -8, 56, 8, 4);
        g.fillStyle = '#64748B';
        g.fill();
        // Saline bag
        rr(g, -28, -238, 24, 42, 8);
        g.fillStyle = 'rgba(186, 230, 253, 0.65)';
        g.fill();
        rr(g, -26, -222, 20, 24, 6);
        g.fillStyle = 'rgba(56, 189, 248, 0.55)';
        g.fill();
        break;
      }

      // ==================== TECH, STUDIO & CORPORATE PROPS ====================
      case 'serverRack': {
        const w = o.w || 135;
        const h = o.h || 310;
        rr(g, -w / 2, -h, w, h, 10);
        g.fillStyle = cylinderGrad(g, -w / 2, -h, w / 2, 0, '#1E293B', -1);
        g.fill();
        rr(g, -w * 0.44, -h + 14, w * 0.88, h - 28, 6);
        g.fillStyle = '#0F172A';
        g.fill();
        const r = rng(seed);
        for (let row = 0; row < 8; row++) {
          const ry = -h + 26 + row * 33;
          rr(g, -w * 0.4, ry, w * 0.8, 26, 4);
          g.fillStyle = '#1E293B';
          g.fill();
          for (let led = 0; led < 5; led++) {
            const lx = -w * 0.32 + led * 14;
            const on = Math.sin(t * (5 + led * 2) + row * 1.7 + r() * 6) > -0.2;
            const lCol = led === 4 && o.alert ? '#F43F5E' : led % 2 === 0 ? '#38C878' : '#38BDF8';
            if (on) {
              glow(g, lx, ry + 13, 10, lCol, 0.65);
              circle(g, lx, ry + 13, 3, lCol);
            } else {
              circle(g, lx, ry + 13, 3, '#334155');
            }
          }
        }
        break;
      }

      case 'multiMonitorDesk': {
        const w = o.w || 320;
        const h = 110;
        // Ergonomic desk legs
        rr(g, -w * 0.44, -h, 14, h, 4);
        rr(g, w * 0.44 - 14, -h, 14, h, 4);
        g.fillStyle = '#334155';
        g.fill();
        // Walnut desktop slab
        rr(g, -w * 0.5, -h - 14, w, 16, 6);
        g.fillStyle = cylinderGrad(g, -w * 0.5, -h - 14, w * 0.5, -h, '#8C5832', -1);
        g.fill();
        // Triple curved monitors
        [-95, 0, 95].forEach((mx, idx) => {
          const mw = idx === 1 ? 96 : 82;
          const mh = 58;
          const my = -h - 82;
          seg(g, [[mx, -h - 14], [mx, my + mh]], 7, '#475569');
          rr(g, mx - mw / 2, my, mw, mh, 6);
          g.fillStyle = '#0F172A';
          g.fill();
          rr(g, mx - mw / 2 + 4, my + 4, mw - 8, mh - 8, 4);
          g.fillStyle = linGrad(g, mx - mw / 2, my, mx + mw / 2, my + mh, ['#0F2942', '#1E3A8A']);
          g.fill();
          // Code / telemetry bars on screen
          for (let l = 0; l < 4; l++) {
            rr(g, mx - mw * 0.36, my + 12 + l * 10, (mw * 0.45) + ((l * 17) % 24), 5, 2);
            g.fillStyle = l === 0 ? '#38BDF8' : l === 1 ? '#F59E0B' : '#38C878';
            g.fill();
          }
          glow(g, mx, my + mh / 2, 65, '#38BDF8', 0.25);
        });
        break;
      }

      case 'ringLight': {
        // Tripod stand
        seg(g, [[0, -45], [-34, 0]], 7, '#1E293B');
        seg(g, [[0, -45], [34, 0]], 7, '#1E293B');
        seg(g, [[0, 0], [0, -210]], 8, '#334155');
        // Glowing LED ring
        glow(g, 0, -250, 95, '#FFF8E7', 0.65);
        ring(g, 0, -250, 44, 12, '#FFFFFF');
        ring(g, 0, -250, 44, 6, '#FFE4B5');
        // Camera mounted in center of ring
        rr(g, -16, -260, 32, 22, 5);
        g.fillStyle = '#0F172A';
        g.fill();
        circle(g, 0, -249, 8, '#38BDF8');
        break;
      }

      case 'boardroomTable': {
        const w = o.w || 480;
        const h = 108;
        // Dual pedestal bases
        [-w * 0.28, w * 0.28].forEach((px) => {
          poly(g, [[px - 28, 0], [px + 28, 0], [px + 16, -h], [px - 16, -h]], cylinderGrad(g, px - 28, -h, px + 28, 0, '#334155', -1));
        });
        // Sleek boat-shaped mahogany/walnut tabletop
        rr(g, -w / 2, -h - 20, w, 24, 12);
        g.fillStyle = cylinderGrad(g, -w / 2, -h - 20, w / 2, -h, '#6E3F24', -1);
        g.fill();
        // Specular tabletop reflection strip
        rr(g, -w * 0.44, -h - 16, w * 0.88, 6, 3);
        g.fillStyle = 'rgba(255, 255, 255, 0.16)';
        g.fill();
        break;
      }

      case 'stockTickerWall': {
        const w = o.w || 520;
        const h = o.h || 240;
        rr(g, -w / 2, -h, w, h, 14);
        g.fillStyle = '#090D16';
        g.fill();
        rr(g, -w / 2 + 8, -h + 8, w - 16, h - 16, 10);
        g.fillStyle = linGrad(g, 0, -h, 0, 0, ['#0F172A', '#1E293B']);
        g.fill();
        // Animated market trend line
        const isBull = o.trend !== 'crash';
        const lineCol = isBull ? '#38C878' : '#F43F5E';
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const u = i / 16;
          const px = lerp(-w * 0.42, w * 0.42, u);
          const slope = isBull ? -u * (h * 0.48) : u * (h * 0.48);
          const base = isBull ? -h * 0.25 : -h * 0.72;
          const py = base + slope + Math.sin(u * 9 + t * 2) * 14;
          pts.push([px, py]);
        }
        seg(g, pts, 5, lineCol);
        glow(g, pts[pts.length - 1][0], pts[pts.length - 1][1], 36, lineCol, 0.75);
        circle(g, pts[pts.length - 1][0], pts[pts.length - 1][1], 7, '#FFFFFF');
        break;
      }

      // ==================== BEDROOM & HOME PROPS ====================
      case 'modernBed': {
        const w = 320;
        // Upholstered headboard
        rr(g, -w * 0.48, -195, 34, 195, 12);
        g.fillStyle = cylinderGrad(g, -w * 0.48, -195, -w * 0.48 + 34, 0, '#475569', -1);
        g.fill();
        // Wooden bed frame
        rr(g, -w * 0.46, -58, w * 0.94, 42, 8);
        g.fillStyle = cylinderGrad(g, -w * 0.46, -58, w * 0.48, -16, '#8C5832', -1);
        g.fill();
        seg(g, [[-w * 0.42, -16], [-w * 0.42, 0]], 12, '#5C381E');
        seg(g, [[w * 0.42, -16], [w * 0.42, 0]], 12, '#5C381E');
        // Plush mattress & quilted duvet
        rr(g, -w * 0.4, -104, w * 0.86, 50, 18);
        g.fillStyle = cylinderGrad(g, -w * 0.4, -104, w * 0.46, -54, '#F8FAFC', -1);
        g.fill();
        rr(g, -w * 0.16, -108, w * 0.64, 54, 20);
        g.fillStyle = cylinderGrad(g, -w * 0.16, -108, w * 0.48, -54, col || '#3B82F6', -1);
        g.fill();
        // Pillows
        ellipse(g, -w * 0.28, -116, 36, 18, sphereGrad(g, -w * 0.28, -116, 36, '#FFFFFF'), 0.18);
        ellipse(g, -w * 0.20, -114, 34, 17, sphereGrad(g, -w * 0.20, -114, 34, '#E2E8F0'), 0.22);
        break;
      }

      case 'bookshelf': {
        const w = o.w || 160;
        const h = o.h || 320;
        rr(g, -w / 2, -h, w, h, 8);
        g.fillStyle = cylinderGrad(g, -w / 2, -h, w / 2, 0, '#6E472B', -1);
        g.fill();
        rr(g, -w * 0.43, -h + 14, w * 0.86, h - 28, 4);
        g.fillStyle = '#3E2718';
        g.fill();
        const bookCols = ['#E53935', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];
        for (let sIdx = 0; sIdx < 4; sIdx++) {
          const sy = -h + 78 + sIdx * 62;
          g.fillStyle = '#8C5C38';
          g.fillRect(-w * 0.45, sy, w * 0.9, 10);
          let bx = -w * 0.38;
          for (let b = 0; b < 6; b++) {
            const bw = 12 + ((b * 7 + sIdx * 3) % 8);
            const bh = 36 + ((b * 11 + sIdx * 5) % 14);
            rr(g, bx, sy - bh, bw, bh, 2);
            g.fillStyle = cylinderGrad(g, bx, sy - bh, bx + bw, sy, bookCols[(b + sIdx) % bookCols.length], -1);
            g.fill();
            bx += bw + 3;
          }
        }
        break;
      }

      // ==================== MILITARY, BUNKER, PRISON & COURT PROPS ====================
      case 'warTableMap': {
        const w = 380;
        const h = 112;
        poly(g, [[-w * 0.38, 0], [w * 0.38, 0], [w * 0.48, -h], [-w * 0.48, -h]], cylinderGrad(g, -w * 0.48, -h, w * 0.48, 0, '#1E293B', -1));
        ellipse(g, 0, -h, w * 0.52, 34, '#0F172A');
        ellipse(g, 0, -h, w * 0.46, 28, '#09192B');
        // Glowing cyan holographic projection cone & terrain grid
        glow(g, 0, -h - 45, 190, '#00F2FE', 0.42);
        for (let rIdx = 1; rIdx <= 3; rIdx++) {
          g.strokeStyle = alpha('#38BDF8', 0.45);
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(0, -h - rIdx * 12, w * 0.12 * rIdx, 8 * rIdx, 0, 0, Math.PI * 2);
          g.stroke();
        }
        // Tactical target markers floating above table
        [-65, 15, 75].forEach((tx, idx) => {
          const ty = -h - 28 - Math.sin(t * 3 + idx) * 6;
          const tCol = idx === 1 ? '#F43F5E' : '#38BDF8';
          glow(g, tx, ty, 22, tCol, 0.8);
          poly(g, [[tx, ty + 10], [tx - 8, ty - 6], [tx + 8, ty - 6]], tCol);
        });
        break;
      }

      case 'defconBoard': {
        const w = 280;
        const h = 150;
        rr(g, -w / 2, -h, w, h, 10);
        g.fillStyle = '#0F172A';
        g.fill();
        const defCols = ['#F43F5E', '#F97316', '#FACC15', '#38C878', '#38BDF8'];
        const activeLvl = o.level || 2;
        for (let i = 0; i < 5; i++) {
          const lx = -w * 0.36 + i * (w * 0.18);
          const isAct = (i + 1) === activeLvl;
          rr(g, lx - 22, -h + 24, 44, 42, 6);
          g.fillStyle = isAct ? defCols[i] : alpha(defCols[i], 0.18);
          g.fill();
          if (isAct) glow(g, lx, -h + 45, 38, defCols[i], 0.75);
          text(g, String(i + 1), lx, -h + 46, { size: 24, font: FONTS.mono, color: isAct ? '#090D16' : '#64748B', weight: 700 });
        }
        text(g, 'STRATEGIC DEFENSE COMMAND', 0, -28, { size: 15, font: FONTS.mono, color: '#94A3B8', weight: 700, spacing: 1.5 });
        break;
      }

      case 'prisonBars': {
        const w = o.w || 420;
        const h = o.h || 520;
        // Top & bottom heavy steel crossbeams
        rr(g, -w / 2, -h, w, 22, 4);
        rr(g, -w / 2, -h * 0.48, w, 16, 4);
        rr(g, -w / 2, -18, w, 18, 4);
        g.fillStyle = cylinderGrad(g, -w / 2, -h, w / 2, 0, '#475569', -1);
        g.fill();
        // Vertical cylindrical steel bars
        const count = Math.floor(w / 46);
        for (let i = 0; i <= count; i++) {
          const bx = lerp(-w * 0.46, w * 0.46, i / count);
          rr(g, bx - 6, -h, 12, h, 5);
          g.fillStyle = cylinderGrad(g, bx - 6, -h, bx + 6, -h, '#64748B', -1);
          g.fill();
        }
        break;
      }

      case 'judgeBench': {
        const w = 360;
        const h = 195;
        // Stepped mahogany podium tiers
        rr(g, -w * 0.52, -32, w * 1.04, 32, 6);
        g.fillStyle = cylinderGrad(g, -w * 0.52, -32, w * 0.52, 0, '#4A2511', -1);
        g.fill();
        rr(g, -w * 0.48, -h, w * 0.96, h - 28, 10);
        g.fillStyle = cylinderGrad(g, -w * 0.48, -h, w * 0.48, -28, '#6E3B1E', -1);
        g.fill();
        // Recessed wood paneling
        [-w * 0.28, 0, w * 0.28].forEach((px) => {
          rr(g, px - 42, -h + 28, 84, h - 78, 6);
          g.fillStyle = '#522B15';
          g.fill();
        });
        // Top cornice & golden judicial seal emblem
        rr(g, -w * 0.52, -h - 18, w * 1.04, 22, 6);
        g.fillStyle = cylinderGrad(g, -w * 0.52, -h - 18, w * 0.52, -h, '#8A4B29', -1);
        g.fill();
        circle(g, 0, -h * 0.56, 32, sphereGrad(g, 0, -h * 0.56, 32, '#F5B942'));
        ring(g, 0, -h * 0.56, 26, 2.5, '#FFF3B0');
        break;
      }

      case 'witnessStand': {
        const w = 155;
        const h = 135;
        rr(g, -w / 2, -h, w, h, 8);
        g.fillStyle = cylinderGrad(g, -w / 2, -h, w / 2, 0, '#7C4424', -1);
        g.fill();
        rr(g, -w * 0.55, -h - 14, w * 1.1, 16, 5);
        g.fillStyle = '#5C3018';
        g.fill();
        // Gooseneck microphone
        seg(g, [[28, -h - 14], [38, -h - 46], [18, -h - 56]], 4, '#334155');
        ellipse(g, 14, -h - 58, 8, 6, '#0F172A', -0.3);
        break;
      }

      // ==================== MILITARY BASE & SPACE LAUNCH PROPS ====================
      case 'radarDish': {
        // Steel lattice tower base
        poly(g, [[-48, 0], [48, 0], [22, -165], [-22, -165]], cylinderGrad(g, -48, -165, 48, 0, '#64748B', -1));
        seg(g, [[-38, -35], [28, -110]], 5, '#475569');
        seg(g, [[38, -35], [-28, -110]], 5, '#475569');
        // Rotating parabolic dish
        const pan = Math.sin(t * 1.4 + seed) * 0.35;
        g.save();
        g.translate(0, -185);
        g.rotate(-0.35 + pan * 0.25);
        ellipse(g, 0, 0, 28, 72, sphereGrad(g, -10, -15, 72, '#E2E8F0'));
        seg(g, [[0, 0], [48, 0]], 5, '#94A3B8');
        circle(g, 50, 0, 8, '#F43F5E');
        glow(g, 50, 0, 26, '#F43F5E', 0.75);
        g.restore();
        break;
      }

      case 'armoredHumvee': {
        const w = 260;
        // Chassis & armored sloped hood
        poly(
          g,
          [
            [-w * 0.48, -34],
            [-w * 0.48, -96],
            [-w * 0.18, -96],
            [-w * 0.04, -138],
            [w * 0.38, -138],
            [w * 0.48, -88],
            [w * 0.48, -34],
          ],
          cylinderGrad(g, -w * 0.48, -138, w * 0.48, -34, col || '#5C6B4E', -1)
        );
        // Ballistic windshield & side windows
        poly(g, [[-w * 0.14, -96], [-w * 0.02, -128], [w * 0.12, -128], [w * 0.12, -96]], '#1E293B');
        rr(g, w * 0.16, -128, 42, 32, 4);
        g.fillStyle = '#1E293B';
        g.fill();
        // Heavy off-road tires
        [-w * 0.3, w * 0.3].forEach((wx) => {
          circle(g, wx, -32, 34, '#1E2024');
          circle(g, wx, -32, 18, '#4A5562');
          circle(g, wx, -32, 7, '#1E2024');
        });
        break;
      }

      case 'orbitalRocket': {
        const w = o.w || 86;
        const h = o.h || 540;
        const liftY = o.liftOff ? -Math.pow(clamp(o.liftOff, 0, 1), 2.2) * 650 : 0;
        g.save();
        g.translate(0, liftY);
        // Side solid rocket boosters
        [-w * 0.68, w * 0.68].forEach((bx) => {
          const bw = w * 0.42;
          const bh = h * 0.58;
          rr(g, bx - bw / 2, -bh, bw, bh, 8);
          g.fillStyle = cylinderGrad(g, bx - bw / 2, -bh, bx + bw / 2, 0, '#F1F5F9', -1);
          g.fill();
          poly(g, [[bx - bw / 2, -bh], [bx + bw / 2, -bh], [bx, -bh - 48]], cylinderGrad(g, bx - bw / 2, -bh - 48, bx + bw / 2, -bh, '#E2E8F0', -1));
        });
        // Main core stage cylinder
        rr(g, -w / 2, -h * 0.82, w, h * 0.82, 10);
        g.fillStyle = cylinderGrad(g, -w / 2, -h * 0.82, w / 2, 0, '#FFFFFF', -1);
        g.fill();
        // Black interstage rings
        g.fillStyle = '#1E293B';
        g.fillRect(-w / 2, -h * 0.52, w, 28);
        g.fillRect(-w / 2, -h * 0.12, w, 22);
        // Payload fairing nosecone
        poly(g, [[-w * 0.52, -h * 0.82], [w * 0.52, -h * 0.82], [w * 0.32, -h * 0.94], [0, -h], [-w * 0.32, -h * 0.94]], cylinderGrad(g, -w * 0.52, -h, w * 0.52, -h * 0.82, '#F8FAFC', -1));
        // Cryogenic venting vapor plumes along rocket body
        for (let v = 0; v < 4; v++) {
          const vy = -h * (0.28 + v * 0.14);
          const drift = ((t * 35 + v * 20) % 75);
          ellipse(g, w * 0.5 + drift, vy + drift * 0.2, 28 + drift * 0.4, 14, alpha('#FFFFFF', Math.max(0, 0.42 - drift / 180)));
        }
        // Ignition exhaust plume if firing
        if (o.firing || o.liftOff > 0) {
          glow(g, 0, 25, 220, '#FF6B1A', 0.9);
          poly(g, [[-w * 0.65, 0], [w * 0.65, 0], [w * 1.1, 140 + Math.sin(t * 28) * 25], [-w * 1.1, 140 + Math.cos(t * 28) * 25]], linGrad(g, 0, 0, 0, 150, ['#FFFFFF', '#FFD54F', '#FF5E1A', 'rgba(255,60,0,0)']));
        }
        g.restore();
        break;
      }

      case 'launchGantry': {
        const w = 115;
        const h = o.h || 560;
        rr(g, -w / 2, -h, w, h, 6);
        g.fillStyle = cylinderGrad(g, -w / 2, -h, w / 2, 0, '#C94A29', -1);
        g.fill();
        // Cross-bracing trusses & umbilical swing arms
        for (let ty = -40; ty > -h + 40; ty -= 55) {
          seg(g, [[-w * 0.44, ty], [w * 0.44, ty - 48]], 5, '#9E351A');
          seg(g, [[w * 0.44, ty], [-w * 0.44, ty - 48]], 5, '#9E351A');
        }
        [-h * 0.35, -h * 0.58, -h * 0.78].forEach((ay) => {
          rr(g, w * 0.45, ay - 10, 95, 18, 4);
          g.fillStyle = '#E05A36';
          g.fill();
        });
        break;
      }

      // ==================== SUBURBAN, URBAN & HISTORICAL PROPS ====================
      case 'suburbanHouse': {
        const w = o.w || 310;
        const h = o.h || 230;
        const wallCol = col || '#E8EEF5';
        const roofCol = o.roofColor || '#475569';
        // Main siding body
        rr(g, -w * 0.48, -h * 0.68, w * 0.96, h * 0.68, 6);
        g.fillStyle = cylinderGrad(g, -w * 0.48, -h * 0.68, w * 0.48, 0, wallCol, -1);
        g.fill();
        // Garage door on left
        rr(g, -w * 0.42, -h * 0.48, w * 0.36, h * 0.48, 4);
        g.fillStyle = shade(wallCol, -0.14);
        g.fill();
        for (let p = 1; p <= 3; p++) {
          seg(g, [[-w * 0.4, -h * 0.12 * p], [-w * 0.08, -h * 0.12 * p]], 2.5, shade(wallCol, -0.24));
        }
        // Front porch door & warm lit windows
        rr(g, w * 0.04, -h * 0.46, 38, h * 0.46, 4);
        g.fillStyle = '#9E2A2B';
        g.fill();
        rr(g, w * 0.22, -h * 0.46, 52, 46, 4);
        g.fillStyle = '#BAE6FD';
        g.fill();
        // Pitched gable roof
        poly(g, [[-w * 0.54, -h * 0.66], [w * 0.54, -h * 0.66], [w * 0.38, -h], [-w * 0.38, -h]], linGrad(g, 0, -h, 0, -h * 0.66, [shade(roofCol, 0.16), roofCol, shade(roofCol, -0.22)]));
        break;
      }

      case 'sportsCar3D': {
        const w = 230;
        const carCol = col || '#E53935';
        // Sleek aerodynamic body
        poly(
          g,
          [
            [-w * 0.48, -22],
            [-w * 0.46, -54],
            [-w * 0.22, -62],
            [-w * 0.04, -92],
            [w * 0.26, -92],
            [w * 0.44, -58],
            [w * 0.48, -22],
          ],
          cylinderGrad(g, -w * 0.48, -92, w * 0.48, -22, carCol, -1)
        );
        // Tinted cabin canopy
        poly(g, [[-w * 0.18, -60], [-w * 0.02, -86], [w * 0.22, -86], [w * 0.34, -60]], '#1E293B');
        // Alloy wheels
        [-w * 0.28, w * 0.28].forEach((wx) => {
          circle(g, wx, -24, 24, '#18181B');
          circle(g, wx, -24, 14, '#CBD5E1');
          circle(g, wx, -24, 5, '#E53935');
        });
        break;
      }

      case 'spiceStall': {
        const w = 240;
        const h = 195;
        // Wooden table base
        rr(g, -w * 0.46, -78, w * 0.92, 78, 6);
        g.fillStyle = cylinderGrad(g, -w * 0.46, -78, w * 0.46, 0, '#7C4A28', -1);
        g.fill();
        // Colorful conical mounds of turmeric, kumkum, cardamom & saffron
        const spices = [
          [-72, '#F59E0B'],
          [-24, '#E53935'],
          [24, '#10B981'],
          [72, '#F97316'],
        ];
        spices.forEach(([sx, sCol]) => {
          ellipse(g, sx, -78, 22, 8, '#D9B382');
          poly(g, [[sx - 20, -78], [sx + 20, -78], [sx, -108]], sphereGrad(g, sx, -90, 24, sCol));
        });
        // Bamboo poles & draped silk awning
        seg(g, [[-w * 0.44, -78], [-w * 0.44, -h]], 8, '#5C361C');
        seg(g, [[w * 0.44, -78], [w * 0.44, -h]], 8, '#5C361C');
        poly(g, [[-w * 0.54, -h + 24], [w * 0.54, -h + 24], [w * 0.44, -h - 14], [-w * 0.44, -h - 14]], cylinderGrad(g, -w * 0.54, -h - 14, w * 0.54, -h + 24, col || '#C92A2A', -1));
        // Golden scalloped trim
        for (let k = -4; k <= 4; k++) {
          circle(g, k * 26, -h + 24, 11, '#F5B942');
        }
        break;
      }

      case 'woodenCrane': {
        // Heavy timber A-frame harbor crane with hanging cargo net
        seg(g, [[-45, 0], [0, -240]], 14, '#6E4224');
        seg(g, [[45, 0], [0, -240]], 14, '#5C361C');
        seg(g, [[0, -220], [125, -295]], 12, '#7C4C2B');
        seg(g, [[-25, -120], [55, -255]], 7, '#4A2B16');
        const sway = Math.sin(t * 2.2 + seed) * 10;
        seg(g, [[120, -292], [120 + sway, -145]], 3.5, '#D9B382');
        circle(g, 120 + sway, -125, 26, sphereGrad(g, 120 + sway, -125, 26, '#C89658'));
        break;
      }

      case 'sieveTable': {
        // Archaeological mesh sifting table on angled legs
        seg(g, [[-55, -68], [-72, 0]], 8, '#6E472B');
        seg(g, [[55, -68], [72, 0]], 8, '#6E472B');
        const shakeX = Math.sin(t * 14) * 4;
        rr(g, -65 + shakeX, -82, 130, 18, 4);
        g.fillStyle = '#8C5C38';
        g.fill();
        // Terracotta potsherds inside sieve
        circle(g, -18 + shakeX, -85, 8, '#B84C2E');
        circle(g, 12 + shakeX, -86, 10, '#C85A38');
        // Falling sifted soil dust
        for (let d = 0; d < 5; d++) {
          const dy = -60 + ((t * 45 + d * 12) % 55);
          circle(g, -30 + d * 15, dy, 3, 'rgba(168, 110, 72, 0.55)');
        }
        break;
      }

      default: {
        rr(g, -40, -80, 80, 80, 10);
        g.fillStyle = sphereGrad(g, 0, -40, 50, col || '#64748B');
        g.fill();
      }
    }

    g.restore();
  }

  // ---------- 2. High-Density Midground & Interior Scene Builders (15 Presets) ----------
  function renderHighDensityMidground(g, t = 0, o = {}) {
    const preset = o.preset || 'scienceLab';
    const y = o.y !== undefined ? o.y : 840;
    const seed = o.seed || 21;

    switch (preset) {
      // ==================== 1. SCIENCE LAB (INTERIOR) ====================
      case 'scienceLab': {
        // Enclosed sterile acoustic lab walls with brushed aluminum dado rail
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#1E293B', '#283548', '#1E293B']);
        g.fillRect(-300, 0, E.W + 600, y);
        g.fillStyle = '#334155';
        g.fillRect(-300, y - 220, E.W + 600, 12);
        // Periodic Table & Molecular Formula Glass Whiteboard on Back Wall
        rr(g, 220, 170, 420, 230, 10);
        g.fillStyle = 'rgba(15, 23, 42, 0.85)';
        g.fill();
        for (let rIdx = 0; rIdx < 5; rIdx++) {
          for (let cIdx = 0; cIdx < 12; cIdx++) {
            if (rIdx === 0 && cIdx > 0 && cIdx < 11) continue;
            if ((rIdx === 1 || rIdx === 2) && cIdx > 1 && cIdx < 6) continue;
            const bCol = cIdx < 2 ? '#F43F5E' : cIdx < 6 ? '#38BDF8' : cIdx < 10 ? '#F59E0B' : '#38C878';
            rr(g, 245 + cIdx * 31, 198 + rIdx * 36, 26, 30, 4);
            g.fillStyle = alpha(bCol, 0.72);
            g.fill();
          }
        }
        // Overhead Cleanroom LED Light Panels + Volumetric Rays
        [380, 960, 1540].forEach((lx) => {
          rr(g, lx - 140, 28, 280, 22, 8);
          g.fillStyle = '#F8FAFC';
          g.fill();
          glow(g, lx, 40, 180, '#BAE6FD', 0.45);
          if (FX.godRays) FX.godRays(g, lx, 40, { count: 4, angle: Math.PI * 0.5, spread: 0.45, len: 820, color: '#BAE6FD', a: 0.08, t });
        });
        // Floor with polished epoxy reflection & hazard border
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#1E293B', '#0F172A']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        if (FX.pool) FX.pool(g, 960, y + 85, 820, 95, '#38BDF8', 0.16);
        // 14+ High-Density Lab Props across the room
        prop3D(g, 340, y, 1.0, { kind: 'labBench', w: 310, t });
        prop3D(g, 260, y - 115, 0.95, { kind: 'microscope', t, shadow: false });
        prop3D(g, 410, y - 115, 0.9, { kind: 'centrifuge', t, shadow: false });
        prop3D(g, 960, y, 1.05, { kind: 'fumeHood', w: 320, h: 360, t });
        prop3D(g, 1520, y, 1.0, { kind: 'labBench', w: 310, t });
        prop3D(g, 1480, y - 135, 0.95, { kind: 'dnaHelix', h: 220, t, shadow: false });
        break;
      }

      // ==================== 2. TECH STUDIO / CREATOR LAB (INTERIOR) ====================
      case 'techStudio': {
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#0D1322', '#161F35', '#0F172A']);
        g.fillRect(-300, 0, E.W + 600, y);
        // Geometric 3D Acoustic Foam Wall Panels & Neon Accent Tubes
        for (let px = 180; px <= 1740; px += 260) {
          for (let py = 160; py <= 460; py += 110) {
            poly(g, [[px, py - 48], [px + 48, py], [px, py + 48], [px - 48, py]], cylinderGrad(g, px - 48, py - 48, px + 48, py + 48, '#1E293B', -1));
          }
          const tubeCol = (px / 260) % 2 === 0 ? '#00F2FE' : '#FF4D94';
          glow(g, px + 130, 310, 95, tubeCol, 0.38);
          seg(g, [[px + 130, 140], [px + 130, 490]], 7, '#FFFFFF');
        }
        if (FX.storybookGround) FX.storybookGround(g, y, { style: 'woodFloor', baseCol: '#3E2A1E' });
        prop3D(g, 260, y, 1.0, { kind: 'serverRack', t });
        prop3D(g, 420, y, 1.0, { kind: 'serverRack', t, seed: 33 });
        prop3D(g, 960, y, 1.08, { kind: 'multiMonitorDesk', w: 360, t });
        prop3D(g, 1340, y, 1.0, { kind: 'ringLight', t });
        prop3D(g, 1640, y, 1.0, { kind: 'bookshelf', t });
        break;
      }

      // ==================== 3. MODERN BEDROOM (INTERIOR) ====================
      case 'modernBedroom': {
        const isNight = o.isNight !== false;
        g.fillStyle = linGrad(g, 0, 0, 0, y, isNight ? ['#1A2138', '#252F4C', '#1B233B'] : ['#CBD5E1', '#E2E8F0', '#CBD5E1']);
        g.fillRect(-300, 0, E.W + 600, y);
        // Large Picture Window with Outside Sky/Moon & Venetian Blinds
        rr(g, 740, 140, 440, 340, 12);
        g.fillStyle = linGrad(g, 740, 140, 740, 480, isNight ? ['#09122C', '#1E3A8A'] : ['#389EE8', '#BAE6FD']);
        g.fill();
        circle(g, 1080, 220, 34, isNight ? '#FEF08A' : '#FFFBEB');
        for (let wy = 160; wy < 470; wy += 24) {
          seg(g, [[748, wy], [1172, wy]], 3, 'rgba(255,255,255,0.28)');
        }
        // Warm Hardwood Floor & Woven Area Rug
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#5C3A24', '#3E2516']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        ellipse(g, 960, y + 95, 520, 65, '#334155');
        ellipse(g, 960, y + 95, 480, 52, '#475569');
        // Bedroom Furniture & Props
        prop3D(g, 340, y, 1.05, { kind: 'modernBed', color: '#4F46E5', t });
        // Nightstand & Glowing Bedside Lamp
        rr(g, 560, y - 85, 86, 85, 8);
        g.fillStyle = '#6E472B';
        g.fill();
        poly(g, [[582, y - 145], [624, y - 145], [634, y - 102], [572, y - 102]], '#FDE68A');
        glow(g, 603, y - 125, 160, '#F59E0B', 0.55);
        prop3D(g, 1340, y, 0.95, { kind: 'multiMonitorDesk', w: 290, t });
        prop3D(g, 1690, y, 1.0, { kind: 'bookshelf', t });
        break;
      }

      // ==================== 4. HOSPITAL ICU (INTERIOR) ====================
      case 'hospitalICU': {
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#E2E8F0', '#F1F5F9', '#CBD5E1']);
        g.fillRect(-300, 0, E.W + 600, y);
        // Medical Teal Wall Stripe & Headwall Gas Outlets
        g.fillStyle = '#0D9488';
        g.fillRect(-300, y - 340, E.W + 600, 48);
        rr(g, 620, y - 440, 680, 75, 10);
        g.fillStyle = '#94A3B8';
        g.fill();
        // Sterile Hospital Floor
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#CBD5E1', '#94A3B8']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        // Privacy Curtain on Left
        for (let cx = 120; cx <= 340; cx += 36) {
          rr(g, cx, 120, 38, y - 160, 14);
          g.fillStyle = cylinderGrad(g, cx, 120, cx + 38, 120, '#BAE6FD', -1);
          g.fill();
        }
        prop3D(g, 640, y, 1.05, { kind: 'ivDrip', t });
        prop3D(g, 960, y, 1.12, { kind: 'hospitalBed', t });
        prop3D(g, 1340, y, 1.08, { kind: 'icuMonitor', t });
        prop3D(g, 1620, y, 0.95, { kind: 'labBench', w: 240, color: '#F8FAFC', t });
        break;
      }

      // ==================== 5. MILITARY BUNKER / WAR ROOM (INTERIOR) ====================
      case 'militaryBunker': {
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#090D16', '#111827', '#1E293B']);
        g.fillRect(-300, 0, E.W + 600, y);
        // Angled Concrete Blast Ribs
        for (let rx = 160; rx <= 1760; rx += 320) {
          poly(g, [[rx - 28, 0], [rx + 28, 0], [rx + 48, y], [rx - 48, y]], '#0F172A');
        }
        // World Map Projection + DEFCON Board on Back Bulkhead
        prop3D(g, 960, 360, 1.15, { kind: 'defconBoard', level: o.defcon || 2, t, shadow: false });
        // Tactical Red/Amber Warning Beacons
        [280, 1640].forEach((bx) => {
          const pulse = 0.5 + 0.5 * Math.sin(t * 6);
          glow(g, bx, 120, 150, '#F43F5E', 0.45 * pulse);
          circle(g, bx, 120, 14, '#F43F5E');
        });
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#111827', '#090D16']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        prop3D(g, 280, y, 1.0, { kind: 'serverRack', alert: true, t });
        prop3D(g, 960, y, 1.12, { kind: 'warTableMap', t });
        prop3D(g, 1580, y, 1.0, { kind: 'multiMonitorDesk', w: 280, t });
        break;
      }

      // ==================== 6. PRISON CELL (INTERIOR) ====================
      case 'prisonCell': {
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#1E2430', '#2D3748', '#1A202C']);
        g.fillRect(-300, 0, E.W + 600, y);
        // Concrete cinderblock courses
        for (let cy = 120; cy < y; cy += 56) {
          seg(g, [[-200, cy], [E.W + 200, cy]], 2, 'rgba(0,0,0,0.22)');
        }
        // High Barred Window with Dramatic God Rays
        rr(g, 1220, 160, 180, 130, 8);
        g.fillStyle = '#090D16';
        g.fill();
        for (let bx = 1250; bx <= 1370; bx += 30) {
          seg(g, [[bx, 160], [bx, 290]], 6, '#475569');
        }
        if (FX.godRays) FX.godRays(g, 1310, 225, { count: 5, angle: Math.PI * 0.62, spread: 0.35, len: 780, color: '#CBD5E1', a: 0.14, t });
        // Chalk tally marks on wall
        for (let m = 0; m < 4; m++) {
          const mx = 740 + m * 12;
          seg(g, [[mx, 340], [mx, 378]], 3, 'rgba(226,232,240,0.45)');
        }
        seg(g, [[734, 372], [784, 346]], 3, 'rgba(226,232,240,0.45)');
        // Steel Bunk Bed on Left
        rr(g, 180, y - 260, 280, 260, 6);
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fill();
        seg(g, [[190, y], [190, y - 270]], 12, '#475569');
        seg(g, [[450, y], [450, y - 270]], 12, '#475569');
        [y - 75, y - 210].forEach((by) => {
          rr(g, 190, by, 260, 22, 6);
          g.fillStyle = '#64748B';
          g.fill();
          rr(g, 196, by - 18, 248, 20, 8);
          g.fillStyle = '#94A3B8';
          g.fill();
        });
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#1A202C', '#0F141C']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        // Cell Bars on Right Wing
        prop3D(g, 1640, y, 1.0, { kind: 'prisonBars', w: 380, h: 680, t, shadow: false });
        break;
      }

      // ==================== 7. COURTROOM (INTERIOR) ====================
      case 'courtroom': {
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#3E2414', '#5C361E', '#4A2B18']);
        g.fillRect(-300, 0, E.W + 600, y);
        // Neoclassical Fluted Pilasters & Tall Arched Windows
        [240, 680, 1240, 1680].forEach((px) => {
          rr(g, px - 28, 80, 56, y - 80, 6);
          g.fillStyle = cylinderGrad(g, px - 28, 80, px + 28, y, '#D6C7B2', -1);
          g.fill();
        });
        [460, 1460].forEach((wx) => {
          rr(g, wx - 85, 130, 170, 340, 85);
          g.fillStyle = linGrad(g, wx, 130, wx, 470, ['#BAE6FD', '#E0F2FE']);
          g.fill();
          if (FX.godRays) FX.godRays(g, wx, 260, { count: 4, angle: Math.PI * 0.42, spread: 0.35, len: 740, color: '#FEF3C7', a: 0.14, t });
        });
        // Marble & Red Carpet Courtroom Floor
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#4A2511', '#2E160A']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        poly(g, [[780, y], [1140, y], [1280, E.H], [640, E.H]], '#9E2A2B');
        // Judge's Bench, Witness Stand & Counsel Tables
        prop3D(g, 960, y, 1.08, { kind: 'judgeBench', t });
        prop3D(g, 640, y, 1.0, { kind: 'witnessStand', t });
        prop3D(g, 310, y, 0.72, { kind: 'boardroomTable', w: 320, t });
        prop3D(g, 1580, y, 0.72, { kind: 'boardroomTable', w: 320, t });
        break;
      }

      // ==================== 8. CORPORATE OFFICE / BOARDROOM (INTERIOR) ====================
      case 'corporateOffice': {
        // Panoramic Glass Curtain Wall Looking Out Over Skyline
        g.fillStyle = linGrad(g, 0, 0, 0, y, ['#1E68C8', '#68B5F5', '#E0F2FE']);
        g.fillRect(-300, 0, E.W + 600, y);
        if (FX.skyline) FX.skyline(g, { style: 'modern', y: y - 40, color: '#475569', lit: 0.25 });
        // Glass Mullion Frames
        for (let mx = 160; mx <= 1760; mx += 320) {
          g.fillStyle = '#1E293B';
          g.fillRect(mx - 8, 0, 16, y);
        }
        g.fillStyle = '#1E293B';
        g.fillRect(-300, 240, E.W + 600, 14);
        // Polished Slate Floor
        g.fillStyle = linGrad(g, 0, y, 0, E.H, ['#334155', '#1E293B']);
        g.fillRect(-300, y, E.W + 600, E.H - y + 200);
        prop3D(g, 960, 460, 1.0, { kind: 'stockTickerWall', trend: o.trend || 'bull', t, shadow: false });
        prop3D(g, 960, y, 1.08, { kind: 'boardroomTable', w: 520, t });
        break;
      }

      // ==================== 9. SUBURBAN STREET (EXTERIOR) ====================
      case 'suburbanStreet': {
        // White picket fence along property line
        for (let fx = -100; fx <= E.W + 100; fx += 34) {
          poly(g, [[fx, y - 45], [fx + 10, y - 58], [fx + 20, y - 45], [fx + 20, y], [fx, y]], '#F8FAFC');
        }
        g.fillStyle = '#E2E8F0';
        g.fillRect(-100, y - 38, E.W + 200, 7);
        g.fillRect(-100, y - 16, E.W + 200, 7);
        // Houses, Trees & Parked Car
        if (FX.tree) FX.tree(g, 160, y, 1.15, '#3B8C44', 'oak');
        prop3D(g, 460, y, 1.05, { kind: 'suburbanHouse', color: '#F1F5F9', roofColor: '#334155', t });
        if (FX.tree) FX.tree(g, 820, y, 1.05, '#449E48', 'oak');
        prop3D(g, 1220, y, 1.05, { kind: 'suburbanHouse', color: '#FEF3C7', roofColor: '#7C2D12', t });
        prop3D(g, 1620, y + 12, 1.0, { kind: 'sportsCar3D', color: '#2563EB', t });
        if (FX.tree) FX.tree(g, 1810, y, 1.1, '#3B8C44', 'oak');
        break;
      }

      // ==================== 10. MODERN DOWNTOWN (EXTERIOR) ====================
      case 'modernDowntown': {
        if (FX.architecture1P) FX.architecture1P(g, { style: 'modern', vy: 620, lit: 0.35, mood: 'day' });
        if (FX.lampPost) {
          FX.lampPost(g, 320, y, 290, { on: false });
          FX.lampPost(g, 1600, y, 290, { on: false });
        }
        prop3D(g, 1460, y + 18, 0.95, { kind: 'sportsCar3D', color: '#E53935', t });
        break;
      }

      // ==================== 11. MILITARY BASE (EXTERIOR) ====================
      case 'militaryBase': {
        // Arched Steel Aircraft Hangar
        g.save();
        g.translate(460, y);
        rr(g, -220, -210, 440, 210, 105);
        g.fillStyle = cylinderGrad(g, -220, -210, 220, 0, '#475569', -1);
        g.fill();
        rr(g, -140, -135, 280, 135, 12);
        g.fillStyle = '#0F172A';
        g.fill();
        g.restore();
        prop3D(g, 980, y, 1.15, { kind: 'radarDish', t });
        prop3D(g, 1460, y, 1.08, { kind: 'armoredHumvee', t });
        break;
      }

      // ==================== 12. SPACE LAUNCH PAD (EXTERIOR) ====================
      case 'launchPad': {
        if (FX.waterBody) FX.waterBody(g, t, { x: -200, y: y - 75, w: E.W + 400, h: 80, color: '#1E68C8', waves: true });
        // Concrete flame trench pad apron
        poly(g, [[520, y], [1400, y], [1320, y - 55], [600, y - 55]], '#64748B');
        // Cryogenic LOX spherical storage tank on left
        circle(g, 280, y - 110, 82, sphereGrad(g, 280, y - 110, 82, '#F8FAFC'));
        seg(g, [[220, y - 50], [210, y]], 10, '#94A3B8');
        seg(g, [[340, y - 50], [350, y]], 10, '#94A3B8');
        // Launch Gantry & Orbital Rocket
        prop3D(g, 840, y - 45, 1.05, { kind: 'launchGantry', h: 560, t });
        prop3D(g, 1020, y - 45, 1.05, { kind: 'orbitalRocket', h: 540, firing: o.firing, liftOff: o.liftOff, t });
        break;
      }

      // ==================== 13. ANCIENT HARBOR (EXTERIOR) ====================
      case 'ancientHarbor': {
        if (FX.storybookScene) FX.storybookScene(g, t, { preset: 'harborWharf', y });
        prop3D(g, 980, y - 50, 0.95, { kind: 'woodenCrane', t });
        prop3D(g, 1260, y - 50, 0.95, { kind: 'spiceStall', color: '#D97706', t });
        break;
      }

      // ==================== 14. TEMPLE BAZAAR (EXTERIOR) ====================
      case 'templeBazaar': {
        if (FX.structure3D) {
          FX.structure3D(g, 960, y, 280, 380, { kind: 'gopuram', t });
          FX.structure3D(g, 260, y, 240, 210, { kind: 'mandapam', t });
          FX.structure3D(g, 1660, y, 240, 210, { kind: 'mandapam', t });
        }
        prop3D(g, 580, y, 1.0, { kind: 'spiceStall', color: '#C92A2A', t });
        prop3D(g, 1340, y, 1.0, { kind: 'spiceStall', color: '#0D9488', t });
        break;
      }

      // ==================== 15. ARCHAEOLOGY DIG SITE (EXTERIOR) ====================
      case 'archaeologyDigSite': {
        // Exposed Ancient Baked-Brick Trench Walls & Terracotta Ring Well
        for (let bx = 280; bx < 840; bx += 52) {
          rr(g, bx, y - 44, 48, 22, 3);
          rr(g, bx, y - 22, 48, 22, 3);
          g.fillStyle = '#B84C2E';
          g.fill();
        }
        // Terracotta Ring Well
        for (let rIdx = 0; rIdx < 4; rIdx++) {
          ellipse(g, 640, y - 12 - rIdx * 18, 46, 12, '#A84224');
          ellipse(g, 640, y - 14 - rIdx * 18, 36, 8, '#3E1E12');
        }
        // White Grid Strings & Wooden Stakes
        seg(g, [[240, y - 55], [900, y - 55]], 2.5, '#F8FAFC');
        prop3D(g, 1240, y, 1.05, { kind: 'sieveTable', t });
        if (FX.structure3D) FX.structure3D(g, 1640, y, 190, 165, { kind: 'thatchedHut', t });
        break;
      }
    }
  }

  // ---------- 3. Hook Into FX.storybookScene & FX.interactiveProp ----------
  const _origStorybookScene = FX.storybookScene;
  const RICH_PRESETS = {
    scienceLab: true,
    techStudio: true,
    modernBedroom: true,
    hospitalICU: true,
    militaryBunker: true,
    prisonCell: true,
    courtroom: true,
    corporateOffice: true,
    suburbanStreet: true,
    modernDowntown: true,
    militaryBase: true,
    launchPad: true,
    ancientHarbor: true,
    templeBazaar: true,
    archaeologyDigSite: true,
  };

  FX.storybookScene = function (g, t = 0, o = {}) {
    if (o && RICH_PRESETS[o.preset]) {
      renderHighDensityMidground(g, t, o);
      return;
    }
    if (_origStorybookScene) _origStorybookScene(g, t, o);
  };

  const _origInteractiveProp = FX.interactiveProp;
  FX.interactiveProp = function (g, o = {}) {
    const { kind = 'choppableTree', x = 565, y = 840, cutTime = 1.8, lt = 0, gt = 0 } = o;

    if (kind === 'labStation') {
      prop3D(g, x, y, 0.85, { kind: 'labBench', w: 180, t: gt });
      const reacted = lt >= cutTime;
      const col = reacted ? '#F43F5E' : '#38BDF8';
      g.save();
      g.translate(x, y - 102);
      poly(g, [[-12, -36], [12, -36], [24, 0], [-24, 0]], 'rgba(220,242,255,0.4)');
      poly(g, [[-18, -18], [18, -18], [22, -2], [-22, -2]], col);
      if (reacted) {
        glow(g, 0, -25, 75, '#F43F5E', 0.85);
        for (let i = 0; i < 6; i++) {
          const by = -28 - ((lt - cutTime) * 65 + i * 14) % 65;
          circle(g, Math.sin(gt * 6 + i) * 14, by, 7, 'rgba(244, 63, 94, 0.65)');
        }
      }
      g.restore();
      return;
    }

    if (kind === 'serverTerminal') {
      prop3D(g, x, y, 0.95, { kind: 'serverRack', alert: lt >= cutTime, t: gt });
      return;
    }

    if (kind === 'gavelBlock') {
      g.save();
      g.translate(x, y);
      rr(g, -28, -58, 56, 58, 6);
      g.fillStyle = '#5C3018';
      g.fill();
      ellipse(g, 0, -58, 22, 7, '#8A4B29');
      if (lt >= cutTime && lt < cutTime + 0.45) {
        const u = (lt - cutTime) / 0.45;
        ring(g, 0, -60, 18 + u * 55, 3 * (1 - u), '#F5B942');
      }
      g.restore();
      return;
    }

    if (_origInteractiveProp) _origInteractiveProp(g, o);
  };

  // ---------- 4. Complete One-Call 5-Plane Rich Environment Wrapper (FX.richEnv) ----------
  const INTERIOR_PRESETS = {
    scienceLab: true,
    techStudio: true,
    modernBedroom: true,
    hospitalICU: true,
    militaryBunker: true,
    prisonCell: true,
    courtroom: true,
    corporateOffice: true,
  };

  function richEnv(g, cam, gt = 0, o = {}) {
    const preset = typeof o === 'string' ? o : o.preset || 'scienceLab';
    const y = o.y !== undefined ? o.y : 840;
    const isInt = !!INTERIOR_PRESETS[preset];
    const m = DK.mood(o.mood || (isInt ? 'interiorCool' : 'clearDay'));

    fivePlane(g, cam, {
      bgSky: (g) => {
        if (!isInt) {
          backdrop(g, m.sky, [-E.W, -E.H, E.W * 3, E.H * 3], { t: gt, clouds: true });
          if (FX.sun && o.isNight !== true) FX.sun(g, 1480, 210, 62);
        }
      },
      bgFarDepth: isInt ? 0.65 : 0.35,
      bgFarBlur: isInt ? 0 : 1.8,
      bgFar: (g) => {
        if (!isInt && FX.hills) {
          FX.hills(g, { seed: 11, y: y - 80, amp: 95, color: m.distantHills || '#5A8F76' });
        }
      },
      mgBackDepth: 0.78,
      mgBackBlur: 0,
      mgBack: (g) => {
        renderHighDensityMidground(g, gt, Object.assign({ y }, o, { preset }));
        if (!isInt && FX.storybookGround) {
          const gStyle = preset === 'suburbanStreet' || preset === 'modernDowntown' ? 'flagstone' : 'earthPath';
          FX.storybookGround(g, y, { style: gStyle, baseCol: m.road || '#6E523C', grassCol: m.grass || '#489C4E' });
        }
      },
      mgHero: (g) => {
        if (typeof o.mgHero === 'function') o.mgHero(g);
      },
      fgBokehDepth: 1.45,
      fgBokehBlur: 10,
      fgBokeh: (g) => {
        if (typeof o.fgBokeh === 'function') {
          o.fgBokeh(g);
        } else if (FX.bokehOrbs) {
          FX.bokehOrbs(g, gt, { count: 9, color: m.practical || '#FFD54F', a: 0.12 });
        }
      },
    });
  }

  // Export to Global Namespaces
  const ENVS = (window.ENVS = {
    prop3D,
    richEnv,
    renderHighDensityMidground,
    RICH_PRESETS,
  });

  FX.prop3D = DK.prop3D = H.prop3D = prop3D;
  FX.richEnv = DK.richEnv = H.richEnv = richEnv;
})();