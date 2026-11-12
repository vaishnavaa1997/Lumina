// ============================================================================
// LUMINA 2.5D STORYBOOK & 3D-PARALLAX STUDIO — ROOT MODULAR ENGINE LOADER
// Save in: C:\Users\vaish\Videos\Video_Studio\Lumina\engine.js
// Synchronously loads Base Modules 1–6 + All 5 Expansion Modules from ./engine/
// Compatible with Chrome, Puppeteer (render_shots.js), and render_all.bat.
// ============================================================================
(function () {
  'use strict';

  var current = document.currentScript;
  var src = current && current.src ? current.src : '../../engine.js';
  var slashIdx = Math.max(src.lastIndexOf('/'), src.lastIndexOf('\\'));
  var baseDir = slashIdx >= 0 ? src.substring(0, slashIdx + 1) : '';

  var LUMINA_MODULES = [
    'engine/lumina_base.js',     // Base Modules 1–6 (Core, Rig, UI, Sound, Camera, Transitions)
    'engine/lumina_envs.js',     // Expansion 1: High-Density 5-Plane Environments & 3D Props
    'engine/lumina_teardown.js', // Expansion 2: 2.5D Isometric Tech Teardowns, Flows & Callouts
    'engine/lumina_maps.js',     // Expansion 3: Accurate [lon, lat] Vector Maps, States & Globes
    'engine/lumina_charts.js',   // Expansion 4: 3D Charts, Line Graphs, Sankey & Scale Arenas
    'engine/lumina_physics.js'   // Expansion 5: Deterministic 120Hz Pre-Baked Physics Engine
  ];

  window.LUMINA_LOADED_MODULES = LUMINA_MODULES;

  for (var i = 0; i < LUMINA_MODULES.length; i++) {
    document.write('<script src="' + baseDir + LUMINA_MODULES[i] + '"><\/script>');
  }
})();