// 1. Pre-Baked 2.5D Wrecking Ball Smashing a Pyramid of Crates (or 'avalanche', 'galtonBoard', 'coinCascade')
PHY.rigidSim(g, lt, {
  id: 'shot04_crash',
  preset: 'pyramidCrash', // 'pyramidCrash' | 'avalanche' | 'galtonBoard' | 'coinCascade'
  rows: 5,
  floorY: 840,
  showVectors: false,
  showContacts: true,
});

// 2. Voronoi Stone/Brick/Glass Wall Shattering at Exact Voiceover Timestamp (lt = 1.2s)
PHY.shatterWall(g, lt, {
  id: 'shot07_wall',
  material: 'brick', // 'stone' | 'brick' | 'glass' | 'ice' | 'gold'
  x: 1120, y: 840, w: 420, h: 340,
  impactTime: 1.2,
  impactPoint: [1120, 650],
  force: 980,
});

// 3. Exponential Tiny-to-Giant Domino Chain Reaction
PHY.dominoChain(g, lt, {
  id: 'shot09_domino',
  mode: 'exponential', // 'standard' | 'exponential'
  count: 9,
  startX: 280, endX: 1620, floorY: 840,
  startTime: 0.25,
});

// 4. Verlet Suspension Bridge Snapping at lt = 1.6s (or 'pendulum', 'wreckingBall')
PHY.ropeSim(g, lt, {
  id: 'shot11_bridge',
  preset: 'suspensionBridge', // 'pendulum' | 'wreckingBall' | 'suspensionBridge'
  x0: 320, x1: 1600, y0: 480,
  cutTime: 1.6,
});

// 5. Auto-Sync Physics Collisions to LUMINA_SOUND in scoreSound(k):
PHY.scheduleImpacts(k, 'domino', { id: 'shot09_domino', mode: 'exponential', count: 9 }, s.start, BATCH_START);