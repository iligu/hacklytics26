/**
 * map.js — Leaflet GIS map with choropleth country polygons
 * Handles: base layers, GeoJSON choropleth, tooltips, click events
 */

window.GeoMap = (() => {
  let map, geoLayer, currentMode = 'gap';
  const baseLayers = {};

  // ── Colour scales per mode ───────────────────────────────────
  const COLOR = {
    gap: d => {
      const p = d.funding_pct;
      if (p < 30) return { fill: '#ff3b4e', opacity: 0.82 };
      if (p < 50) return { fill: '#ff7926', opacity: 0.78 };
      if (p < 70) return { fill: '#ffd84a', opacity: 0.74 };
      return { fill: '#00d68f', opacity: 0.70 };
    },
    health: d => {
      const p = d.health_cluster_funded_pct;
      if (p < 20) return { fill: '#ff3b4e', opacity: 0.82 };
      if (p < 35) return { fill: '#ff7926', opacity: 0.78 };
      if (p < 55) return { fill: '#ffd84a', opacity: 0.74 };
      return { fill: '#00d68f', opacity: 0.70 };
    },
    workers: d => {
      const v = d.health_workers_per_10k;
      // WHO minimum is 23/10k — scale to that
      if (v < 2)  return { fill: '#ff3b4e', opacity: 0.82 };
      if (v < 5)  return { fill: '#ff7926', opacity: 0.78 };
      if (v < 15) return { fill: '#ffd84a', opacity: 0.74 };
      return { fill: '#00d68f', opacity: 0.70 };
    },
    coldchain: d => {
      const p = d.cold_chain_coverage_pct;
      if (p < 20) return { fill: '#ff3b4e', opacity: 0.82 };
      if (p < 40) return { fill: '#ff7926', opacity: 0.78 };
      if (p < 60) return { fill: '#ffd84a', opacity: 0.74 };
      return { fill: '#00d68f', opacity: 0.70 };
    },
    cbpf: d => {
      if (!d.cbpf) return { fill: '#3d9eff', opacity: 0.55 };
      const c = parseFloat(d.cbpf_coverage);
      if (c < 25) return { fill: '#ff3b4e', opacity: 0.82 };
      if (c < 50) return { fill: '#ff7926', opacity: 0.78 };
      if (c < 75) return { fill: '#ffd84a', opacity: 0.74 };
      return { fill: '#00d68f', opacity: 0.70 };
    },
  };

  // ── Build tooltip HTML ───────────────────────────────────────
  function buildTooltip(d) {
    const alertColor = {
      critical: '#ff3b4e', high: '#ff7926', moderate: '#ffd84a', funded: '#00d68f'
    }[d.alert_level];

    const stockColors = { critical:'#ff3b4e', high:'#ff7926', moderate:'#ffd84a', low:'#00d68f' };
    const stockColor = stockColors[d.med_stockout_risk] || '#3d9eff';

    const outbreaks = d.active_outbreaks.length
      ? d.active_outbreaks.join(', ')
      : 'None active';

    const anomalyBadge = d.health_anomaly
      ? `<div style="margin-top:5px;padding:4px 0 0;border-top:1px solid #1e2436;font-size:9px;color:#9d6fff;font-family:'IBM Plex Mono',monospace;letter-spacing:0.5px">⚠ HEALTH SYSTEM ANOMALY FLAGGED</div>`
      : '';

    return `<div class="tt-inner">
      <div class="tt-country">${d.name}</div>
      <div class="tt-type">${d.crisis_desc}</div>
      <div class="tt-row">
        <span class="tt-key">People in Need</span>
        <span class="tt-val color-yellow">${d.pin}M</span>
      </div>
      <div class="tt-row">
        <span class="tt-key">HRP Funded</span>
        <span class="tt-val" style="color:${alertColor}">${d.funding_pct.toFixed(1)}%</span>
      </div>
      <div class="tt-row">
        <span class="tt-key">$/Person in Need</span>
        <span class="tt-val">$${d.budget_per_bene}</span>
      </div>
      <div class="tt-divider"></div>
      <div class="tt-row">
        <span class="tt-key">Health Workers/10k</span>
        <span class="tt-val" style="color:${d.health_workers_per_10k < 5 ? '#ff3b4e' : '#00d68f'}">${d.health_workers_per_10k}</span>
      </div>
      <div class="tt-row">
        <span class="tt-key">Cold Chain Coverage</span>
        <span class="tt-val">${d.cold_chain_coverage_pct}%</span>
      </div>
      <div class="tt-row">
        <span class="tt-key">Active Outbreaks</span>
        <span class="tt-val" style="color:#ff3b4e;max-width:130px;text-align:right;font-size:10px">${outbreaks}</span>
      </div>
      <div class="tt-row">
        <span class="tt-key">Stockout Risk</span>
        <span class="tt-val" style="color:${stockColor}">${d.med_stockout_risk.toUpperCase()}</span>
      </div>
      ${anomalyBadge}
    </div>
    <div class="tt-alert" style="color:${alertColor}">
      <span>●</span>
      <span>${d.alert_level.toUpperCase()} FUNDING GAP · INFORM ${d.inform_score}</span>
    </div>`;
  }

  // ── Style function for GeoJSON layer ────────────────────────
  function featureStyle(feature, crisisLookup, mode) {
    const iso = feature.properties.iso_a2;
    const d = crisisLookup[iso];

    if (!d) {
      // Non-crisis countries — neutral base style
      return {
        fillColor: '#1a2035',
        fillOpacity: 0.6,
        color: '#1e2436',
        weight: 0.8,
      };
    }

    const { fill, opacity } = (COLOR[mode] || COLOR.gap)(d);
    return {
      fillColor: fill,
      fillOpacity: opacity,
      color: d.health_anomaly ? '#9d6fff' : 'rgba(255,255,255,0.12)',
      weight: d.health_anomaly ? 2 : 0.8,
    };
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(containerId) {
    map = L.map(containerId, {
      center: [10, 20],
      zoom: 2.5,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 10,
    });

    // Base tile layers
    baseLayers.dark = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18 }
    );
    baseLayers.satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    );
    baseLayers.topo = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { maxZoom: 17 }
    );

    baseLayers.dark.addTo(map);

    // Load GeoJSON and render
    fetch('data/world.geo.json')
      .then(r => r.json())
      .then(geojson => buildChoropleth(geojson))
      .catch(err => console.error('GeoJSON load error:', err));
  }

  // ── Build choropleth ─────────────────────────────────────────
  function buildChoropleth(geojson) {
    const lookup = {};
    window.CRISIS_DATA.forEach(d => { lookup[d.iso_a2] = d; });

    if (geoLayer) map.removeLayer(geoLayer);

    geoLayer = L.geoJSON(geojson, {
      style: f => featureStyle(f, lookup, currentMode),

      onEachFeature(feature, layer) {
        const iso = feature.properties.iso_a2;
        const d = lookup[iso];

        if (!d) {
          // Subtle hover for non-crisis countries
          layer.on({
            mouseover: e => {
              e.target.setStyle({ fillOpacity: 0.85, color: '#2a334d', weight: 1.2 });
            },
            mouseout: e => {
              geoLayer.resetStyle(e.target);
            }
          });
          return;
        }

        // Crisis country interactions
        layer.bindTooltip(buildTooltip(d), {
          className: 'geo-tooltip',
          sticky: true,
          opacity: 1,
          offset: [12, 0],
        });

        layer.on({
          mouseover: e => {
            e.target.setStyle({ weight: 2.5, fillOpacity: 0.95 });
            e.target.bringToFront();
          },
          mouseout: e => {
            geoLayer.resetStyle(e.target);
          },
          click: () => {
            // Fire custom event for detail panel
            window.dispatchEvent(new CustomEvent('countrySelect', { detail: d }));
            // Fly to country centroid
            const bounds = layer.getBounds();
            map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 7, duration: 1.0 });
          }
        });
      }
    }).addTo(map);
  }

  // ── Public API ───────────────────────────────────────────────
  return {
    init,

    setBaseMap(type) {
      Object.values(baseLayers).forEach(l => {
        if (map.hasLayer(l)) map.removeLayer(l);
      });
      (baseLayers[type] || baseLayers.dark).addTo(map);
    },

    setMode(mode) {
      currentMode = mode;
      if (!geoLayer) return;
      const lookup = {};
      window.CRISIS_DATA.forEach(d => { lookup[d.iso_a2] = d; });
      geoLayer.setStyle(f => featureStyle(f, lookup, mode));
    },

    zoomIn()  { map.zoomIn(); },
    zoomOut() { map.zoomOut(); },
    reset()   { map.flyTo([10, 20], 2.5, { duration: 1 }); },

    flyTo(lat, lng) {
      map.flyTo([lat, lng], 5, { duration: 1 });
    },
  };
})();
