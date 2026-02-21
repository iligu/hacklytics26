/**
 * app.js — Application bootstrap & event wiring
 * Entry point: called after all scripts are loaded
 */

(function () {
  'use strict';

  // Current filter state
  const state = {
    mapMode: 'gap',
    crisisFilter: 'all',
    baseMap: 'dark',
    chartTab: 'gap',
    pinMin: 0,
  };

  // ── DOM ready ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Init subsystems
    GeoMap.init('map');
    UI.init();
    Charts.render('gap');

    // Wire header stat counters
    animateCounter('stat-requirements', 49.47, '$', 'B', 2);
    animateCounter('stat-funded',       23.96, '$', 'B', 2);
    animateCounter('stat-gap-pct',      51.6,  '',  '%', 1);
    animateCounter('stat-pin',          305,   '',  'M', 0);

    // Wire map mode tabs
    document.querySelectorAll('.map-tab[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-tab[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mapMode = btn.dataset.mode;
        GeoMap.setMode(state.mapMode);
        updateLegendLabel(state.mapMode);
      });
    });

    // Wire base map selector
    document.querySelectorAll('.map-tab[data-basemap]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.map-tab[data-basemap]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.baseMap = btn.dataset.basemap;
        GeoMap.setBaseMap(state.baseMap);
      });
    });

    // Wire left panel filters
    const crisisFilterEl = document.getElementById('filter-crisis-type');
    if (crisisFilterEl) {
      crisisFilterEl.addEventListener('change', e => {
        state.crisisFilter = e.target.value;
        UI.buildCrisisRanking(
          state.crisisFilter === 'all' ? () => true : d => d.crisis_type === state.crisisFilter
        );
      });
    }

    const pinSlider = document.getElementById('filter-pin');
    if (pinSlider) {
      pinSlider.addEventListener('input', e => {
        state.pinMin = parseFloat(e.target.value);
        document.getElementById('pin-val').textContent = state.pinMin > 0 ? state.pinMin + 'M+' : 'All';
        UI.buildCrisisRanking(d => d.pin >= state.pinMin);
      });
    }

    // Wire chart tabs
    document.querySelectorAll('.chart-tab[data-chart]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-tab[data-chart]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.chartTab = btn.dataset.chart;
        Charts.render(state.chartTab);
      });
    });

    // Wire zoom controls
    document.getElementById('zoom-in')?.addEventListener('click',    () => GeoMap.zoomIn());
    document.getElementById('zoom-out')?.addEventListener('click',   () => GeoMap.zoomOut());
    document.getElementById('zoom-reset')?.addEventListener('click', () => GeoMap.reset());
  });

  // ── Animated number counter ───────────────────────────────────
  function animateCounter(id, end, prefix = '', suffix = '', decimals = 0) {
    const el = document.getElementById(id);
    if (!el) return;
    let start = null;
    const duration = 1400;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = prefix + (eased * end).toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Legend label map ─────────────────────────────────────────
  const LEGEND_LABELS = {
    gap:       'HRP Funding Coverage',
    health:    'Health Cluster Funded %',
    workers:   'Health Workers / 10k (WHO min: 23)',
    coldchain: 'Cold Chain Coverage %',
    cbpf:      'CBPF Pooled Fund Coverage',
  };

  function updateLegendLabel(mode) {
    const el = document.getElementById('legend-label');
    if (el) el.textContent = LEGEND_LABELS[mode] || mode;
  }

})();
