// ============================================================================
// MODULE 11: LUMINA_PHYSICS (engine/lumina_physics.js) — Rapier-Grade 120Hz
// Deterministic Pre-Baked 2.5D Physics Engine (Pure HTML5 Canvas + JS):
//   1. PHY.rigidSim     — 120Hz Sequential-Impulse Rigid-Body & Joint Solver
//                         (True Rotational Inertia, OBB Corner Contacts, Coulomb
//                         Friction, Joints, Pyramids, Galton Boards, Newton's
//                         Cradle, Avalanches & Custom Rapier-style Bodies)
//   2. PHY.shatterWall  — Voronoi / Brick / Glass / Stone / Ice / Gold Wall
//                         Fracture + 120Hz Colliding Rubble Pile Solver
//   3. PHY.dominoChain  — Standard & Exponential 2.5D Domino Toppling Solver
//                         with True Contact Angles, Labels & Force Readouts
//   4. PHY.ropeSim      — 120Hz Verlet Rope, Pendulum, Wrecking Ball, Hanging
//                         Payloads (Lantern/Bell/Crate/Weight), Wind & Floor Bounce
//   5. PHY.scheduleImpacts — Frame-Accurate Collision -> LUMINA_SOUND Auto-Sync
// Logical Stage: 1920x1080 (16:9). 100% Deterministic O(1) Lookup via window.seek(t).
// Requires MODULE 1 (window.DK / window.H).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const UI = (window.UI = window.UI || {});
  const FX = (window.FX = window.FX || {});

  const {
    E,
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

  const _simCache = new Map();
  const SIM_FPS = 120;
  const DT = 1 / SIM_FPS;
  const SUBSTEPS = 6; // 720Hz effective constraint resolution (Rapier-grade stability)

  // Fast FNV-1a config hash so any parameter change invalidates stale cache entries
  function hashConfig(prefix, obj) {
    const str = prefix + ':' + JSON.stringify(obj);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return prefix + '_' + (h >>> 0).toString(36);
  }

  // Material Palettes (Lumina Soft-Volumetric 2.5D Shaded)
  const MATERIALS = {
    wood: { top: '#E09F5A', front: '#C67D38', side: '#94561E', border: '#6E3C10', restitution: 0.25, friction: 0.58, density: 1.0 },
    stone: { top: '#94A3B8', front: '#64748B', side: '#475569', border: '#334155', restitution: 0.16, friction: 0.74, density: 2.4 },
    brick: { top: '#D96B43', front: '#B84A27', side: '#873218', border: '#5E200D', restitution: 0.18, friction: 0.68, density: 2.0 },
    steel: { top: '#CBD5E1', front: '#94A3B8', side: '#475569', border: '#1E293B', restitution: 0.38, friction: 0.32, density: 4.5 },
    gold: { top: '#FFE066', front: '#F5B926', side: '#B87D0E', border: '#7C5205', restitution: 0.32, friction: 0.42, density: 6.0 },
    glass: { top: 'rgba(186,230,253,0.78)', front: 'rgba(125,211,252,0.58)', side: 'rgba(56,189,248,0.45)', border: '#E0F2FE', restitution: 0.48, friction: 0.16, density: 1.4 },
    ice: { top: '#E0F7FA', front: '#80DEEA', side: '#26C6DA', border: '#FFFFFF', restitution: 0.42, friction: 0.06, density: 0.9 },
    rubber: { top: '#FF6B8B', front: '#E11D48', side: '#9F1239', border: '#881337', restitution: 0.82, friction: 0.68, density: 1.1 },
  };

  function resolveMat(matOrName, customColor) {
    if (matOrName && typeof matOrName === 'object') return matOrName;
    const base = MATERIALS[matOrName] || MATERIALS.wood;
    if (!customColor) return base;
    return {
      top: shade(customColor, 0.22),
      front: customColor,
      side: shade(customColor, -0.22),
      border: shade(customColor, -0.42),
      restitution: base.restitution,
      friction: base.friction,
      density: base.density,
    };
  }

  function normalizeShape(rawShape) {
    if (!rawShape) return 'cuboid';
    const s = String(rawShape).toLowerCase();
    if (s === 'box' || s === 'cuboid' || s === 'crate' || s === 'pillarblock' || s === 'block') return 'cuboid';
    if (s === 'coin' || s === 'disc') return 'coin';
    return 'ball'; // 'sphere', 'ball', 'circle', 'boulder'
  }

  // ---------- 1. 2.5D Soft-Volumetric Primitive Renderers ----------
  function drawBox25D(g, x, y, w, h, rot = 0, matName = 'wood', o = {}) {
    const mat = resolveMat(matName, o.color);
    const depthX = o.depthX !== undefined ? o.depthX : 14;
    const depthY = o.depthY !== undefined ? o.depthY : -10;
    const hw = w * 0.5;
    const hh = h * 0.5;

    g.save();
    g.translate(x, y);
    g.rotate(rot);

    // 2.5D Extruded Top & Side Faces (Transformed so oblique extrusion stays consistent)
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const ldx = depthX * cos + depthY * sin;
    const ldy = -depthX * sin + depthY * cos;

    poly(
      g,
      [
        [-hw, -hh],
        [hw, -hh],
        [hw + ldx, -hh + ldy],
        [-hw + ldx, -hh + ldy],
      ],
      mat.top,
      mat.border,
      1.2
    );

    poly(
      g,
      [
        [hw, -hh],
        [hw + ldx, -hh + ldy],
        [hw + ldx, hh + ldy],
        [hw, hh],
      ],
      mat.side,
      mat.border,
      1.2
    );

    rr(g, -hw, -hh, w, h, o.radius !== undefined ? o.radius : 4);
    g.fillStyle = matName === 'glass'
      ? mat.front
      : cylinderGrad(g, -hw, -hh, hw, hh, mat.front, -1);
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = mat.border;
    g.stroke();

    if (o.style === 'crate' || matName === 'wood') {
      g.strokeStyle = alpha(mat.border, 0.45);
      g.lineWidth = 2;
      g.strokeRect(-hw + 5, -hh + 5, w - 10, h - 10);
      seg(g, [[-hw + 6, -hh + 6], [hw - 6, hh - 6]], 2, alpha(mat.border, 0.35));
      seg(g, [[hw - 6, -hh + 6], [-hw + 6, hh - 6]], 2, alpha(mat.border, 0.35));
    } else if (matName === 'glass' || matName === 'ice') {
      seg(g, [[-hw + 6, -hh + 6], [hw - 10, hh - 10]], 2.5, 'rgba(255,255,255,0.65)');
    } else if (matName === 'gold') {
      seg(g, [[-hw + 6, -hh + 5], [hw - 6, -hh + 5]], 2.5, 'rgba(255,255,255,0.75)');
    }

    if (o.label) {
      text(g, String(o.label), 0, 0, {
        size: Math.min(22, Math.max(12, w * 0.28)),
        font: FONTS.ui,
        weight: 900,
        color: '#FFFFFF',
        stroke: 3,
        strokeColor: 'rgba(0,0,0,0.65)',
      });
    }

    g.restore();
  }

  function drawSphere25D(g, x, y, r, rot = 0, matName = 'steel', o = {}) {
    const mat = resolveMat(matName, o.color);
    g.save();
    g.translate(x, y);
    g.rotate(rot);

    if (o.shape === 'coin') {
      ellipse(g, 4, 3, r, r * 0.78, '#9A6506');
      ellipse(g, 0, 0, r, r * 0.78, sphereGrad(g, 0, 0, r, o.color || '#FFD54F', [-0.6, -0.6], 0.32));
      g.strokeStyle = '#B87D0E';
      g.lineWidth = 2;
      g.stroke();
      ellipse(g, 0, 0, r * 0.66, r * 0.52, null);
      g.strokeStyle = '#FFF3B0';
      g.lineWidth = 1.4;
      g.stroke();
    } else {
      circle(g, 0, 0, r, sphereGrad(g, 0, 0, r, mat.front, [-0.6, -0.7], 0.28));
      ring(g, 0, 0, r, 1.5, alpha(mat.border, 0.55));
      circle(g, r * 0.46, 0, Math.max(2, r * 0.11), alpha('#FFFFFF', 0.45));
    }
    g.restore();
  }

  // ---------- 2. OBB / SAT & Inertia Helpers (Rapier-Style Rigid Solver) ----------
  function getBoxVertices(b) {
    const hw = b.w * 0.5;
    const hh = b.h * 0.5;
    const c = Math.cos(b.rot);
    const s = Math.sin(b.rot);
    return [
      { x: b.x + (-hw * c - -hh * s), y: b.y + (-hw * s + -hh * c) },
      { x: b.x + (hw * c - -hh * s), y: b.y + (hw * s + -hh * c) },
      { x: b.x + (hw * c - hh * s), y: b.y + (hw * s + hh * c) },
      { x: b.x + (-hw * c - hh * s), y: b.y + (-hw * s + hh * c) },
    ];
  }

  function applyContactImpulse(A, B, cx, cy, nx, ny, pen, slop = 0.6) {
    const invMassA = A.invMass;
    const invMassB = B ? B.invMass : 0;
    const invIA = A.invInertia;
    const invIB = B ? B.invInertia : 0;
    const totalInvMass = invMassA + invMassB;
    if (totalInvMass <= 0) return 0;

    // Baumgarte positional correction with slop to prevent stack jitter
    const corrMag = (Math.max(0, pen - slop) / totalInvMass) * 0.72;
    A.x -= nx * corrMag * invMassA;
    A.y -= ny * corrMag * invMassA;
    if (B) {
      B.x += nx * corrMag * invMassB;
      B.y += ny * corrMag * invMassB;
    }

    const rAx = cx - A.x;
    const rAy = cy - A.y;
    const rBx = B ? cx - B.x : 0;
    const rBy = B ? cy - B.y : 0;

    const vAx = A.vx - A.vRot * rAy;
    const vAy = A.vy + A.vRot * rAx;
    const vBx = B ? B.vx - B.vRot * rBy : 0;
    const vBy = B ? B.vy + B.vRot * rBx : 0;

    const rvx = vBx - vAx;
    const rvy = vBy - vAy;
    const vn = rvx * nx + rvy * ny;
    if (vn > 0) return 0;

    const rnA = rAx * ny - rAy * nx;
    const rnB = rBx * ny - rBy * nx;
    const kNormal = totalInvMass + rnA * rnA * invIA + rnB * rnB * invIB;

    const e = B
      ? Math.min(A.restitution, B.restitution)
      : A.restitution;
    // Restitution velocity threshold so resting contacts don't micro-bounce
    const effE = Math.abs(vn) < 65 ? 0 : e;
    const j = (-(1 + effE) * vn) / kNormal;

    const impX = j * nx;
    const impY = j * ny;

    A.vx -= impX * invMassA;
    A.vy -= impY * invMassA;
    A.vRot -= (rAx * impY - rAy * impX) * invIA;
    if (B) {
      B.vx += impX * invMassB;
      B.vy += impY * invMassB;
      B.vRot += (rBx * impY - rBy * impX) * invIB;
    }

    // Coulomb Tangential Friction Impulse
    const tx = -ny;
    const ty = nx;
    const vt = rvx * tx + rvy * ty;
    const rtA = rAx * ty - rAy * tx;
    const rtB = rBx * ty - rBy * tx;
    const kTangent = totalInvMass + rtA * rtA * invIA + rtB * rtB * invIB;
    let jt = -vt / kTangent;

    const mu = B ? Math.sqrt(A.friction * B.friction) : A.friction;
    const maxJt = j * mu;
    jt = clamp(jt, -maxJt, maxJt);

    const fImpX = jt * tx;
    const fImpY = jt * ty;
    A.vx -= fImpX * invMassA;
    A.vy -= fImpY * invMassA;
    A.vRot -= (rAx * fImpY - rAy * fImpX) * invIA;
    if (B) {
      B.vx += fImpX * invMassB;
      B.vy += fImpY * invMassB;
      B.vRot += (rBx * fImpY - rBy * fImpX) * invIB;
    }

    return Math.abs(vn);
  }

  // OBB vs OBB Separating Axis Theorem (SAT)
  function collideOBB(A, B) {
    const vertsA = getBoxVertices(A);
    const vertsB = getBoxVertices(B);
    const axes = [
      { x: Math.cos(A.rot), y: Math.sin(A.rot) },
      { x: -Math.sin(A.rot), y: Math.cos(A.rot) },
      { x: Math.cos(B.rot), y: Math.sin(B.rot) },
      { x: -Math.sin(B.rot), y: Math.cos(B.rot) },
    ];

    let minOverlap = Infinity;
    let bestAxis = null;

    for (let i = 0; i < 4; i++) {
      const ax = axes[i];
      let minA = Infinity, maxA = -Infinity;
      let minB = Infinity, maxB = -Infinity;
      for (let v = 0; v < 4; v++) {
        const pA = vertsA[v].x * ax.x + vertsA[v].y * ax.y;
        if (pA < minA) minA = pA;
        if (pA > maxA) maxA = pA;
        const pB = vertsB[v].x * ax.x + vertsB[v].y * ax.y;
        if (pB < minB) minB = pB;
        if (pB > maxB) maxB = pB;
      }
      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= 0) return null;
      if (overlap < minOverlap) {
        minOverlap = overlap;
        bestAxis = { x: ax.x, y: ax.y };
      }
    }

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    if (dx * bestAxis.x + dy * bestAxis.y < 0) {
      bestAxis.x = -bestAxis.x;
      bestAxis.y = -bestAxis.y;
    }

    // Find deepest penetrating vertex for accurate torque lever arm
    let bestPt = { x: (A.x + B.x) * 0.5, y: (A.y + B.y) * 0.5 };
    let maxScore = -Infinity;
    for (let v = 0; v < 4; v++) {
      const sA = (vertsA[v].x - A.x) * bestAxis.x + (vertsA[v].y - A.y) * bestAxis.y;
      if (sA > maxScore) {
        maxScore = sA;
        bestPt = vertsA[v];
      }
    }
    return { nx: bestAxis.x, ny: bestAxis.y, pen: minOverlap, cx: bestPt.x, cy: bestPt.y };
  }

  // ---------- 3. Scene Builder & 120Hz Rigid-Body + Joint Solver (PHY.rigidSim) ----------
  function buildPresetScene(preset, o) {
    const r = rng(o.seed || 42);
    const floorY = o.floorY !== undefined ? o.floorY : 840;
    const bodies = [];
    const joints = [];
    const colliders = [
      { x: 960, y: floorY + 30, w: 2800, h: 60, restitution: 0.35, friction: 0.78 },
    ];

    if (preset === 'pyramidCrash') {
      const rows = o.rows || 6;
      const boxW = o.boxW || 68;
      const boxH = o.boxH || 58;
      const baseX = o.stackX !== undefined ? o.stackX : 1120;
      const mat = o.material || 'wood';
      let idCounter = 1;

      for (let row = 0; row < rows; row++) {
        const cols = rows - row;
        const startX = baseX - ((cols - 1) * (boxW + 4)) * 0.5;
        const y = floorY - boxH * 0.5 - row * boxH;
        for (let col = 0; col < cols; col++) {
          bodies.push({
            id: 'crate_' + idCounter++,
            type: 'dynamic',
            shape: 'cuboid',
            material: row % 2 === 0 ? mat : o.altMaterial || mat,
            x: startX + col * (boxW + 4),
            y,
            w: boxW,
            h: boxH,
            vx: 0,
            vy: 0,
            rot: 0,
            vRot: 0,
            mass: 1.2,
            restitution: 0.22,
            friction: 0.62,
          });
        }
      }

      const launchDelay = o.impactTime !== undefined ? Math.max(0, o.impactTime - 0.38) : 0.15;
      bodies.push({
        id: 'striker_ball',
        type: 'dynamic',
        shape: 'ball',
        material: 'steel',
        x: o.ballX !== undefined ? o.ballX : 340,
        y: o.ballY !== undefined ? o.ballY : floorY - 195,
        r: o.ballR || 54,
        vx: o.ballVx !== undefined ? o.ballVx : 1380,
        vy: o.ballVy !== undefined ? o.ballVy : -160,
        rot: 0,
        vRot: 6.5,
        mass: 16.0,
        restitution: 0.42,
        friction: 0.25,
        wakeTime: launchDelay,
      });
    } else if (preset === 'newtonsCradle') {
      const count = o.count || 5;
      const ballR = o.ballR || 42;
      const spacing = ballR * 2.02;
      const startX = 960 - ((count - 1) * spacing) * 0.5;
      const anchorY = o.anchorY || 220;
      const ropeLen = o.length || 380;

      for (let i = 0; i < count; i++) {
        const ax = startX + i * spacing;
        const pullAngle = i === 0 ? -0.95 : 0;
        const bx = ax + Math.sin(pullAngle) * ropeLen;
        const by = anchorY + Math.cos(pullAngle) * ropeLen;
        bodies.push({
          id: 'cradle_' + i,
          type: 'dynamic',
          shape: 'ball',
          material: 'steel',
          x: bx,
          y: by,
          r: ballR,
          vx: 0,
          vy: 0,
          rot: 0,
          vRot: 0,
          mass: 4.0,
          restitution: 0.98,
          friction: 0.02,
        });
        joints.push({
          type: 'distance',
          bodyA: 'cradle_' + i,
          anchorB: [ax, anchorY],
          length: ropeLen,
          stiffness: 1.0,
        });
      }
    } else if (preset === 'avalanche') {
      colliders.push(
        { x: 520, y: 560, w: 860, h: 36, rot: 0.34, restitution: 0.35, friction: 0.55 },
        { x: 1480, y: floorY - 36, w: 90, h: 72, restitution: 0.3, friction: 0.65 }
      );
      const count = o.count || 18;
      for (let i = 0; i < count; i++) {
        const isRock = i % 3 !== 0;
        const rad = 26 + r() * 24;
        bodies.push({
          id: 'av_' + i,
          type: 'dynamic',
          shape: isRock ? 'ball' : 'cuboid',
          material: isRock ? 'stone' : 'wood',
          x: 180 + (i % 5) * 72 + (r() - 0.5) * 20,
          y: 160 - Math.floor(i / 5) * 75,
          r: rad,
          w: rad * 1.75,
          h: rad * 1.55,
          vx: 160 + r() * 140,
          vy: 40 + r() * 80,
          rot: r() * Math.PI,
          vRot: (r() - 0.5) * 4,
          mass: rad * 0.08,
          restitution: 0.36,
          friction: 0.48,
          wakeTime: i * 0.06,
        });
      }
    } else if (preset === 'galtonBoard') {
      const pegRows = 6;
      const centerX = 960;
      const topY = 250;
      const rowSpacing = 68;
      const colSpacing = 76;

      for (let row = 0; row < pegRows; row++) {
        const cols = row + 3;
        const startX = centerX - ((cols - 1) * colSpacing) * 0.5;
        for (let col = 0; col < cols; col++) {
          colliders.push({
            shape: 'peg',
            x: startX + col * colSpacing,
            y: topY + row * rowSpacing,
            r: 10,
            restitution: 0.62,
          });
        }
      }
      for (let b = -4; b <= 4; b++) {
        colliders.push({
          x: centerX + b * colSpacing,
          y: floorY - 75,
          w: 10,
          h: 150,
          restitution: 0.2,
        });
      }
      const ballCount = o.count || 28;
      for (let i = 0; i < ballCount; i++) {
        bodies.push({
          id: 'bead_' + i,
          type: 'dynamic',
          shape: 'ball',
          material: i % 2 === 0 ? 'gold' : 'rubber',
          x: centerX + (r() - 0.5) * 48,
          y: 130 - (i % 4) * 26,
          r: 14,
          vx: (r() - 0.5) * 45,
          vy: 20,
          rot: 0,
          vRot: 0,
          mass: 1.0,
          restitution: 0.52,
          friction: 0.15,
          wakeTime: i * 0.085,
        });
      }
    } else if (preset === 'coinCascade') {
      const count = o.count || 26;
      for (let i = 0; i < count; i++) {
        bodies.push({
          id: 'coin_' + i,
          type: 'dynamic',
          shape: 'coin',
          material: 'gold',
          x: 680 + (i % 6) * 105 + (r() - 0.5) * 32,
          y: 120 - Math.floor(i / 6) * 85,
          r: 28,
          vx: (r() - 0.5) * 120,
          vy: 60 + r() * 80,
          rot: (r() - 0.5) * 0.6,
          vRot: (r() - 0.5) * 5,
          mass: 1.5,
          restitution: 0.36,
          friction: 0.45,
          wakeTime: i * 0.055,
        });
      }
    }

    if (Array.isArray(o.bodies)) {
      o.bodies.forEach((b, idx) => {
        const normShape = normalizeShape(b.shape);
        const w = b.w || (b.r ? b.r * 2 : 70);
        const h = b.h || (b.r ? b.r * 2 : 70);
        const rad = b.r || Math.min(w, h) * 0.5;
        bodies.push(
          Object.assign(
            {
              id: 'custom_' + idx,
              type: 'dynamic',
              material: 'wood',
              x: 960,
              y: 300,
              vx: 0,
              vy: 0,
              rot: 0,
              vRot: 0,
              mass: 1.5,
              restitution: 0.35,
              friction: 0.55,
              wakeTime: 0,
            },
            b,
            { shape: normShape, w, h, r: rad }
          )
        );
      });
    }

    if (Array.isArray(o.colliders)) {
      o.colliders.forEach((c) => colliders.push(c));
    }
    if (Array.isArray(o.joints)) {
      o.joints.forEach((j) => joints.push(j));
    }

    // Precompute mass & true rotational inertia tensors (Rapier-style)
    bodies.forEach((b) => {
      if (b.type === 'fixed' || b.type === 'kinematicPosition') {
        b.invMass = 0;
        b.invInertia = 0;
      } else {
        const m = Math.max(0.05, b.mass || 1.0);
        b.invMass = 1 / m;
        const inertia =
          b.shape === 'cuboid'
            ? (m * (b.w * b.w + b.h * b.h)) / 12
            : 0.5 * m * b.r * b.r;
        b.invInertia = b.lockRotations ? 0 : 1 / Math.max(1, inertia);
      }
    });

    return { bodies, colliders, joints, floorY };
  }

  function bakeRigidSim(o = {}) {
    // Only default to 'pyramidCrash' if custom bodies were NOT provided!
    const preset = o.preset || (Array.isArray(o.bodies) && o.bodies.length > 0 ? 'custom' : 'pyramidCrash');
    const cacheKey = hashConfig('RIGID', Object.assign({ preset }, o));
    if (_simCache.has(cacheKey)) return _simCache.get(cacheKey);

    const maxDur = o.duration || 6.0;
    const totalFrames = Math.ceil(maxDur * SIM_FPS);
    const gravity = o.gravity !== undefined ? o.gravity : 1480;
    const scene = buildPresetScene(preset, o);
    const { bodies, colliders, joints, floorY } = scene;
    const bodyMap = new Map(bodies.map((b) => [b.id, b]));

    const frames = [];
    const impacts = [];
    let lastImpactTime = -1;
    const subDt = DT / SUBSTEPS;

    for (let f = 0; f <= totalFrames; f++) {
      const simT = f * DT;

      for (let sub = 0; sub < SUBSTEPS; sub++) {
        // 1. Symplectic Euler Velocity & Position Step
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (b.type === 'fixed' || (b.wakeTime && simT < b.wakeTime)) continue;

          b.vy += gravity * (b.gravityScale !== undefined ? b.gravityScale : 1) * subDt;
          b.vx *= Math.pow(1 - (b.linearDamping || 0.002), 1 / SUBSTEPS);
          b.vy *= Math.pow(1 - (b.linearDamping || 0.002), 1 / SUBSTEPS);
          b.vRot *= Math.pow(1 - (b.angularDamping || 0.012), 1 / SUBSTEPS);

          b.x += b.vx * subDt;
          b.y += b.vy * subDt;
          b.rot += b.vRot * subDt;
        }

        // 2. Solve Joint Constraints (Distance, Rope, Spring)
        for (let jIdx = 0; jIdx < joints.length; jIdx++) {
          const j = joints[jIdx];
          if (j.cutTime !== undefined && simT >= j.cutTime) continue;
          const A = bodyMap.get(j.bodyA);
          const B = j.bodyB ? bodyMap.get(j.bodyB) : null;
          if (!A) continue;
          const bx = B ? B.x : j.anchorB[0];
          const by = B ? B.y : j.anchorB[1];
          const dx = bx - A.x;
          const dy = by - A.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const targetLen = j.length || 200;
          if (j.type === 'rope' && dist <= targetLen) continue;

          const nx = dx / dist;
          const ny = dy / dist;
          const err = dist - targetLen;

          if (j.type === 'spring') {
            const kSpring = j.stiffness || 45;
            const damp = j.damping || 4;
            const rvx = (B ? B.vx : 0) - A.vx;
            const rvy = (B ? B.vy : 0) - A.vy;
            const fMag = err * kSpring + (rvx * nx + rvy * ny) * damp;
            A.vx += nx * fMag * A.invMass * subDt;
            A.vy += ny * fMag * A.invMass * subDt;
            if (B) {
              B.vx -= nx * fMag * B.invMass * subDt;
              B.vy -= ny * fMag * B.invMass * subDt;
            }
          } else {
            const wSum = A.invMass + (B ? B.invMass : 0) || 1;
            const corr = err / wSum;
            A.x += nx * corr * A.invMass;
            A.y += ny * corr * A.invMass;
            if (B) {
              B.x -= nx * corr * B.invMass;
              B.y -= ny * corr * B.invMass;
            }
            const rvx = (B ? B.vx : 0) - A.vx;
            const rvy = (B ? B.vy : 0) - A.vy;
            const vn = rvx * nx + rvy * ny;
            const jImp = vn / wSum;
            A.vx += nx * jImp * A.invMass;
            A.vy += ny * jImp * A.invMass;
            if (B) {
              B.vx -= nx * jImp * B.invMass;
              B.vy -= ny * jImp * B.invMass;
            }
          }
        }

        // 3. Body vs. Floor & Static Colliders (OBB Corner-Aware)
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (b.type === 'fixed' || (b.wakeTime && simT < b.wakeTime)) continue;

          if (b.shape === 'cuboid') {
            const verts = getBoxVertices(b);
            for (let v = 0; v < 4; v++) {
              const vt = verts[v];
              if (vt.y > floorY) {
                const hitSpeed = applyContactImpulse(b, null, vt.x, floorY, 0, 1, vt.y - floorY);
                if (hitSpeed > 210 && simT - lastImpactTime > 0.045) {
                  impacts.push({ t: simT, x: vt.x, y: floorY, strength: clamp(hitSpeed / 950, 0.2, 1), mat: b.material });
                  lastImpactTime = simT;
                }
              }
            }
          } else {
            const radY = b.shape === 'coin' ? b.r * 0.78 : b.r;
            if (b.y + radY > floorY) {
              const hitSpeed = applyContactImpulse(b, null, b.x, floorY, 0, 1, b.y + radY - floorY);
              if (hitSpeed > 210 && simT - lastImpactTime > 0.045) {
                impacts.push({ t: simT, x: b.x, y: floorY, strength: clamp(hitSpeed / 950, 0.2, 1), mat: b.material });
                lastImpactTime = simT;
              }
            }
          }

          // Static Pegs / Ramps / Walls
          for (let cIdx = 1; cIdx < colliders.length; cIdx++) {
            const col = colliders[cIdx];
            const radX = b.shape === 'cuboid' ? b.w * 0.5 : b.r;
            const radY = b.shape === 'cuboid' ? b.h * 0.5 : b.shape === 'coin' ? b.r * 0.78 : b.r;

            if (col.shape === 'peg') {
              const dx = b.x - col.x;
              const dy = b.y - col.y;
              const dist = Math.hypot(dx, dy) || 0.001;
              const minDist = radX + col.r;
              if (dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const hitSpeed = applyContactImpulse(b, null, col.x + nx * col.r, col.y + ny * col.r, -nx, -ny, minDist - dist, 0.1);
                if (hitSpeed > 150 && simT - lastImpactTime > 0.04) {
                  impacts.push({ t: simT, x: col.x, y: col.y, strength: 0.45, mat: b.material });
                  lastImpactTime = simT;
                }
              }
            } else if (col.rot) {
              const cos = Math.cos(-col.rot);
              const sin = Math.sin(-col.rot);
              const lx = (b.x - col.x) * cos - (b.y - col.y) * sin;
              const ly = (b.x - col.x) * sin + (b.y - col.y) * cos;
              const hw = col.w * 0.5;
              const hh = col.h * 0.5;
              if (Math.abs(lx) < hw + radX && Math.abs(ly) < hh + radY) {
                const penY = hh + radY - Math.abs(ly);
                const nyLocal = ly < 0 ? -1 : 1;
                const wx = -nyLocal * Math.sin(col.rot);
                const wy = nyLocal * Math.cos(col.rot);
                applyContactImpulse(b, null, b.x - wx * radY, b.y - wy * radY, -wx, -wy, penY);
              }
            } else {
              const hw = col.w * 0.5;
              const hh = col.h * 0.5;
              const dx = b.x - col.x;
              const dy = b.y - col.y;
              const ox = hw + radX - Math.abs(dx);
              const oy = hh + radY - Math.abs(dy);
              if (ox > 0 && oy > 0) {
                if (ox < oy) {
                  const sx = dx < 0 ? 1 : -1;
                  applyContactImpulse(b, null, b.x, b.y, sx, 0, ox);
                } else {
                  const sy = dy < 0 ? 1 : -1;
                  applyContactImpulse(b, null, b.x, b.y, 0, sy, oy);
                }
              }
            }
          }
        }

        // 4. Dynamic Body vs. Dynamic Body Impulse Resolution (OBB & Sphere)
        for (let i = 0; i < bodies.length; i++) {
          const A = bodies[i];
          if (A.wakeTime && simT < A.wakeTime) continue;

          for (let j = i + 1; j < bodies.length; j++) {
            const B = bodies[j];
            if (B.wakeTime && simT < B.wakeTime) continue;

            // Broadphase AABB check
            const boundA = A.shape === 'cuboid' ? Math.hypot(A.w, A.h) * 0.5 : A.r;
            const boundB = B.shape === 'cuboid' ? Math.hypot(B.w, B.h) * 0.5 : B.r;
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            if (Math.abs(dx) > boundA + boundB || Math.abs(dy) > boundA + boundB) continue;

            let contact = null;
            if (A.shape === 'cuboid' && B.shape === 'cuboid') {
              contact = collideOBB(A, B);
            } else if (A.shape !== 'cuboid' && B.shape !== 'cuboid') {
              const dist = Math.hypot(dx, dy) || 0.001;
              const rA = A.shape === 'coin' ? A.r * 0.85 : A.r;
              const rB = B.shape === 'coin' ? B.r * 0.85 : B.r;
              if (dist < rA + rB) {
                const nx = dx / dist;
                const ny = dy / dist;
                contact = { nx, ny, pen: rA + rB - dist, cx: A.x + nx * rA, cy: A.y + ny * rA };
              }
            } else {
              // Sphere vs Rotated Cuboid
              const box = A.shape === 'cuboid' ? A : B;
              const sph = A.shape === 'cuboid' ? B : A;
              const sign = A.shape === 'cuboid' ? 1 : -1;
              const c = Math.cos(-box.rot);
              const s = Math.sin(-box.rot);
              const lx = (sph.x - box.x) * c - (sph.y - box.y) * s;
              const ly = (sph.x - box.x) * s + (sph.y - box.y) * c;
              const hw = box.w * 0.5;
              const hh = box.h * 0.5;
              const clx = clamp(lx, -hw, hw);
              const cly = clamp(ly, -hh, hh);
              const dlx = lx - clx;
              const dly = ly - cly;
              const dist = Math.hypot(dlx, dly) || 0.0001;
              if (dist < sph.r) {
                const lnx = dist > 0.001 ? dlx / dist : 0;
                const lny = dist > 0.001 ? dly / dist : -1;
                const wnx = (lnx * c + lny * -s) * sign;
                const wny = (lnx * -s + lny * c) * sign;
                const wcx = box.x + (clx * c - cly * -s);
                const wcy = box.y + (-clx * s + cly * c);
                contact = { nx: wnx, ny: wny, pen: sph.r - dist, cx: wcx, cy: wcy };
              }
            }

            if (contact) {
              const hitSpeed = applyContactImpulse(A, B, contact.cx, contact.cy, contact.nx, contact.ny, contact.pen);
              if (hitSpeed > 210 && simT - lastImpactTime > 0.038) {
                impacts.push({
                  t: simT,
                  x: contact.cx,
                  y: contact.cy,
                  strength: clamp(hitSpeed / 1100, 0.25, 1),
                  mat: A.material,
                });
                lastImpactTime = simT;
              }
            }
          }
        }
      }

      frames.push(
        bodies.map((b) => ({
          id: b.id,
          shape: b.shape,
          material: b.material,
          color: b.color,
          label: b.label,
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          r: b.r,
          rot: b.rot,
          vx: b.vx,
          vy: b.vy,
          awake: !b.wakeTime || simT >= b.wakeTime,
        }))
      );
    }

    const result = { frames, colliders, joints, impacts, floorY, preset };
    _simCache.set(cacheKey, result);
    return result;
  }

  function rigidSim(g, lt = 0, o = {}) {
    const sim = bakeRigidSim(o);
    const fIdx = clamp(Math.floor(Math.max(0, lt) * SIM_FPS), 0, sim.frames.length - 1);
    const fNext = Math.min(fIdx + 1, sim.frames.length - 1);
    const frac = clamp(lt * SIM_FPS - fIdx, 0, 1);

    const stateA = sim.frames[fIdx];
    const stateB = sim.frames[fNext];

    g.save();

    // 1. Render Static Colliders
    for (let i = 1; i < sim.colliders.length; i++) {
      const col = sim.colliders[i];
      if (col.shape === 'peg') {
        circle(g, col.x, col.y, col.r, sphereGrad(g, col.x, col.y, col.r, '#F5B942'));
      } else {
        drawBox25D(g, col.x, col.y, col.w, col.h, col.rot || 0, 'stone');
      }
    }

    // 2. Render Joint Cables / Springs
    if (sim.joints && sim.joints.length > 0) {
      sim.joints.forEach((j) => {
        if (j.cutTime !== undefined && lt >= j.cutTime) return;
        const idxA = stateA.findIndex((b) => b.id === j.bodyA);
        if (idxA < 0) return;
        const ax = lerp(stateA[idxA].x, stateB[idxA].x, frac);
        const ay = lerp(stateA[idxA].y, stateB[idxA].y, frac);
        let bx = j.anchorB ? j.anchorB[0] : ax;
        let by = j.anchorB ? j.anchorB[1] : ay - 200;
        if (j.bodyB) {
          const idxB = stateA.findIndex((b) => b.id === j.bodyB);
          if (idxB >= 0) {
            bx = lerp(stateA[idxB].x, stateB[idxB].x, frac);
            by = lerp(stateA[idxB].y, stateB[idxB].y, frac);
          }
        }
        seg(g, [[ax, ay], [bx, by]], 4, '#CBD5E1');
        if (j.anchorB) circle(g, bx, by, 7, '#64748B');
      });
    }

    // 3. Ground Contact Shadows
    for (let i = 0; i < stateA.length; i++) {
      const a = stateA[i];
      if (!a.awake) continue;
      const b = stateB[i];
      const bx = lerp(a.x, b.x, frac);
      const by = lerp(a.y, b.y, frac);
      const hDist = Math.max(0, sim.floorY - by);
      if (hDist < 240) {
        const sFactor = 1 - hDist / 240;
        const rx = (a.w ? a.w * 0.6 : a.r * 1.1) * sFactor;
        contactShadow(g, bx, sim.floorY + 3, rx, rx * 0.22, 0.28 * sFactor);
      }
    }

    // 4. Render Dynamic 2.5D Bodies
    for (let i = 0; i < stateA.length; i++) {
      const a = stateA[i];
      if (!a.awake) continue;
      const b = stateB[i];
      const bx = lerp(a.x, b.x, frac);
      const by = lerp(a.y, b.y, frac);
      const brot = lerp(a.rot, b.rot, frac);

      if (a.shape === 'cuboid') {
        drawBox25D(g, bx, by, a.w, a.h, brot, a.material, { style: 'crate', color: a.color, label: a.label });
      } else {
        drawSphere25D(g, bx, by, a.r, brot, a.material, { shape: a.shape, color: a.color });
      }

      if (o.showVectors && Math.hypot(a.vx, a.vy) > 45) {
        const vx = a.vx * 0.08;
        const vy = a.vy * 0.08;
        seg(g, [[bx, by], [bx + vx, by + vy]], 3, '#5CE1FF');
        circle(g, bx + vx, by + vy, 4.5, '#FFFFFF');
      }
    }

    // 5. Render Impact Shockwaves
    if (o.showContacts !== false) {
      sim.impacts.forEach((imp) => {
        const age = lt - imp.t;
        if (age >= 0 && age < 0.28) {
          const u = age / 0.28;
          const rad = lerp(8, 68 * imp.strength, ease.out(u));
          ring(g, imp.x, imp.y, rad, 3 * (1 - u), alpha('#FFD54F', (1 - u) * 0.85));
          glow(g, imp.x, imp.y, rad * 0.8, '#FF9E2C', (1 - u) * 0.45);
        }
      });
    }

    g.restore();
  }

  // ---------- 4. 120Hz Colliding Voronoi / Brick Wall Shatter Solver (PHY.shatterWall) ----------
  function bakeShatterWall(o = {}) {
    const cacheKey = hashConfig('SHATTER', o);
    if (_simCache.has(cacheKey)) return _simCache.get(cacheKey);

    const x = o.x !== undefined ? o.x : 960;
    const y = o.y !== undefined ? o.y : 840;
    const w = o.w || 420;
    const h = o.h || 340;
    const cols = o.cols || 7;
    const rows = o.rows || 8;
    const matName = o.material || 'brick';
    const mat = resolveMat(matName, o.color);
    const impactTime = o.impactTime !== undefined ? o.impactTime : 1.0;
    const impactPoint = o.impactPoint || [x, y - h * 0.55];
    const force = o.force || 920;
    const floorY = o.floorY !== undefined ? o.floorY : y;
    const gravity = o.gravity || 1650;
    const r = rng(o.seed || 77);

    const shards = [];
    const cellW = w / cols;
    const cellH = h / rows;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = x - w * 0.5 + (col + 0.5) * cellW + (row % 2 === 1 && matName === 'brick' ? cellW * 0.15 : 0);
        const cy = y - h + (row + 0.5) * cellH;
        const dx = cx - impactPoint[0];
        const dy = cy - impactPoint[1];
        const dist = Math.hypot(dx, dy) || 1;
        const falloff = clamp(1 - dist / (Math.max(w, h) * 0.95), 0.18, 1);
        const ang = Math.atan2(dy, dx) + (r() - 0.5) * 0.45;
        const speed = force * falloff * (0.55 + r() * 0.75);

        const pts = [];
        const vCount = matName === 'brick' ? 4 : 6;
        for (let v = 0; v < vCount; v++) {
          const va = (v / vCount) * Math.PI * 2 + (matName === 'brick' ? Math.PI * 0.25 : (r() - 0.5) * 0.35);
          const rx = cellW * (matName === 'brick' ? 0.68 : 0.48 + r() * 0.22);
          const ry = cellH * (matName === 'brick' ? 0.68 : 0.48 + r() * 0.22);
          pts.push([Math.cos(va) * rx, Math.sin(va) * ry]);
        }

        shards.push({
          x: cx,
          y: cy,
          w: cellW * 0.92,
          h: cellH * 0.9,
          r: Math.min(cellW, cellH) * 0.44,
          pts,
          vx: Math.cos(ang) * speed + (r() - 0.5) * 240,
          vy: Math.sin(ang) * speed - (180 + r() * 260) * falloff,
          rot: 0,
          vRot: (r() - 0.5) * 14 * falloff,
          restitution: mat.restitution,
          friction: mat.friction,
          shadeOffset: (r() - 0.5) * 0.14,
        });
      }
    }

    // Pre-bake 120Hz post-impact debris with shard-vs-floor and shard-vs-shard collisions
    const maxPostDur = (o.duration || 5.5) - impactTime;
    const totalPostFrames = Math.max(10, Math.ceil(maxPostDur * SIM_FPS));
    const postFrames = [];

    for (let f = 0; f <= totalPostFrames; f++) {
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        s.vy += gravity * DT;
        s.x += s.vx * DT;
        s.y += s.vy * DT;
        s.rot += s.vRot * DT;

        if (s.y + s.r > floorY) {
          s.y = floorY - s.r;
          if (s.vy > 0) {
            s.vy = -s.vy * s.restitution;
            s.vx *= 1 - s.friction * 0.25;
            s.vRot *= 0.72;
            if (Math.abs(s.vy) < 35) s.vy = 0;
          }
        }
      }

      // Shard-vs-Shard Rubble Pile Separation
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < shards.length; i++) {
          const A = shards[i];
          for (let j = i + 1; j < shards.length; j++) {
            const B = shards[j];
            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const minDist = (A.r + B.r) * 0.88;
            if (Math.abs(dx) < minDist && Math.abs(dy) < minDist) {
              const dist = Math.hypot(dx, dy) || 0.01;
              if (dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const pen = (minDist - dist) * 0.45;
                A.x -= nx * pen;
                A.y -= ny * pen;
                B.x += nx * pen;
                B.y += ny * pen;
                const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
                if (vn < 0) {
                  const imp = -0.6 * vn;
                  A.vx -= nx * imp;
                  A.vy -= ny * imp;
                  B.vx += nx * imp;
                  B.vy += ny * imp;
                }
              }
            }
          }
        }
      }

      postFrames.push(shards.map((s) => ({ x: s.x, y: s.y, rot: s.rot })));
    }

    const result = { x, y, w, h, matName, mat, impactTime, impactPoint, shards, postFrames, floorY };
    _simCache.set(cacheKey, result);
    return result;
  }

  function shatterWall(g, lt = 0, o = {}) {
    const sim = bakeShatterWall(o);
    const impactTime = sim.impactTime;
    const floorY = sim.floorY;

    g.save();
    contactShadow(g, sim.x, floorY + 5, sim.w * 0.62, 14, 0.32);

    if (lt < impactTime) {
      drawBox25D(g, sim.x, sim.y - sim.h * 0.5, sim.w, sim.h, 0, sim.matName, { depthX: 22, depthY: -14, color: o.color });
      if (lt > impactTime - 0.15) {
        const uCrack = (lt - (impactTime - 0.15)) / 0.15;
        const [ix, iy] = sim.impactPoint;
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2;
          const len = 95 * uCrack;
          seg(g, [[ix, iy], [ix + Math.cos(ang) * len, iy + Math.sin(ang) * len]], 2.5, '#FFF3B0');
        }
      }
    } else {
      const dt = lt - impactTime;
      if (dt < 0.38) {
        const u = dt / 0.38;
        const [ix, iy] = sim.impactPoint;
        glow(g, ix, iy, 220 * (1 - u), '#FFB84D', (1 - u) * 0.85);
        ring(g, ix, iy, lerp(20, 320, ease.out(u)), 6 * (1 - u), alpha('#FFFFFF', 1 - u));
      }

      const fIdx = clamp(Math.floor(dt * SIM_FPS), 0, sim.postFrames.length - 1);
      const snap = sim.postFrames[fIdx];

      sim.shards.forEach((sh, idx) => {
        const st = snap[idx];
        if (sim.matName === 'brick' || sim.matName === 'gold') {
          drawBox25D(g, st.x, st.y, sh.w, sh.h, st.rot, sim.matName, { depthX: 8, depthY: -6, color: o.color });
        } else {
          g.save();
          g.translate(st.x, st.y);
          g.rotate(st.rot);
          poly(g, sh.pts.map(([px, py]) => [px + 6, py - 5]), sim.mat.side, sim.mat.border, 1);
          poly(g, sh.pts, shade(sim.mat.front, sh.shadeOffset), sim.mat.border, 1.5);
          g.restore();
        }
      });
    }

    g.restore();
  }

  // ---------- 5. Kinematic & Labeled Domino Chain Solver (PHY.dominoChain) ----------
  function dominoChain(g, lt = 0, o = {}) {
    // Support BOTH MASTER_PROMPT.md aliases (x0, x1, y, triggerTime, labels, color) AND native props!
    const mode = o.mode || (Array.isArray(o.labels) && o.labels.length > 0 ? 'standard' : 'exponential');
    const count = o.count || (Array.isArray(o.labels) ? Math.max(8, o.labels.length) : 9);
    const startX = o.x0 !== undefined ? o.x0 : o.startX !== undefined ? o.startX : 280;
    const endX = o.x1 !== undefined ? o.x1 : o.endX !== undefined ? o.endX : 1620;
    const floorY = o.y !== undefined ? o.y : o.floorY !== undefined ? o.floorY : 840;
    const startTime = o.triggerTime !== undefined ? o.triggerTime : o.startTime !== undefined ? o.startTime : 0.25;
    const stepDelay = o.stepDelay || 0.22;
    const material = o.material || 'gold';
    const labels = Array.isArray(o.labels) ? o.labels : [];

    g.save();

    const dominoes = [];
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0.5 : i / (count - 1);
      const scale = mode === 'exponential' ? Math.pow(1.34, i) * 0.42 : 1.0;
      const x = mode === 'exponential'
        ? lerp(startX, endX, Math.pow(u, 1.28))
        : lerp(startX, endX, u);
      const w = Math.max(16, 30 * scale);
      const h = Math.max(58, (mode === 'standard' ? 210 : 145) * scale);
      const label = labels.length > 0
        ? labels[Math.floor((i / count) * labels.length)]
        : null;
      dominoes.push({ x, w, h, scale, hitTime: startTime + i * stepDelay, label });
    }

    for (let i = 0; i < dominoes.length; i++) {
      const d = dominoes[i];
      const nextD = dominoes[i + 1];
      const dt = lt - d.hitTime;

      let angle = 0;
      if (dt > 0) {
        const gap = nextD ? Math.max(10, nextD.x - d.x - d.w) : d.h;
        const restAngle = nextD ? clamp(Math.asin(clamp(gap / d.h, 0.25, 0.92)) + 0.38, 0.95, 1.28) : 1.48;
        const fallDur = nextD ? stepDelay * 1.35 : 0.36;
        angle = lerp(0, restAngle, ease.in(clamp(dt / fallDur, 0, 1)));
      }

      contactShadow(g, d.x + Math.sin(angle) * d.h * 0.45, floorY + 4, d.w * 1.4 + Math.sin(angle) * d.h * 0.4, 9, 0.3);

      g.save();
      g.translate(d.x + d.w * 0.5, floorY);
      g.rotate(angle);
      drawBox25D(g, -d.w * 0.5, -d.h * 0.5, d.w, d.h, 0, i === count - 1 ? 'gold' : material, {
        depthX: Math.max(6, 14 * d.scale),
        depthY: Math.min(-4, -9 * d.scale),
        color: o.color,
      });

      // Render Domino Face Label if provided in MASTER_PROMPT.md
      if (d.label && (i === 0 || d.label !== dominoes[i - 1].label)) {
        pillBadgeSafe(g, -d.w * 0.5, -d.h - 28, d.label, '#FFD54F');
      }
      g.restore();

      if (nextD) {
        const strikeAge = lt - nextD.hitTime;
        if (strikeAge >= 0 && strikeAge < 0.22) {
          const su = strikeAge / 0.22;
          const sx = nextD.x - nextD.w * 0.5;
          const sy = floorY - d.h * 0.72;
          glow(g, sx, sy, 48 * d.scale * (1 - su), '#FFD54F', (1 - su) * 0.85);
          ring(g, sx, sy, 32 * d.scale * su, 3 * (1 - su), alpha('#FFFFFF', 1 - su));
        }
      }
    }

    if (mode === 'exponential' && o.showBadge !== false && lt >= startTime && UI.pillBadge) {
      const activeIdx = clamp(Math.floor((lt - startTime) / stepDelay), 0, count - 1);
      const mult = Math.pow(1.5, activeIdx).toFixed(1);
      UI.pillBadge(g, lt, {
        x: 960,
        y: 150,
        text: 'FORCE MULTIPLIER: ' + mult + 'x',
        subText: 'DOMINO #' + (activeIdx + 1) + ' OF ' + count,
        border: '#FFD54F',
      });
    }

    g.restore();
  }

  function pillBadgeSafe(g, x, y, str, borderCol) {
    g.save();
    g.translate(x, y);
    rr(g, -54, -18, 108, 36, 18);
    g.fillStyle = 'rgba(20, 24, 41, 0.92)';
    g.fill();
    g.strokeStyle = borderCol || '#FFD54F';
    g.lineWidth = 2;
    g.stroke();
    text(g, str, 0, 1, { size: 16, font: FONTS.ui, weight: 800, color: '#FFFFFF' });
    g.restore();
  }

  // ---------- 6. 120Hz Verlet Rope, Payload, Pendulum & Bridge Solver (PHY.ropeSim) ----------
  function bakeRopeSim(o = {}) {
    // Auto-detect pendulum/payload mode when o.anchor or o.payload is passed per MASTER_PROMPT.md!
    const preset = o.preset || (o.anchor || o.payload || o.anchorX !== undefined ? 'pendulum' : 'suspensionBridge');
    const cacheKey = hashConfig('ROPE', Object.assign({ preset }, o));
    if (_simCache.has(cacheKey)) return _simCache.get(cacheKey);

    const maxDur = o.duration || 6.0;
    const totalFrames = Math.ceil(maxDur * SIM_FPS);
    const gravity = o.gravity || 1350;
    const wind = o.wind !== undefined ? o.wind : 0;
    const floorY = o.floorY !== undefined ? o.floorY : 840;
    const x0 = o.x0 !== undefined ? o.x0 : 320;
    const x1 = o.x1 !== undefined ? o.x1 : 1600;
    const y0 = o.y0 !== undefined ? o.y0 : 460;
    const segments = o.segments || (preset === 'suspensionBridge' ? 18 : 14);
    const cutTime = o.cutTime !== undefined ? o.cutTime : 1.6;
    const cutIndex = o.cutIndex !== undefined
      ? o.cutIndex
      : preset === 'suspensionBridge'
      ? Math.floor(segments * 0.5)
      : Math.max(1, segments - 2);

    const nodes = [];
    const sticks = [];
    const payloadR = (o.payload && o.payload.r) || o.ballR || 48;

    if (preset === 'pendulum' || preset === 'wreckingBall') {
      const anchorX = Array.isArray(o.anchor) ? o.anchor[0] : o.anchorX !== undefined ? o.anchorX : 960;
      const anchorY = Array.isArray(o.anchor) ? o.anchor[1] : o.anchorY !== undefined ? o.anchorY : 180;
      const ropeLen = o.length || 380;
      const startAngle = o.startAngle !== undefined ? o.startAngle : o.payload ? -0.45 : -1.05;

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const rDist = u * ropeLen;
        const nx = anchorX + Math.sin(startAngle) * rDist;
        const ny = anchorY + Math.cos(startAngle) * rDist;
        nodes.push({ x: nx, y: ny, oldX: nx, oldY: ny, pinned: i === 0, mass: i === segments ? 12 : 1 });
        if (i > 0) {
          sticks.push({ a: i - 1, b: i, len: ropeLen / segments, active: true });
        }
      }
    } else {
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const nx = lerp(x0, x1, u);
        const sag = Math.sin(u * Math.PI) * 52;
        const ny = y0 + sag;
        nodes.push({ x: nx, y: ny, oldX: nx, oldY: ny, pinned: i === 0 || i === segments, mass: 1.0 });
        if (i > 0) {
          sticks.push({ a: i - 1, b: i, len: Math.hypot((x1 - x0) / segments, 0) * 1.01, active: true });
        }
      }
    }

    const frames = [];
    let floorHitTime = null;

    for (let f = 0; f <= totalFrames; f++) {
      const simT = f * DT;

      if (cutTime >= 0 && simT >= cutTime && sticks[cutIndex]) {
        sticks[cutIndex].active = false;
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.pinned) continue;
        const vx = (n.x - n.oldX) * 0.995;
        const vy = (n.y - n.oldY) * 0.995;
        n.oldX = n.x;
        n.oldY = n.y;
        const windAcc = wind * Math.sin(simT * 3.5 + i * 0.3) * 420;
        n.x += vx + windAcc * DT * DT;
        n.y += vy + gravity * DT * DT;

        // Floor collision for rope nodes & heavy tip payload
        const nodeRad = i === nodes.length - 1 && preset !== 'suspensionBridge' ? payloadR : 6;
        if (n.y + nodeRad > floorY) {
          if (i === nodes.length - 1 && floorHitTime === null) floorHitTime = simT;
          n.y = floorY - nodeRad;
          n.oldY = n.y + vy * 0.35; // Restitution bounce on floor
          n.oldX = n.x - vx * 0.72; // Floor friction
        }
      }

      for (let iter = 0; iter < 16; iter++) {
        for (let s = 0; s < sticks.length; s++) {
          const st = sticks[s];
          if (!st.active) continue;
          const nA = nodes[st.a];
          const nB = nodes[st.b];
          const dx = nB.x - nA.x;
          const dy = nB.y - nA.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const diff = (st.len - dist) / dist;
          const wA = nA.pinned ? 0 : 1 / nA.mass;
          const wB = nB.pinned ? 0 : 1 / nB.mass;
          const wSum = wA + wB || 1;

          if (!nA.pinned) {
            nA.x -= dx * diff * (wA / wSum);
            nA.y -= dy * diff * (wA / wSum);
          }
          if (!nB.pinned) {
            nB.x += dx * diff * (wB / wSum);
            nB.y += dy * diff * (wB / wSum);
          }
        }
      }

      frames.push({
        nodes: nodes.map((n) => ({ x: n.x, y: n.y })),
        sticks: sticks.map((st) => ({ a: st.a, b: st.b, active: st.active })),
      });
    }

    const result = { frames, preset, x0, x1, y0, cutTime, cutIndex, floorY, payloadR, floorHitTime };
    _simCache.set(cacheKey, result);
    return result;
  }

  function ropeSim(g, lt = 0, o = {}) {
    const sim = bakeRopeSim(o);
    const fIdx = clamp(Math.floor(Math.max(0, lt) * SIM_FPS), 0, sim.frames.length - 1);
    const snap = sim.frames[fIdx];

    g.save();

    if (sim.preset === 'suspensionBridge') {
      drawBox25D(g, sim.x0 - 65, sim.y0 + 180, 130, 460, 0, 'stone');
      drawBox25D(g, sim.x1 + 65, sim.y0 + 180, 130, 460, 0, 'stone');
    }

    snap.sticks.forEach((st) => {
      if (!st.active) return;
      const nA = snap.nodes[st.a];
      const nB = snap.nodes[st.b];
      seg(g, [[nA.x, nA.y], [nB.x, nB.y]], 5, '#CBD5E1');

      if (sim.preset === 'suspensionBridge') {
        const mx = (nA.x + nB.x) * 0.5;
        const my = (nA.y + nB.y) * 0.5;
        const ang = Math.atan2(nB.y - nA.y, nB.x - nA.x);
        drawBox25D(g, mx, my + 8, 56, 16, ang, 'wood', { depthX: 6, depthY: -5 });
      }
    });

    if (sim.preset === 'pendulum' || sim.preset === 'wreckingBall') {
      const anchor = snap.nodes[0];
      const tip = snap.nodes[snap.nodes.length - 1];
      const prev = snap.nodes[Math.max(0, snap.nodes.length - 2)];
      const tipRot = Math.atan2(tip.x - prev.x, Math.max(1, tip.y - prev.y)) * -0.45;
      const pKind = (o.payload && o.payload.kind) || 'weight';
      const pColor = (o.payload && o.payload.color) || undefined;
      const pRad = sim.payloadR;

      drawBox25D(g, anchor.x, anchor.y - 16, 84, 32, 0, 'steel');
      contactShadow(g, tip.x, sim.floorY + 4, pRad * 1.15, 10, clamp(1 - (sim.floorY - tip.y) / 420, 0.08, 0.34));

      if (pKind === 'crate') {
        drawBox25D(g, tip.x, tip.y, pRad * 1.8, pRad * 1.8, tipRot, 'wood', { style: 'crate', color: pColor });
      } else if (pKind === 'lantern') {
        glow(g, tip.x, tip.y, pRad * 2.4, '#FFAE38', 0.78);
        drawBox25D(g, tip.x, tip.y, pRad * 1.1, pRad * 1.45, tipRot, 'gold', { color: pColor || '#FFB84D' });
      } else if (pKind === 'bell') {
        drawBox25D(g, tip.x, tip.y, pRad * 1.35, pRad * 1.35, tipRot, 'gold', { radius: pRad * 0.45, color: pColor });
      } else {
        drawSphere25D(g, tip.x, tip.y, pRad, tipRot, o.material || 'steel', { color: pColor });
      }
    }

    if (sim.cutTime >= 0) {
      const snapAge = lt - sim.cutTime;
      if (snapAge >= 0 && snapAge < 0.32) {
        const u = snapAge / 0.32;
        const cutNode = snap.nodes[sim.cutIndex] || { x: 960, y: sim.y0 };
        glow(g, cutNode.x, cutNode.y, 110 * (1 - u), '#FFB84D', (1 - u) * 0.9);
        ring(g, cutNode.x, cutNode.y, 65 * u, 4 * (1 - u), '#FFFFFF');
      }
    }

    g.restore();
  }

  // ---------- 7. Automatic Physics -> LUMINA_SOUND Scheduler (PHY.scheduleImpacts) ----------
  function scheduleImpacts(k, kind = 'rigid', o = {}, shotStart = 0, batchStart = 0) {
    if (!k || typeof k.play !== 'function') return;

    if (kind === 'domino' || kind === 'dominoChain') {
      const count = o.count || (Array.isArray(o.labels) ? Math.max(8, o.labels.length) : 9);
      const startTime = o.triggerTime !== undefined ? o.triggerTime : o.startTime !== undefined ? o.startTime : 0.25;
      const stepDelay = o.stepDelay || 0.22;
      for (let i = 0; i < count; i++) {
        const bt = shotStart + startTime + i * stepDelay - batchStart;
        if (bt >= 0) {
          const isGiant = (o.mode || 'exponential') === 'exponential' && i >= count - 2;
          k.play(isGiant ? 'impact' : 'thud', bt, {
            f: isGiant ? 85 : 190 - i * 12,
            gain: clamp(0.35 + (i / count) * 0.55, 0.35, 0.95),
          });
        }
      }
    } else if (kind === 'shatter' || kind === 'shatterWall') {
      const impactTime = o.impactTime !== undefined ? o.impactTime : 1.0;
      const bt = shotStart + impactTime - batchStart;
      if (bt >= 0) {
        k.play(o.material === 'glass' || o.material === 'ice' ? 'shatter' : 'impact', bt, { gain: 0.9 });
      }
    } else if (kind === 'rope' || kind === 'ropeSim') {
      const sim = bakeRopeSim(o);
      if (sim.cutTime >= 0) {
        const bt = shotStart + sim.cutTime - batchStart;
        if (bt >= 0) k.play('boltSnap', bt, { gain: 0.88 });
      }
      if (sim.floorHitTime !== null) {
        const btFloor = shotStart + sim.floorHitTime - batchStart;
        if (btFloor >= 0) {
          const isBell = o.payload && o.payload.kind === 'bell';
          k.play(isBell ? 'templeBell' : 'impact', btFloor, { gain: 0.85 });
        }
      }
    } else {
      const sim = bakeRigidSim(o);
      sim.impacts.slice(0, 18).forEach((imp) => {
        const bt = shotStart + imp.t - batchStart;
        if (bt >= 0) {
          const sfxName = imp.mat === 'gold' ? 'coinClink' : imp.strength > 0.65 ? 'impact' : 'thud';
          k.play(sfxName, bt, { gain: clamp(imp.strength * 0.85, 0.25, 0.9) });
        }
      });
    }
  }

  // ---------- 8. Export to Global Namespace (window.PHY, window.UI, window.DK) ----------
  const PHY = (window.PHY = {
    MATERIALS,
    drawBox25D,
    drawSphere25D,
    rigidSim,
    shatterWall,
    dominoChain,
    ropeSim,
    scheduleImpacts,
  });

  DK.phy = H.phy = PHY;
  Object.assign(UI, {
    rigidSim,
    shatterWall,
    dominoChain,
    ropeSim,
  });
  Object.assign(DK, {
    rigidSim,
    shatterWall,
    dominoChain,
    ropeSim,
  });
})();