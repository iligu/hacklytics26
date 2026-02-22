/**
 * Pathologic — Country detail panel and sparklines
 * Depends: EPIDEMIC_DATA, currentYear, selectedCountry, coverageColor, computeR0
 */
function showCountry(cc) {
  selectedCountry = cc;
  let v;
  if (currentDisease === 'covid19' && typeof window.getCovid19CountryForPanel === 'function') {
    v = window.getCovid19CountryForPanel(cc);
  }
  if (!v) v = EPIDEMIC_DATA[cc];
  if (!v) return;

  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const diseaseLabel = cfg.label || 'Cases';
  const antigenLabel = cfg.antigenLabel || 'MCV2';

  const panel = document.getElementById('country-panel');
  const years = Object.keys(v.years).sort();
  const yrData = v.years[currentYear] || {};
  const cases = yrData.measles;
  const funding = yrData.gghed_per_capita;
  const coverage = yrData.vaccine_coverage;
  const targetNumber = yrData.target_number;
  const doses = yrData.doses;
  const popDen = yrData.pop_density;
  var yearEntries = getYearData(currentYear);
  var entryForCountry = yearEntries.filter(function (e) { return e.cc === cc; })[0];
  const fundingGap = entryForCountry && entryForCountry.funding_gap != null ? entryForCountry.funding_gap : null;

  // SIR uses reference R₀ from literature (15 for measles); density-adjusted R₀ is indicative only (map/circle)
  const r0Reference = getReferenceR0();
  const r0Adjusted = computeR0(yrData.pop_density || 1);
  const gamma = 1 / 14;   // 14-day infectious period (standard for measles)
  const beta = r0Reference * gamma;
  const peakFraction = (1 - (1 / r0Reference) - Math.log(r0Reference) / r0Reference) || 0;

  function noData(val) { return (val == null || val === '' || (typeof val === 'number' && isNaN(val))) ? 'No data available' : val; }
  function fmtCases(val) { return (val != null && val > 0) ? val.toLocaleString() : 'No data available'; }
  function fmtPct(val) { return (val != null && !isNaN(val)) ? val.toFixed(1) + '%' : 'No data available'; }
  function fmtMoney(val) { return (val != null && val > 0) ? '$' + val.toFixed(0) : 'No data available'; }
  function fmtDoses(val) { return (val != null && val > 0) ? (val / 1e6).toFixed(2) + 'M' : 'No data available'; }
  function fmtNum(val) { return (val != null && !isNaN(val)) ? val.toFixed(1) : 'No data available'; }
  function fmtGap(val) { return (val != null && !isNaN(val)) ? (val * 100).toFixed(1) + '%' : 'No data available'; }

  const casesStr = fmtCases(cases);
  const coverageStr = fmtPct(coverage);
  const coverageNum = (coverage != null && !isNaN(coverage)) ? coverage : -1;
  const fundingStr = fmtMoney(funding);
  const fundingNum = (funding != null && funding > 0) ? funding : -1;
  const dosesStr = (currentDisease === 'covid19' && doses != null && doses > 0)
    ? doses.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' per 1M'
    : fmtDoses(doses);
  const popStr = fmtNum(popDen);
  const gapStr = fmtGap(fundingGap);
  const gapNum = (fundingGap != null && !isNaN(fundingGap)) ? fundingGap : 0;

  panel.innerHTML =
    '<div class="animate-in">' +
    '<div id="country-title">' + v.name + '</div>' +
    '<div id="country-meta">' + (v.region || '') + (v.region && v.income ? ' \u2022 ' : '') + (v.income ? v.income + ' income' : '') + '</div>' +
    '<div class="stat-grid">' +
    '<div class="stat-card"><div class="stat-label">' + (currentDisease === 'covid19' ? 'Total cases (' + currentYear + ')' : 'Cases (' + currentYear + ')') + '</div><div class="stat-value ' + (cases > 0 ? 'red' : '') + '">' + casesStr + '</div></div>' +
    (currentDisease === 'covid19'
      ? '<div class="stat-card"><div class="stat-label">Doses (per 1M pop., ÷2)</div><div class="stat-value cyan">' + dosesStr + '</div></div>'
      : '<div class="stat-card"><div class="stat-label">Vaccine Coverage (' + antigenLabel + ')</div><div class="stat-value ' + (coverageNum < 0 ? '' : coverageNum < 50 ? 'red' : coverageNum < 80 ? 'yellow' : 'green') + '">' + coverageStr + '</div>' + (coverageNum >= 0 && coverageNum < 95 ? '<div class="stat-gap">Target 95% \u2022 Gap ' + (95 - coverageNum).toFixed(1) + '%</div>' : '') + '</div><div class="stat-card"><div class="stat-label">Doses Administered</div><div class="stat-value cyan">' + dosesStr + '</div></div>') +
    '<div class="stat-card"><div class="stat-label">Funding/cap</div><div class="stat-value ' + (fundingNum < 0 ? '' : fundingNum < 50 ? 'red' : fundingNum < 200 ? 'yellow' : 'green') + '">' + fundingStr + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Pop. Density</div><div class="stat-value cyan">' + popStr + '</div></div>' +
    '<div class="stat-card"><div class="stat-label">Funding gap (burden vs funding)</div><div class="stat-value ' + (gapNum > 0.3 ? 'red' : gapNum > 0.1 ? 'yellow' : '') + '">' + gapStr + '</div></div>' +
    '</div>' +
    '<div class="mini-chart-label">' + diseaseLabel + ' Cases Over Time</div>' +
    '<canvas id="mini-chart-canvas" height="70"></canvas>' +
    '<div class="mini-chart-label">Vaccine ' + (currentDisease === 'covid19' ? 'doses (per 1M pop., ÷2) (' + antigenLabel + ')' : 'Coverage (' + antigenLabel + ')') + ' Over Time</div>' +
    '<canvas id="vaccine-chart-canvas" height="70"></canvas>' +
    '<div class="sir-info">' +
    '<div class="sir-title">// SIR Model Estimates</div>' +
    '<div class="sir-row"><span class="k">R\u2080 (reference)</span><span class="v">' + r0Reference + '</span></div>' +
    '<div class="sir-row"><span class="k">Adj. R\u2080 (indicative)</span><span class="v">' + r0Adjusted.toFixed(2) + '</span></div>' +
    '<div class="sir-row"><span class="k">\u03b2 (transmission)</span><span class="v">' + beta.toFixed(4) + '</span></div>' +
    '<div class="sir-row"><span class="k">\u03b3 (recovery)</span><span class="v">' + gamma.toFixed(4) + ' (~14d)</span></div>' +
    '<div class="sir-row"><span class="k">Est. peak fraction</span><span class="v">' + (Math.max(0, peakFraction) * 100).toFixed(1) + '%</span></div>' +
    '<div class="sir-row"><span class="k">Peak year</span><span class="v">' + (v.peak_year != null ? v.peak_year : 'No data available') + '</span></div>' +
    '<div class="sir-row"><span class="k">Peak cases</span><span class="v">' + ((v.peak_measles != null && v.peak_measles > 0) ? v.peak_measles.toLocaleString() : 'No data available') + '</span></div>' +
    '<div class="sir-methodology">R\u2080 from literature (12\u201318). \u03b2, \u03b3, peak from standard SIR. See DATA_AND_METHODOLOGY.md.</div>' +
    '</div></div>';

  requestAnimationFrame(function () {
    drawSparkline(v.years, years);
    drawVaccineSparkline(v.years, years);
    var mini = document.getElementById('mini-chart-canvas');
    var vaccineCanvas = document.getElementById('vaccine-chart-canvas');
    if (mini) mini.onclick = function () { openChartModal(v, years); };
    if (vaccineCanvas) vaccineCanvas.onclick = function () { openChartModal(v, years); };
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

// ============================================================
// Chart detail modal — accurate data for everyone (UN / non-technical)
// ============================================================
function openChartModal(country, years) {
  var modal = document.getElementById('chart-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  var headingCountry = document.getElementById('chart-modal-country');
  if (headingCountry) headingCountry.textContent = country.name || '';
  drawModalCasesChart(country.years, years);
  drawModalVaccineChart(country.years, years);
  renderModalTable(country.years, years);
  var closeBtn = modal.querySelector('.chart-modal-close');
  if (closeBtn && closeBtn.focus) closeBtn.focus();
}

function closeChartModal() {
  var modal = document.getElementById('chart-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('click', function (evt) {
  if (evt.target && evt.target.hasAttribute && evt.target.hasAttribute('data-modal-close')) {
    closeChartModal();
  }
});
document.addEventListener('keydown', function (evt) {
  if (evt.key === 'Escape') closeChartModal();
});

function drawModalCasesChart(yearsData, years) {
  var canvas = document.getElementById('modal-cases-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var parent = canvas.parentElement;
  var W = parent ? (parent.clientWidth - 40) : 400;
  var H = 160;
  canvas.width = W;
  canvas.height = H;
  var vals = years.map(function (y) { return yearsData[y] && yearsData[y].measles != null ? yearsData[y].measles : 0; });
  var maxV = Math.max.apply(null, vals.concat([1]));

  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#c8bfa8';
  ctx.lineWidth = 1;
  for (var i = 0; i <= 4; i++) {
    var y = (H * i) / 4;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a6a52';
  ctx.font = '9px DM Mono, monospace';
  ctx.textAlign = 'right';
  for (i = 0; i <= 4; i++) {
    var frac = i / 4;
    var value = Math.round(maxV * (1 - frac));
    ctx.fillText(value.toLocaleString(), 36, (H * frac) + 3);
  }
  ctx.beginPath();
  ctx.moveTo(40, H);
  for (i = 0; i < years.length; i++) {
    var x = 40 + (i / (years.length - 1 || 1)) * (W - 40);
    var yVal = H - (vals[i] / maxV) * (H - 12);
    ctx.lineTo(x, yVal);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = 'rgba(192,57,43,0.2)';
  ctx.fill();
  ctx.strokeStyle = '#8b3a2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (i = 0; i < years.length; i++) {
    x = 40 + (i / (years.length - 1 || 1)) * (W - 40);
    yVal = H - (vals[i] / maxV) * (H - 12);
    if (i === 0) ctx.moveTo(x, yVal); else ctx.lineTo(x, yVal);
  }
  ctx.stroke();
  ctx.fillStyle = '#7a6a52';
  ctx.font = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  [0, Math.floor(years.length / 2), years.length - 1].forEach(function (i) {
    if (years[i]) ctx.fillText(years[i], 40 + (i / (years.length - 1 || 1)) * (W - 40), H - 2);
  });
}

function drawModalVaccineChart(yearsData, years) {
  var canvas = document.getElementById('modal-vaccine-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var parent = canvas.parentElement;
  var W = parent ? (parent.clientWidth - 40) : 400;
  var H = 160;
  canvas.width = W;
  canvas.height = H;
  var isCovid = currentDisease === 'covid19';
  var vals = years.map(function (y) {
    var yd = yearsData[y];
    if (!yd) return null;
    if (isCovid) return yd.doses != null && !isNaN(yd.doses) ? yd.doses : null;
    var c = yd.vaccine_coverage;
    return c != null && !isNaN(c) ? c : null;
  });
  var numVals = vals.filter(function (v) { return v != null; });
  var maxV = Math.max.apply(null, numVals.concat([isCovid ? 0 : 95, 1]));
  var minV = numVals.length ? Math.min.apply(null, numVals) : 0;

  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, W, H);
  if (!isCovid) {
    var targetPct = 95;
    var targetY = H - ((targetPct - minV) / (maxV - minV || 1)) * (H - 12);
    ctx.strokeStyle = 'rgba(58,107,58,0.5)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, targetY);
    ctx.lineTo(W, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#3a6b3a';
    ctx.font = '9px DM Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('95% target', W - 4, targetY - 4);
  }
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  var started = false;
  for (var j = 0; j < years.length; j++) {
    var v = vals[j];
    if (v == null) { started = false; continue; }
    var x = 40 + (j / (years.length - 1 || 1)) * (W - 40);
    var y = H - ((v - minV) / (maxV - minV || 1)) * (H - 12);
    if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#8b3a2a';
  ctx.stroke();
  ctx.fillStyle = '#7a6a52';
  ctx.font = '9px DM Mono, monospace';
  ctx.textAlign = 'center';
  [0, Math.floor(years.length / 2), years.length - 1].forEach(function (i) {
    if (years[i]) ctx.fillText(years[i], 40 + (i / (years.length - 1 || 1)) * (W - 40), H - 2);
  });
}

function renderModalTable(yearsData, years) {
  var tbody = document.getElementById('chart-modal-rows');
  if (!tbody) return;
  var isCovid = currentDisease === 'covid19';
  var headerRow = tbody.closest('table') && tbody.closest('table').querySelector('thead tr');
  if (headerRow && headerRow.cells.length >= 3) {
    headerRow.cells[2].textContent = isCovid ? 'Doses (per 1M pop., ÷2)' : 'Coverage';
  }
  var html = '';
  for (var i = 0; i < years.length; i++) {
    var y = years[i];
    var row = yearsData[y] || {};
    var cases = (row.measles != null && row.measles > 0) ? row.measles.toLocaleString() : 'No data available';
    var cov;
    if (isCovid) {
      cov = (row.doses != null && !isNaN(row.doses)) ? row.doses.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'No data available';
    } else {
      cov = (row.vaccine_coverage != null && !isNaN(row.vaccine_coverage)) ? row.vaccine_coverage.toFixed(1) + '%' : 'No data available';
    }
    html += '<tr><td>' + y + '</td><td>' + cases + '</td><td>' + cov + '</td></tr>';
  }
  tbody.innerHTML = html;
}

function drawVaccineSparkline(yearsData, years) {
  const canvas = document.getElementById('vaccine-chart-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.clientWidth - 40;
  const H = 70;
  canvas.width = W;
  canvas.height = H;
  const isCovid = currentDisease === 'covid19';
  const vals = years.map(function (y) {
    const yd = yearsData[y];
    if (!yd) return null;
    if (isCovid) return yd.doses != null && !isNaN(yd.doses) ? yd.doses : null;
    const c = yd.vaccine_coverage;
    return c != null && !isNaN(c) ? c : null;
  });
  const numVals = vals.filter(function (v) { return v != null; });
  const maxV = Math.max.apply(null, numVals.concat([isCovid ? 0 : 95, 1]));
  const minV = numVals.length ? Math.min.apply(null, numVals) : 0;

  ctx.fillStyle = '#faf6ed';
  ctx.fillRect(0, 0, W, H);
  if (!isCovid) {
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
  }

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
    ctx.fillStyle = isCovid ? '#3a6b3a' : coverageColor(vals[curIdx]);
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
