// ============================================================================
// MODULE: LUMINA_MAPS (engine/lumina_maps.js) — High-Precision [lon, lat]
// Vector Cartography, Indian States, Southeast Asia, World Continents,
// Historical Empires, Major Rivers, 2.5D Extruded Coastal Cliff Relief,
// Royal Parchment Maps, Animated Naval/Army Route Vessels, 2.5D Monument
// Diorama Pins & Orthographic 3D Globe-to-Map Morphing.
// Logical Stage: 1920x1080 (16:9 Widescreen). Deterministic fn(t).
// Requires MODULE 1: LUMINA_CORE (window.DK / window.H / window.FX).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const FX = (window.FX = window.FX || DK.fx || {});
  const UI = (window.UI = window.UI || DK.ui || {});
  const E = DK.E || { W: 1920, H: 1080 };

  const {
    clamp,
    lerp,
    prog,
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
    text,
    measure,
    FONTS,
  } = DK;

  const DEG2RAD = Math.PI / 180;

  // ---------- 1. Regional Bounding Boxes [minLon, minLat, maxLon, maxLat] ----------
  const REGION_BBOX = {
    tamil_nadu: [75.2, 7.4, 81.8, 14.2],
    south_india: [72.5, 5.5, 85.5, 20.5],
    india: [66.5, 5.5, 98.5, 36.5],
    india_southeast_asia: [71.0, -9.5, 118.0, 26.5],
    southeast_asia: [92.0, -10.5, 126.0, 23.5],
    east_asia: [98.0, 18.0, 147.0, 48.0],
    middle_east: [26.0, 12.0, 72.0, 43.0],
    europe_mediterranean: [-11.0, 29.0, 42.0, 60.0],
    eurasia: [-12.0, -8.0, 148.0, 66.0],
    north_america: [-132.0, 15.0, -62.0, 58.0],
    world: [-168.0, -56.0, 178.0, 74.0],
  };

  // ---------- 2. Real [lon, lat] Vector Polygon Database (GEO_DB) ----------
  const GEO_DB = {
    // --- A. INDIAN STATES & SUBCONTINENT NEIGHBORS ---
    tamil_nadu: {
      name: 'TAMIL NADU',
      group: 'india_state',
      color: '#D98A4C',
      rings: [
        [
          [80.28, 13.42], [80.27, 13.08], [80.18, 12.62], [79.85, 11.94],
          [79.85, 11.45], [79.84, 10.76], [79.84, 10.28], [79.32, 10.22],
          [78.88, 9.55], [79.32, 9.28], [78.82, 9.15], [78.13, 8.78],
          [77.75, 8.38], [77.54, 8.08], [77.22, 8.32], [77.12, 8.95],
          [77.38, 9.48], [77.18, 9.92], [76.95, 10.35], [76.72, 10.85],
          [76.42, 11.45], [76.25, 11.68], [76.95, 11.95], [77.58, 12.22],
          [77.68, 12.68], [78.18, 12.88], [78.68, 12.92], [79.18, 13.05],
          [79.72, 13.28], [80.28, 13.42],
        ],
      ],
    },
    kerala: {
      name: 'KERALA',
      group: 'india_state',
      color: '#68A864',
      rings: [
        [
          [74.88, 12.78], [75.38, 12.48], [75.88, 11.92], [76.25, 11.68],
          [76.42, 11.45], [76.72, 10.85], [76.95, 10.35], [77.18, 9.92],
          [77.38, 9.48], [77.12, 8.95], [77.22, 8.32], [76.88, 8.42],
          [76.55, 8.88], [76.32, 9.48], [76.24, 9.96], [76.02, 10.65],
          [75.78, 11.25], [75.32, 11.88], [74.88, 12.78],
        ],
      ],
    },
    karnataka: {
      name: 'KARNATAKA',
      group: 'india_state',
      color: '#C89B58',
      rings: [
        [
          [74.12, 14.82], [74.45, 15.88], [74.38, 16.65], [75.55, 16.95],
          [76.45, 17.85], [77.48, 18.42], [77.68, 17.55], [77.38, 16.42],
          [77.15, 15.22], [77.62, 14.48], [78.28, 13.85], [78.18, 12.88],
          [77.68, 12.68], [77.58, 12.22], [76.95, 11.95], [76.25, 11.68],
          [75.88, 11.92], [75.38, 12.48], [74.88, 12.78], [74.62, 13.48],
          [74.38, 14.22], [74.12, 14.82],
        ],
      ],
    },
    andhra_pradesh: {
      name: 'ANDHRA PRADESH',
      group: 'india_state',
      color: '#D4A85C',
      rings: [
        [
          [80.28, 13.42], [79.72, 13.28], [79.18, 13.05], [78.68, 12.92],
          [78.18, 12.88], [78.28, 13.85], [77.62, 14.48], [77.15, 15.22],
          [77.38, 16.42], [78.42, 16.15], [79.58, 16.58], [80.42, 16.92],
          [81.18, 17.65], [82.65, 18.45], [84.18, 18.98], [84.72, 19.12],
          [83.92, 18.18], [83.32, 17.68], [82.28, 16.92], [81.65, 16.32],
          [80.85, 15.75], [80.15, 15.12], [80.08, 14.25], [80.28, 13.42],
        ],
      ],
    },
    telangana: {
      name: 'TELANGANA',
      group: 'india_state',
      color: '#BC8C54',
      rings: [
        [
          [77.48, 18.42], [78.12, 19.28], [79.48, 19.65], [80.42, 18.78],
          [81.18, 17.65], [80.42, 16.92], [79.58, 16.58], [78.42, 16.15],
          [77.38, 16.42], [77.68, 17.55], [77.48, 18.42],
        ],
      ],
    },
    maharashtra: {
      name: 'MAHARASHTRA',
      group: 'india_state',
      color: '#C48452',
      rings: [
        [
          [72.68, 20.12], [73.68, 20.92], [74.78, 21.65], [76.42, 21.38],
          [78.25, 21.52], [80.28, 21.25], [80.52, 19.85], [80.42, 18.78],
          [79.48, 19.65], [78.12, 19.28], [77.48, 18.42], [76.45, 17.85],
          [75.55, 16.95], [74.38, 16.65], [73.78, 15.85], [73.32, 16.95],
          [72.95, 18.25], [72.82, 18.95], [72.68, 20.12],
        ],
      ],
    },
    odisha: {
      name: 'ODISHA',
      group: 'india_state',
      color: '#B8985E',
      rings: [
        [
          [84.72, 19.12], [84.18, 18.98], [82.65, 18.45], [81.48, 18.22],
          [82.38, 20.15], [83.52, 21.48], [84.88, 22.35], [86.52, 22.18],
          [87.45, 21.62], [86.95, 20.75], [85.85, 19.82], [84.72, 19.12],
        ],
      ],
    },
    gujarat: {
      name: 'GUJARAT',
      group: 'india_state',
      color: '#D8A664',
      rings: [
        [
          [68.45, 23.62], [69.85, 24.42], [71.68, 24.55], [73.48, 24.18],
          [74.32, 22.85], [73.68, 20.92], [72.85, 20.38], [72.62, 21.65],
          [72.18, 21.75], [70.85, 20.78], [69.05, 22.25], [70.18, 22.88],
          [68.45, 23.62],
        ],
      ],
    },
    sri_lanka: {
      name: 'SRI LANKA (Eelam)',
      group: 'country',
      color: '#78A868',
      rings: [
        [
          [79.98, 9.78], [80.32, 9.45], [80.85, 8.95], [81.25, 8.55],
          [81.82, 7.45], [81.75, 6.45], [80.62, 5.95], [79.95, 6.42],
          [79.82, 7.25], [79.75, 8.28], [79.92, 9.05], [79.98, 9.78],
        ],
      ],
    },

    // --- B. FULL INDIA SUBCONTINENT OUTLINE (For Macro Maps) ---
    india_mainland: {
      name: 'INDIA',
      group: 'country',
      color: '#C9965C',
      rings: [
        [
          [68.45, 23.62], [70.18, 22.88], [69.05, 22.25], [70.85, 20.78],
          [72.62, 21.65], [72.82, 18.95], [73.32, 16.95], [74.12, 14.82],
          [74.88, 12.78], [75.78, 11.25], [76.32, 9.48], [77.54, 8.08],
          [78.13, 8.78], [79.32, 9.28], [78.88, 9.55], [79.84, 10.28],
          [79.85, 11.94], [80.27, 13.08], [80.08, 14.25], [80.85, 15.75],
          [82.28, 16.92], [83.92, 18.18], [85.85, 19.82], [87.45, 21.62],
          [88.85, 21.75], [88.95, 24.45], [88.15, 26.65], [89.85, 26.25],
          [92.15, 26.85], [95.85, 28.15], [97.35, 27.95], [96.25, 26.15],
          [94.25, 24.25], [92.85, 22.85], [91.45, 23.85], [88.95, 24.45],
          [88.15, 26.65], [85.25, 26.85], [81.15, 28.45], [78.95, 31.25],
          [78.45, 34.85], [76.25, 35.65], [74.15, 34.45], [74.65, 31.85],
          [73.25, 29.85], [70.45, 27.25], [71.15, 24.65], [68.45, 23.62],
        ],
      ],
    },

    // --- C. SOUTHEAST ASIA & MARITIME CHOLA EXPEDITION REGIONS ---
    myanmar_thai_malay: {
      name: 'MALAY PENINSULA (Kadaram)',
      group: 'country',
      color: '#6E9E68',
      rings: [
        [
          [92.45, 20.85], [94.35, 16.15], [96.45, 16.65], [97.85, 15.15],
          [98.45, 11.85], [99.15, 9.25], [100.15, 6.45], [101.25, 3.65],
          [103.85, 1.32], [104.25, 2.65], [103.35, 4.85], [102.15, 6.25],
          [100.25, 8.45], [99.45, 11.45], [100.55, 13.55], [102.65, 12.35],
          [104.65, 10.35], [106.85, 8.65], [109.25, 11.85], [108.15, 16.05],
          [105.85, 18.85], [107.15, 21.45], [102.25, 22.45], [97.85, 24.45],
          [92.45, 20.85],
        ],
      ],
    },
    sumatra: {
      name: 'SUMATRA (Srivijaya)',
      group: 'country',
      color: '#5C9862',
      rings: [
        [
          [95.32, 5.55], [97.65, 4.95], [99.85, 3.15], [102.25, 1.45],
          [104.45, -0.85], [105.95, -2.95], [105.75, -5.85], [103.85, -5.35],
          [101.65, -3.15], [99.35, -0.65], [97.25, 1.85], [95.32, 5.55],
        ],
      ],
    },
    java: {
      name: 'JAVA',
      group: 'country',
      color: '#689E5E',
      rings: [
        [
          [105.35, -6.15], [108.45, -6.35], [111.35, -6.75], [114.45, -7.75],
          [114.25, -8.65], [110.85, -8.25], [107.45, -7.55], [105.35, -6.75],
          [105.35, -6.15],
        ],
      ],
    },
    borneo: {
      name: 'BORNEO',
      group: 'country',
      color: '#5E925C',
      rings: [
        [
          [109.25, 1.85], [111.65, 3.25], [115.25, 5.45], [117.65, 6.85],
          [118.85, 4.65], [117.65, 1.15], [116.25, -2.25], [114.35, -3.55],
          [111.65, -3.15], [109.45, -0.65], [109.25, 1.85],
        ],
      ],
    },
    andaman_nicobar: {
      name: 'ANDAMAN & NICOBAR',
      group: 'island',
      color: '#78A868',
      rings: [
        [[92.65, 13.45], [93.05, 13.25], [92.95, 11.65], [92.55, 11.75], [92.65, 13.45]],
        [[93.65, 7.95], [93.95, 7.65], [93.85, 6.75], [93.55, 6.95], [93.65, 7.95]],
      ],
    },

    // --- D. WORLD CONTINENTS & MAJOR HISTORICAL REGIONS ---
    eurasia_macro: {
      name: 'EURASIA',
      group: 'continent',
      color: '#B89B6A',
      rings: [
        [
          [-9.2, 38.7], [-5.5, 36.0], [3.2, 42.4], [12.5, 41.9], [15.6, 38.2],
          [18.5, 40.5], [23.7, 37.9], [26.2, 40.0], [35.5, 33.9], [34.8, 31.2],
          [48.5, 30.0], [56.2, 26.5], [61.5, 25.2], [68.4, 23.6], [72.8, 18.9],
          [77.5, 8.1], [80.3, 13.1], [88.8, 21.8], [94.3, 16.2], [100.2, 6.5],
          [103.8, 1.3], [106.8, 8.7], [109.2, 11.9], [108.1, 21.5], [114.2, 22.3],
          [121.5, 31.2], [126.8, 37.5], [129.1, 35.1], [135.2, 43.5], [142.5, 52.8],
          [160.5, 59.5], [172.0, 64.5], [135.0, 71.2], [85.0, 72.5], [42.0, 68.2],
          [28.0, 70.8], [10.5, 63.4], [5.2, 60.4], [8.5, 54.5], [1.8, 51.0],
          [-4.5, 48.4], [-1.8, 43.4], [-9.2, 38.7],
        ],
      ],
    },
    uk_ireland: {
      name: 'BRITAIN',
      group: 'country',
      color: '#8EA472',
      rings: [
        [[-5.2, 50.1], [1.4, 51.2], [-1.8, 55.6], [-5.1, 58.5], [-4.8, 54.8], [-5.2, 50.1]],
      ],
    },
    japan_archipelago: {
      name: 'JAPAN',
      group: 'country',
      color: '#A88268',
      rings: [
        [[130.5, 31.5], [134.5, 33.8], [139.8, 35.7], [141.2, 41.2], [139.5, 39.8], [135.5, 35.6], [130.5, 31.5]],
        [[140.5, 41.8], [145.2, 43.4], [141.8, 45.4], [140.5, 41.8]],
      ],
    },
    africa_macro: {
      name: 'AFRICA',
      group: 'continent',
      color: '#C89E62',
      rings: [
        [
          [-5.8, 35.8], [10.2, 36.8], [32.5, 31.2], [43.2, 11.8], [51.2, 11.9],
          [40.5, -2.5], [39.5, -10.5], [35.2, -23.5], [25.8, -33.9], [18.4, -34.4],
          [14.5, -22.6], [12.2, -6.1], [9.4, 3.8], [3.4, 6.4], [-7.8, 4.5],
          [-17.4, 14.7], [-13.2, 27.8], [-5.8, 35.8],
        ],
      ],
    },
    north_america_macro: {
      name: 'NORTH AMERICA',
      group: 'continent',
      color: '#98A872',
      rings: [
        [
          [-165.0, 64.5], [-135.0, 58.2], [-124.2, 48.4], [-122.4, 37.8],
          [-117.2, 32.7], [-105.2, 20.6], [-89.6, 21.2], [-80.2, 25.8],
          [-75.5, 35.2], [-74.0, 40.7], [-66.0, 44.6], [-55.5, 52.2],
          [-78.5, 62.4], [-115.0, 68.5], [-165.0, 64.5],
        ],
      ],
    },
    south_america_macro: {
      name: 'SOUTH AMERICA',
      group: 'continent',
      color: '#78A464',
      rings: [
        [
          [-77.5, 8.5], [-62.2, 10.5], [-50.2, 1.5], [-34.8, -7.2],
          [-43.2, -22.9], [-53.5, -33.8], [-68.5, -54.8], [-74.5, -45.2],
          [-71.5, -33.0], [-70.2, -18.5], [-81.2, -4.8], [-77.5, 8.5],
        ],
      ],
    },
    australia_macro: {
      name: 'AUSTRALIA',
      group: 'continent',
      color: '#C88A58',
      rings: [
        [
          [114.2, -22.2], [130.8, -12.5], [142.5, -10.8], [153.2, -27.5],
          [149.8, -37.5], [138.6, -34.9], [115.8, -34.2], [114.2, -22.2],
        ],
      ],
    },
  };

  // ---------- 3. Historical Empire & Territory Polygons (EMPIRES_DB) ----------
  const EMPIRES_DB = {
    chola: {
      name: 'CHOLA EMPIRE',
      color: 'rgba(247, 185, 40, 0.46)',
      border: '#FFD54F',
      rings: [
        [
          [80.28, 13.42], [80.08, 14.25], [81.65, 16.32], [84.72, 19.12],
          [87.45, 21.62], [85.2, 20.8], [79.5, 16.2], [76.95, 11.95],
          [77.12, 8.95], [77.54, 8.08], [79.32, 9.28], [79.84, 10.76],
          [80.28, 13.42],
        ],
        // Northern Sri Lanka & Maritime foothold
        [
          [79.98, 9.78], [81.25, 8.55], [81.75, 6.85], [79.82, 7.25], [79.98, 9.78],
        ],
      ],
    },
    chola_maritime: {
      name: 'SRIVIJAYA / KADARAM (Chola Vassal)',
      color: 'rgba(255, 133, 27, 0.42)',
      border: '#FF851B',
      rings: [
        [
          [99.8, 7.2], [103.85, 1.32], [104.25, 2.65], [102.15, 6.25], [99.8, 7.2],
        ],
        [
          [95.32, 5.55], [102.25, 1.45], [105.75, -4.85], [101.65, -3.15], [95.32, 5.55],
        ],
      ],
    },
    pandya: {
      name: 'PANDYA KINGDOM',
      color: 'rgba(229, 57, 53, 0.45)',
      border: '#FF6B6B',
      rings: [
        [
          [79.32, 10.22], [78.88, 9.55], [79.32, 9.28], [78.13, 8.78],
          [77.54, 8.08], [77.22, 8.32], [77.18, 9.92], [77.95, 10.38],
          [79.32, 10.22],
        ],
      ],
    },
    chera: {
      name: 'CHERA KINGDOM',
      color: 'rgba(56, 200, 120, 0.45)',
      border: '#38C878',
      rings: [
        [
          [75.38, 12.48], [76.42, 11.45], [77.38, 10.95], [77.18, 9.92],
          [76.88, 8.42], [76.24, 9.96], [75.32, 11.88], [75.38, 12.48],
        ],
      ],
    },
    pallava: {
      name: 'PALLAVA KINGDOM',
      color: 'rgba(142, 84, 233, 0.44)',
      border: '#B888FF',
      rings: [
        [
          [80.28, 13.42], [80.15, 15.12], [79.2, 15.2], [78.18, 12.88],
          [79.15, 11.75], [79.85, 11.94], [80.28, 13.42],
        ],
      ],
    },
    roman_empire: {
      name: 'ROMAN EMPIRE',
      color: 'rgba(201, 42, 42, 0.44)',
      border: '#FF5E5E',
      rings: [
        [
          [-9.0, 38.7], [-1.8, 43.4], [8.5, 49.5], [16.5, 48.2], [28.8, 44.2],
          [36.2, 36.8], [35.5, 31.2], [29.9, 31.2], [10.2, 36.8], [-5.8, 35.8],
          [-9.0, 38.7],
        ],
      ],
    },
  };

  // ---------- 4. Major Historical & Geographical Rivers (RIVERS_DB) ----------
  const RIVERS_DB = {
    kaveri: {
      name: 'Kaveri River',
      pts: [[75.52, 12.38], [76.65, 12.42], [77.72, 11.35], [78.68, 10.82], [79.13, 10.78], [79.85, 11.14]],
    },
    vaigai: {
      name: 'Vaigai River',
      pts: [[77.38, 9.98], [77.82, 10.12], [78.12, 9.92], [78.48, 9.65], [78.98, 9.32]],
    },
    thamirabarani: {
      name: 'Thamirabarani',
      pts: [[77.25, 8.68], [77.58, 8.72], [77.78, 8.65], [78.12, 8.63]],
    },
    godavari: {
      name: 'Godavari River',
      pts: [[73.55, 19.95], [76.25, 19.12], [78.85, 18.85], [80.85, 17.65], [81.78, 16.98], [82.28, 16.72]],
    },
    krishna: {
      name: 'Krishna River',
      pts: [[73.65, 17.92], [75.85, 16.35], [77.95, 16.18], [79.65, 16.55], [80.62, 16.52], [81.12, 15.95]],
    },
    ganga: {
      name: 'Ganga River',
      pts: [[78.95, 30.98], [78.15, 29.55], [80.35, 26.45], [83.02, 25.32], [85.15, 25.62], [88.25, 24.18], [89.15, 22.15]],
    },
    indus: {
      name: 'Indus River',
      pts: [[77.55, 34.15], [74.65, 35.25], [71.85, 32.85], [70.25, 29.35], [68.35, 25.45], [67.45, 24.12]],
    },
    nile: {
      name: 'Nile River',
      pts: [[32.55, 15.58], [32.95, 19.55], [32.88, 24.08], [31.24, 30.04], [31.15, 31.45]],
    },
  };

  // ---------- 5. Named Historical & Modern Cities Lookup (CITIES_DB) ----------
  const CITIES_DB = {
    POOMPUHAR: [79.85, 11.14],
    KAVERIPATTINAM: [79.85, 11.14],
    NAGAPATTINAM: [79.84, 10.76],
    THANJAVUR: [79.13, 10.78],
    URAIYUR: [78.68, 10.82],
    GANGAIKONDA_CHOLAPURAM: [79.45, 11.21],
    MADURAI: [78.12, 9.92],
    KEELADI: [78.20, 9.85],
    KORKAI: [78.08, 8.63],
    ADICHANALLUR: [77.88, 8.62],
    KANCHIPURAM: [79.70, 12.83],
    MAMALLAPURAM: [80.19, 12.62],
    CHENNAI: [80.27, 13.08],
    MUZIRIS: [76.21, 10.21],
    KODUMANAL: [77.52, 11.18],
    KARUR: [78.08, 10.96],
    KANYAKUMARI: [77.55, 8.08],
    RAMESWARAM: [79.31, 9.29],
    ANURADHAPURA: [80.40, 8.31],
    POLONNARUWA: [81.00, 7.94],
    BENGALURU: [77.59, 12.97],
    HYDERABAD: [78.48, 17.38],
    MUMBAI: [72.87, 19.07],
    DELHI: [77.21, 28.61],
    KOLKATA: [88.36, 22.57],
    PATALIPUTRA: [85.14, 25.60],
    KADARAM: [100.42, 5.72],
    MALAYSIA: [101.68, 3.14],
    TEMASEK: [103.85, 1.29],
    SINGAPORE: [103.85, 1.29],
    SRIVIJAYA: [104.75, -2.99],
    PALEMBANG: [104.75, -2.99],
    ANGKOR: [103.86, 13.41],
    ROME: [12.49, 41.89],
    ALEXANDRIA: [29.92, 31.20],
    BERENIKE: [35.47, 23.91],
    LONDON: [-0.12, 51.50],
    PARIS: [2.35, 48.85],
    BEIJING: [116.40, 39.90],
    TOKYO: [139.69, 35.68],
    NEW_YORK: [-74.00, 40.71],
    SAN_FRANCISCO: [-122.42, 37.77],
  };

  // ---------- 6. Projection Math: Equirectangular/Mercator & 3D Orthographic Globe ----------
  function getRegionBBox(region = 'india_southeast_asia', customBBox = null) {
    if (Array.isArray(customBBox) && customBBox.length === 4) return customBBox;
    const key = String(region || 'india_southeast_asia').toLowerCase();
    return REGION_BBOX[key] || REGION_BBOX.india_southeast_asia;
  }

  function lonLatToXY(lon, lat, bbox, rect = [110, 88, 1700, 904]) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const [rx, ry, rw, rh] = rect;
    const midLatRad = ((minLat + maxLat) * 0.5) * DEG2RAD;
    const cosMid = Math.max(0.35, Math.cos(midLatRad));
    const lonSpan = Math.max(0.1, (maxLon - minLon) * cosMid);
    const latSpan = Math.max(0.1, maxLat - minLat);

    // Maintain true geographic aspect ratio inside the 16:9 viewport frame
    const scale = Math.min(rw / lonSpan, rh / latSpan);
    const mapW = lonSpan * scale;
    const mapH = latSpan * scale;
    const ox = rx + (rw - mapW) * 0.5;
    const oy = ry + (rh - mapH) * 0.5;

    const x = ox + (lon - minLon) * cosMid * scale;
    const y = oy + (maxLat - lat) * scale;
    return [x, y];
  }

  function lonLatToGlobe(lon, lat, centerLon = 79.0, centerLat = 13.0, radius = 380, cx = 960, cy = 540) {
    const lam = lon * DEG2RAD;
    const phi = lat * DEG2RAD;
    const lam0 = centerLon * DEG2RAD;
    const phi0 = centerLat * DEG2RAD;

    const dLam = lam - lam0;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosPhi0 = Math.cos(phi0);
    const sinPhi0 = Math.sin(phi0);

    // Cosine of angular distance from front center of sphere (visible when cosC > -0.1)
    const cosC = sinPhi0 * sinPhi + cosPhi0 * cosPhi * Math.cos(dLam);
    const x = cx + radius * cosPhi * Math.sin(dLam);
    const y = cy - radius * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * Math.cos(dLam));
    return { x, y, z: cosC, visible: cosC > -0.08 };
  }

  // Smart Coordinate Resolver: Accepts City Name ('THANJAVUR'), [lon, lat], or legacy stage [x, y]!
  function resolveMapPoint(pt, bbox, rect) {
    if (!pt) return [960, 540];
    if (typeof pt === 'string') {
      const clean = pt.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const ll = CITIES_DB[clean] || [79.13, 10.78];
      return lonLatToXY(ll[0], ll[1], bbox, rect);
    }
    if (Array.isArray(pt) && pt.length >= 2) {
      const [a, b] = pt;
      // If values are > 180 or y > 90, treat as legacy stage [x, y] pixel coordinates!
      if (Math.abs(a) > 180 || Math.abs(b) > 90) {
        return [a, b];
      }
      return lonLatToXY(a, b, bbox, rect);
    }
    if (typeof pt === 'object' && pt.lon !== undefined && pt.lat !== undefined) {
      return lonLatToXY(pt.lon, pt.lat, bbox, rect);
    }
    if (typeof pt === 'object' && pt.x !== undefined && pt.y !== undefined) {
      return resolveMapPoint([pt.x, pt.y], bbox, rect);
    }
    return [960, 540];
  }

  // Select which polygons from GEO_DB to render for a given region
  function selectPolygonsForRegion(region) {
    const r = String(region || 'india_southeast_asia').toLowerCase();
    if (r === 'tamil_nadu' || r === 'south_india') {
      return ['kerala', 'karnataka', 'andhra_pradesh', 'telangana', 'sri_lanka', 'tamil_nadu'];
    }
    if (r === 'india') {
      return [
        'india_mainland', 'gujarat', 'maharashtra', 'telangana', 'odisha',
        'karnataka', 'andhra_pradesh', 'kerala', 'tamil_nadu', 'sri_lanka', 'andaman_nicobar',
      ];
    }
    if (r === 'india_southeast_asia' || r === 'southeast_asia') {
      return [
        'india_mainland', 'maharashtra', 'odisha', 'karnataka', 'andhra_pradesh',
        'kerala', 'tamil_nadu', 'sri_lanka', 'andaman_nicobar',
        'myanmar_thai_malay', 'sumatra', 'java', 'borneo',
      ];
    }
    return [
      'eurasia_macro', 'africa_macro', 'north_america_macro', 'south_america_macro',
      'australia_macro', 'uk_ireland', 'japan_archipelago', 'india_mainland',
      'sri_lanka', 'myanmar_thai_malay', 'sumatra', 'java', 'borneo',
    ];
  }

  // ---------- 7. 2.5D Extruded Polygon & Coastal Relief Renderer ----------
  function drawExtrudedRing(g, screenPts, o = {}) {
    if (!screenPts || screenPts.length < 3) return;
    const {
      fill = '#D6A868',
      cliffColor = '#6E4C2C',
      coastGlow = 'rgba(130, 225, 255, 0.35)',
      borderColor = 'rgba(55, 35, 18, 0.55)',
      borderW = 2.2,
      extrudeY = 12,
      extrudeX = 4,
    } = o;

    // 1. Shallow Coastal Shelf Halo
    if (coastGlow) {
      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = coastGlow;
      g.lineWidth = 18;
      g.beginPath();
      g.moveTo(screenPts[0][0], screenPts[0][1]);
      for (let i = 1; i < screenPts.length; i++) g.lineTo(screenPts[i][0], screenPts[i][1]);
      g.closePath();
      g.stroke();
      g.restore();
    }

    // 2. 2.5D Vertical Cliff Extrusion Stack
    if (extrudeY > 0) {
      const steps = 4;
      for (let s = steps; s >= 1; s--) {
        const frac = s / steps;
        const ox = extrudeX * frac;
        const oy = extrudeY * frac;
        g.beginPath();
        g.moveTo(screenPts[0][0] + ox, screenPts[0][1] + oy);
        for (let i = 1; i < screenPts.length; i++) {
          g.lineTo(screenPts[i][0] + ox, screenPts[i][1] + oy);
        }
        g.closePath();
        g.fillStyle = s === steps ? 'rgba(0,0,0,0.32)' : shade(cliffColor, -0.1 * s);
        g.fill();
      }
    }

    // 3. Top Bevelled Landmass Surface
    g.beginPath();
    g.moveTo(screenPts[0][0], screenPts[0][1]);
    for (let i = 1; i < screenPts.length; i++) g.lineTo(screenPts[i][0], screenPts[i][1]);
    g.closePath();
    g.fillStyle = fill;
    g.fill();

    if (borderColor && borderW > 0) {
      g.lineJoin = 'round';
      g.strokeStyle = borderColor;
      g.lineWidth = borderW;
      g.stroke();
    }
  }

  // ---------- 8. Miniature 2.5D Monument Diorama & Route Vessel Icons ----------
  function drawMapDiorama(g, x, y, kind = 'gopuram', s = 1, col = '#FFD54F') {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    contactShadow(g, 0, 4, 28, 8, 0.38);

    if (kind === 'gopuram' || kind === 'temple') {
      poly(g, [[-20, 0], [20, 0], [12, -46], [-12, -46]], cylinderGrad(g, -20, -46, 20, 0, '#C85A32', -1), '#7C2E16', 1.8);
      for (let tier = 1; tier <= 3; tier++) {
        const ty = -tier * 11;
        const tw = 20 - tier * 2.2;
        seg(g, [[-tw, ty], [tw, ty]], 3, '#FFD54F');
      }
      rr(g, -11, -52, 22, 7, 3);
      g.fillStyle = '#D99B26';
      g.fill();
      circle(g, -6, -55, 2.5, '#FFF3B0');
      circle(g, 0, -56, 3, '#FFF3B0');
      circle(g, 6, -55, 2.5, '#FFF3B0');
    } else if (kind === 'fort' || kind === 'citadel') {
      rr(g, -22, -32, 44, 32, 3);
      g.fillStyle = cylinderGrad(g, -22, -32, 22, 0, '#788292', -1);
      g.fill();
      [-18, -6, 6, 14].forEach((mx) => {
        g.fillStyle = '#949FB0';
        g.fillRect(mx, -39, 6, 8);
      });
      rr(g, -7, -18, 14, 18, 6);
      g.fillStyle = '#261C16';
      g.fill();
    } else if (kind === 'port' || kind === 'ship') {
      poly(g, [[-22, 0], [22, 0], [28, -12], [-26, -12]], '#7C4828');
      seg(g, [[0, -12], [0, -44]], 3.5, '#5C341C');
      poly(g, [[-16, -40], [16, -40], [18, -16], [-14, -16]], '#F7B928', '#C92A2A', 2);
    } else if (kind === 'digSite' || kind === 'keeladi') {
      rr(g, -24, -16, 48, 16, 3);
      g.fillStyle = '#B84C2E';
      g.fill();
      circle(g, 0, -24, 11, sphereGrad(g, 0, -24, 11, '#C85A38'));
      ellipse(g, 0, -33, 8, 3.5, '#3E1E12');
    } else if (kind === 'battle' || kind === 'swords') {
      seg(g, [[-18, -4], [18, -36]], 4, '#E2E8F0');
      seg(g, [[18, -4], [-18, -36]], 4, '#E2E8F0');
      glow(g, 0, -20, 22, '#FF5E3A', 0.85);
      circle(g, 0, -20, 5, '#FFF3B0');
    } else {
      // Glowing Beacon Pin
      glow(g, 0, -14, 26, col, 0.85);
      poly(g, [[0, 0], [-11, -18], [11, -18]], col);
      circle(g, 0, -20, 11, sphereGrad(g, 0, -20, 11, col));
      circle(g, 0, -20, 4.5, '#FFFFFF');
    }
    g.restore();
  }

  function drawRouteVessel(g, x, y, angle, kind = 'ship', col = '#FF851B', t = 0) {
    g.save();
    g.translate(x, y);
    if (kind === 'naval' || kind === 'ship') {
      // Always keep ship upright while facing horizontal direction of travel
      const flip = Math.cos(angle) < 0 ? -1 : 1;
      g.scale(flip, 1 + Math.sin(t * 5) * 0.04);
      poly(g, [[-18, 4], [18, 4], [24, -5], [-22, -5]], '#7C4828');
      seg(g, [[0, -5], [0, -32]], 3, '#4A2814');
      poly(g, [[-12, -29], [14, -29], [16, -9], [-10, -9]], '#F7B928', '#C92A2A', 1.8);
    } else if (kind === 'air' || kind === 'plane') {
      g.rotate(angle);
      poly(g, [[18, 0], [-12, -12], [-6, 0], [-12, 12]], '#FFFFFF', col, 2);
    } else {
      // Directional Cavalry / Army Arrowhead
      g.rotate(angle);
      glow(g, 0, 0, 22, col, 0.8);
      poly(g, [[16, 0], [-11, -10], [-6, 0], [-11, 10]], col, '#FFFFFF', 1.8);
    }
    g.restore();
  }

  // ---------- 9. Master 2.5D Strategic & Historical Map Renderer (UI.strategicMap) ----------
  function strategicMap(g, lt = 0, o = {}) {
    const {
      region = 'india_southeast_asia',
      bbox: customBBox = null,
      style = 'parchment', // 'parchment' | 'relief' | 'satelliteNight' | 'blueprint'
      territories = [],
      routes = [],
      pins = [],
      rivers = true,
      grid = true,
      compass = true,
      title = '',
      subTitle = '',
    } = o;

    const bbox = getRegionBBox(region, customBBox);
    const viewport = o.viewport || [110, 86, 1700, 908];
    const isParchment = style === 'parchment';
    const isNight = style === 'satelliteNight' || style === 'blueprint';

    g.save();

    // 1. Ocean Backdrop & Animated Wave Shimmer
    const oceanCols = isParchment
      ? ['#1A4E7A', '#24689C', '#164066']
      : isNight
      ? ['#050C1E', '#0B1B3D', '#07122B']
      : ['#104E8B', '#1C6EB8', '#12467A'];
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, oceanCols);
    g.fillRect(0, 0, E.W, E.H);

    // Animated Nautical Wave Ripples
    const rWave = rng(409);
    g.strokeStyle = isParchment ? 'rgba(255, 240, 200, 0.12)' : 'rgba(160, 230, 255, 0.14)';
    g.lineWidth = 2;
    for (let i = 0; i < 36; i++) {
      const wx = 80 + rWave() * (E.W - 160) + Math.sin(lt * 1.4 + i) * 14;
      const wy = 80 + rWave() * (E.H - 160);
      g.beginPath();
      g.moveTo(wx - 24, wy);
      g.quadraticCurveTo(wx - 12, wy - 5, wx, wy);
      g.quadraticCurveTo(wx + 12, wy + 5, wx + 24, wy);
      g.stroke();
    }

    // 2. Latitude / Longitude Graticule Grid
    if (grid) {
      g.strokeStyle = isParchment ? 'rgba(255, 235, 190, 0.13)' : 'rgba(130, 195, 255, 0.14)';
      g.lineWidth = 1.2;
      g.setLineDash([6, 8]);
      for (let gx = 160; gx < E.W - 100; gx += 200) {
        g.beginPath();
        g.moveTo(gx, 60);
        g.lineTo(gx, E.H - 60);
        g.stroke();
      }
      for (let gy = 140; gy < E.H - 100; gy += 160) {
        g.beginPath();
        g.moveTo(80, gy);
        g.lineTo(E.W - 80, gy);
        g.stroke();
      }
      g.setLineDash([]);
    }

    // 3. Render 2.5D Extruded Landmasses & State Polygons
    const polyKeys = selectPolygonsForRegion(region);
    polyKeys.forEach((k) => {
      const item = GEO_DB[k];
      if (!item) return;
      const baseLandCol = isParchment
        ? mix(item.color || '#D6A868', '#E8CE9C', 0.48)
        : isNight
        ? '#1C2D4F'
        : item.color || '#6EA864';
      const cliffCol = isParchment ? '#5C3E22' : isNight ? '#0A1326' : '#3B5836';
      const coastGlow = isParchment
        ? 'rgba(120, 210, 240, 0.28)'
        : isNight
        ? 'rgba(80, 200, 255, 0.22)'
        : 'rgba(110, 225, 255, 0.34)';

      item.rings.forEach((ringLL) => {
        const screenPts = ringLL.map(([lon, lat]) => lonLatToXY(lon, lat, bbox, viewport));
        drawExtrudedRing(g, screenPts, {
          fill: linGrad(g, 0, 120, 0, 960, [shade(baseLandCol, 0.1), baseLandCol, shade(baseLandCol, -0.12)]),
          cliffColor: cliffCol,
          coastGlow,
          borderColor: isParchment ? 'rgba(92, 60, 28, 0.65)' : 'rgba(255, 255, 255, 0.28)',
          borderW: item.group === 'india_state' ? 2.4 : 2.0,
          extrudeY: 11,
          extrudeX: 3,
        });
      });
    });

    // 4. Render Major Rivers
    if (rivers) {
      g.save();
      g.lineCap = 'round';
      g.lineJoin = 'round';
      Object.keys(RIVERS_DB).forEach((rk) => {
        const rv = RIVERS_DB[rk];
        const pts = rv.pts;
        // Check if river falls inside current bbox
        const [lon0, lat0] = pts[0];
        if (lon0 < bbox[0] - 2 || lon0 > bbox[2] + 2 || lat0 < bbox[1] - 2 || lat0 > bbox[3] + 2) return;
        const sPts = pts.map(([ln, lt2]) => lonLatToXY(ln, lt2, bbox, viewport));
        seg(g, sPts, 4.5, isParchment ? 'rgba(30, 110, 180, 0.75)' : 'rgba(88, 205, 255, 0.85)');
        seg(g, sPts, 1.8, 'rgba(215, 248, 255, 0.85)');
      });
      g.restore();
    }

    // 5. Render Historical Empire / Territory Overlays (with Animated Expansion)
    territories.forEach((ter) => {
      const tKey = String(ter.id || ter.name || 'chola').toLowerCase();
      const preset = EMPIRES_DB[tKey] || EMPIRES_DB.chola;
      const ringsLL = ter.rings || preset.rings || [];
      const fillCol = ter.color || preset.color || 'rgba(247, 185, 40, 0.45)';
      const borderCol = ter.border || preset.border || '#FFD54F';
      const expandU = ter.t0 !== undefined ? ease.out(prog(lt, ter.t0, (ter.t0 || 0) + (ter.dur || 1.2))) : 1;
      if (expandU <= 0.01) return;

      g.save();
      g.globalAlpha *= expandU;
      ringsLL.forEach((rLL) => {
        const sPts = rLL.map((pt) => resolveMapPoint(pt, bbox, viewport));
        poly(g, sPts, fillCol, borderCol, 3.5);
      });

      // Also highlight maritime vassal territory if 'chola' is selected on a Southeast Asia map
      if (tKey === 'chola' && (region === 'india_southeast_asia' || region === 'southeast_asia')) {
        EMPIRES_DB.chola_maritime.rings.forEach((rLL) => {
          const sPts = rLL.map((pt) => resolveMapPoint(pt, bbox, viewport));
          poly(g, sPts, EMPIRES_DB.chola_maritime.color, EMPIRES_DB.chola_maritime.border, 2.8);
        });
      }

      if (ter.label) {
        const centerPt = ter.labelPos
          ? resolveMapPoint(ter.labelPos, bbox, viewport)
          : resolveMapPoint(ringsLL[0] ? ringsLL[0][0] : [79.1, 11.0], bbox, viewport);
        text(g, ter.label, centerPt[0], centerPt[1] - 24, {
          size: 26,
          font: FONTS.serif,
          weight: 900,
          color: '#FFF8E7',
          stroke: 5,
          strokeColor: 'rgba(20, 12, 6, 0.85)',
          spacing: 2.5,
        });
      }
      g.restore();
    });

    // 6. Render Animated Bezier / Great-Circle Route Arrows & Moving Vessels
    routes.forEach((rt, rIdx) => {
      const t0 = rt.t0 !== undefined ? rt.t0 : 0.2;
      const dur = rt.dur !== undefined ? rt.dur : 1.6;
      const u = ease.inOut(prog(lt, t0, t0 + dur));
      if (u <= 0.001) return;

      const p0 = resolveMapPoint(rt.from, bbox, viewport);
      const p1 = resolveMapPoint(rt.to, bbox, viewport);
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const dist = Math.hypot(dx, dy);
      const arcLift = rt.arc !== undefined ? rt.arc : -Math.min(130, dist * 0.22);
      const cx = (p0[0] + p1[0]) * 0.5 - (dy / Math.max(1, dist)) * arcLift * 0.35;
      const cy = (p0[1] + p1[1]) * 0.5 + arcLift;

      const col = rt.color || '#FF851B';
      const steps = 36;
      const maxStep = Math.max(1, Math.round(steps * u));
      const curvePts = [];
      for (let i = 0; i <= maxStep; i++) {
        const s = i / steps;
        const bx = (1 - s) * (1 - s) * p0[0] + 2 * (1 - s) * s * cx + s * s * p1[0];
        const by = (1 - s) * (1 - s) * p0[1] + 2 * (1 - s) * s * cy + s * s * p1[1];
        curvePts.push([bx, by]);
      }

      // Route Glow & Dashed Trail
      g.save();
      g.strokeStyle = alpha(col, 0.35);
      g.lineWidth = 10;
      g.lineCap = 'round';
      g.beginPath();
      curvePts.forEach(([px, py], i) => (i === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
      g.stroke();

      g.strokeStyle = col;
      g.lineWidth = 4.5;
      g.setLineDash([12, 8]);
      g.lineDashOffset = -lt * 45;
      g.stroke();
      g.setLineDash([]);
      g.restore();

      // Moving Vessel or Arrowhead at Route Tip
      const tip = curvePts[curvePts.length - 1];
      const prev = curvePts[Math.max(0, curvePts.length - 2)];
      const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
      const vesselKind = rt.vessel || (rt.naval ? 'ship' : 'arrow');
      drawRouteVessel(g, tip[0], tip[1], ang, vesselKind, col, lt + rIdx);
    });

    // 7. Render City Pins & 2.5D Monument Dioramas
    pins.forEach((pin, idx) => {
      const t0 = pin.t0 !== undefined ? pin.t0 : 0.1 + idx * 0.15;
      const popS = DK.pop(lt, t0, 0.42);
      if (popS <= 0.001) return;

      const pt =
        pin.lon !== undefined && pin.lat !== undefined
          ? lonLatToXY(pin.lon, pin.lat, bbox, viewport)
          : pin.city
          ? resolveMapPoint(pin.city, bbox, viewport)
          : resolveMapPoint([pin.x !== undefined ? pin.x : 79.13, pin.y !== undefined ? pin.y : 10.78], bbox, viewport);

      const [px, py] = pt;
      const col = pin.color || '#FFD54F';

      g.save();
      g.translate(px, py);
      g.scale(popS, popS);

      // Pulsing Sonar Ring
      const pulse = (lt * 1.4 + idx * 0.35) % 1;
      ring(g, 0, 0, 12 + pulse * 34, 2.5, alpha(col, (1 - pulse) * 0.75));

      // Draw 2.5D Monument Diorama or Classic Pin
      drawMapDiorama(g, 0, 0, pin.diorama || pin.icon || 'pin', pin.scale || 0.95, col);

      // Sleek Pill Label Badge
      if (pin.label) {
        const lbl = String(pin.label);
        const lw = measure(g, lbl, 20, FONTS.ui, 800) + 28;
        const lh = 34;
        const ly = pin.labelOffsetY || 26;
        rr(g, -lw / 2, ly - lh / 2, lw, lh, lh / 2);
        g.fillStyle = 'rgba(16, 22, 38, 0.92)';
        g.fill();
        g.strokeStyle = col;
        g.lineWidth = 2;
        g.stroke();
        text(g, lbl, 0, ly + 1, { size: 19, font: FONTS.ui, weight: 800, color: '#FFFFFF' });
      }
      g.restore();
    });

    // 8. Ornate Royal Parchment Border Frame & Compass Rose
    rr(g, 32, 28, E.W - 64, E.H - 56, 18);
    g.strokeStyle = isParchment ? '#D99B26' : '#4C78B8';
    g.lineWidth = 5;
    g.stroke();
    rr(g, 42, 38, E.W - 84, E.H - 76, 12);
    g.strokeStyle = isParchment ? 'rgba(255, 230, 168, 0.38)' : 'rgba(130, 195, 255, 0.28)';
    g.lineWidth = 1.8;
    g.stroke();

    if (compass) {
      drawCompassRose(g, E.W - 135, 135, 52, lt);
    }

    if (title) {
      UI.pillBadge(g, lt, {
        x: 260,
        y: 88,
        text: title,
        subText: subTitle,
        border: '#FFD54F',
      });
    }

    g.restore();
  }

  function drawCompassRose(g, x, y, r = 52, t = 0) {
    g.save();
    g.translate(x, y);
    circle(g, 0, 0, r, 'rgba(16, 22, 38, 0.78)');
    ring(g, 0, 0, r, 2.5, '#D99B26');
    ring(g, 0, 0, r * 0.78, 1.2, 'rgba(255, 213, 79, 0.45)');

    g.save();
    g.rotate(Math.sin(t * 0.8) * 0.04);
    for (let i = 0; i < 4; i++) {
      g.save();
      g.rotate((i * Math.PI) / 2);
      poly(g, [[0, -r * 0.82], [8, 0], [0, -8]], i === 0 ? '#FF5E3A' : '#FFD54F');
      poly(g, [[0, -r * 0.82], [-8, 0], [0, -8]], i === 0 ? '#C92A2A' : '#B38018');
      g.restore();
    }
    circle(g, 0, 0, 6, '#FFF3B0');
    g.restore();

    text(g, 'N', 0, -r - 14, { size: 18, font: FONTS.serif, weight: 900, color: '#FFD54F' });
    g.restore();
  }

  // ---------- 10. Orthographic 3D Globe & Seamless Globe-to-Map Morph ----------
  function globeToMap(g, lt = 0, o = {}) {
    const {
      morph = 0, // 0.0 = Rotating 3D Globe in Space, 1.0 = Flat 2.5D Regional Map
      centerLon = 79.2,
      centerLat = 12.5,
      globeRadius = 390,
      region = 'india_southeast_asia',
      pins = [],
      routes = [],
    } = o;

    const m = clamp(morph, 0, 1);
    const bbox = getRegionBBox(region, o.bbox);
    const viewport = [110, 86, 1700, 908];

    g.save();
    // Space-to-Ocean Background Crossfade
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, [
      mix('#040714', '#164878', m),
      mix('#0A132C', '#22669B', m),
      mix('#060B1A', '#143E63', m),
    ]);
    g.fillRect(0, 0, E.W, E.H);

    if (m < 0.85 && FX.stars) {
      g.save();
      g.globalAlpha = 1 - m;
      FX.stars(g, lt, { count: 160 });
      g.restore();
    }

    // 3D Sphere Ocean Disc & Atmospheric Halo (fades as morph approaches 1.0)
    if (m < 0.98) {
      const rGlobe = lerp(globeRadius, 1200, ease.in(m));
      glow(g, 960, 540, rGlobe * 1.25, '#5CE1FF', (1 - m) * 0.45);
      circle(g, 960, 540, rGlobe, sphereGrad(g, 960, 540, rGlobe, '#165296', [-0.5, -0.6], 0.22));
      ring(g, 960, 540, rGlobe, 3.5, alpha('#8CE8FF', 1 - m));
    }

    // Project every polygon vertex by interpolating between 3D Globe and 2D Map!
    const polyKeys = selectPolygonsForRegion('world');
    polyKeys.forEach((k) => {
      const item = GEO_DB[k];
      if (!item) return;
      item.rings.forEach((ringLL) => {
        const pts = [];
        let anyVisible = false;
        ringLL.forEach(([lon, lat]) => {
          const gPt = lonLatToGlobe(lon, lat, centerLon, centerLat, globeRadius, 960, 540);
          const mPt = lonLatToXY(lon, lat, bbox, viewport);
          if (gPt.visible || m > 0.35) anyVisible = true;
          pts.push([lerp(gPt.x, mPt[0], m), lerp(gPt.y, mPt[1], m)]);
        });
        if (anyVisible && pts.length >= 3) {
          drawExtrudedRing(g, pts, {
            fill: item.color || '#78A868',
            cliffColor: '#3B5836',
            coastGlow: 'rgba(120, 225, 255, 0.25)',
            borderColor: 'rgba(255, 255, 255, 0.35)',
            borderW: 2,
            extrudeY: lerp(4, 11, m),
            extrudeX: lerp(1, 3, m),
          });
        }
      });
    });

    // Render Pins Morphing from Globe to Map
    pins.forEach((pin, idx) => {
      const ll =
        pin.lon !== undefined && pin.lat !== undefined
          ? [pin.lon, pin.lat]
          : pin.city && CITIES_DB[pin.city.toUpperCase()]
          ? CITIES_DB[pin.city.toUpperCase()]
          : [79.13, 10.78];
      const gPt = lonLatToGlobe(ll[0], ll[1], centerLon, centerLat, globeRadius, 960, 540);
      const mPt = lonLatToXY(ll[0], ll[1], bbox, viewport);
      if (!gPt.visible && m < 0.25) return;
      const px = lerp(gPt.x, mPt[0], m);
      const py = lerp(gPt.y, mPt[1], m);
      drawMapDiorama(g, px, py, pin.diorama || 'pin', 0.95, pin.color || '#FFD54F');
      if (pin.label) {
        UI.pillBadge(g, lt, { x: px, y: py + 28, text: pin.label, scale: 0.78 });
      }
    });

    g.restore();
  }

  function globe3D(g, lt = 0, o = {}) {
    globeToMap(g, lt, Object.assign({}, o, { morph: 0 }));
  }

  // ---------- 11. Export to Global Namespaces (window.MAP, window.UI, window.DK) ----------
  const MAP = (window.MAP = {
    REGION_BBOX,
    GEO_DB,
    EMPIRES_DB,
    RIVERS_DB,
    CITIES_DB,
    lonLatToXY,
    lonLatToGlobe,
    resolveMapPoint,
    drawMapDiorama,
    strategicMap,
    drawMap: strategicMap,
    globeToMap,
    globe3D,
  });

  UI.strategicMap = DK.strategicMap = H.strategicMap = strategicMap;
  UI.globeToMap = DK.globeToMap = H.globeToMap = globeToMap;
  UI.globe3D = DK.globe3D = H.globe3D = globe3D;
  DK.mapEngine = MAP;
})();