/**
 * EpiWatch — Map rendering (circles, GeoJSON, legend)
 * Depends: map, markers, geojsonLayer, animFrames, currentMode, currentDisease,
 *          getYearData, caseColor, fundingColor, coverageColor, computeR0, WORLD_GEOJSON, showCountry
 */
function computeScaleStats(entries) {
  var caseVals = entries.map(function (e) { return e.measles != null ? e.measles : 0; }).filter(function (v) { return v > 0; });
  var covVals = entries.map(function (e) { return e.vaccine_coverage; }).filter(function (v) { return v != null && !isNaN(v); });
  var gapVals = entries.map(function (e) { return e.funding_gap; }).filter(function (v) { return v != null && !isNaN(v) && v >= 0; });
  return {
    cases: caseVals.length ? { median: percentile(caseVals, 50), p75: percentile(caseVals, 75), max: Math.max.apply(null, caseVals) } : null,
    coverage: covVals.length ? { median: percentile(covVals, 50), p75: percentile(covVals, 75) } : null,
    gap: gapVals.length ? { median: percentile(gapVals, 50), p75: percentile(gapVals, 75) } : null
  };
}

function renderYear(year) {
  const yr = String(year);
  const entries = getYearData(yr);
  const usePerCapita = currentDisease === 'covid19';
  const caseVal = function (e) {
    if (usePerCapita && e.cases_per_1M != null && !isNaN(e.cases_per_1M)) return e.cases_per_1M;
    return e.measles != null ? e.measles : 0;
  };
  const maxCases = Math.max(...entries.map(caseVal), 1);
  const stats = computeScaleStats(entries);
  if (usePerCapita) {
    var caseVals = entries.map(function (e) { return caseVal(e); }).filter(function (v) { return v > 0; });
    stats.cases = caseVals.length ? { median: percentile(caseVals, 50), p75: percentile(caseVals, 75), max: Math.max.apply(null, caseVals) } : null;
  }
  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const diseaseLabel = cfg.label || 'Cases';
  const antigenLabel = cfg.antigenLabel || '';

  if (window.updateCountrySelect) {
    window.updateCountrySelect(entries);
  }

  const legendTitle = document.getElementById('legend-title');
  const legendBar = document.getElementById('legend-bar');
  const legendLabels = document.getElementById('legend-labels');
  if (legendTitle && legendBar && legendLabels) {
    if (currentMode === 'coverage') {
      if (currentDisease === 'covid19') {
        legendTitle.textContent = 'COVID-19 vaccine doses (per 1M pop.)';
        legendLabels.innerHTML = '<span>No data</span><span>Low</span><span>Relative scale</span><span>High</span>';
      } else {
        legendTitle.textContent = 'Vaccine coverage (' + antigenLabel + ')';
        legendLabels.innerHTML = '<span>No data</span><span>Low</span><span>95% target</span><span>High</span>';
      }
      legendBar.className = 'legend-bar legend-coverage';
      legendBar.style.background = 'linear-gradient(to right, #b4322d, #d4a84b, #4a7c59)';
    } else if (currentMode === 'funding') {
      legendTitle.textContent = 'Funding gap (burden vs funding)';
      legendBar.className = 'legend-bar legend-gap';
      legendBar.style.background = 'linear-gradient(to right, #3c8c50, #d1e6c3, #c03020)';
      legendLabels.innerHTML = '<span>Overfunded</span><span>Neutral</span><span>Underfunded</span>';
    } else {
      legendTitle.textContent = usePerCapita ? 'Cases per 1M (per capita)' : (cfg.casesLabel != null ? cfg.casesLabel : diseaseLabel + ' case load');
      legendBar.className = 'legend-bar legend-cases';
      legendBar.style.background = 'linear-gradient(to right, #fcfaf5, #e8c040, #b03028)';
      legendLabels.innerHTML = '<span>No data</span><span>Low</span><span>High</span><span>Severe</span>';
    }
  }

  const totalCases = entries.reduce(function (s, e) { return s + (e.measles || 0); }, 0);
  const affected = entries.filter(function (e) { return e.measles != null && e.measles > 0; }).length;
  const sorted = entries.slice().sort(function (a, b) { return (b.measles || 0) - (a.measles || 0); });
  const worst = sorted[0];
  document.getElementById('stat-total').textContent = totalCases > 0 ? totalCases.toLocaleString() : 'No data available';
  document.getElementById('stat-countries').textContent = affected;
  document.getElementById('stat-worst').textContent = worst && worst.measles > 0 ? worst.name.substring(0, 10) : '—';

  for (const key of Object.keys(markers)) { map.removeLayer(markers[key]); }
  markers = {};
  for (const id of Object.values(animFrames)) cancelAnimationFrame(id);
  animFrames = {};
  if (geojsonLayer) { map.removeLayer(geojsonLayer); geojsonLayer = null; }

  if (currentMode === 'funding' && WORLD_GEOJSON) {
    renderGeoJson(entries, stats.gap);
    return;
  }
  if (currentMode === 'coverage' && WORLD_GEOJSON) {
    renderCoverageGeoJson(entries, stats.coverage);
    return;
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.lat || !e.lng) continue;
    if (currentMode === 'funding' && !WORLD_GEOJSON) {
      renderFundingCircle(e, stats.gap);
    } else if (currentMode === 'coverage') {
      renderCoverageCircle(e, stats.coverage);
    } else {
      renderSpreadCircle(e, maxCases, stats.cases, usePerCapita);
    }
  }

  if (currentMode === 'both' && WORLD_GEOJSON) renderGeoJson(entries, stats.gap);
}

function renderSpreadCircle(e, maxCases, caseStats, usePerCapita) {
  const cases = (usePerCapita && e.cases_per_1M != null && !isNaN(e.cases_per_1M)) ? e.cases_per_1M : (e.measles != null ? e.measles : 0);
  if ((cases === 0 || cases == null) && currentMode !== 'both') {
    const dot = L.circleMarker([e.lat, e.lng], {
      radius: 3,
      fillColor: NO_DATA_FILL,
      fillOpacity: 0.6,
      color: '#b0a490',
      weight: 1,
    }).addTo(map);
    dot.on('click', function () { showCountry(e.cc); });
    markers[e.cc] = dot;
    return;
  }

  const r0 = computeR0(e.pop_density || 1);
  const color = caseColor(cases, maxCases, caseStats);
  const radius = 5 + (cases / maxCases) * 16;
  const size = Math.max(radius * 2, 14);
  const icon = L.divIcon({
    className: 'map-marker-spread',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: '<div class="spread-marker-wrap" style="position:relative;width:' + size + 'px;height:' + size + 'px;"><div class="spread-bubble" style="border-color:' + color + ';background:' + color + '"></div><div class="spread-bubble spread-bubble-2" style="border-color:' + color + ';background:' + color + '"></div><div class="spread-bubble spread-bubble-3" style="border-color:' + color + ';background:' + color + '"></div><div class="spread-dot" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';border:1px solid rgba(40,35,25,0.15);cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.08);"></div></div>',
  });
  const marker = L.marker([e.lat, e.lng], { icon: icon, zIndexOffset: Math.floor(cases) }).addTo(map);
  marker.on('click', function () { showCountry(e.cc); });
  var casesLabel = (cases != null && cases > 0) ? cases.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'No data available';
  var casesRowLabel = usePerCapita ? 'Cases per 1M' : (currentDisease === 'covid19' ? 'Total cases' : 'Cases');
  var fundLabel = (e.gghed_per_capita != null && e.gghed_per_capita > 0) ? '$' + e.gghed_per_capita.toFixed(0) + '/cap' : 'No data available';
  var popLabel = (e.pop_density != null) ? e.pop_density.toFixed(1) + '/km²' : 'No data available';
  marker.bindTooltip(
    '<div style="font-family:\'DM Mono\',monospace;font-size:11px;"><strong style="color:#000">' + e.name + '</strong><br>' + casesRowLabel + ': <strong>' + casesLabel + '</strong><br>Gov. Health Funding: ' + fundLabel + '<br>Pop. Density: ' + popLabel + '<br>Adj. R₀ (indicative): ' + r0.toFixed(1) + '</div>',
    { direction: 'top', offset: [0, -8] }
  );
  markers[e.cc] = marker;
}

function renderFundingCircle(e, gapStats) {
  const gap = e.funding_gap != null ? e.funding_gap : 0;
  const color = gapColor(gap, gapStats);
  const radius = 5 + Math.min(gap * 18, 12);
  const fundLabel = (e.gghed_per_capita != null && e.gghed_per_capita > 0) ? '$' + e.gghed_per_capita.toFixed(0) + '/cap' : 'No data available';
  const casesLabel = (e.measles != null && e.measles > 0) ? e.measles.toLocaleString() : 'No data available';
  const circle = L.circleMarker([e.lat, e.lng], {
    radius: radius,
    fillColor: color,
    fillOpacity: 0.78,
    color: 'rgba(255,255,255,0.35)',
    weight: 1,
  }).addTo(map);
  circle.on('click', function () { showCountry(e.cc); });
  circle.bindTooltip('<strong style="color:#000">' + e.name + '</strong><br>Funding gap (burden vs funding): ' + (gap * 100).toFixed(0) + '%<br>Cases: ' + casesLabel + '<br>Funding: ' + fundLabel, { direction: 'top' });
  markers[e.cc] = circle;
}

function renderCoverageCircle(e, coverageStats) {
  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const antigenLabel = cfg.antigenLabel || 'MCV2';
  const coverage = e.vaccine_coverage != null ? e.vaccine_coverage : 0;
  const color = coverageColor(coverage, coverageStats);
  const radius = 5 + (coverage / 100) * 14;
  const circle = L.circleMarker([e.lat, e.lng], {
    radius: radius,
    fillColor: color,
    fillOpacity: 0.78,
    color: 'rgba(255,255,255,0.35)',
    weight: 1,
  }).addTo(map);
  circle.on('click', function () { showCountry(e.cc); });
  var covLabel = (e.vaccine_coverage != null && !isNaN(e.vaccine_coverage)) ? e.vaccine_coverage.toFixed(1) + '%' : 'No data available';
  var dosesLabel = (e.doses != null && e.doses > 0) ? e.doses.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'No data available';
  if (currentDisease === 'covid19') {
    circle.bindTooltip('<strong style="color:#000">' + e.name + '</strong><br>Doses (per 1M pop., ÷2 for 2 doses/person): ' + dosesLabel + '<br>Source: COVID-19 vaccine data', { direction: 'top' });
  } else {
    var targetLabel = (e.target_number != null && e.target_number > 0) ? e.target_number.toLocaleString() : 'No data available';
    circle.bindTooltip('<strong style="color:#000">' + e.name + '</strong><br>Vaccine Coverage (' + antigenLabel + '): ' + covLabel + '<br>Target: ' + targetLabel + '<br>Doses Given: ' + (e.doses != null && e.doses > 0 ? (e.doses / 1e6).toFixed(2) + 'M' : 'No data available'), { direction: 'top' });
  }
  markers[e.cc] = circle;
}

function renderGeoJson(entries, gapStats) {
  if (!WORLD_GEOJSON) return;
  const byCode = {};
  for (let i = 0; i < entries.length; i++) byCode[entries[i].cc] = entries[i];
  geojsonLayer = L.geoJSON(WORLD_GEOJSON, {
    style: function (feature) {
      const cc = feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso3;
      const e = byCode[cc];
      const fill = e && e.funding_gap != null ? gapColor(e.funding_gap, gapStats) : NO_DATA_FILL;
      return { fillColor: fill, fillOpacity: 0.72, color: '#b8b0a0', weight: 0.8 };
    },
    onEachFeature: function (feature, layer) {
      const cc = feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso3;
      layer.on('click', function () { if (cc) showCountry(cc); });
    },
  }).addTo(map);
}

function renderCoverageGeoJson(entries, coverageStats) {
  if (!WORLD_GEOJSON) return;
  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const antigenLabel = cfg.antigenLabel || 'MCV2';
  const byCode = {};
  for (let i = 0; i < entries.length; i++) byCode[entries[i].cc] = entries[i];
  geojsonLayer = L.geoJSON(WORLD_GEOJSON, {
    style: function (feature) {
      const cc = feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso3;
      const e = byCode[cc];
      const cov = e && e.vaccine_coverage != null ? e.vaccine_coverage : null;
      const fill = cov != null ? coverageColor(cov, coverageStats) : NO_DATA_FILL;
      return { fillColor: fill, fillOpacity: 0.72, color: '#b8b0a0', weight: 0.8 };
    },
    onEachFeature: function (feature, layer) {
      const cc = feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso3;
      const e = byCode[cc];
      const cov = e && e.vaccine_coverage != null ? e.vaccine_coverage : null;
      const covLabel = cov != null ? cov.toFixed(1) + '%' : 'No data available';
      const dosesLabel = e && e.doses != null && e.doses > 0 ? e.doses.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'No data available';
      const targetLabel = e && e.target_number != null && e.target_number > 0 ? e.target_number.toLocaleString() : 'No data available';
      const name = (e && e.name) || cc || 'Unknown';
      layer.on('click', function () { if (cc) showCountry(cc); });
      if (currentDisease === 'covid19') {
        layer.bindTooltip('<strong style="color:#000">' + name + '</strong><br>Doses (per 1M pop., ÷2 for 2 doses/person): ' + dosesLabel + '<br>Source: COVID-19 vaccine data', { direction: 'top' });
      } else {
        layer.bindTooltip('<strong style="color:#000">' + name + '</strong><br>Vaccine Coverage (' + antigenLabel + '): ' + covLabel + '<br>Target: ' + targetLabel + '<br>Doses Given: ' + dosesLabel, { direction: 'top' });
      }
    },
  }).addTo(map);
}
