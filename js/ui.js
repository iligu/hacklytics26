/**
 * ui.js — Panel rendering: left sidebar, right detail + lists
 */

window.UI = (() => {

  // ── Helpers ──────────────────────────────────────────────────
  const alertColor = {
    critical: 'var(--red)', high: 'var(--orange)',
    moderate: 'var(--yellow)', funded: 'var(--green)'
  };
  const pillClass = {
    critical: 'pill-critical', high: 'pill-high',
    moderate: 'pill-moderate', funded: 'pill-funded'
  };
  const stockColor = {
    critical: 'var(--red)', high: 'var(--orange)',
    moderate: 'var(--yellow)', low: 'var(--green)'
  };

  function fmt(n, prefix='', suffix='', decimals=2) {
    return prefix + parseFloat(n).toFixed(decimals) + suffix;
  }

  // ── Crisis ranking list (left panel) ────────────────────────
  function buildCrisisRanking(filterFn = () => true) {
    const sorted = [...window.CRISIS_DATA]
      .filter(filterFn)
      .sort((a, b) => a.funding_pct - b.funding_pct);

    const el = document.getElementById('crisis-ranking');
    if (!el) return;

    el.innerHTML = sorted.slice(0, 15).map((d, i) => `
      <div class="crisis-row" data-iso="${d.iso_a2}" onclick="UI.selectCountry('${d.iso_a2}')">
        <div class="crisis-rank">#${i + 1}</div>
        <div class="crisis-info">
          <div class="crisis-name">${d.name}</div>
          <div class="crisis-meta">${d.funding_pct.toFixed(0)}% funded · ${d.pin}M PIN</div>
        </div>
        <div class="crisis-minibar">
          <div class="crisis-minibar-fill" style="width:${d.funding_pct}%;background:${alertColor[d.alert_level]}"></div>
        </div>
      </div>
    `).join('');
  }

  // ── Anomaly list (right panel) ───────────────────────────────
  function buildAnomalyList() {
    const anomalies = [...window.CRISIS_DATA]
      .filter(d => d.health_anomaly || d.health_cluster_funded_pct < 22)
      .sort((a, b) => a.health_cluster_funded_pct - b.health_cluster_funded_pct)
      .slice(0, 7);

    const el = document.getElementById('anomaly-list');
    if (!el) return;

    el.innerHTML = anomalies.map(d => `
      <div class="anomaly-list-item" onclick="UI.selectCountry('${d.iso_a2}')">
        <div>
          <div class="ali-name">${d.name} ${d.health_anomaly ? '<span style="color:var(--purple);font-size:10px">⚠</span>' : ''}</div>
          <div class="ali-sub">${d.health_workers_per_10k}/10k workers · $${d.budget_per_bene}/PIN</div>
        </div>
        <div class="ali-right">
          <div class="ali-pct" style="color:${alertColor[d.alert_level]}">${d.health_cluster_funded_pct}%</div>
          <div class="ali-lbl">health funded</div>
        </div>
      </div>
    `).join('');
  }

  // ── CBPF list (right panel) ──────────────────────────────────
  function buildCBPFList() {
    const cbpf = [...window.CRISIS_DATA]
      .filter(d => d.cbpf)
      .sort((a, b) => parseFloat(a.cbpf_coverage) - parseFloat(b.cbpf_coverage))
      .slice(0, 8);

    const el = document.getElementById('cbpf-list');
    if (!el) return;

    el.innerHTML = cbpf.map(d => {
      const pct = parseFloat(d.cbpf_coverage);
      const c = pct < 30 ? 'var(--red)' : pct < 55 ? 'var(--orange)' : 'var(--green)';
      return `
        <div class="cbpf-list-item">
          <div class="cbpf-header">
            <span class="name">${d.name}</span>
            <span class="amt" style="color:${c}">$${d.cbpf_alloc}M / $${d.cbpf_req}M req</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.min(100, pct)}%;background:${c}"></div>
          </div>
        </div>`;
    }).join('');
  }

  // ── Country detail card (right panel) ───────────────────────
  function buildDetailCard(d) {
    const card = document.getElementById('detail-card');
    if (!card) return;

    const ac = alertColor[d.alert_level];
    const pc = pillClass[d.alert_level];
    const sc = stockColor[d.med_stockout_risk] || 'var(--blue)';

    const whoMin = 86; // WHO minimum health spend per person per year
    const healthSpendPerPIN = ((d.funded * 1e9 * (d.health_cluster_funded_pct / 100)) / (d.pin * 1e6)).toFixed(0);
    const whoGapPct = Math.min(100, (healthSpendPerPIN / whoMin) * 100).toFixed(0);

    const cbpfBlock = d.cbpf
      ? `<div class="bar-group">
          <div class="bar-label">
            <span class="name">CBPF Pool Coverage</span>
            <span class="pct" style="color:var(--blue)">$${d.cbpf_alloc}M / $${d.cbpf_req}M</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.min(100, d.cbpf_coverage)}%;background:var(--blue)"></div>
          </div>
        </div>`
      : `<div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);padding:4px 0">No active CBPF Pooled Fund</div>`;

    const anomalyBanner = d.health_anomaly
      ? `<div class="anomaly-banner critical">
          <div class="icon">⚠</div>
          <div>
            <strong style="color:var(--red)">Health System Anomaly</strong><br>
            Health worker density (${d.health_workers_per_10k}/10k) is critically below WHO minimum (23/10k) 
            while health cluster funding is only ${d.health_cluster_funded_pct}%.
          </div>
        </div>`
      : '';

    const outbreakChips = d.active_outbreaks.length
      ? d.active_outbreaks.map(o => `<span class="outbreak-chip">${o}</span>`).join('')
      : `<span style="font-size:10px;color:var(--text-muted)">None active</span>`;

    const clusterRows = d.clusters.map(c => `
      <div class="cluster-row">
        <div class="cluster-name">${c.n}</div>
        <div class="cluster-mini"><div class="cluster-fill" style="width:${c.p}%;background:${c.color}"></div></div>
        <div class="cluster-pct">${c.p}%</div>
      </div>`).join('');

    card.innerHTML = `
      <!-- HEADER -->
      <div class="detail-header">
        <div class="detail-country-name">${d.name}</div>
        <div class="detail-crisis-type">${d.crisis_desc}</div>
        <div class="alert-pill ${pc}">● ${d.alert_level.toUpperCase()} GAP · INFORM ${d.inform_score}</div>
      </div>

      <!-- METRICS -->
      <div class="metric-grid">
        <div class="metric-box">
          <div class="metric-val color-yellow">${d.pin}M</div>
          <div class="metric-lbl">People in Need</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color:${ac}">$${d.gap_usd.toFixed(2)}B</div>
          <div class="metric-lbl">Funding Gap</div>
        </div>
        <div class="metric-box">
          <div class="metric-val">$${d.requirements.toFixed(2)}B</div>
          <div class="metric-lbl">HRP Required</div>
        </div>
        <div class="metric-box">
          <div class="metric-val" style="color:${ac}">${d.funding_pct.toFixed(1)}%</div>
          <div class="metric-lbl">Funded</div>
        </div>
      </div>

      <!-- FUNDING BARS -->
      <div class="funding-section">
        <div class="bar-group">
          <div class="bar-label">
            <span class="name">HRP Funding Coverage</span>
            <span class="pct" style="color:${ac}">${d.funding_pct.toFixed(1)}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${Math.min(100, d.funding_pct)}%;background:${ac}"></div>
          </div>
        </div>
        ${cbpfBlock}
      </div>

      <!-- HEALTH METRICS -->
      <div class="health-section">
        <div class="section-title red">Healthcare Indicators</div>
        ${anomalyBanner}
        <div class="health-grid">
          <div class="health-metric">
            <div class="v" style="color:${d.health_workers_per_10k < 5 ? 'var(--red)' : 'var(--green)'}">${d.health_workers_per_10k}</div>
            <div class="l">Workers / 10k pop <span style="color:var(--text-muted)">(WHO min: 23)</span></div>
          </div>
          <div class="health-metric">
            <div class="v" style="color:${d.functional_facilities_pct < 40 ? 'var(--red)' : 'var(--yellow)'}">${d.functional_facilities_pct}%</div>
            <div class="l">Facilities Functional</div>
          </div>
          <div class="health-metric">
            <div class="v" style="color:${d.cold_chain_coverage_pct < 30 ? 'var(--red)' : 'var(--yellow)'}">${d.cold_chain_coverage_pct}%</div>
            <div class="l">Cold Chain Coverage</div>
          </div>
          <div class="health-metric">
            <div class="v" style="color:${sc}">${d.med_stockout_risk.toUpperCase()}</div>
            <div class="l">Med Stockout Risk</div>
          </div>
        </div>

        <!-- WHO Minimum threshold bar -->
        <div class="who-threshold-bar">
          <div class="bar-label">
            <span class="name">Health Spend vs WHO Min ($86/person)</span>
            <span class="pct" style="color:${whoGapPct < 50 ? 'var(--red)' : 'var(--yellow)'}">$${healthSpendPerPIN}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${whoGapPct}%;background:${whoGapPct < 50 ? 'var(--red)' : whoGapPct < 75 ? 'var(--orange)' : 'var(--green)'}"></div>
          </div>
        </div>

        <div class="section-title" style="margin-top:10px;margin-bottom:6px">Active Disease Outbreaks</div>
        <div class="outbreak-chips">${outbreakChips}</div>
      </div>

      <!-- CLUSTER BREAKDOWN -->
      <div class="cluster-section">
        <div class="section-title">Cluster Allocation (% of HRP Budget)</div>
        ${clusterRows}
      </div>

      <!-- ANALYST NOTE -->
      <div class="note-box">${d.note}</div>
    `;

    card.classList.add('visible');

    // Highlight selected row in ranking list
    document.querySelectorAll('.crisis-row').forEach(r => r.classList.remove('selected'));
    const row = document.querySelector(`.crisis-row[data-iso="${d.iso_a2}"]`);
    if (row) { row.classList.add('selected'); row.scrollIntoView({ block: 'nearest' }); }
  }

  // ── Select country (public entry point) ──────────────────────
  function selectCountry(iso) {
    const d = window.CRISIS_DATA.find(x => x.iso_a2 === iso);
    if (!d) return;
    buildDetailCard(d);
    window.GeoMap.flyTo(d.lat, d.lng);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    buildCrisisRanking();
    buildAnomalyList();
    buildCBPFList();

    // Listen for map click events
    window.addEventListener('countrySelect', e => buildDetailCard(e.detail));

    // Show first country by default
    setTimeout(() => {
      const first = [...window.CRISIS_DATA].sort((a, b) => a.funding_pct - b.funding_pct)[0];
      if (first) buildDetailCard(first);
    }, 800);
  }

  return { init, buildCrisisRanking, buildAnomalyList, buildCBPFList, selectCountry };
})();
