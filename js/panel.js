/**
 * EpiWatch — Country detail panel and sparklines
 * Depends: EPIDEMIC_DATA, currentYear, selectedCountry, coverageColor, computeR0
 */
function showCountry(cc) {
  selectedCountry = cc;
  const v = EPIDEMIC_DATA[cc];
  if (!v) return;

  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const diseaseLabel = cfg.label || 'Cases';
  const antigenLabel = cfg.antigenLabel || 'MCV2';

  const panel = document.getElementById('country-panel');
  const years = Object.keys(v.years).sort();
  const yrData = v.years[currentYear] || {};
  const cases = yrData.measles || 0;
  const funding = yrData.gghed_per_capita || 0;
  const coverage = yrData.vaccine_coverage || 0;
  const targetNumber = yrData.target_number || 0;
  const doses = yrData.doses || 0;
  const r0 = computeR0(yrData.pop_density || 1);
  const popDen = yrData.pop_density || 0;

  const gamma = 1 / 14;
  const beta = r0 * gamma;
  const peakFraction = (1 - (1 / r0) - Math.log(r0) / r0) || 0;

  panel.innerHTML =
    '<div class="animate-in">' +
    '<div id="country-title">' + v.name + '</div>' +
    '<div id="country-meta">' + (v.region || '') + (v.region && v.income ? ' \u2022 ' : '') + (v.income ? v.income + ' income' : '') + '</div>' +
    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-label">Cases (' + currentYear + ')</div><div class="stat-value red">' + (cases > 0 ? cases.toLocaleString() : 'N/A') + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Vaccine Coverage (' + antigenLabel + ')</div><div class="stat-value ' + (coverage < 50 ? 'red' : coverage < 80 ? 'yellow' : 'green') + '">' + (coverage > 0 ? coverage.toFixed(1) + '%' : 'N/A') + '</div>' +
    (coverage > 0 && coverage < 95 ? '<div class="stat-gap">Target 95% \u2022 Gap ' + (95 - coverage).toFixed(1) + '%</div>' : '') + '</div>' +
    '<div class="stat-card"><div class="stat-label">Gov. Funding/cap</div><div class="stat-value ' + (funding < 50 ? 'red' : funding < 200 ? 'yellow' : 'green') + '">$' + funding.toFixed(0) + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Doses Administered</div><div class="stat-value cyan">' + (doses > 0 ? (doses / 1e6).toFixed(2) + 'M' : 'N/A') + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Pop. Density</div><div class="stat-value cyan">' + popDen.toFixed(1) + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Underfunded Score</div><div class="stat-value ' + ((v.underfunded_score || 0) > 0.3 ? 'red' : 'yellow') + '">' + (v.underfunded_score || 0).toFixed(3) + '</div></div>' +
    '</div>' +
    '<div class="mini-chart-label">' + diseaseLabel + ' Cases Over Time</div>' +
    '<canvas id="mini-chart-canvas" height="70"></canvas>' +
    '<div class="mini-chart-label">Vaccine Coverage (' + antigenLabel + ') Over Time</div>' +
    '<canvas id="vaccine-chart-canvas" height="70"></canvas>' +
    '<div class="sir-info">' +
    '<div class="sir-title">// SIR Model Estimates</div>' +
    '<div class="sir-row"><span class="k">Adj. R\u2080</span><span class="v">' + r0.toFixed(2) + '</span></div>' +
    '<div class="sir-row"><span class="k">\u03b2 (transmission)</span><span class="v">' + beta.toFixed(4) + '</span></div>' +
    '<div class="sir-row"><span class="k">\u03b3 (recovery)</span><span class="v">' + gamma.toFixed(4) + ' (~14d)</span></div>' +
    '<div class="sir-row"><span class="k">Est. peak fraction</span><span class="v">' + (Math.max(0, peakFraction) * 100).toFixed(1) + '%</span></div>' +
    '<div class="sir-row"><span class="k">Peak year</span><span class="v">' + (v.peak_year || '\u2014') + '</span></div>' +
    '<div class="sir-row"><span class="k">Peak cases</span><span class="v">' + (v.peak_measles || 0).toLocaleString() + '</span></div>' +
    '</div></div>';

  requestAnimationFrame(function () {
    drawSparkline(v.years, years);
    drawVaccineSparkline(v.years, years);
  });
}

function drawSparkline(yearsData, years) {
  const canvas = document.getElementById('mini-chart-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.clientWidth - 40;
  const H = 70;
  canvas.width = W;
  canvas.height = H;
  const vals = years.map(function (y) { return yearsData[y] && yearsData[y].measles != null ? yearsData[y].measles : 0; });
  const maxV = Math.max.apply(null, vals.concat([1]));

  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c8bfa8';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = (H * i) / 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const curIdx = years.indexOf(currentYear);
  if (curIdx >= 0) {
    const cx = (curIdx / (years.length - 1 || 1)) * W;
    ctx.fillStyle = 'rgba(139,58,42,0.08)';
    ctx.fillRect(cx - W / years.length / 2, 0, W / years.length, H);
    ctx.strokeStyle = 'rgba(139,58,42,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(192,57,43,0.35)');
  grad.addColorStop(1, 'rgba(192,57,43,0.02)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let i = 0; i < years.length; i++) {
    const x = (i / (years.length - 1 || 1)) * W;
    const y = H - (vals[i] / maxV) * (H - 8);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8b3a2a';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < years.length; i++) {
    const x = (i / (years.length - 1 || 1)) * W;
    const y = H - (vals[i] / maxV) * (H - 8);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#7a6a52';
  ctx.font = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  [0, Math.floor(years.length / 2), years.length - 1].forEach(function (i) {
    if (years[i]) ctx.fillText(years[i], (i / (years.length - 1 || 1)) * W, H - 2);
  });
}

function drawVaccineSparkline(yearsData, years) {
  const canvas = document.getElementById('vaccine-chart-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.clientWidth - 40;
  const H = 70;
  canvas.width = W;
  canvas.height = H;
  const vals = years.map(function (y) {
    const c = yearsData[y] && yearsData[y].vaccine_coverage;
    return c != null && !isNaN(c) ? c : null;
  });
  const numVals = vals.filter(function (v) { return v != null; });
  const maxV = Math.max.apply(null, numVals.concat([95, 1]));
  const minV = numVals.length ? Math.min.apply(null, numVals) : 0;

  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, W, H);
  const targetPct = 95;
  const targetY = H - ((targetPct - minV) / (maxV - minV || 1)) * (H - 8);
  ctx.strokeStyle = 'rgba(58,107,58,0.5)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, targetY);
  ctx.lineTo(W, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#3a6b3a';
  ctx.font = '8px DM Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('95% target', 4, targetY - 2);

  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < years.length; i++) {
    const v = vals[i];
    if (v == null) { started = false; continue; }
    const x = (i / (years.length - 1 || 1)) * W;
    const y = H - ((v - minV) / (maxV - minV || 1)) * (H - 8);
    if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#8b3a2a';
  ctx.stroke();

  const curIdx = years.indexOf(currentYear);
  if (curIdx >= 0 && vals[curIdx] != null) {
    const cx = (curIdx / (years.length - 1 || 1)) * W;
    const cy = H - ((vals[curIdx] - minV) / (maxV - minV || 1)) * (H - 8);
    ctx.fillStyle = coverageColor(vals[curIdx]);
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,18,9,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#7a6a52';
  ctx.font = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  [0, Math.floor(years.length / 2), years.length - 1].forEach(function (i) {
    if (years[i]) ctx.fillText(years[i], (i / (years.length - 1 || 1)) * W, H - 2);
  });
}
