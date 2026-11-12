// ============================================================================
// MODULE: LUMINA_MAPS (engine/lumina_maps.js) — 16:9 Widescreen (1920x1080)
// 100% UNIVERSAL, LOCATION-AGNOSTIC SATELLITE, TERRAIN & GEOJSON ENGINE
// - ZERO hardcoded city/state limitations: works for ANY location on Earth.
// - Accepts ANY [lon, lat], [minLon, minLat, maxLon, maxLat] bbox, custom
//   GeoJSON/polygon rings, or ANY place name string on Earth (auto-resolved
//   via OpenStreetMap Nominatim GeoJSON + Natural Earth World GeoJSON).
// - Real Web Mercator Slippy Tiles (z = 1..19): Satellite, Analyst Briefing,
//   Night Satellite, Shaded Terrain Relief (zero modern labels), & Street/Canals.
// - Calibrated for 16:9 Widescreen Safe Stage (1920x1080, cx: 960, cy: 540).
// ============================================================================
(function () {
  'use strict';

  const DK = (window.DK = window.DK || {});
  const H = (window.H = window.H || DK);
  const FX = (window.FX = window.FX || DK.fx || {});
  const UI = (window.UI = window.UI || DK.ui || {});
  const E = DK.E || {
    W: 1920,
    H: 1080,
    SAFE: { x0: 140, x1: 1780, y0: 90, y1: 990, cx: 960, cy: 540, groundY: 840 },
  };
  const SAFE = E.SAFE || { x0: 140, x1: 1780, y0: 90, y1: 990, cx: 960, cy: 540, groundY: 840 };

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
    sphereGrad,
    cylinderGrad,
    contactShadow,
    glow,
    text,
    measure,
    FONTS,
  } = DK;

  const DEG2RAD = Math.PI / 180;
  const DEFAULT_VIEWPORT_169 = [110, 86, 1700, 908];
  const DEFAULT_FRAME_169 = [64, 48, 1792, 984];
  const WORLD_BBOX = [-168.0, -56.0, 178.0, 74.0];

  // ---------- 1. Universal Keyless Tile Providers (Zoom 1 to 19 Anywhere on Earth) ----------
  const TILE_PROVIDERS = {
    satellite: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    satelliteBriefing: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    satelliteNight: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    terrainHistorical: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/${z}/${y}/${x}`,
    parchment: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/${z}/${y}/${x}`,
    relief: (z, x, y) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/${z}/${y}/${x}`,
    tactical: (z, x, y) =>
      `https://a.basemaps.cartocdn.com/dark_nolabels/${z}/${x}/${y}.png`,
    darkStreet: (z, x, y) =>
      `https://a.basemaps.cartocdn.com/dark_nolabels/${z}/${x}/${y}.png`,
    streetCanals: (z, x, y) =>
      `https://a.basemaps.cartocdn.com/rastertiles/voyager_nolabels/${z}/${x}/${y}.png`,
  };

  // Runtime Caches (Populated Dynamically for Any Place on Earth)
  const TILE_CACHE = new Map();
  const PLACE_CACHE = new Map(); // normalizedName -> { name, center: [lon, lat], bbox: [minLon, minLat, maxLon, maxLat], rings: [...] }
  const PENDING_PLACE_PROMISES = new Map();
  let WORLD_FEATURES = [];
  let WORLD_LOADED = false;

  const WORLD_GEOJSON_URL =
    'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

  // ---------- 2. Dynamic GeoJSON & OpenStreetMap Nominatim Resolver ----------
  function normKey(str) {
    return String(str || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  }

  function parseGeoJSONGeometryToRings(geom) {
    if (!geom) return [];
    if (geom.type === 'Polygon') {
      return geom.coordinates.map((r) => r.map(([ln, lt]) => [ln, lt]));
    }
    if (geom.type === 'MultiPolygon') {
      const rings = [];
      geom.coordinates.forEach((polyCoords) => {
        if (polyCoords && polyCoords[0]) {
          rings.push(polyCoords[0].map(([ln, lt]) => [ln, lt]));
        }
      });
      return rings;
    }
    if (geom.type === 'LineString') {
      return [geom.coordinates.map(([ln, lt]) => [ln, lt])];
    }
    return [];
  }

  function computeBBoxFromRings(rings) {
    let minLon = 180, minLat = 90, maxLon = -180, maxLat = -90;
    rings.forEach((r) =>
      r.forEach(([ln, lt]) => {
        if (ln < minLon) minLon = ln;
        if (ln > maxLon) maxLon = ln;
        if (lt < minLat) minLat = lt;
        if (lt > maxLat) maxLat = lt;
      })
    );
    if (minLon > maxLon) return WORLD_BBOX;
    const padLon = Math.max(0.02, (maxLon - minLon) * 0.15);
    const padLat = Math.max(0.02, (maxLat - minLat) * 0.15);
    return [minLon - padLon, minLat - padLat, maxLon + padLon, maxLat + padLat];
  }

  async function loadWorldBaseGeoJSON() {
    if (WORLD_LOADED) return true;
    try {
      const res = await fetch(WORLD_GEOJSON_URL, { mode: 'cors' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && Array.isArray(data.features)) {
        const palette = ['#C9965C', '#78A868', '#D4A85C', '#8EA472', '#B8985E', '#6E9E68', '#C48452'];
        WORLD_FEATURES = [];
        data.features.forEach((feat, i) => {
          const name = (feat.properties && (feat.properties.name || feat.properties.NAME)) || `REGION_${i}`;
          const iso = (feat.id || (feat.properties && feat.properties.iso_a3) || '').toLowerCase();
          const rings = parseGeoJSONGeometryToRings(feat.geometry);
          if (rings.length > 0) {
            const bbox = computeBBoxFromRings(rings);
            const center = [(bbox[0] + bbox[2]) * 0.5, (bbox[1] + bbox[3]) * 0.5];
            const entry = {
              name: name.toUpperCase(),
              color: palette[i % palette.length],
              rings,
              bbox,
              center,
            };
            WORLD_FEATURES.push(entry);
            PLACE_CACHE.set(normKey(name), entry);
            if (iso) PLACE_CACHE.set(normKey(iso), entry);
          }
        });
        WORLD_LOADED = true;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  if (typeof window !== 'undefined' && typeof fetch === 'function') {
    loadWorldBaseGeoJSON();
  }

  // Resolve ANY place name on Earth (City, Street, Canal, State, Island, Country, Monument) via Nominatim
  async function resolvePlaceByName(queryStr) {
    if (!queryStr || typeof queryStr !== 'string') return null;
    const key = normKey(queryStr);
    if (!key || key === 'world') return null;
    if (PLACE_CACHE.has(key)) return PLACE_CACHE.get(key);
    if (PENDING_PLACE_PROMISES.has(key)) return PENDING_PLACE_PROMISES.get(key);

    const p = (async () => {
      try {
        const cleanQuery = String(queryStr).replace(/_/g, ' ').trim();
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          cleanQuery
        )}&format=geojson&polygon_geojson=1&limit=1`;
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && Array.isArray(data.features) && data.features[0]) {
          const feat = data.features[0];
          const rings = parseGeoJSONGeometryToRings(feat.geometry);
          let bbox = Array.isArray(feat.bbox) && feat.bbox.length === 4 ? feat.bbox.map(Number) : null;
          if (!bbox && rings.length > 0) bbox = computeBBoxFromRings(rings);
          let center = [0, 20];
          if (bbox) {
            center = [(bbox[0] + bbox[2]) * 0.5, (bbox[1] + bbox[3]) * 0.5];
          } else if (feat.geometry && feat.geometry.type === 'Point') {
            center = feat.geometry.coordinates.map(Number);
            bbox = [center[0] - 0.08, center[1] - 0.08, center[0] + 0.08, center[1] + 0.08];
          }
          const entry = {
            name: String(queryStr).toUpperCase(),
            color: '#D4A85C',
            rings,
            bbox: bbox || WORLD_BBOX,
            center,
          };
          PLACE_CACHE.set(key, entry);
          return entry;
        }
      } catch (e) {}
      return null;
    })();

    PENDING_PLACE_PROMISES.set(key, p);
    return p;
  }

  // ---------- 3. Universal Coordinate & Projection Math ----------
  function resolveLonLat(input) {
    if (!input) return [0, 20];
    if (Array.isArray(input) && input.length >= 2) {
      return [Number(input[0]) || 0, Number(input[1]) || 0];
    }
    if (typeof input === 'object') {
      if (Array.isArray(input.lonLat) && input.lonLat.length >= 2) {
        return [Number(input.lonLat[0]) || 0, Number(input.lonLat[1]) || 0];
      }
      if (input.lon !== undefined && input.lat !== undefined) {
        return [Number(input.lon) || 0, Number(input.lat) || 0];
      }
      if (input.lng !== undefined && input.lat !== undefined) {
        return [Number(input.lng) || 0, Number(input.lat) || 0];
      }
      if (input.place || input.city || input.name || input.id) {
        return resolveLonLat(input.place || input.city || input.name || input.id);
      }
      if (input.x !== undefined && input.y !== undefined) {
        return [Number(input.x) || 0, Number(input.y) || 0];
      }
    }
    if (typeof input === 'string') {
      const cached = PLACE_CACHE.get(normKey(input));
      if (cached && cached.center) return cached.center;
      resolvePlaceByName(input);
    }
    return [0, 20];
  }

  function resolveBBox(o = {}) {
    if (Array.isArray(o.bbox) && o.bbox.length === 4) return o.bbox;
    if (typeof o.region === 'string' && normKey(o.region) !== 'world') {
      const cached = PLACE_CACHE.get(normKey(o.region));
      if (cached && cached.bbox) return cached.bbox;
      resolvePlaceByName(o.region);
    }
    if (o.center || o.centerLonLat) {
      const [cLon, cLat] = resolveLonLat(o.center || o.centerLonLat);
      const spanLon = o.spanLon || (o.span ? o.span * 1.45 : 16);
      const spanLat = o.spanLat || o.span || 9;
      return [cLon - spanLon, cLat - spanLat, cLon + spanLon, cLat + spanLat];
    }
    // Auto-derive bounding box if pins or routes are provided without explicit bbox/region
    const sampleLL = [];
    if (Array.isArray(o.pins)) {
      o.pins.forEach((p) => {
        const ll = resolveLonLat(p);
        if (Math.abs(ll[0]) <= 180 && Math.abs(ll[1]) <= 90 && (ll[0] !== 0 || ll[1] !== 20)) sampleLL.push(ll);
      });
    }
    if (Array.isArray(o.routes)) {
      o.routes.forEach((r) => {
        const f = resolveLonLat(r.from !== undefined ? r.from : r.fromLonLat);
        const t = resolveLonLat(r.to !== undefined ? r.to : r.toLonLat);
        if (Math.abs(f[0]) <= 180 && Math.abs(f[1]) <= 90) sampleLL.push(f);
        if (Math.abs(t[0]) <= 180 && Math.abs(t[1]) <= 90) sampleLL.push(t);
      });
    }
    if (sampleLL.length >= 1) {
      return computeBBoxFromRings([sampleLL]);
    }
    return WORLD_BBOX;
  }

  function lonLatToXY(lon, lat, bbox = WORLD_BBOX, rect = DEFAULT_VIEWPORT_169) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const [rx, ry, rw, rh] = rect;
    const midLatRad = ((minLat + maxLat) * 0.5) * DEG2RAD;
    const cosMid = Math.max(0.25, Math.cos(midLatRad));
    const lonSpan = Math.max(0.001, (maxLon - minLon) * cosMid);
    const latSpan = Math.max(0.001, maxLat - minLat);

    const scale = Math.min(rw / lonSpan, rh / latSpan);
    const mapW = lonSpan * scale;
    const mapH = latSpan * scale;
    const ox = rx + (rw - mapW) * 0.5;
    const oy = ry + (rh - mapH) * 0.5;

    return [ox + (lon - minLon) * cosMid * scale, oy + (maxLat - lat) * scale];
  }

  function lonLatToGlobe(lon, lat, centerLon = 0, centerLat = 20, radius = 390, cx = 960, cy = 540) {
    const lam = lon * DEG2RAD;
    const phi = lat * DEG2RAD;
    const lam0 = centerLon * DEG2RAD;
    const phi0 = centerLat * DEG2RAD;

    const dLam = lam - lam0;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const cosPhi0 = Math.cos(phi0);
    const sinPhi0 = Math.sin(phi0);

    const cosC = sinPhi0 * sinPhi + cosPhi0 * cosPhi * Math.cos(dLam);
    const x = cx + radius * cosPhi * Math.sin(dLam);
    const y = cy - radius * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * Math.cos(dLam));
    return { x, y, z: cosC, visible: cosC > -0.08 };
  }

  // ---------- 4. Web Mercator Slippy Tile Engine (16:9 Widescreen) ----------
  function lonToTileX(lon, z) {
    return ((lon + 180) / 360) * Math.pow(2, z);
  }

  function latToTileY(lat, z) {
    const cLat = clamp(lat, -85.0511, 85.0511) * DEG2RAD;
    return ((1 - Math.log(Math.tan(cLat) + 1 / Math.cos(cLat)) / Math.PI) / 2) * Math.pow(2, z);
  }

  function lonLatToSlippyScreen(lon, lat, centerLon, centerLat, zoom, cx = 960, cy = 540) {
    const scale = 256 * Math.pow(2, zoom);
    const worldX = ((lon + 180) / 360) * scale;
    const cLat = clamp(lat, -85.0511, 85.0511) * DEG2RAD;
    const worldY = ((1 - Math.log(Math.tan(cLat) + 1 / Math.cos(cLat)) / Math.PI) / 2) * scale;

    const centerWorldX = ((centerLon + 180) / 360) * scale;
    const ccLat = clamp(centerLat, -85.0511, 85.0511) * DEG2RAD;
    const centerWorldY = ((1 - Math.log(Math.tan(ccLat) + 1 / Math.cos(ccLat)) / Math.PI) / 2) * scale;

    return [cx + (worldX - centerWorldX), cy + (worldY - centerWorldY)];
  }

  function autoCenterZoomFromBBox(bbox, viewW = 1792, viewH = 984) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const centerLon = (minLon + maxLon) * 0.5;
    const centerLat = (minLat + maxLat) * 0.5;
    const lonSpan = Math.max(0.005, maxLon - minLon);
    const latSpan = Math.max(0.005, maxLat - minLat);
    const zLon = Math.log2((viewW * 360) / (256 * lonSpan));
    const zLat = Math.log2((viewH * 170) / (256 * latSpan));
    const zoom = clamp(Math.min(zLon, zLat) - 0.15, 2.0, 18.0);
    return { centerLon, centerLat, zoom };
  }

  function resolveMapPoint(pt, bbox, rect = DEFAULT_VIEWPORT_169, slippyState = null) {
    if (Array.isArray(pt) && (Math.abs(pt[0]) > 180 || Math.abs(pt[1]) > 90)) {
      return [pt[0], pt[1]];
    }
    const [lon, lat] = resolveLonLat(pt);
    if (slippyState) {
      return lonLatToSlippyScreen(
        lon,
        lat,
        slippyState.centerLon,
        slippyState.centerLat,
        slippyState.zoom,
        slippyState.cx,
        slippyState.cy
      );
    }
    return lonLatToXY(lon, lat, bbox, rect);
  }

  function getOrLoadTile(providerKey, zInt, xInt, yInt) {
    const maxTile = Math.pow(2, zInt);
    if (yInt < 0 || yInt >= maxTile) return null;
    const wrappedX = ((xInt % maxTile) + maxTile) % maxTile;
    const urlFn = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.satellite;
    const url = urlFn(zInt, wrappedX, yInt);

    if (TILE_CACHE.has(url)) return TILE_CACHE.get(url);

    const entry = { img: null, loaded: false, promise: null };
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      entry.img = img;
      entry.promise = new Promise((resolve) => {
        img.onload = () => {
          entry.loaded = true;
          resolve(true);
        };
        img.onerror = () => {
          entry.loaded = false;
          resolve(false);
        };
      });
      img.src = url;
    }
    TILE_CACHE.set(url, entry);
    return entry;
  }

  function drawSlippyTileLayer(g, centerLon, centerLat, zoom, providerKey, cx = 960, cy = 540, clipRect = DEFAULT_FRAME_169) {
    const zInt = clamp(Math.round(zoom), 2, 18);
    const fracScale = Math.pow(2, zoom - zInt);
    const tileSize = 256 * fracScale;

    const centerTileX = lonToTileX(centerLon, zInt);
    const centerTileY = latToTileY(centerLat, zInt);

    const [rx, ry, rw, rh] = clipRect;
    const colsHalf = Math.ceil(rw / tileSize / 2) + 2;
    const rowsHalf = Math.ceil(rh / tileSize / 2) + 2;

    const baseTX = Math.floor(centerTileX);
    const baseTY = Math.floor(centerTileY);

    let drawnCount = 0;
    for (let dx = -colsHalf; dx <= colsHalf; dx++) {
      for (let dy = -rowsHalf; dy <= rowsHalf; dy++) {
        const tx = baseTX + dx;
        const ty = baseTY + dy;
        const screenX = cx + (tx - centerTileX) * tileSize;
        const screenY = cy + (ty - centerTileY) * tileSize;

        if (
          screenX + tileSize < rx ||
          screenX > rx + rw ||
          screenY + tileSize < ry ||
          screenY > ry + rh
        ) {
          continue;
        }

        const tileEntry = getOrLoadTile(providerKey, zInt, tx, ty);
        if (tileEntry && tileEntry.loaded && tileEntry.img) {
          g.drawImage(
            tileEntry.img,
            Math.floor(screenX),
            Math.floor(screenY),
            Math.ceil(tileSize) + 1,
            Math.ceil(tileSize) + 1
          );
          drawnCount++;
        } else {
          const parentZ = Math.max(2, zInt - 1);
          const pEntry = getOrLoadTile(providerKey, parentZ, Math.floor(tx / 2), Math.floor(ty / 2));
          if (pEntry && pEntry.loaded && pEntry.img) {
            const subX = ((tx % 2) + 2) % 2;
            const subY = ((ty % 2) + 2) % 2;
            g.drawImage(
              pEntry.img,
              subX * 128,
              subY * 128,
              128,
              128,
              Math.floor(screenX),
              Math.floor(screenY),
              Math.ceil(tileSize) + 1,
              Math.ceil(tileSize) + 1
            );
            drawnCount++;
          }
        }
      }
    }
    return drawnCount;
  }

  // ---------- 5. "Satellite Briefing" Analyst HUD, Extruded Polygons & Icons ----------
  function drawSatelliteBriefingHUD(g, lt, centerLon, centerLat, zoom, o = {}) {
    const [fx, fy, fw, fh] = o.frame || DEFAULT_FRAME_169;
    const cx = o.cx || 960;
    const cy = o.cy || 540;
    const accent = o.hudColor || '#F8FAFC';
    const subAccent = '#5CE1FF';

    g.save();
    g.strokeStyle = alpha(accent, 0.72);
    g.lineWidth = 1.8;
    g.strokeRect(fx, fy, fw, fh);

    const tickL = 26;
    [
      [fx, fy, 1, 1],
      [fx + fw, fy, -1, 1],
      [fx, fy + fh, 1, -1],
      [fx + fw, fy + fh, -1, -1],
    ].forEach(([x, y, sx, sy]) => {
      g.strokeStyle = subAccent;
      g.lineWidth = 3.5;
      g.beginPath();
      g.moveTo(x, y + sy * tickL);
      g.lineTo(x, y);
      g.lineTo(x + sx * tickL, y);
      g.stroke();
    });

    if (o.reticle !== false) {
      ring(g, cx, cy, 54, 1.5, alpha(accent, 0.5));
      ring(g, cx, cy, 128, 1.1, alpha(accent, 0.25));
      seg(g, [[cx - 84, cy], [cx - 18, cy]], 1.6, alpha(accent, 0.75));
      seg(g, [[cx + 18, cy], [cx + 84, cy]], 1.6, alpha(accent, 0.75));
      seg(g, [[cx, cy - 84], [cx, cy - 18]], 1.6, alpha(accent, 0.75));
      seg(g, [[cx, cy + 18], [cx, cy + 84]], 1.6, alpha(accent, 0.75));
    }

    const latStr = `${Math.abs(centerLat).toFixed(3)}° ${centerLat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(centerLon).toFixed(3)}° ${centerLon >= 0 ? 'E' : 'W'}`;
    const metersPerPx = (156543.03392 * Math.cos(centerLat * DEG2RAD)) / Math.pow(2, zoom);
    const barKm = (metersPerPx * 180) / 1000;
    const scaleLabel =
      barKm >= 10 ? `${Math.round(barKm)} KM` : barKm >= 1 ? `${barKm.toFixed(1)} KM` : `${Math.round(barKm * 1000)} M`;

    rr(g, fx + 20, fy + fh - 58, fw - 40, 42, 8);
    g.fillStyle = 'rgba(8, 12, 20, 0.80)';
    g.fill();

    text(g, `SAT-OPTICAL // ${latStr} · ${lonStr} · ZOOM Z${zoom.toFixed(1)}`, fx + 38, fy + fh - 36, {
      align: 'left',
      size: 17,
      font: FONTS.mono,
      weight: 700,
      color: accent,
    });

    const bx1 = fx + fw - 42;
    const bx0 = bx1 - 160;
    const by = fy + fh - 32;
    seg(g, [[bx0, by - 6], [bx0, by], [bx1, by], [bx1, by - 6]], 2.2, subAccent);
    text(g, scaleLabel, (bx0 + bx1) * 0.5, by - 14, {
      size: 15,
      font: FONTS.mono,
      weight: 700,
      color: subAccent,
    });

    if (o.reading) {
      rr(g, fx + 24, fy + 22, 340, 58, 8);
      g.fillStyle = 'rgba(8, 12, 20, 0.86)';
      g.fill();
      g.strokeStyle = subAccent;
      g.lineWidth = 2;
      g.stroke();
      text(g, String(o.reading), fx + 40, fy + 52, {
        align: 'left',
        size: 23,
        font: FONTS.mono,
        weight: 700,
        color: '#FFFFFF',
      });
    }
    g.restore();
  }

  function drawExtrudedRing(g, screenPts, o = {}) {
    if (!screenPts || screenPts.length < 3) return;
    const {
      fill = '#D6A868',
      cliffColor = '#6E4C2C',
      coastGlow = 'rgba(130, 225, 255, 0.32)',
      borderColor = 'rgba(55, 35, 18, 0.55)',
      borderW = 2.2,
      extrudeY = 11,
      extrudeX = 3.5,
    } = o;

    if (coastGlow) {
      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.strokeStyle = coastGlow;
      g.lineWidth = 16;
      g.beginPath();
      g.moveTo(screenPts[0][0], screenPts[0][1]);
      for (let i = 1; i < screenPts.length; i++) g.lineTo(screenPts[i][0], screenPts[i][1]);
      g.closePath();
      g.stroke();
      g.restore();
    }

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

  function centroidOfRing(pts) {
    if (!pts || !pts.length) return [960, 540];
    let sx = 0, sy = 0;
    for (let i = 0; i < pts.length; i++) {
      sx += pts[i][0];
      sy += pts[i][1];
    }
    return [sx / pts.length, sy / pts.length];
  }

  function drawMapDiorama(g, x, y, kind = 'pin', s = 1, col = '#FFD54F') {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    contactShadow(g, 0, 4, 28, 8, 0.38);

    if (kind === 'gopuram' || kind === 'temple' || kind === 'monument') {
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
    } else if (kind === 'port' || kind === 'ship' || kind === 'cholaShip') {
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
      glow(g, 0, -14, 26, col, 0.85);
      poly(g, [[0, 0], [-11, -18], [11, -18]], col);
      circle(g, 0, -20, 11, sphereGrad(g, 0, -20, 11, col));
      circle(g, 0, -20, 4.5, '#FFFFFF');
    }
    g.restore();
  }

  function drawRouteVessel(g, x, y, angle, kind = 'arrow', col = '#FF851B', t = 0) {
    g.save();
    g.translate(x, y);
    if (kind === 'naval' || kind === 'ship' || kind === 'cholaShip' || kind === 'romanShip') {
      const flip = Math.cos(angle) < 0 ? -1 : 1;
      g.scale(flip, 1 + Math.sin(t * 5) * 0.04);
      poly(g, [[-18, 4], [18, 4], [24, -5], [-22, -5]], '#7C4828');
      seg(g, [[0, -5], [0, -32]], 3, '#4A2814');
      poly(g, [[-12, -29], [14, -29], [16, -9], [-10, -9]], '#F7B928', '#C92A2A', 1.8);
    } else if (kind === 'air' || kind === 'plane') {
      g.rotate(angle);
      poly(g, [[18, 0], [-12, -12], [-6, 0], [-12, 12]], '#FFFFFF', col, 2);
    } else {
      g.rotate(angle);
      glow(g, 0, 0, 22, col, 0.8);
      poly(g, [[16, 0], [-11, -10], [-6, 0], [-11, 10]], col, '#FFFFFF', 1.8);
    }
    g.restore();
  }

  function drawCompassRose(g, x, y, r = 52, t = 0) {
    g.save();
    g.translate(x, y);
    circle(g, 0, 0, r, 'rgba(16, 22, 38, 0.82)');
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

  // ---------- 6. Master Universal Map Renderer (UI.strategicMap / UI.satelliteBriefing) ----------
  function strategicMap(g, lt = 0, o = {}) {
    const {
      // style: 'satelliteBriefing' | 'satellite' | 'satelliteNight' | 'terrainHistorical' | 'streetCanals' | 'darkStreet' | 'parchment' | 'relief' | 'tactical'
      style = 'relief',
      territories = [],
      highlight = [],
      highlightStates = [],
      routes = [],
      pins = [],
      compass = true,
      title = '',
      subTitle = '',
    } = o;

    const bbox = resolveBBox(o);
    const viewport = o.viewport || DEFAULT_VIEWPORT_169;
    const frame = o.frame || DEFAULT_FRAME_169;
    const [fx, fy, fw, fh] = frame;

    const isParchment = style === 'parchment' || style === 'terrainHistorical';
    const isNight = style === 'satelliteNight' || style === 'blueprint' || style === 'darkStreet' || style === 'tactical';
    const useSlippyTiles =
      o.useTiles !== false &&
      (TILE_PROVIDERS[style] !== undefined || o.zoom !== undefined || o.center !== undefined);

    const autoCZ = autoCenterZoomFromBBox(bbox, fw, fh);
    const centerLL = o.center ? resolveLonLat(o.center) : [autoCZ.centerLon, autoCZ.centerLat];
    const slippyState = useSlippyTiles
      ? {
          centerLon: o.centerLon !== undefined ? o.centerLon : centerLL[0],
          centerLat: o.centerLat !== undefined ? o.centerLat : centerLL[1],
          zoom: o.zoom !== undefined ? o.zoom : autoCZ.zoom,
          cx: o.cx || 960,
          cy: o.cy || 540,
        }
      : null;

    g.save();

    // 1. Ocean Backdrop
    const oceanCols = isParchment
      ? ['#16446C', '#226498', '#133A5E']
      : isNight || style === 'satelliteBriefing'
      ? ['#050C1E', '#0B1B3D', '#07122B']
      : ['#0E4880', '#1C6EB8', '#104070'];
    g.fillStyle = linGrad(g, 0, 0, 0, E.H, oceanCols);
    g.fillRect(0, 0, E.W, E.H);

    // 2. Real Slippy Tile Layer (Satellite / Shaded Terrain / Street & Canals)
    let tilesDrawn = 0;
    if (slippyState) {
      g.save();
      rr(g, fx, fy, fw, fh, 18);
      g.clip();

      if (style === 'satelliteBriefing') {
        g.filter = 'grayscale(76%) contrast(122%) brightness(86%)';
      } else if (style === 'satelliteNight') {
        g.filter = 'saturate(55%) contrast(125%) brightness(62%) hue-rotate(190deg)';
      } else if (style === 'terrainHistorical' || style === 'parchment') {
        g.filter = 'sepia(55%) contrast(112%) brightness(94%)';
      }

      const providerKey = TILE_PROVIDERS[style] ? style : isParchment ? 'terrainHistorical' : 'satellite';
      tilesDrawn = drawSlippyTileLayer(
        g,
        slippyState.centerLon,
        slippyState.centerLat,
        slippyState.zoom,
        providerKey,
        slippyState.cx,
        slippyState.cy,
        frame
      );
      g.filter = 'none';
      g.restore();
    }

    // 3. 2.5D Extruded Vector World Base (when in pure Vector Mode or while tiles load)
    if (!slippyState || tilesDrawn === 0) {
      g.save();
      rr(g, fx, fy, fw, fh, 18);
      g.clip();
      const [minLon, minLat, maxLon, maxLat] = bbox;
      WORLD_FEATURES.forEach((item) => {
        const hits = item.rings.some((r) =>
          r.some(([ln, lt2]) => ln >= minLon - 12 && ln <= maxLon + 12 && lt2 >= minLat - 12 && lt2 <= maxLat + 12)
        );
        if (!hits) return;
        const baseLandCol = isParchment ? mix(item.color, '#E8CE9C', 0.48) : isNight ? '#1C2D4F' : item.color;
        item.rings.forEach((ringLL) => {
          const sPts = ringLL.map((pt) => resolveMapPoint(pt, bbox, viewport, slippyState));
          drawExtrudedRing(g, sPts, {
            fill: baseLandCol,
            cliffColor: isParchment ? '#5C3E22' : '#0A1326',
            borderColor: isParchment ? 'rgba(92, 60, 28, 0.65)' : 'rgba(255, 255, 255, 0.28)',
            extrudeY: o.extrudeDepth !== undefined ? o.extrudeDepth : 11,
          });
        });
      });
      g.restore();
    }

    // 4. Highlighted Places / Countries / States / Custom Polygons
    const allHighlights = [...highlight, ...highlightStates, ...territories];
    allHighlights.forEach((hl, idx) => {
      const placeName = typeof hl === 'string' ? hl : hl.place || hl.country || hl.state || hl.id || hl.name;
      const cached = placeName ? PLACE_CACHE.get(normKey(placeName)) : null;
      if (placeName && !cached) resolvePlaceByName(placeName);

      const ringsLL = (typeof hl === 'object' && hl.rings) || (cached && cached.rings) || [];
      if (!ringsLL.length) return;

      const t0 = typeof hl === 'object' && hl.t0 !== undefined ? hl.t0 : 0.1 + idx * 0.12;
      const dur = typeof hl === 'object' && hl.dur !== undefined ? hl.dur : 0.9;
      const u = ease.out(prog(lt, t0, t0 + dur));
      if (u <= 0.01) return;

      const fillCol =
        (typeof hl === 'object' && hl.color) ||
        (style === 'satelliteBriefing' ? 'rgba(92, 225, 255, 0.24)' : 'rgba(255, 138, 61, 0.46)');
      const borderCol =
        (typeof hl === 'object' && hl.border) ||
        (style === 'satelliteBriefing' ? '#FFFFFF' : '#FFD54F');

      g.save();
      rr(g, fx, fy, fw, fh, 18);
      g.clip();
      g.globalAlpha *= u;

      ringsLL.forEach((rLL) => {
        const sPts = rLL.map((pt) => resolveMapPoint(pt, bbox, viewport, slippyState));
        poly(g, sPts, fillCol, borderCol, 3.5);
      });

      const labelText = typeof hl === 'object' ? hl.label : null;
      if (labelText && ringsLL[0]) {
        const sPts0 = ringsLL[0].map((pt) => resolveMapPoint(pt, bbox, viewport, slippyState));
        const [cx, cy] = centroidOfRing(sPts0);
        text(
          g,
          labelText,
          clamp(cx, SAFE.x0 + 100, SAFE.x1 - 100),
          clamp(cy, SAFE.y0 + 70, SAFE.y1 - 70),
          {
            size: 24,
            font: FONTS.ui,
            weight: 900,
            color: '#FFFFFF',
            stroke: 5,
            strokeColor: 'rgba(12, 18, 32, 0.88)',
          }
        );
      }
      g.restore();
    });

    // 5. Animated Routes & Moving Vessels
    routes.forEach((rt, rIdx) => {
      const t0 = rt.t0 !== undefined ? rt.t0 : 0.2;
      const dur = rt.dur !== undefined ? rt.dur : 1.6;
      const u = ease.inOut(prog(lt, t0, t0 + dur));
      if (u <= 0.001) return;

      const fromPt = rt.from !== undefined ? rt.from : rt.fromLonLat;
      const toPt = rt.to !== undefined ? rt.to : rt.toLonLat;
      const p0 = resolveMapPoint(fromPt, bbox, viewport, slippyState);
      const p1 = resolveMapPoint(toPt, bbox, viewport, slippyState);
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const dist = Math.hypot(dx, dy);
      const arcLift = rt.arc !== undefined ? rt.arc : -Math.min(130, dist * 0.22);
      const cx = (p0[0] + p1[0]) * 0.5 - (dy / Math.max(1, dist)) * arcLift * 0.35;
      const cy = (p0[1] + p1[1]) * 0.5 + arcLift;

      const col = rt.color || (style === 'satelliteBriefing' ? '#FFFFFF' : '#FF851B');
      const steps = 36;
      const maxStep = Math.max(1, Math.round(steps * u));
      const curvePts = [];
      for (let i = 0; i <= maxStep; i++) {
        const s = i / steps;
        const bx = (1 - s) * (1 - s) * p0[0] + 2 * (1 - s) * s * cx + s * s * p1[0];
        const by = (1 - s) * (1 - s) * p0[1] + 2 * (1 - s) * s * cy + s * s * p1[1];
        curvePts.push([bx, by]);
      }

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

      const tip = curvePts[curvePts.length - 1];
      const prev = curvePts[Math.max(0, curvePts.length - 2)];
      const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
      const vesselKind = rt.vessel || (rt.naval ? 'ship' : 'arrow');
      drawRouteVessel(g, tip[0], tip[1], ang, vesselKind, col, lt + rIdx);
    });

    // 6. Pins & 2.5D Diorama Markers
    pins.forEach((pin, idx) => {
      const t0 = pin.t0 !== undefined ? pin.t0 : 0.1 + idx * 0.15;
      const popS = DK.pop(lt, t0, 0.42);
      if (popS <= 0.001) return;

      const pt = resolveMapPoint(pin, bbox, viewport, slippyState);
      const px = clamp(pt[0], SAFE.x0 + 40, SAFE.x1 - 40);
      const py = clamp(pt[1], SAFE.y0 + 60, SAFE.y1 - 50);
      const col = pin.color || '#FFD54F';

      g.save();
      g.translate(px, py);
      g.scale(popS, popS);

      const pulse = (lt * 1.4 + idx * 0.35) % 1;
      ring(g, 0, 0, 12 + pulse * 34, 2.5, alpha(col, (1 - pulse) * 0.75));
      drawMapDiorama(g, 0, 0, pin.diorama || pin.icon || 'pin', pin.scale || 0.95, col);

      if (pin.label) {
        const lbl = String(pin.label);
        const lw = measure(g, lbl, 20, FONTS.ui, 800) + 28;
        const lh = 34;
        const ly = pin.labelOffsetY || 26;
        let lxShift = 0;
        if (px + lw * 0.5 > SAFE.x1 - 16) lxShift = (SAFE.x1 - 16) - (px + lw * 0.5);
        if (px - lw * 0.5 < SAFE.x0 + 16) lxShift = (SAFE.x0 + 16) - (px - lw * 0.5);

        rr(g, lxShift - lw / 2, ly - lh / 2, lw, lh, lh / 2);
        g.fillStyle = 'rgba(16, 22, 38, 0.92)';
        g.fill();
        g.strokeStyle = col;
        g.lineWidth = 2;
        g.stroke();
        text(g, lbl, lxShift, ly + 1, { size: 19, font: FONTS.ui, weight: 800, color: '#FFFFFF' });
      }
      g.restore();
    });

    // 7. Frame Overlay: Either Analyst HUD ('satelliteBriefing') or Classic Widescreen Border + Compass
    if (style === 'satelliteBriefing' && slippyState) {
      drawSatelliteBriefingHUD(g, lt, slippyState.centerLon, slippyState.centerLat, slippyState.zoom, o);
    } else {
      rr(g, fx, fy, fw, fh, 18);
      g.strokeStyle = isParchment ? '#D99B26' : '#4C78B8';
      g.lineWidth = 5;
      g.stroke();
      rr(g, fx + 10, fy + 10, fw - 20, fh - 20, 12);
      g.strokeStyle = isParchment ? 'rgba(255, 230, 168, 0.38)' : 'rgba(130, 195, 255, 0.28)';
      g.lineWidth = 1.8;
      g.stroke();

      if (compass) {
        drawCompassRose(g, o.compassX || E.W - 150, o.compassY || 140, 52, lt);
      }
    }

    if (title && UI.pillBadge) {
      UI.pillBadge(g, lt, {
        x: o.titleX || 320,
        y: o.titleY || 105,
        text: title,
        subText: subTitle,
        border: style === 'satelliteBriefing' ? '#5CE1FF' : '#FFD54F',
      });
    }

    g.restore();
  }

  function satelliteBriefing(g, lt = 0, o = {}) {
    strategicMap(g, lt, Object.assign({}, o, { style: 'satelliteBriefing', useTiles: true }));
  }

  // ---------- 7. Orthographic 3D Globe & Seamless Globe-to-Map Morph (16:9 Widescreen) ----------
  function globeToMap(g, lt = 0, o = {}) {
    const {
      morph = 0,
      pins = [],
      routes = [],
      territories = [],
      highlight = [],
      highlightIds = [],
      title = '',
      subTitle = '',
    } = o;

    const centerSource = o.center || o.centerLonLat;
    const centerLL = centerSource
      ? resolveLonLat(centerSource)
      : [o.centerLon ?? o.rotLon ?? 78.9, o.centerLat ?? o.rotLat ?? 20.5];
    const centerLon = centerLL[0];
    const centerLat = centerLL[1];
    const zoomFactor = o.zoom || 1.0;
    const globeRadius = (o.globeRadius ?? o.r ?? 390) * zoomFactor;
    const globeCX = o.x ?? o.cx ?? 960;
    const globeCY = o.y ?? o.cy ?? 540;

    const m = clamp(morph, 0, 1);
    const bbox = resolveBBox(o);
    const viewport = o.viewport || DEFAULT_VIEWPORT_169;

    g.save();
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

    if (m < 0.98) {
      const rGlobe = lerp(globeRadius, 1280, ease.in(m));
      glow(g, globeCX, globeCY, rGlobe * 1.25, '#5CE1FF', (1 - m) * 0.45);
      circle(g, globeCX, globeCY, rGlobe, sphereGrad(g, globeCX, globeCY, rGlobe, '#165296', [-0.5, -0.6], 0.22));
      ring(g, globeCX, globeCY, rGlobe, 3.5, alpha('#8CE8FF', 1 - m));
    }

    WORLD_FEATURES.forEach((item) => {
      item.rings.forEach((ringLL) => {
        const pts = [];
        let anyVisible = false;
        ringLL.forEach(([lon, lat]) => {
          const gPt = lonLatToGlobe(lon, lat, centerLon, centerLat, globeRadius, globeCX, globeCY);
          const mPt = lonLatToXY(lon, lat, bbox, viewport);
          if (gPt.visible || m > 0.35) anyVisible = true;
          pts.push([lerp(gPt.x, mPt[0], m), lerp(gPt.y, mPt[1], m)]);
        });
        if (anyVisible && pts.length >= 3) {
          drawExtrudedRing(g, pts, {
            fill: item.color || '#78A868',
            cliffColor: '#3B5836',
            coastGlow: 'rgba(120, 225, 255, 0.22)',
            borderColor: 'rgba(255, 255, 255, 0.32)',
            borderW: 1.8,
            extrudeY: lerp(4, 11, m),
            extrudeX: lerp(1, 3, m),
          });
        }
      });
    });

    [...territories, ...highlight, ...highlightIds].forEach((ter) => {
      const placeName = typeof ter === 'string' ? ter : ter.place || ter.country || ter.id || ter.name;
      const cached = placeName ? PLACE_CACHE.get(normKey(placeName)) : null;
      if (placeName && !cached) resolvePlaceByName(placeName);
      const ringsLL = (typeof ter === 'object' && ter.rings) || (cached && cached.rings) || [];
      ringsLL.forEach((rLL) => {
        const pts = [];
        let anyVis = false;
        rLL.forEach((pt) => {
          const [lon, lat] = resolveLonLat(pt);
          const gPt = lonLatToGlobe(lon, lat, centerLon, centerLat, globeRadius, globeCX, globeCY);
          const mPt = lonLatToXY(lon, lat, bbox, viewport);
          if (gPt.visible || m > 0.3) anyVis = true;
          pts.push([lerp(gPt.x, mPt[0], m), lerp(gPt.y, mPt[1], m)]);
        });
        if (anyVis && pts.length >= 3) {
          poly(g, pts, (typeof ter === 'object' && ter.color) || 'rgba(255, 138, 61, 0.48)', (typeof ter === 'object' && ter.border) || '#FFD54F', 3);
        }
      });
    });

    routes.forEach((rt, rIdx) => {
      const t0 = rt.t0 !== undefined ? rt.t0 : 0.2;
      const dur = rt.dur !== undefined ? rt.dur : 1.5;
      const u = ease.inOut(prog(lt, t0, t0 + dur));
      if (u <= 0.001) return;

      const ll0 = resolveLonLat(rt.from !== undefined ? rt.from : rt.fromLonLat);
      const ll1 = resolveLonLat(rt.to !== undefined ? rt.to : rt.toLonLat);
      const col = rt.color || '#FF851B';
      const steps = 32;
      const maxStep = Math.max(1, Math.round(steps * u));
      const curvePts = [];

      for (let i = 0; i <= maxStep; i++) {
        const s = i / steps;
        const lon = lerp(ll0[0], ll1[0], s);
        const lat = lerp(ll0[1], ll1[1], s);
        const arcBoost = Math.sin(s * Math.PI) * 22;
        const gPt = lonLatToGlobe(lon, lat, centerLon, centerLat, globeRadius + arcBoost * (1 - m), globeCX, globeCY);
        const mPt = lonLatToXY(lon, lat, bbox, viewport);
        curvePts.push([lerp(gPt.x, mPt[0], m), lerp(gPt.y - arcBoost * m, mPt[1] - arcBoost * m, m)]);
      }

      if (curvePts.length >= 2) {
        seg(g, curvePts, 4.2, col);
        const tip = curvePts[curvePts.length - 1];
        const prev = curvePts[Math.max(0, curvePts.length - 2)];
        const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
        const vesselKind = rt.vessel || (rt.naval ? 'ship' : 'arrow');
        drawRouteVessel(g, tip[0], tip[1], ang, vesselKind, col, lt + rIdx);
      }
    });

    pins.forEach((pin) => {
      const [lon, lat] = resolveLonLat(pin);
      const gPt = lonLatToGlobe(lon, lat, centerLon, centerLat, globeRadius, globeCX, globeCY);
      const mPt = lonLatToXY(lon, lat, bbox, viewport);
      if (!gPt.visible && m < 0.25) return;
      const px = clamp(lerp(gPt.x, mPt[0], m), SAFE.x0 + 40, SAFE.x1 - 40);
      const py = clamp(lerp(gPt.y, mPt[1], m), SAFE.y0 + 50, SAFE.y1 - 50);
      drawMapDiorama(g, px, py, pin.diorama || pin.icon || 'pin', 0.95, pin.color || '#FFD54F');
      if (pin.label && UI.pillBadge) {
        UI.pillBadge(g, lt, { x: px, y: py + 28, text: pin.label, scale: 0.80 });
      }
    });

    if (title && UI.pillBadge) {
      UI.pillBadge(g, lt, { x: 320, y: 105, text: title, subText: subTitle, border: '#5CE1FF' });
    }

    g.restore();
  }

  function globe3D(g, lt = 0, o = {}) {
    globeToMap(g, lt, Object.assign({}, o, { morph: 0 }));
  }

  // ---------- 8. Deterministic Preloader (Resolves All Place Names & Tiles Before Frame 1) ----------
  async function preloadAll(shots = []) {
    await loadWorldBaseGeoJSON();

    // Pass 1: Trigger dry-run to discover any string place names, then await Nominatim lookups
    if (typeof document !== 'undefined' && Array.isArray(shots) && shots.length > 0) {
      const off = document.createElement('canvas');
      off.width = E.W;
      off.height = E.H;
      const offCtx = off.getContext('2d');

      shots.forEach((s) => {
        if (s && typeof s.draw === 'function') {
          try { s.draw(offCtx, 0.1, (s.start || 0) + 0.1, 0.1); } catch (e) {}
        }
      });

      // Wait for all queued Nominatim place lookups to resolve
      if (PENDING_PLACE_PROMISES.size > 0) {
        await Promise.all(Array.from(PENDING_PLACE_PROMISES.values()));
      }
      await new Promise((r) => setTimeout(r, 120));

      // Pass 2: Now that place bboxes/coordinates are cached, sample frames to queue all Slippy Tiles
      shots.forEach((s) => {
        if (!s || typeof s.draw !== 'function') return;
        [0.05, 0.35, 0.65, 0.95].forEach((u) => {
          const lt = (s.duration || 3) * u;
          const gt = (s.start || 0) + lt;
          try { s.draw(offCtx, lt, gt, u); } catch (e) {}
        });
      });
    }

    const pendingTiles = [];
    TILE_CACHE.forEach((entry) => {
      if (entry && entry.promise && !entry.loaded) pendingTiles.push(entry.promise);
    });
    if (pendingTiles.length > 0) {
      await Promise.all(pendingTiles);
    }
    return true;
  }

  // ---------- 9. Export to Global Namespaces ----------
  const MAP = (window.MAP = {
    DEFAULT_VIEWPORT_169,
    DEFAULT_FRAME_169,
    lonLatToXY,
    lonLatToGlobe,
    lonLatToSlippyScreen,
    resolveLonLat,
    resolveMapPoint,
    resolvePlaceByName,
    drawMapDiorama,
    drawCompassRose,
    strategicMap,
    satelliteBriefing,
    drawMap: strategicMap,
    globeToMap,
    globe3D,
    geoGlobe: globe3D,
    preloadAll,
  });

  UI.strategicMap = DK.strategicMap = H.strategicMap = strategicMap;
  UI.satelliteBriefing = DK.satelliteBriefing = H.satelliteBriefing = satelliteBriefing;
  UI.globeToMap = DK.globeToMap = H.globeToMap = globeToMap;
  UI.globe3D = DK.globe3D = H.globe3D = globe3D;
  UI.geoGlobe = DK.geoGlobe = H.geoGlobe = globe3D;
  DK.mapEngine = MAP;
})();