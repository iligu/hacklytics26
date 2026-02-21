/**
 * charts.js — Chart.js visualisations
 * Tabs: Funding Gap | Health Workers | Sector | Trend
 */

window.Charts = (() => {
  let instance = null;
  const CANVAS_ID = 'main-chart';

  // ── Shared chart options ─────────────────────────────────────
  const BASE_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#4b5472', font: { size: 9, family: "'IBM Plex Mono'" } }, grid: { display: false } },
      y: { ticks: { color: '#4b5472', font: { size: 9, family: "'IBM Plex Mono'" } }, grid: { color: '#1e2436' } }
    }
  };

  const SORTED_BY_GAP = [...window.CRISIS_DATA]
    .sort((a, b) => a.funding_pct - b.funding_pct)
    .slice(0, 12);

  const SORTED_BY_WORKERS = [...window.CRISIS_DATA]
    .sort((a, b) => a.health_workers_per_10k - b.health_workers_per_10k)
    .slice(0, 12);

  // ── Chart configs ────────────────────────────────────────────
  const CONFIGS = {

    gap: () => ({
      type: 'bar',
      data: {
        labels: SORTED_BY_GAP.map(d => d.name),
        datasets: [
          {
            label: 'Funded %',
            data: SORTED_BY_GAP.map(d => d.funding_pct.toFixed(1)),
            backgroundColor: SORTED_BY_GAP.map(d => ({
              critical: 'rgba(255,59,78,0.75)',
              high: 'rgba(255,121,38,0.75)',
              moderate: 'rgba(255,216,74,0.75)',
              funded: 'rgba(0,214,143,0.75)',
            }[d.alert_level])),
            borderRadius: 3,
          },
          {
            label: 'Gap %',
            data: SORTED_BY_GAP.map(d => (100 - d.funding_pct).toFixed(1)),
            backgroundColor: 'rgba(30,36,54,0.6)',
            borderRadius: 3,
          }
        ]
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%` } }
        },
        scales: {
          ...BASE_OPTS.scales,
          x: { ...BASE_OPTS.scales.x, stacked: true },
          y: { ...BASE_OPTS.scales.y, stacked: true, max: 100,
            ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v + '%' } }
        }
      }
    }),

    health: () => ({
      type: 'bar',
      data: {
        labels: SORTED_BY_WORKERS.map(d => d.name),
        datasets: [
          {
            label: 'Health Workers / 10k',
            data: SORTED_BY_WORKERS.map(d => d.health_workers_per_10k),
            backgroundColor: SORTED_BY_WORKERS.map(d =>
              d.health_workers_per_10k < 5 ? 'rgba(255,59,78,0.75)' :
              d.health_workers_per_10k < 15 ? 'rgba(255,216,74,0.75)' : 'rgba(0,214,143,0.75)'
            ),
            borderRadius: 3,
          }
        ]
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          ...BASE_OPTS.plugins,
          annotation: {},
        },
        scales: {
          ...BASE_OPTS.scales,
          y: {
            ...BASE_OPTS.scales.y,
            ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => v + '/10k' }
          }
        }
      }
    }),

    sector: () => ({
      type: 'doughnut',
      data: {
        labels: ['Food Security', 'Health', 'WASH', 'Protection', 'Shelter', 'Nutrition', 'Education'],
        datasets: [{
          data: [37, 21, 17, 13, 6, 4, 2],
          backgroundColor: ['#ff7926','#3d9eff','#00d68f','#9d6fff','#ffd84a','#ff3b4e','#4b5472'],
          borderColor: '#0e1118',
          borderWidth: 2,
          hoverOffset: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { color: '#8b93a8', font: { size: 9, family: "'IBM Plex Mono'" }, boxWidth: 9, padding: 8 }
          },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
        },
        cutout: '62%',
      }
    }),

    trend: () => ({
      type: 'line',
      data: {
        labels: ['2019', '2020', '2021', '2022', '2023', '2024'],
        datasets: [
          {
            label: 'Global Requirements ($B)',
            data: [21.9, 28.5, 35.3, 46.0, 56.7, 49.5],
            borderColor: '#ff7926',
            backgroundColor: 'rgba(255,121,38,0.08)',
            fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#ff7926',
          },
          {
            label: 'Total Funded ($B)',
            data: [14.3, 17.5, 19.8, 24.1, 22.2, 24.0],
            borderColor: '#3d9eff',
            backgroundColor: 'rgba(61,158,255,0.08)',
            fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#3d9eff',
          },
          {
            label: 'Health Cluster Funded ($B)',
            data: [2.8, 4.1, 5.0, 5.8, 5.2, 5.4],
            borderColor: '#00d68f',
            backgroundColor: 'rgba(0,214,143,0.06)',
            fill: true, tension: 0.4, pointRadius: 3, borderDash: [4, 3], pointBackgroundColor: '#00d68f',
          }
        ]
      },
      options: {
        ...BASE_OPTS,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#8b93a8', font: { size: 9, family: "'IBM Plex Mono'" }, boxWidth: 10, padding: 10 }
          }
        },
        scales: {
          ...BASE_OPTS.scales,
          y: { ...BASE_OPTS.scales.y, ticks: { ...BASE_OPTS.scales.y.ticks, callback: v => '$' + v + 'B' } }
        }
      }
    }),
  };

  // ── Render ───────────────────────────────────────────────────
  function render(type) {
    if (instance) { instance.destroy(); instance = null; }
    const cfg = CONFIGS[type];
    if (!cfg) return;
    const ctx = document.getElementById(CANVAS_ID);
    if (!ctx) return;
    instance = new Chart(ctx.getContext('2d'), cfg());
  }

  return { render };
})();
