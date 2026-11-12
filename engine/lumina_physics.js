// ============================================================================
// MODULE 11: LUMINA_PHYSICS (engine/lumina_physics.js) — Rapier-Inspired 120Hz
// Deterministic Pre-Baked 2.5D Physics Engine (Pure HTML5 Canvas + JS, Zero React):
//   1. PHY.rigidSim     — Sequential-Impulse Rigid-Body Solver (Cuboids, Spheres,
//                         Crates, Coins, Galton Boards, Avalanches, Newton's Cradle
//                         & Custom Rapier-style dynamic/fixed/kinematic bodies)
//   2. PHY.shatterWall  — Voronoi / Brick / Glass / Stone / Ice / Gold Wall
//                         Fracture, Shockwave & Debris Bounce Solver
//   3. PHY.dominoChain  — Standard & Exponential (Tiny-to-Giant) 2.5D Domino
//                         Toppling Kinematics & Contact Force Readouts
//   4. PHY.ropeSim      — 120Hz Verlet Integration Rope, Pendulum, Wrecking Ball
//                         & Snapping Suspension Bridge Constraint Solver
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

  // Global deterministic simulation cache keyed by simulation ID + config hash
  const _simCache = new Map();
  const SIM_FPS = 120;
  const DT = 1 / SIM_FPS;

  // Material Palettes (Lumina Soft-Volumetric 2.5D Shaded)
  const MATERIALS = {
    wood: { top: '#E09F5A', front: '#C67D38', side: '#94561E', border: '#6E3C10', restitution: 0.28, friction: 0.55, density: 1.0 },
    stone: { top: '#94A3B8', front: '#64748B', side: '#475569', border: '#334155', restitution: 0.18, friction: 0.72, density: 2.4 },
    brick: { top: '#D96B43', front: '#B84A27', side: '#873218', border: '#5E200D', restitution: 0.20, friction: 0.68, density: 2.0 },
    steel: { top: '#CBD5E1', front: '#94A3B8', side: '#475569', border: '#1E293B', restitution: 0.35, friction: 0.38, density: 4.5 },
    gold: { top: '#FFE066', front: '#F5B926', side: '#B87D0E', border: '#7C5205', restitution: 0.32, friction: 0.42, density: 6.0 },
    glass: { top: 'rgba(186,230,253,0.78)', front: 'rgba(125,211,252,0.58)', side: 'rgba(56,189,248,0.45)', border: '#E0F2FE', restitution: 0.45, friction: 0.18, density: 1.4 },
    ice: { top: '#E0F7FA', front: '#80DEEA', side: '#26C6DA', border: '#FFFFFF', restitution: 0.40, friction: 0.08, density: 0.9 },
    rubber: { top: '#FF6B8B', front: '#E11D48', side: '#9F1239', border: '#881337', restitution: 0.78, friction: 0.65, density: 1.1 },
  };

  function getMat(name) {
    return MATERIALS[name] || MATERIALS.wood;
  }

  // ---------- 1. 2.5D Soft-Volumetric Primitive Renderers (Boxes, Spheres, Shards) ----------
  function drawBox25D(g, x, y, w, h, rot = 0, matName = 'wood', o = {}) {
    const mat = typeof matName === 'object' ? matName : getMat(matName);
    const depthX = o.depthX !== undefined ? o.depthX : 14;
    const depthY = o.depthY !== undefined ? o.depthY : -10;
    const hw = w * 0.5;
    const hh = h * 0.5;

    g.save();
    g.translate(x, y);
    g.rotate(rot);

    // 2.5D Extruded Top Face
    poly(
      g,
      [
        [-hw, -hh],
        [hw, -hh],
        [hw + depthX, -hh + depthY],
        [-hw + depthX, -hh + depthY],
      ],
      mat.top,
      mat.border,
      1.2
    );

    // 2.5D Extruded Right Side Face
    poly(
      g,
      [
        [hw, -hh],
        [hw + depthX, -hh + depthY],
        [hw + depthX, hh + depthY],
        [hw, hh],
      ],
      mat.side,
      mat.border,
      1.2
    );

    // Front Face with Soft Cylindrical Gradient
    rr(g, -hw, -hh, w, h, o.radius !== undefined ? o.radius : 4);
    g.fillStyle = matName === 'glass'
      ? mat.front
      : cylinderGrad(g, -hw, -hh, hw, hh, mat.front, -1);
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = mat.border;
    g.stroke();

    // Crate Cross-Bracing or Brick Mortar Detail
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

    g.restore();
  }

  function drawSphere25D(g, x, y, r, rot = 0, matName = 'steel', o = {}) {
    const mat = typeof matName === 'object' ? matName : getMat(matName);
    g.save();
    g.translate(x, y);
    g.rotate(rot);

    if (o.shape === 'coin') {
      // 3D Gold/Bronze Coin Disc
      ellipse(g, 4, 3, r, r * 0.78, '#9A6506');
      ellipse(g, 0, 0, r, r * 0.78, sphereGrad(g, 0, 0, r, '#FFD54F', [-0.6, -0.6], 0.32));
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
      // Subtle rotation seam indicator
      circle(g, Math.cos(0) * r * 0.48, Math.sin(0) * r * 0.48, Math.max(2, r * 0.11), alpha('#FFFFFF', 0.45));
    }
    g.restore();
  }

  // ---------- 2. 120Hz Sequential-Impulse Rigid-Body World Solver (PHY.rigidSim) ----------
  function buildPresetScene(preset, o) {
    const r = rng(o.seed || 42);
    const floorY = o.floorY !== undefined ? o.floorY : 840;
    const bodies = [];
    const colliders = [
      // Ground Floor Plane
      { x: 960, y: floorY + 30, w: 2400, h: 60, restitution: 0.35, friction: 0.75 },
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
        const y = floorY - boxH * 0.5 - row * (boxH + 1);
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
            restitution: 0.24,
            friction: 0.58,
          });
        }
      }

      // High-momentum heavy cannonball / wrecking sphere launched from left
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
        mass: 14.0,
        restitution: 0.42,
        friction: 0.25,
        wakeTime: launchDelay,
      });
    } else if (preset === 'avalanche') {
      // Inclined mountain ramp + boulders & crates tumbling down
      colliders.push(
        { x: 520, y: 560, w: 860, h: 36, rot: 0.34, restitution: 0.35 },
        { x: 1480, y: floorY - 36, w: 90, h: 72, restitution: 0.3 }
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
          restitution: 0.38,
          friction: 0.42,
          wakeTime: i * 0.06,
        });
      }
    } else if (preset === 'galtonBoard') {
      // Peg Lattice + Bouncing Spheres Sorting into Histogram Bins
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
      // Bin dividers along bottom
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

    // Merge any custom Rapier-style bodies & colliders passed by user
    if (Array.isArray(o.bodies)) {
      o.bodies.forEach((b, idx) => {
        bodies.push(
          Object.assign(
            {
              id: 'custom_' + idx,
              type: 'dynamic',
              shape: 'cuboid',
              material: 'wood',
              x: 960,
              y: 300,
              w: 70,
              h: 70,
              r: 35,
              vx: 0,
              vy: 0,
              rot: 0,
              vRot: 0,
              mass: 1.5,
              restitution: 0.35,
              friction: 0.5,
              wakeTime: 0,
            },
            b
          )
        );
      });
    }
    if (Array.isArray(o.colliders)) {
      o.colliders.forEach((c) => colliders.push(c));
    }

    return { bodies, colliders, floorY };
  }

  function bakeRigidSim(o = {}) {
    const preset = o.preset || 'pyramidCrash';
    const cacheKey =
      'RIGID_' +
      (o.id || preset) +
      '_' +
      (o.rows || 6) +
      '_' +
      (o.count || 0) +
      '_' +
      (o.floorY || 840) +
      '_' +
      (o.seed || 42);
    if (_simCache.has(cacheKey)) return _simCache.get(cacheKey);

    const maxDur = o.duration || 6.0;
    const totalFrames = Math.ceil(maxDur * SIM_FPS);
    const gravity = o.gravity !== undefined ? o.gravity : 1480;
    const scene = buildPresetScene(preset, o);
    const bodies = scene.bodies;
    const colliders = scene.colliders;
    const floorY = scene.floorY;

    const frames = [];
    const impacts = [];
    let lastImpactTime = -1;

    for (let f = 0; f <= totalFrames; f++) {
      const simT = f * DT;

      // 1. Integrate Forces & Velocities
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        if (b.type === 'fixed') continue;
        if (b.wakeTime && simT < b.wakeTime) continue;

        b.vy += gravity * DT;
        b.vx *= 0.998;
        b.vy *= 0.998;
        b.vRot *= 0.985;

        b.x += b.vx * DT;
        b.y += b.vy * DT;
        b.rot += b.vRot * DT;
      }

      // 2. Iterative Sequential Impulse Solver (4 sub-iterations per 120Hz step)
      for (let iter = 0; iter < 4; iter++) {
        // A. Body vs. Floor & Static Colliders
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          if (b.type === 'fixed' || (b.wakeTime && simT < b.wakeTime)) continue;

          const radY = b.shape === 'cuboid' ? b.h * 0.5 : b.shape === 'coin' ? b.r * 0.78 : b.r;
          const radX = b.shape === 'cuboid' ? b.w * 0.5 : b.r;

          // Ground Floor Clamp & Impulse
          if (b.y + radY > floorY) {
            const pen = b.y + radY - floorY;
            b.y -= pen;
            if (b.vy > 0) {
              if (b.vy > 210 && simT - lastImpactTime > 0.045) {
                impacts.push({ t: simT, x: b.x, y: floorY, strength: clamp(b.vy / 950, 0.2, 1), mat: b.material });
                lastImpactTime = simT;
              }
              b.vy = -b.vy * b.restitution;
              b.vx *= 1 - b.friction * 0.18;
              b.vRot *= 0.78;
              if (Math.abs(b.vy) < 28) b.vy = 0;
              if (Math.abs(b.vx) < 12) {
                b.vx *= 0.8;
                b.rot *= 0.85;
              }
            }
          }

          // Static Pegs / Ramps / Walls
          for (let cIdx = 1; cIdx < colliders.length; cIdx++) {
            const col = colliders[cIdx];
            if (col.shape === 'peg') {
              const dx = b.x - col.x;
              const dy = b.y - col.y;
              const dist = Math.hypot(dx, dy) || 0.001;
              const minDist = radX + col.r;
              if (dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                b.x += nx * (minDist - dist);
                b.y += ny * (minDist - dist);
                const vn = b.vx * nx + b.vy * ny;
                if (vn < 0) {
                  const imp = -(1 + (col.restitution || 0.55)) * vn;
                  b.vx += nx * imp + ( nx >= 0 ? 18 : -18 );
                  b.vy += ny * imp;
                  if (Math.abs(vn) > 160 && simT - lastImpactTime > 0.04) {
                    impacts.push({ t: simT, x: col.x, y: col.y, strength: 0.45, mat: b.material });
                    lastImpactTime = simT;
                  }
                }
              }
            } else if (col.rot) {
              // Rotated Ramp Collider
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
                b.x += wx * penY;
                b.y += wy * penY;
                const vn = b.vx * wx + b.vy * wy;
                if (vn < 0) {
                  b.vx -= (1 + (col.restitution || 0.35)) * vn * wx;
                  b.vy -= (1 + (col.restitution || 0.35)) * vn * wy;
                  b.vRot += b.vx * 0.012;
                }
              }
            } else {
              // Axis-Aligned Box Collider
              const hw = col.w * 0.5;
              const hh = col.h * 0.5;
              const dx = b.x - col.x;
              const dy = b.y - col.y;
              const ox = hw + radX - Math.abs(dx);
              const oy = hh + radY - Math.abs(dy);
              if (ox > 0 && oy > 0) {
                if (ox < oy) {
                  const sx = dx < 0 ? -1 : 1;
                  b.x += sx * ox;
                  b.vx = -b.vx * 0.35;
                } else {
                  const sy = dy < 0 ? -1 : 1;
                  b.y += sy * oy;
                  b.vy = -b.vy * 0.35;
                }
              }
            }
          }
        }

        // B. Dynamic Body vs. Dynamic Body Impulse Resolution
        for (let i = 0; i < bodies.length; i++) {
          const A = bodies[i];
          if (A.wakeTime && simT < A.wakeTime) continue;
          const rAx = A.shape === 'cuboid' ? A.w * 0.48 : A.r;
          const rAy = A.shape === 'cuboid' ? A.h * 0.48 : A.shape === 'coin' ? A.r * 0.78 : A.r;

          for (let j = i + 1; j < bodies.length; j++) {
            const B = bodies[j];
            if (B.wakeTime && simT < B.wakeTime) continue;
            const rBx = B.shape === 'cuboid' ? B.w * 0.48 : B.r;
            const rBy = B.shape === 'cuboid' ? B.h * 0.48 : B.shape === 'coin' ? B.r * 0.78 : B.r;

            const dx = B.x - A.x;
            const dy = B.y - A.y;
            const ox = rAx + rBx - Math.abs(dx);
            const oy = rAy + rBy - Math.abs(dy);

            if (ox > 0 && oy > 0) {
              let nx = 0,
                ny = 0,
                pen = 0;
              if (A.shape !== 'cuboid' && B.shape !== 'cuboid') {
                const dist = Math.hypot(dx, dy) || 0.001;
                const minDist = rAx + rBx;
                if (dist >= minDist) continue;
                nx = dx / dist;
                ny = dy / dist;
                pen = minDist - dist;
              } else if (ox < oy) {
                nx = dx < 0 ? -1 : 1;
                ny = 0;
                pen = ox;
              } else {
                nx = 0;
                ny = dy < 0 ? -1 : 1;
                pen = oy;
              }

              const invMassA = A.type === 'fixed' ? 0 : 1 / (A.mass || 1);
              const invMassB = B.type === 'fixed' ? 0 : 1 / (B.mass || 1);
              const invMassSum = invMassA + invMassB || 1;

              // Positional correction
              const corr = (pen / invMassSum) * 0.82;
              A.x -= nx * corr * invMassA;
              A.y -= ny * corr * invMassA;
              B.x += nx * corr * invMassB;
              B.y += ny * corr * invMassB;

              // Relative velocity along normal
              const rvx = B.vx - A.vx;
              const rvy = B.vy - A.vy;
              const velAlongNormal = rvx * nx + rvy * ny;

              if (velAlongNormal < 0) {
                const e = Math.min(A.restitution || 0.25, B.restitution || 0.25);
                const jImp = (-(1 + e) * velAlongNormal) / invMassSum;
                const impX = jImp * nx;
                const impY = jImp * ny;

                A.vx -= impX * invMassA;
                A.vy -= impY * invMassA;
                B.vx += impX * invMassB;
                B.vy += impY * invMassB;

                // Angular torque transfer on off-center impact
                const cross = (dx * impY - dy * impX) * 0.00018;
                A.vRot -= cross * invMassA;
                B.vRot += cross * invMassB;

                if (Math.abs(velAlongNormal) > 220 && simT - lastImpactTime > 0.038) {
                  impacts.push({
                    t: simT,
                    x: (A.x + B.x) * 0.5,
                    y: (A.y + B.y) * 0.5,
                    strength: clamp(Math.abs(velAlongNormal) / 1100, 0.25, 1),
                    mat: A.material,
                  });
                  lastImpactTime = simT;
                }
              }
            }
          }
        }
      }

      // Snapshot current 120Hz frame
      frames.push(
        bodies.map((b) => ({
          id: b.id,
          shape: b.shape,
          material: b.material,
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

    const result = { frames, colliders, impacts, floorY, preset };
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

    // 1. Render Static Colliders (Pegs, Ramps, Bin Walls)
    for (let i = 1; i < sim.colliders.length; i++) {
      const col = sim.colliders[i];
      if (col.shape === 'peg') {
        circle(g, col.x, col.y, col.r, sphereGrad(g, col.x, col.y, col.r, '#F5B942'));
      } else {
        drawBox25D(g, col.x, col.y, col.w, col.h, col.rot || 0, 'stone');
      }
    }

    // 2. Ground Contact Shadows for Bodies Near Floor
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

    // 3. Render Dynamic 2.5D Bodies
    for (let i = 0; i < stateA.length; i++) {
      const a = stateA[i];
      if (!a.awake) continue;
      const b = stateB[i];
      const bx = lerp(a.x, b.x, frac);
      const by = lerp(a.y, b.y, frac);
      const brot = lerp(a.rot, b.rot, frac);

      if (a.shape === 'cuboid') {
        drawBox25D(g, bx, by, a.w, a.h, brot, a.material, { style: 'crate' });
      } else {
        drawSphere25D(g, bx, by, a.r, brot, a.material, { shape: a.shape });
      }

      // Optional Velocity Vector Arrows (Debug / Physics Explainer Mode)
      if (o.showVectors && Math.hypot(a.vx, a.vy) > 45) {
        const vx = a.vx * 0.08;
        const vy = a.vy * 0.08;
        seg(g, [[bx, by], [bx + vx, by + vy]], 3, '#5CE1FF');
        circle(g, bx + vx, by + vy, 4.5, '#FFFFFF');
      }
    }

    // 4. Render Active Impact Shockwave Rings & Sparks
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

  // ---------- 3. Deterministic Voronoi / Brick / Glass Wall Shatter Solver (PHY.shatterWall) ----------
  function bakeShatterWall(o = {}) {
    const cacheKey =
      'SHATTER_' +
      (o.id || 'wall') +
      '_' +
      (o.material || 'brick') +
      '_' +
      (o.x || 960) +
      '_' +
      (o.impactTime || 1.0);
    if (_simCache.has(cacheKey)) return _simCache.get(cacheKey);

    const x = o.x !== undefined ? o.x : 960;
    const y = o.y !== undefined ? o.y : 840;
    const w = o.w || 420;
    const h = o.h || 340;
    const cols = o.cols || 7;
    const rows = o.rows || 8;
    const matName = o.material || 'brick';
    const mat = getMat(matName);
    const impactPoint = o.impactPoint || [x, y - h * 0.55];
    const force = o.force || 920;
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
        const falloff = clamp(1 - dist / (Math.max(w, h) * 0.95), 0.15, 1);
        const ang = Math.atan2(dy, dx) + (r() - 0.5) * 0.45;
        const speed = force * falloff * (0.55 + r() * 0.75);

        // Irregular Voronoi-like polygon vertices for stone/glass/ice, bevelled block for brick
        const pts = [];
        const vCount = matName === 'brick' ? 4 : 6;
        for (let v = 0; v < vCount; v++) {
          const va = (v / vCount) * Math.PI * 2 + (matName === 'brick' ? Math.PI * 0.25 : (r() - 0.5) * 0.35);
          const rx = cellW * (matName === 'brick' ? 0.68 : 0.48 + r() * 0.22);
          const ry = cellH * (matName === 'brick' ? 0.68 : 0.48 + r() * 0.22);
          pts.push([Math.cos(va) * rx, Math.sin(va) * ry]);
        }

        shards.push({
          x0: cx,
          y0: cy,
          w: cellW * 0.94,
          h: cellH * 0.92,
          pts,
          vx: Math.cos(ang) * speed + (r() - 0.5) * 220,
          vy: Math.sin(ang) * speed - (180 + r() * 260) * falloff,
          vRot: (r() - 0.5) * 14 * falloff,
          restitution: mat.restitution,
          friction: mat.friction,
          shadeOffset: (r() - 0.5) * 0.14,
        });
      }
    }

    const result = { x, y, w, h, matName, mat, impactPoint, shards };
    _simCache.set(cacheKey, result);
    return result;
  }

  function shatterWall(g, lt = 0, o = {}) {
    const sim = bakeShatterWall(o);
    const impactTime = o.impactTime !== undefined ? o.impactTime : 1.0;
    const floorY = o.floorY !== undefined ? o.floorY : sim.y;
    const gravity = o.gravity || 1650;

    g.save();
    contactShadow(g, sim.x, floorY + 5, sim.w * 0.62, 14, 0.32);

    if (lt < impactTime) {
      // Intact 2.5D Wall Before Impact
      drawBox25D(g, sim.x, sim.y - sim.h * 0.5, sim.w, sim.h, 0, sim.matName, { depthX: 22, depthY: -14 });

      // Pre-impact stress cracks if within 0.15s of impact
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

      // Impact Flash & Shockwave Ring
      if (dt < 0.38) {
        const u = dt / 0.38;
        const [ix, iy] = sim.impactPoint;
        glow(g, ix, iy, 220 * (1 - u), '#FFB84D', (1 - u) * 0.85);
        ring(g, ix, iy, lerp(20, 320, ease.out(u)), 6 * (1 - u), alpha('#FFFFFF', 1 - u));
      }

      // Step & Render Flying / Bouncing 2.5D Shards
      sim.shards.forEach((sh) => {
        let sx = sh.x0 + sh.vx * dt;
        let sy = sh.y0 + sh.vy * dt + 0.5 * gravity * dt * dt;
        let srot = sh.vRot * dt;

        // Analytical Floor Bounce Calculation
        const groundLevel = floorY - sh.h * 0.4;
        if (sy > groundLevel) {
          // Solve approximate time of first floor hit
          const a = 0.5 * gravity;
          const b = sh.vy;
          const c = sh.y0 - groundLevel;
          const disc = Math.max(0, b * b - 4 * a * c);
          const tHit = (-b + Math.sqrt(disc)) / (2 * a);
          const dtAfter = Math.max(0, dt - tHit);
          const vHit = sh.vy + gravity * tHit;
          const bounceVy = -vHit * sh.restitution;
          sy = groundLevel + bounceVy * dtAfter + 0.5 * gravity * dtAfter * dtAfter;
          if (sy > groundLevel) {
            sy = groundLevel;
            sx = sh.x0 + sh.vx * tHit + sh.vx * (1 - sh.friction * 0.45) * dtAfter;
            srot = sh.vRot * tHit + sh.vRot * 0.35 * dtAfter;
          }
        }

        if (sim.matName === 'brick' || sim.matName === 'gold') {
          drawBox25D(g, sx, sy, sh.w, sh.h, srot, sim.matName, { depthX: 8, depthY: -6 });
        } else {
          g.save();
          g.translate(sx, sy);
          g.rotate(srot);
          poly(g, sh.pts.map(([px, py]) => [px + 6, py - 5]), sim.mat.side, sim.mat.border, 1);
          poly(g, sh.pts, shade(sim.mat.front, sh.shadeOffset), sim.mat.border, 1.5);
          g.restore();
        }
      });
    }

    g.restore();
  }

  // ---------- 4. Standard & Exponential Domino Chain Solver (PHY.dominoChain) ----------
  function dominoChain(g, lt = 0, o = {}) {
    const {
      mode = 'exponential', // 'standard' | 'exponential'
      count = 9,
      startX = 280,
      endX = 1620,
      floorY = 840,
      startTime = 0.25,
      stepDelay = 0.22,
      material = 'gold',
    } = o;

    g.save();

    const dominoes = [];
    for (let i = 0; i < count; i++) {
      const u = count === 1 ? 0.5 : i / (count - 1);
      const scale = mode === 'exponential' ? Math.pow(1.34, i) * 0.42 : 1.0;
      const x = mode === 'exponential'
        ? lerp(startX, endX, Math.pow(u, 1.28))
        : lerp(startX, endX, u);
      const w = Math.max(14, 28 * scale);
      const h = Math.max(54, 145 * scale);
      dominoes.push({ x, w, h, scale, hitTime: startTime + i * stepDelay });
    }

    for (let i = 0; i < dominoes.length; i++) {
      const d = dominoes[i];
      const nextD = dominoes[i + 1];
      const dt = lt - d.hitTime;

      let angle = 0;
      if (dt > 0) {
        const maxAngle = nextD ? 1.12 : 1.48; // Resting lean angle on next domino vs. flat on floor
        const fallDur = nextD ? stepDelay * 1.35 : 0.36;
        angle = lerp(0, maxAngle, ease.in(clamp(dt / fallDur, 0, 1)));
      }

      contactShadow(g, d.x + Math.sin(angle) * d.h * 0.45, floorY + 4, d.w * 1.4 + Math.sin(angle) * d.h * 0.4, 9, 0.3);

      // Pivot around bottom-right corner of the domino
      g.save();
      g.translate(d.x + d.w * 0.5, floorY);
      g.rotate(angle);
      drawBox25D(g, -d.w * 0.5, -d.h * 0.5, d.w, d.h, 0, i === count - 1 ? 'gold' : material, {
        depthX: Math.max(6, 14 * d.scale),
        depthY: Math.min(-4, -9 * d.scale),
      });
      g.restore();

      // Contact Spark Ring at exact moment domino strikes the next one
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

    // Optional Force Multiplier Readout Badge on Exponential Mode
    if (mode === 'exponential' && o.showBadge !== false) {
      const activeIdx = clamp(Math.floor((lt - startTime) / stepDelay), 0, count - 1);
      if (lt >= startTime) {
        const mult = Math.pow(1.5, activeIdx).toFixed(1);
        if (UI.pillBadge) {
          UI.pillBadge(g, lt, {
            x: 960,
            y: 150,
            text: 'FORCE MULTIPLIER: ' + mult + 'x',
            subText: 'DOMINO #' + (activeIdx + 1) + ' OF ' + count,
            border: '#FFD54F',
          });
        }
      }
    }

    g.restore();
  }

  // ---------- 5. 120Hz Verlet Integration Rope, Pendulum & Snapping Bridge Solver (PHY.ropeSim) ----------
  function bakeRopeSim(o = {}) {
    const preset = o.preset || 'suspensionBridge';
    const cacheKey =
      'ROPE_' +
      (o.id || preset) +
      '_' +
      (o.x0 || 320) +
      '_' +
      (o.x1 || 1600) +
      '_' +
      (o.cutTime !== undefined ? o.cutTime : -1);
    if (_simCache.has(cacheKey)) return _simCache.get(cacheKey);

    const maxDur = o.duration || 6.0;
    const totalFrames = Math.ceil(maxDur * SIM_FPS);
    const gravity = o.gravity || 1350;
    const x0 = o.x0 !== undefined ? o.x0 : 320;
    const x1 = o.x1 !== undefined ? o.x1 : 1600;
    const y0 = o.y0 !== undefined ? o.y0 : 460;
    const segments = o.segments || (preset === 'suspensionBridge' ? 18 : 12);
    const cutTime = o.cutTime !== undefined ? o.cutTime : 1.6;
    const cutIndex = o.cutIndex !== undefined ? o.cutIndex : Math.floor(segments * 0.5);

    const nodes = [];
    const sticks = [];

    if (preset === 'pendulum' || preset === 'wreckingBall') {
      const anchorX = o.anchorX || 960;
      const anchorY = o.anchorY || 180;
      const ropeLen = o.length || 440;
      const startAngle = o.startAngle !== undefined ? o.startAngle : -1.05;
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
      // Suspension Bridge Catenary Span between Left & Right Cliff Towers
      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const nx = lerp(x0, x1, u);
        const sag = Math.sin(u * Math.PI) * 52;
        const ny = y0 + sag;
        nodes.push({
          x: nx,
          y: ny,
          oldX: nx,
          oldY: ny,
          pinned: i === 0 || i === segments,
          mass: 1.0,
        });
        if (i > 0) {
          sticks.push({
            a: i - 1,
            b: i,
            len: Math.hypot((x1 - x0) / segments, 0) * 1.01,
            active: true,
          });
        }
      }
    }

    const frames = [];
    for (let f = 0; f <= totalFrames; f++) {
      const simT = f * DT;

      // Sever cable at exact cutTime!
      if (cutTime >= 0 && simT >= cutTime && sticks[cutIndex]) {
        sticks[cutIndex].active = false;
      }

      // Verlet Position Integration
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.pinned) continue;
        const vx = (n.x - n.oldX) * 0.996;
        const vy = (n.y - n.oldY) * 0.996;
        n.oldX = n.x;
        n.oldY = n.y;
        n.x += vx;
        n.y += vy + gravity * DT * DT;
      }

      // 14-Iteration Distance Constraint Relaxation
      for (let iter = 0; iter < 14; iter++) {
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

    const result = { frames, preset, x0, x1, y0, cutTime, cutIndex };
    _simCache.set(cacheKey, result);
    return result;
  }

  function ropeSim(g, lt = 0, o = {}) {
    const sim = bakeRopeSim(o);
    const fIdx = clamp(Math.floor(Math.max(0, lt) * SIM_FPS), 0, sim.frames.length - 1);
    const snap = sim.frames[fIdx];

    g.save();

    if (sim.preset === 'suspensionBridge') {
      // Left & Right Stone Cliff Pylons
      drawBox25D(g, sim.x0 - 65, sim.y0 + 180, 130, 460, 0, 'stone');
      drawBox25D(g, sim.x1 + 65, sim.y0 + 180, 130, 460, 0, 'stone');
    }

    // Draw Active Rope / Cable Segments & Wooden Bridge Planks
    snap.sticks.forEach((st, idx) => {
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

    // If Pendulum or Wrecking Ball, draw heavy 3D Steel Sphere at tip
    if (sim.preset === 'pendulum' || sim.preset === 'wreckingBall') {
      const anchor = snap.nodes[0];
      const tip = snap.nodes[snap.nodes.length - 1];
      drawBox25D(g, anchor.x, anchor.y - 16, 84, 32, 0, 'steel');
      drawSphere25D(g, tip.x, tip.y, o.ballR || 56, 0, o.material || 'steel');
    }

    // Snap Spark Burst at cutTime
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

  // ---------- 6. Automatic Physics -> LUMINA_SOUND Scheduler (PHY.scheduleImpacts) ----------
  function scheduleImpacts(k, kind = 'rigid', o = {}, shotStart = 0, batchStart = 0) {
    if (!k || typeof k.play !== 'function') return;

    if (kind === 'domino' || kind === 'dominoChain') {
      const count = o.count || 9;
      const startTime = o.startTime !== undefined ? o.startTime : 0.25;
      const stepDelay = o.stepDelay || 0.22;
      for (let i = 0; i < count; i++) {
        const bt = shotStart + startTime + i * stepDelay - batchStart;
        if (bt >= 0) {
          const isGiant = o.mode === 'exponential' && i >= count - 2;
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
      const cutTime = o.cutTime !== undefined ? o.cutTime : 1.6;
      const bt = shotStart + cutTime - batchStart;
      if (bt >= 0) {
        k.play('boltSnap', bt, { gain: 0.88 });
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

  // ---------- 7. Export to Global Namespace (window.PHY, window.UI, window.DK) ----------
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