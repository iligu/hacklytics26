/**
 * EpiWatch — Map rendering (circles, GeoJSON, legend)
 * Depends: map, markers, geojsonLayer, animFrames, currentMode, currentDisease,
 *          getYearData, caseColor, fundingColor, coverageColor, computeR0, WORLD_GEOJSON, showCountry
 */
function renderYear(year) {
  const yr = String(year);
  const entries = getYearData(yr);
  const maxCases = Math.max(...entries.map(function (e) { return e.measles || 0; }), 1);
  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const diseaseLabel = cfg.label || 'Cases';
  const antigenLabel = cfg.antigenLabel || '';

  // Refresh country dropdown (if present) with countries that have data this year
  if (window.updateCountrySelect) {
    window.updateCountrySelect(entries);
  }

  const legendTitle = document.getElementById('legend-title');
  const legendBar = document.getElementById('legend-bar');
  const legendLabels = document.getElementById('legend-labels');
  if (legendTitle && legendBar && legendLabels) {
    if (currentMode === 'coverage') {
      legendTitle.textContent = 'Vaccine coverage (' + antigenLabel + ') — red = gap';
      legendBar.className = 'legend-bar legend-coverage';
      legendLabels.innerHTML = '<span>0%</span><span>Low</span><span>95% target</span><span>High</span>';
    } else if (currentMode === 'funding') {
      legendTitle.textContent = 'Gov. health funding per capita';
      legendBar.className = 'legend-bar';
      legendBar.style.background = 'linear-gradient(to right, #8b1c1c, #9a7200, #3a6b3a)';
      legendLabels.innerHTML = '<span>Low $</span><span></span><span>High $</span>';
    } else {
      legendTitle.textContent = diseaseLabel + ' case load';
      legendBar.className = 'legend-bar';
      legendBar.style.background = '';
      legendLabels.innerHTML = '<span>0</span><span>Low</span><span>High</span><span>Severe</span>';
    }
  }

  const totalCases = entries.reduce(function (s, e) { return s + (e.measles || 0); }, 0);
  const affected = entries.filter(function (e) { return e.measles > 0; }).length;
  const sorted = entries.slice().sort(function (a, b) { return (b.measles || 0) - (a.measles || 0); });
  const worst = sorted[0];
  document.getElementById('stat-total').textContent = totalCases.toLocaleString();
  document.getElementById('stat-countries').textContent = affected;
  document.getElementById('stat-worst').textContent = worst ? worst.name.substring(0, 10) : '—';

  for (const key of Object.keys(markers)) { map.removeLayer(markers[key]); }
  markers = {};
  for (const id of Object.values(animFrames)) cancelAnimationFrame(id);
  animFrames = {};

  if (currentMode === 'funding' && WORLD_GEOJSON) {
    renderGeoJson(entries);
    return;
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.lat || !e.lng) continue;
    if (currentMode === 'funding' && !WORLD_GEOJSON) {
      renderFundingCircle(e, maxCases);
    } else if (currentMode === 'coverage') {
      renderCoverageCircle(e, 100);
    } else {
      renderSpreadCircle(e, maxCases);
    }
  }

  if (currentMode === 'both' && WORLD_GEOJSON) renderGeoJson(entries);
}

function renderSpreadCircle(e, maxCases) {
  const cases = e.measles || 0;
  if (cases === 0 && currentMode !== 'both') {
    const dot = L.circleMarker([e.lat, e.lng], {
      radius: 3,
      fillColor: '#c8bfa8',
      fillOpacity: 0.5,
      color: '#b0a490',
      weight: 1,
    }).addTo(map);
    dot.on('click', function () { showCountry(e.cc); });
    markers[e.cc] = dot;
    return;
  }

  const r0 = computeR0(e.pop_density || 1);
  const color = caseColor(cases, maxCases);
  const radius = 4 + (cases / maxCases) * 22;
  const size = radius * 3;
  const animate = cases > 100;
  const icon = L.divIcon({
    className: '',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    html: '<div style="position:relative;width:' + size * 2 + 'px;height:' + size * 2 + 'px;">' +
      (animate ? '<div style="position:absolute;width:' + size * 2 + 'px;height:' + size * 2 + 'px;border-radius:50%;background:' + color + ';top:0;left:0;animation:pulse-ring ' + (2 + (1 - cases / maxCases) * 2) + 's cubic-bezier(0.2,0.8,0.2,1) infinite;transform-origin:center;"></div>' : '') +
      '<div style="position:absolute;width:' + radius * 2 + 'px;height:' + radius * 2 + 'px;border-radius:50%;background:' + color + ';top:' + (size - radius) + 'px;left:' + (size - radius) + 'px;border:1.5px solid rgba(26,18,9,0.2);animation:pulse-dot 2s ease-in-out infinite;cursor:pointer;"></div></div>',
  });
  const marker = L.marker([e.lat, e.lng], { icon: icon, zIndexOffset: Math.floor(cases) }).addTo(map);
  marker.on('click', function () { showCountry(e.cc); });
  marker.bindTooltip(
    '<div style="font-family:\'DM Mono\',monospace;font-size:11px;"><strong style="color:#8b3a2a">' + e.name + '</strong><br>Cases: <strong style="color:#c0392b">' + cases.toLocaleString() + '</strong><br>Gov. Health Funding: $' + (e.gghed_per_capita || 0).toFixed(0) + '/cap<br>Pop. Density: ' + (e.pop_density || 0).toFixed(1) + '/km²<br>Estimated R₀: ' + r0.toFixed(1) + '</div>',
    { direction: 'top', offset: [0, -10] }
  );
  markers[e.cc] = marker;
}

function renderFundingCircle(e, maxCases) {
  const color = fundingColor(e.gghed_per_capita);
  const radius = 5 + (e.underfunded || 0) * 20;
  const circle = L.circleMarker([e.lat, e.lng], {
    radius: radius,
    fillColor: color,
    fillOpacity: 0.7,
    color: 'rgba(255,255,255,0.2)',
    weight: 1,
  }).addTo(map);
  circle.on('click', function () { showCountry(e.cc); });
  circle.bindTooltip('<strong>' + e.name + '</strong><br>Funding: $' + (e.gghed_per_capita || 0).toFixed(0) + '/cap<br>Underfunded Score: ' + (e.underfunded || 0).toFixed(3), { direction: 'top' });
  markers[e.cc] = circle;
}

function renderCoverageCircle(e, maxCoverage) {
  const cfg = DISEASE_CONFIG[currentDisease] || DISEASE_CONFIG.measles;
  const antigenLabel = cfg.antigenLabel || 'MCV2';
  const coverage = e.vaccine_coverage || 0;
  const color = coverageColor(coverage);
  const radius = 5 + (coverage / 100) * 20;
  const circle = L.circleMarker([e.lat, e.lng], {
    radius: radius,
    fillColor: color,
    fillOpacity: 0.7,
    color: 'rgba(255,255,255,0.2)',
    weight: 1,
  }).addTo(map);
  circle.on('click', function () { showCountry(e.cc); });
  circle.bindTooltip('<strong>' + e.name + '</strong><br>Vaccine Coverage (' + antigenLabel + '): ' + (coverage || 0).toFixed(1) + '%<br>Target: ' + (e.target_number || 0).toLocaleString() + '<br>Doses Given: ' + (e.doses || 0).toLocaleString(), { direction: 'top' });
  markers[e.cc] = circle;
}

function renderGeoJson(entries) {
  if (geojsonLayer) { map.removeLayer(geojsonLayer); geojsonLayer = null; }
  if (!WORLD_GEOJSON) return;
  const byCode = {};
  for (let i = 0; i < entries.length; i++) byCode[entries[i].cc] = entries[i];
  geojsonLayer = L.geoJSON(WORLD_GEOJSON, {
    style: function (feature) {
      const cc = feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso3;
      const e = byCode[cc];
      const fill = e ? fundingColor(e.gghed_per_capita) : 'rgba(200,191,168,0.3)';
      return { fillColor: fill, fillOpacity: 0.7, color: '#c8bfa8', weight: 0.8 };
    },
    onEachFeature: function (feature, layer) {
      const cc = feature.properties.iso_a3 || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties.iso3;
      layer.on('click', function () { if (cc) showCountry(cc); });
    },
  }).addTo(map);
}
