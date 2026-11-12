// ============================================================================
// MODULE: LUMINA_CHARTS (engine/lumina_charts.js) — High-Precision 2.5D/3D
// Extruded Bar & Column Charts, Multi-Series Spline Line Graphs with Live
// Playheads, 3D Exploded Volumetric Donut Charts, Radar Spider Charts,
// Animated Sankey Flow Diagrams & 3D Logarithmic Size-Comparison Arenas.
// Logical Stage: 1920x1080 (16:9 Widescreen). Deterministic fn(t).
// Requires MODULE 1: LUMINA_CORE (window.DK / window.H / window.UI).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const UI = (window.UI = window.UI || DK.ui || {});
  const E = DK.E || { W: 1920, H: 1080 };

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

  const DEFAULT_SERIES_COLORS = [
    '#FF8A3D', // Lumina Amber-Orange
    '#5CE1FF', // Electric Cyan
    '#38C878', // Emerald Mint
    '#F5B942', // Royal Gold
    '#FF4D6A', // Neon Coral
    '#9B6BFF', // Volumetric Violet
    '#4DA6FF', //Cobalt Sky
  ];

  function formatNumber(val, o = {}) {
    const dec = o.decimals !== undefined ? o.decimals : Math.abs(val) < 10 && val % 1 !== 0 ? 1 : 0;
    const numStr =
      dec > 0
        ? Number(val).toFixed(dec)
        : Math.round(Number(val)).toLocaleString('en-US');
    return (o.prefix || '') + numStr + (o.suffix || '');
  }

  // Studio Glass Card Backdrop for Charts (can be disabled with card: false for in-world HUDs)
  function drawChartCard(g, x, y, w, h, o = {}) {
    if (o.card === false) return;
    g.save();
    // Soft 3D drop shadow
    rr(g, x - w / 2 + 8, y - h / 2 + 14, w, h, 26);
    g.fillStyle = 'rgba(0, 0, 0, 0.45)';
    g.fill();

    // Volumetric Dark-Navy Studio Glass Panel
    rr(g, x - w / 2, y - h / 2, w, h, 24);
    g.fillStyle = linGrad(g, x, y - h / 2, x, y + h / 2, [
      o.cardTop || 'rgba(20, 28, 52, 0.92)',
      o.cardBot || 'rgba(11, 16, 32, 0.95)',
    ]);
    g.fill();
    g.strokeStyle = o.borderColor || 'rgba(110, 160, 235, 0.28)';
    g.lineWidth = 2.5;
    g.stroke();

    // Top Specular Rim Highlight
    seg(
      g,
      [
        [x - w / 2 + 28, y - h / 2 + 2],
        [x + w / 2 - 28, y - h / 2 + 2],
      ],
      2,
      'rgba(255, 255, 255, 0.22)'
    );

    if (o.title) {
      text(g, o.title, x - w / 2 + 44, y - h / 2 + 46, {
        size: 32,
        font: FONTS.ui,
        weight: 900,
        color: '#FFFFFF',
        align: 'left',
      });
    }
    if (o.subTitle) {
      text(g, o.subTitle, x - w / 2 + 44, y - h / 2 + 82, {
        size: 20,
        font: FONTS.ui,
        weight: 700,
        color: '#94A3B8',
        align: 'left',
      });
    }
    if (o.badgeText && UI.pillBadge) {
      UI.pillBadge(g, 1, {
        x: x + w / 2 - 130,
        y: y - h / 2 + 54,
        text: o.badgeText,
        border: o.badgeColor || '#FFB84D',
        scale: 0.88,
      });
    }
    g.restore();
  }

  // ---------- 1. True-Axis 3D Extruded Bar & Column Chart (UI.chartBar3D) ----------
  function chartBar3D(g, lt = 0, o = {}) {
    const {
      x = 960,
      y = 540,
      w = 1360,
      h = 760,
      title = '',
      subTitle = '',
      badgeText = '',
      data = [], // [{ label: '2020', value: 45, color: '#FF8A3D', subLabel: '' }, ...]
      maxVal: customMax = null,
      t0 = 0.1,
      dur = 1.1,
      stagger = 0.12,
      depth3D = 24,
      shape = 'prism', // 'prism' (3-face isometric box) | 'cylinder'
      highlightIdx = null,
      targetLine = null, // { value: 75, label: 'CRITICAL THRESHOLD', color: '#FF4D6A' }
      prefix = '',
      suffix = '',
      decimals = 0,
      card = true,
    } = o;

    if (!data || !data.length) return;
    g.save();
    drawChartCard(g, x, y, w, h, { title, subTitle, badgeText, card });

    const padL = 135;
    const padR = 75;
    const padT = title ? 125 : 75;
    const padB = 105;

    const plotX0 = x - w / 2 + padL;
    const plotX1 = x + w / 2 - padR;
    const plotY0 = y - h / 2 + padT;
    const plotY1 = y + h / 2 - padB;
    const plotW = plotX1 - plotX0;
    const plotH = plotY1 - plotY0;

    const rawMax = Math.max(1e-3, ...data.map((d) => Number(d.value || 0)));
    const maxVal = customMax !== null ? customMax : rawMax * 1.15;

    // 1. 2.5D Extruded Floor Plinth & Y-Axis Gridlines
    const dx3 = depth3D * 0.78;
    const dy3 = -depth3D * 0.52;

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const uGrid = i / gridSteps;
      const gy = lerp(plotY1, plotY0, uGrid);
      const gVal = lerp(0, maxVal, uGrid);

      // Receding 3D side-wall tick + back-wall horizontal grid line
      seg(
        g,
        [
          [plotX0, gy],
          [plotX0 + dx3, gy + dy3],
          [plotX1 + dx3, gy + dy3],
        ],
        1.5,
        i === 0 ? 'rgba(180, 205, 245, 0.45)' : 'rgba(130, 170, 230, 0.16)'
      );

      text(g, formatNumber(gVal, { prefix, suffix, decimals }), plotX0 - 18, gy, {
        size: 20,
        font: FONTS.mono,
        weight: 700,
        color: '#94A3B8',
        align: 'right',
      });
    }

    // 3D Floor Baseboard Polygon
    poly(
      g,
      [
        [plotX0, plotY1],
        [plotX1, plotY1],
        [plotX1 + dx3, plotY1 + dy3],
        [plotX0 + dx3, plotY1 + dy3],
      ],
      'rgba(30, 42, 74, 0.72)',
      'rgba(120, 165, 235, 0.32)',
      2
    );

    // 2. Render 3D Extruded Columns
    const n = data.length;
    const slotW = plotW / n;
    const barW = Math.min(115, slotW * 0.56);

    data.forEach((item, idx) => {
      const itemT0 = t0 + idx * stagger;
      const growU = ease.outBack(clamp((lt - itemT0) / Math.max(0.1, dur), 0, 1));
      const val = Number(item.value || 0);
      const curVal = val * clamp((lt - itemT0) / Math.max(0.1, dur), 0, 1);
      const bh = Math.max(2, (val / maxVal) * plotH * Math.max(0, growU));

      const bx = plotX0 + (idx + 0.5) * slotW - barW * 0.5;
      const by = plotY1 - bh;
      const baseCol = item.color || DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length];

      const isDimmed = highlightIdx !== null && highlightIdx !== undefined && highlightIdx !== idx;
      const isHighlighted = highlightIdx === idx;

      g.save();
      if (isDimmed) g.globalAlpha = 0.24;

      if (isHighlighted) {
        glow(g, bx + barW / 2, by + bh / 2, Math.max(barW, bh * 0.65), baseCol, 0.45);
      }

      // Floor Contact Shadow
      contactShadow(g, bx + barW * 0.5 + dx3 * 0.3, plotY1 + dy3 * 0.3, barW * 0.68, 10, 0.38);

      if (shape === 'cylinder') {
        // 3D Shaded Cylindrical Column + Elliptical Top Cap
        const rx = barW * 0.5;
        const ry = Math.max(8, barW * 0.22);
        const cx = bx + rx + dx3 * 0.35;
        const topY = by + dy3 * 0.35;
        const botY = plotY1 + dy3 * 0.35;

        g.fillStyle = cylinderGrad(g, cx - rx, topY, cx + rx, botY, baseCol, -1);
        g.beginPath();
        g.moveTo(cx - rx, topY);
        g.lineTo(cx - rx, botY);
        g.ellipse(cx, botY, rx, ry, 0, Math.PI, 0, true);
        g.lineTo(cx + rx, topY);
        g.closePath();
        g.fill();

        ellipse(g, cx, topY, rx, ry, linGrad(g, cx - rx, topY - ry, cx + rx, topY + ry, [shade(baseCol, 0.36), shade(baseCol, 0.08)]));
        g.strokeStyle = shade(baseCol, 0.48);
        g.lineWidth = 2;
        g.stroke();
      } else {
        // 3-Face Isometric 3D Prism Bar (Front Face, Right Side Wall, Top Bevel Cap)
        // A. Front Vertical Face
        g.fillStyle = linGrad(g, bx, by, bx, plotY1, [
          shade(baseCol, 0.16),
          baseCol,
          shade(baseCol, -0.22),
        ]);
        g.fillRect(bx, by, barW, bh);

        // B. Right Extruded Side Wall
        poly(
          g,
          [
            [bx + barW, by],
            [bx + barW + dx3, by + dy3],
            [bx + barW + dx3, plotY1 + dy3],
            [bx + barW, plotY1],
          ],
          linGrad(g, bx + barW, by, bx + barW + dx3, plotY1, [
            shade(baseCol, -0.14),
            shade(baseCol, -0.38),
          ])
        );

        // C. Top Bevelled Specular Roof Cap
        poly(
          g,
          [
            [bx, by],
            [bx + barW, by],
            [bx + barW + dx3, by + dy3],
            [bx + dx3, by + dy3],
          ],
          linGrad(g, bx, by + dy3, bx + barW, by, [
            shade(baseCol, 0.42),
            shade(baseCol, 0.18),
          ]),
          shade(baseCol, 0.52),
          1.8
        );
      }

      // Live Counter Value Above Bar
      if (growU > 0.08) {
        const valStr = formatNumber(curVal, { prefix, suffix, decimals });
        text(g, valStr, bx + barW * 0.5 + dx3 * 0.5, by + dy3 - 18, {
          size: isHighlighted ? 26 : 22,
          font: FONTS.mono,
          weight: 800,
          color: isHighlighted ? '#FFD54F' : '#FFFFFF',
          glow: isHighlighted ? 14 : 0,
        });
      }

      // X-Axis Category Label Below Bar
      text(g, String(item.label || ''), bx + barW * 0.5, plotY1 + 36, {
        size: 21,
        font: FONTS.ui,
        weight: 800,
        color: isHighlighted ? '#FFD54F' : '#E2E8F0',
      });
      if (item.subLabel) {
        text(g, String(item.subLabel), bx + barW * 0.5, plotY1 + 62, {
          size: 16,
          font: FONTS.ui,
          weight: 700,
          color: '#94A3B8',
        });
      }

      g.restore();
    });

    // 3. Optional Threshold / Benchmark Line
    if (targetLine && targetLine.value !== undefined) {
      const ty = lerp(plotY1, plotY0, clamp(targetLine.value / maxVal, 0, 1));
      const tCol = targetLine.color || '#FF4D6A';
      g.save();
      g.strokeStyle = tCol;
      g.lineWidth = 3.5;
      g.setLineDash([12, 8]);
      g.beginPath();
      g.moveTo(plotX0, ty);
      g.lineTo(plotX1 + dx3, ty);
      g.stroke();
      g.setLineDash([]);
      if (targetLine.label && UI.pillBadge) {
        UI.pillBadge(g, lt, {
          x: plotX1 - 110,
          y: ty - 24,
          text: targetLine.label,
          border: tCol,
          scale: 0.78,
        });
      }
      g.restore();
    }

    g.restore();
  }

  // ---------- 2. Multi-Series Spline / Area Line Graph with Live Playhead (UI.chartLine) ----------
  function sampleCatmullRom(pts, samplesPerSeg = 16) {
    if (!pts || pts.length < 2) return pts || [];
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < samplesPerSeg; s++) {
        const t = s / samplesPerSeg;
        const t2 = t * t;
        const t3 = t2 * t;
        const x =
          0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y =
          0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push([x, y]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function chartLine(g, lt = 0, o = {}) {
    const {
      x = 960,
      y = 540,
      w = 1380,
      h = 760,
      title = '',
      subTitle = '',
      badgeText = '',
      labels = [],
      series: rawSeries = null,
      data = null, // Shorthand for single series: [12, 28, 45, 92]
      minVal: customMin = 0,
      maxVal: customMax = null,
      t0 = 0.1,
      dur = 1.6,
      smooth = true,
      areaFill = true,
      playhead = true,
      annotations = [], // [{ index: 2, label: 'PEAK SURGE', color: '#FF4D6A' }]
      prefix = '',
      suffix = '',
      decimals = 0,
      card = true,
    } = o;

    const series =
      Array.isArray(rawSeries) && rawSeries.length
        ? rawSeries
        : Array.isArray(data)
        ? [{ name: title || 'Series 1', color: o.color || '#5CE1FF', values: data }]
        : [];
    if (!series.length) return;

    g.save();
    drawChartCard(g, x, y, w, h, { title, subTitle, badgeText, card });

    const padL = 135;
    const padR = 95;
    const padT = title ? 128 : 75;
    const padB = 100;

    const plotX0 = x - w / 2 + padL;
    const plotX1 = x + w / 2 - padR;
    const plotY0 = y - h / 2 + padT;
    const plotY1 = y + h / 2 - padB;
    const plotW = plotX1 - plotX0;
    const plotH = plotY1 - plotY0;

    let allVals = [];
    series.forEach((s) => {
      const arr = s.values || s.data || [];
      arr.forEach((v) => allVals.push(Number(v)));
    });
    const minVal = customMin !== null ? customMin : Math.min(0, ...allVals);
    const maxVal = customMax !== null ? customMax : Math.max(1, ...allVals) * 1.15;

    // 1. Gridlines & Y/X Axis Labels
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const uG = i / gridSteps;
      const gy = lerp(plotY1, plotY0, uG);
      const gVal = lerp(minVal, maxVal, uG);
      seg(
        g,
        [
          [plotX0, gy],
          [plotX1, gy],
        ],
        i === 0 ? 2.5 : 1.4,
        i === 0 ? 'rgba(180, 205, 245, 0.45)' : 'rgba(130, 170, 230, 0.14)'
      );
      text(g, formatNumber(gVal, { prefix, suffix, decimals }), plotX0 - 18, gy, {
        size: 20,
        font: FONTS.mono,
        weight: 700,
        color: '#94A3B8',
        align: 'right',
      });
    }

    const numPts = Math.max(...series.map((s) => (s.values || s.data || []).length));
    if (labels && labels.length) {
      labels.forEach((lbl, idx) => {
        const lx = plotX0 + (idx / Math.max(1, labels.length - 1)) * plotW;
        seg(g, [[lx, plotY0], [lx, plotY1]], 1, 'rgba(130, 170, 230, 0.08)');
        text(g, String(lbl), lx, plotY1 + 36, {
          size: 20,
          font: FONTS.ui,
          weight: 800,
          color: '#CBD5E1',
        });
      });
    }

    // 2. Progressive Sweep Progress
    const drawU = ease.inOut(clamp((lt - t0) / Math.max(0.1, dur), 0, 1));
    const clipX = plotX0 + plotW * drawU;

    series.forEach((ser, sIdx) => {
      const vals = ser.values || ser.data || [];
      if (!vals.length) return;
      const col = ser.color || DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length];

      const rawPts = vals.map((v, i) => {
        const px = plotX0 + (i / Math.max(1, vals.length - 1)) * plotW;
        const py = lerp(plotY1, plotY0, clamp((v - minVal) / Math.max(1e-6, maxVal - minVal), 0, 1));
        return [px, py];
      });

      const densePts = smooth && rawPts.length > 2 ? sampleCatmullRom(rawPts, 18) : rawPts;
      const visiblePts = densePts.filter((p) => p[0] <= clipX + 2);
      if (!visiblePts.length) return;

      // A. Glowing Gradient Area Under Curve
      if (areaFill) {
        g.save();
        g.beginPath();
        g.moveTo(visiblePts[0][0], plotY1);
        visiblePts.forEach(([px, py]) => g.lineTo(px, py));
        g.lineTo(visiblePts[visiblePts.length - 1][0], plotY1);
        g.closePath();
        g.fillStyle = linGrad(g, 0, plotY0, 0, plotY1, [
          alpha(col, 0.42),
          alpha(col, 0.08),
          alpha(col, 0.0),
        ]);
        g.fill();
        g.restore();
      }

      // B. Glowing Outer Stroke + Crisp Inner Core Line
      seg(g, visiblePts, 11, alpha(col, 0.26));
      seg(g, visiblePts, 4.8, col);

      // C. Data Vertex Nodes
      rawPts.forEach(([px, py], i) => {
        if (px <= clipX + 4) {
          circle(g, px, py, 7.5, sphereGrad(g, px, py, 7.5, col));
          circle(g, px, py, 3.2, '#FFFFFF');
        }
      });

      // D. Live Tracking Playhead Beam & Floating Value Readout
      const tip = visiblePts[visiblePts.length - 1];
      if (playhead && drawU > 0.02) {
        if (sIdx === 0) {
          seg(g, [[tip[0], plotY0], [tip[0], plotY1]], 2, alpha(col, 0.48));
        }
        glow(g, tip[0], tip[1], 32, col, 0.9);
        circle(g, tip[0], tip[1], 9.5, '#FFFFFF');
        ring(g, tip[0], tip[1], 14, 2.5, col);

        // Interpolated numeric value at playhead
        const exactIdx = clamp(drawU * (vals.length - 1), 0, vals.length - 1);
        const i0 = Math.floor(exactIdx);
        const i1 = Math.min(vals.length - 1, i0 + 1);
        const liveVal = lerp(vals[i0], vals[i1], exactIdx - i0);
        const valText =
          (series.length > 1 && ser.name ? ser.name + ': ' : '') +
          formatNumber(liveVal, { prefix, suffix, decimals });

        if (UI.pillBadge) {
          UI.pillBadge(g, 1, {
            x: clamp(tip[0], plotX0 + 80, plotX1 - 80),
            y: tip[1] - 38 - sIdx * 42,
            text: valText,
            border: col,
            scale: 0.82,
          });
        }
      }
    });

    // 3. Event Annotations
    annotations.forEach((ann) => {
      const idx = clamp(ann.index || 0, 0, numPts - 1);
      const vals0 = series[0].values || series[0].data || [];
      const ax = plotX0 + (idx / Math.max(1, vals0.length - 1)) * plotW;
      if (ax > clipX + 10) return;
      const ay = lerp(plotY1, plotY0, clamp(((vals0[idx] || 0) - minVal) / Math.max(1e-6, maxVal - minVal), 0, 1));
      if (UI.pillBadge) {
        UI.pillBadge(g, lt, {
          x: ax,
          y: Math.max(plotY0 + 36, ay - 78),
          text: ann.label || 'EVENT',
          border: ann.color || '#FF4D6A',
          target: [ax, ay],
          scale: 0.84,
        });
      }
    });

    g.restore();
  }

  // ---------- 3. 3D Exploded Volumetric Donut Chart (UI.chartDonut3D) ----------
  function drawDonutSlicePath(g, cx, cy, rx, ry, innerRatio, a0, a1) {
    const irx = rx * innerRatio;
    const iry = ry * innerRatio;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, a0, a1, false);
    if (innerRatio > 0.02) {
      g.ellipse(cx, cy, irx, iry, 0, a1, a0, true);
    } else {
      g.lineTo(cx, cy);
    }
    g.closePath();
  }

  function chartDonut3D(g, lt = 0, o = {}) {
    const {
      x = 960,
      y = 560,
      rx = 320,
      ry = 205, // Elliptical 2.5D perspective tilt
      innerRatio = 0.54,
      depth3D = 32,
      title = '',
      subTitle = '',
      centerTitle = '',
      centerValue = '',
      data = [], // [{ label: 'R&D', value: 42, color: '#5CE1FF', explode: 22 }, ...]
      explodeIdx = null,
      t0 = 0.1,
      dur = 1.2,
      card = true,
      w = 1360,
      h = 760,
    } = o;

    if (!data || !data.length) return;
    g.save();
    drawChartCard(g, x, y - 20, w, h, { title, subTitle, card });

    const total = Math.max(1e-6, data.reduce((acc, d) => acc + Number(d.value || 0), 0));
    const sweepU = ease.outCubic(clamp((lt - t0) / Math.max(0.1, dur), 0, 1));
    const maxAngle = -Math.PI * 0.5 + sweepU * Math.PI * 2;

    // Precompute Slice Angles & Explode Vectors
    let curAng = -Math.PI * 0.5;
    const slices = data.map((d, idx) => {
      const frac = Number(d.value || 0) / total;
      const span = frac * Math.PI * 2;
      const a0 = curAng;
      const a1 = Math.min(maxAngle, curAng + span);
      const midA = a0 + span * 0.5;
      curAng += span;

      const isExploded = explodeIdx === idx || (d.explode && d.explode > 0);
      const expDist = isExploded ? (d.explode || 26) * ease.outBack(sweepU) : 0;
      const ox = Math.cos(midA) * expDist;
      const oy = Math.sin(midA) * expDist * (ry / rx);

      return {
        d,
        idx,
        frac,
        a0,
        a1,
        midA,
        ox,
        oy,
        col: d.color || DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length],
        visible: a1 > a0 + 0.005,
      };
    });

    // 1. Soft Floor Shadow under 3D Donut
    ellipse(g, x, y + depth3D + 22, rx * 1.06, ry * 1.04, 'rgba(0, 0, 0, 0.45)');

    // 2. Render Extruded 3D Side Walls (Stacked from bottom layer up to top surface)
    const layers = 14;
    for (let l = layers; l >= 1; l--) {
      const zOff = (l / layers) * depth3D;
      slices.forEach((s) => {
        if (!s.visible) return;
        drawDonutSlicePath(g, x + s.ox, y + s.oy + zOff, rx, ry, innerRatio, s.a0, s.a1);
        g.fillStyle = shade(s.col, -0.32 - (l / layers) * 0.12);
        g.fill();
      });
    }

    // 3. Render Top Bevelled Volumetric Donut Slices
    slices.forEach((s) => {
      if (!s.visible) return;
      const sx = x + s.ox;
      const sy = y + s.oy;
      drawDonutSlicePath(g, sx, sy, rx, ry, innerRatio, s.a0, s.a1);
      g.fillStyle = linGrad(g, sx - rx, sy - ry, sx + rx, sy + ry, [
        shade(s.col, 0.24),
        s.col,
        shade(s.col, -0.16),
      ]);
      g.fill();
      g.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      g.lineWidth = 2.2;
      g.stroke();
    });

    // 4. Center Hole Summary Readout
    if (centerValue || centerTitle) {
      text(g, centerValue, x, y - 6, {
        size: 46,
        font: FONTS.mono,
        weight: 900,
        color: '#FFFFFF',
      });
      if (centerTitle) {
        text(g, centerTitle, x, y + 34, {
          size: 18,
          font: FONTS.ui,
          weight: 800,
          color: '#FFB84D',
          spacing: 1.5,
        });
      }
    }

    // 5. Orthogonal Leader-Line Callout Badges Around Donut
    if (sweepU > 0.35) {
      const labelAlpha = clamp((sweepU - 0.35) / 0.45, 0, 1);
      g.save();
      g.globalAlpha *= labelAlpha;
      slices.forEach((s) => {
        if (!s.visible) return;
        const rMid = rx * ((1 + innerRatio) * 0.52);
        const anchorX = x + s.ox + Math.cos(s.midA) * rMid;
        const anchorY = y + s.oy + Math.sin(s.midA) * rMid * (ry / rx);

        const kneeX = x + s.ox + Math.cos(s.midA) * (rx + 48);
        const kneeY = y + s.oy + Math.sin(s.midA) * (ry + 42);
        const side = Math.cos(s.midA) >= 0 ? 1 : -1;
        const endX = kneeX + side * 68;
        const endY = kneeY;

        circle(g, anchorX, anchorY, 5, '#FFFFFF');
        seg(g, [[anchorX, anchorY], [kneeX, kneeY], [endX, endY]], 2.5, s.col);

        const pctStr = Math.round(s.frac * 100) + '%';
        const lblText = (s.d.label || 'Slice') + ' · ' + pctStr;
        if (UI.pillBadge) {
          UI.pillBadge(g, 1, {
            x: endX + side * 88,
            y: endY,
            text: lblText,
            subText: s.d.subText || '',
            border: s.col,
            scale: 0.82,
          });
        }
      });
      g.restore();
    }

    g.restore();
  }

  // ---------- 4. Multi-Axis Spider / Radar Chart (UI.chartRadar) ----------
  function chartRadar(g, lt = 0, o = {}) {
    const {
      x = 960,
      y = 560,
      r = 275,
      title = '',
      subTitle = '',
      axes = ['SPEED', 'EFFICIENCY', 'RANGE', 'DURABILITY', 'COST'],
      series = [], // [{ name: 'MODEL A', color: '#5CE1FF', values: [0.9, 0.8, 0.7, 0.85, 0.6] }]
      t0 = 0.1,
      dur = 1.1,
      card = true,
      w = 1280,
      h = 760,
    } = o;

    if (!axes || axes.length < 3) return;
    g.save();
    drawChartCard(g, x, y - 20, w, h, { title, subTitle, card });

    const n = axes.length;
    const rings = 5;

    // 1. Concentric Web Polygons
    for (let k = rings; k >= 1; k--) {
      const rk = (k / rings) * r;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        pts.push([x + Math.cos(ang) * rk, y + Math.sin(ang) * rk]);
      }
      poly(
        g,
        pts,
        k % 2 === 0 ? 'rgba(25, 38, 72, 0.35)' : 'rgba(15, 24, 48, 0.35)',
        'rgba(130, 175, 245, 0.22)',
        1.5
      );
    }

    // 2. Radial Spokes & Outer Axis Badges
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const ex = x + Math.cos(ang) * r;
      const ey = y + Math.sin(ang) * r;
      seg(g, [[x, y], [ex, ey]], 1.6, 'rgba(130, 175, 245, 0.28)');

      const lx = x + Math.cos(ang) * (r + 58);
      const ly = y + Math.sin(ang) * (r + 44);
      text(g, String(axes[i]), lx, ly, {
        size: 20,
        font: FONTS.ui,
        weight: 800,
        color: '#E2E8F0',
      });
    }

    // 3. Animated Radar Series Polygons
    const u = ease.outBack(clamp((lt - t0) / Math.max(0.1, dur), 0, 1));
    series.forEach((ser, sIdx) => {
      const col = ser.color || DEFAULT_SERIES_COLORS[sIdx % DEFAULT_SERIES_COLORS.length];
      const vals = ser.values || [];
      const pts = [];
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const val = clamp(Number(vals[i] !== undefined ? vals[i] : 0.5), 0, 1) * Math.max(0, u);
        pts.push([x + Math.cos(ang) * r * val, y + Math.sin(ang) * r * val]);
      }
      poly(g, pts, alpha(col, 0.28), col, 4);
      pts.forEach(([px, py]) => {
        glow(g, px, py, 16, col, 0.75);
        circle(g, px, py, 6, '#FFFFFF');
      });

      // Legend Pill
      if (ser.name && UI.pillBadge) {
        UI.pillBadge(g, 1, {
          x: x + w / 2 - 165,
          y: y - h / 2 + 120 + sIdx * 56,
          text: ser.name,
          border: col,
          scale: 0.82,
        });
      }
    });

    g.restore();
  }

  // ---------- 5. Animated Sankey / Supply-Chain Flow Diagram (UI.flowDiagram) ----------
  function flowDiagram(g, lt = 0, o = {}) {
    const {
      x = 960,
      y = 540,
      w = 1420,
      h = 760,
      title = '',
      subTitle = '',
      nodes = [], // [{ id: 'src', col: 0, row: 0, label: 'ENERGY INPUT', subText: '100 MW', color: '#FF8A3D' }]
      links = [], // [{ from: 'src', to: 'out1', value: 65, color: '#5CE1FF', label: '65%' }]
      t0 = 0.1,
      dur = 1.0,
      card = true,
    } = o;

    if (!nodes || !nodes.length) return;
    g.save();
    drawChartCard(g, x, y, w, h, { title, subTitle, card });

    const padX = 185;
    const padT = title ? 150 : 100;
    const padB = 90;
    const leftX = x - w / 2 + padX;
    const rightX = x + w / 2 - padX;
    const topY = y - h / 2 + padT;
    const botY = y + h / 2 - padB;

    const maxCol = Math.max(1, ...nodes.map((n) => n.col || 0));
    const colGroups = {};
    nodes.forEach((n) => {
      const c = n.col || 0;
      if (!colGroups[c]) colGroups[c] = [];
      colGroups[c].push(n);
    });

    const nodeMap = {};
    Object.keys(colGroups).forEach((cKey) => {
      const c = Number(cKey);
      const list = colGroups[cKey];
      list.forEach((nd, idx) => {
        const nx = nd.x !== undefined ? nd.x : lerp(leftX, rightX, c / maxCol);
        const ny =
          nd.y !== undefined
            ? nd.y
            : list.length === 1
            ? (topY + botY) * 0.5
            : lerp(topY + 40, botY - 40, idx / (list.length - 1));
        nodeMap[nd.id] = Object.assign({}, nd, { nx, ny });
      });
    });

    const flowU = ease.outCubic(clamp((lt - t0) / Math.max(0.1, dur), 0, 1));

    // 1. Render Bezier Flow Ribbons & Streaming Energy Particles
    links.forEach((lk, lIdx) => {
      const n0 = nodeMap[lk.from];
      const n1 = nodeMap[lk.to];
      if (!n0 || !n1) return;

      const x0 = n0.nx + 95;
      const y0 = n0.ny;
      const x1 = n1.nx - 95;
      const y1 = n1.ny;
      const cx0 = lerp(x0, x1, 0.48);
      const cx1 = lerp(x0, x1, 0.52);

      const col = lk.color || n0.color || '#5CE1FF';
      const ribbonW = clamp((lk.value || 30) * 0.52, 8, 52) * flowU;

      g.save();
      g.strokeStyle = alpha(col, 0.34);
      g.lineWidth = ribbonW;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x0, y0);
      g.bezierCurveTo(cx0, y0, cx1, y1, x1, y1);
      g.stroke();

      g.strokeStyle = alpha(col, 0.85);
      g.lineWidth = 3;
      g.stroke();

      // Animated Glowing Particles Streaming Along Ribbon
      for (let p = 0; p < 4; p++) {
        const uP = (lt * 0.45 + p * 0.25 + lIdx * 0.13) % 1;
        const inv = 1 - uP;
        const px =
          inv * inv * inv * x0 +
          3 * inv * inv * uP * cx0 +
          3 * inv * uP * uP * cx1 +
          uP * uP * uP * x1;
        const py =
          inv * inv * inv * y0 +
          3 * inv * inv * uP * y0 +
          3 * inv * uP * uP * y1 +
          uP * uP * uP * y1;
        glow(g, px, py, 18, col, 0.85);
        circle(g, px, py, 4.5, '#FFFFFF');
      }
      g.restore();
    });

    // 2. Render 3D-Shaded Node Blocks
    Object.values(nodeMap).forEach((nd, idx) => {
      const nw = 195;
      const nh = 78;
      const col = nd.color || DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length];
      const popS = DK.pop(lt, t0 + idx * 0.08, 0.38);

      g.save();
      g.translate(nd.nx, nd.ny);
      g.scale(popS, popS);

      rr(g, -nw / 2, -nh / 2 + 8, nw, nh, 18);
      g.fillStyle = 'rgba(0, 0, 0, 0.45)';
      g.fill();

      rr(g, -nw / 2, -nh / 2, nw, nh, 16);
      g.fillStyle = linGrad(g, 0, -nh / 2, 0, nh / 2, ['#1E2946', '#12192E']);
      g.fill();
      g.strokeStyle = col;
      g.lineWidth = 3;
      g.stroke();

      text(g, String(nd.label || nd.id), 0, nd.subText ? -10 : 0, {
        size: 20,
        font: FONTS.ui,
        weight: 900,
        color: '#FFFFFF',
      });
      if (nd.subText) {
        text(g, String(nd.subText), 0, 16, {
          size: 17,
          font: FONTS.mono,
          weight: 800,
          color: col,
        });
      }
      g.restore();
    });

    g.restore();
  }

  // ---------- 6. 3D Logarithmic Size-Comparison Arena (UI.scaleComparison) ----------
  function drawComparisonObject(g, x, y, hPx, item, lt = 0) {
    const kind = item.kind || 'monolith';
    const col = item.color || '#5CE1FF';
    g.save();
    g.translate(x, y);

    if (kind === 'human' && DK.char) {
      const charScale = hPx / 245;
      DK.char(g, {
        x: 0,
        y: 0,
        s: charScale,
        hairStyle: 'curlyCloud',
        hairColor: '#261C1A',
        skin: '#D69A72',
        wardrobe: 'sweater',
        topColor: '#F7B928',
        bottomColor: '#28808C',
        pose: 'admire',
        t: lt,
      });
      g.restore();
      return;
    }

    if ((kind === 'elephant' || kind === 'dino' || kind === 'dinosaur' || kind === 'horse') && DK.animal) {
      const animScale = hPx / 185;
      DK.animal(g, {
        kind: kind === 'dino' ? 'dinosaur' : kind,
        x: 0,
        y: 0,
        s: animScale,
        t: lt,
      });
      g.restore();
      return;
    }

    if (kind === 'gopuram' && window.FX && window.FX.structure3D) {
      window.FX.structure3D(g, 0, 0, hPx * 0.72, hPx, { kind: 'gopuram', t: lt });
      g.restore();
      return;
    }

    if (kind === 'sphere' || kind === 'planet' || kind === 'atom' || kind === 'cell') {
      const r = Math.max(8, hPx * 0.5);
      contactShadow(g, 0, 6, r * 0.85, 10, 0.38);
      glow(g, 0, -r, r * 1.25, col, 0.35);
      circle(g, 0, -r, r, sphereGrad(g, 0, -r, r, col, [-0.6, -0.7], 0.24));
      g.restore();
      return;
    }

    // Default 3D Extruded Comparison Monolith / Skyscraper / Pillar
    const wBar = Math.max(36, Math.min(180, hPx * 0.34));
    const dx = 18;
    const dy = -12;
    contactShadow(g, 0, 6, wBar * 0.75, 10, 0.38);

    // Front Face
    g.fillStyle = linGrad(g, -wBar / 2, -hPx, wBar / 2, 0, [
      shade(col, 0.18),
      col,
      shade(col, -0.24),
    ]);
    g.fillRect(-wBar / 2, -hPx, wBar, hPx);

    // Right 3D Face
    poly(
      g,
      [
        [wBar / 2, -hPx],
        [wBar / 2 + dx, -hPx + dy],
        [wBar / 2 + dx, dy],
        [wBar / 2, 0],
      ],
      shade(col, -0.32)
    );

    // Top Cap
    poly(
      g,
      [
        [-wBar / 2, -hPx],
        [wBar / 2, -hPx],
        [wBar / 2 + dx, -hPx + dy],
        [-wBar / 2 + dx, -hPx + dy],
      ],
      shade(col, 0.38)
    );
    g.restore();
  }

  function scaleComparison(g, lt = 0, o = {}) {
    const {
      title = '',
      subTitle = '',
      groundY = 855,
      items = [], // [{ label: 'HUMAN', sizeLabel: '1.7 m', value: 1.7, kind: 'human', color: '#F7B928' }, ...]
      t0 = 0.1,
      stagger = 0.18,
    } = o;

    if (!items || !items.length) return;
    g.save();

    // 1. 2.5D Perspective Measurement Arena Backdrop & Grid Floor
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, ['#081024', '#102044', '#0A152E']);
    g.fillRect(0, 0, E.W, E.H);

    // Back-wall horizontal ruler lines
    const maxVal = Math.max(1e-6, ...items.map((it) => Number(it.value || 1)));
    const maxPlotH = 560;
    for (let i = 0; i <= 5; i++) {
      const u = i / 5;
      const ry = groundY - u * maxPlotH;
      seg(g, [[120, ry], [E.W - 120, ry]], i === 0 ? 3 : 1.4, i === 0 ? '#5CE1FF' : 'rgba(120, 175, 245, 0.16)');
    }

    // Perspective Grid Floor below groundY
    g.fillStyle = linGrad(g, 0, groundY, 0, E.H, ['#122246', '#070E20']);
    g.fillRect(0, groundY, E.W, E.H - groundY);
    for (let gx = -200; gx <= E.W + 200; gx += 160) {
      seg(g, [[960 + (gx - 960) * 0.55, groundY], [gx, E.H]], 1.4, 'rgba(92, 225, 255, 0.16)');
    }

    if (title && UI.pillBadge) {
      UI.pillBadge(g, lt, {
        x: 960,
        y: 78,
        text: title,
        subText: subTitle,
        border: '#FFB84D',
      });
    }

    // 2. Render Side-by-Side 3D Scale Items + Height Dimension Brackets
    const n = items.length;
    const spanX = E.W - 380;
    const startX = 190 + (n === 1 ? spanX * 0.5 : 0);

    items.forEach((item, idx) => {
      const ix = n === 1 ? 960 : startX + (idx / (n - 1)) * spanX;
      const popU = ease.outBack(clamp((lt - (t0 + idx * stagger)) / 0.55, 0, 1));
      if (popU <= 0.001) return;

      const ratio = clamp(Number(item.value || 1) / maxVal, 0.04, 1);
      const hPx = ratio * maxPlotH * popU;
      const col = item.color || DEFAULT_SERIES_COLORS[idx % DEFAULT_SERIES_COLORS.length];

      drawComparisonObject(
        g,
        ix,
        groundY,
        hPx,
        Object.assign({}, item, { color: col }),
        lt
      );

      // Vertical Height Callout Line & Pill Badge Above Object
      const topY = groundY - hPx;
      seg(g, [[ix - 45, topY], [ix + 45, topY]], 2.2, col);
      if (UI.pillBadge) {
        UI.pillBadge(g, 1, {
          x: ix,
          y: Math.max(145, topY - 46),
          text: item.sizeLabel || String(item.value),
          subText: item.label || '',
          border: col,
          scale: 0.88 * Math.min(1, popU),
        });
      }
    });

    g.restore();
  }

  // ---------- 7. Export to Global Namespaces (window.CHARTS, window.UI, window.DK) ----------
  const CHARTS = (window.CHARTS = {
    DEFAULT_SERIES_COLORS,
    chartBar3D,
    chartLine,
    chartDonut3D,
    chartRadar,
    flowDiagram,
    scaleComparison,
  });

  Object.assign(UI, {
    chartBar3D,
    chartLine,
    chartDonut3D,
    chartRadar,
    flowDiagram,
    scaleComparison,
  });
  Object.assign(DK, {
    chartBar3D,
    chartLine,
    chartDonut3D,
    chartRadar,
    flowDiagram,
    scaleComparison,
  });
})();