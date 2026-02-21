/**
 * EpiWatch — Controls and bootstrap
 * Depends: all other modules; runs after DOM and scripts are ready.
 */
(function () {
  const yearSlider = document.getElementById('year-slider');
  const yearDisplay = document.getElementById('year-display');
  const countrySelect = document.getElementById('country-select');

  // Exposed so map-render can repopulate when year changes
  window.updateCountrySelect = function (entries) {
    if (!countrySelect) return;
    const seen = {};
    const items = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.cc || !e.name) continue;
      if (seen[e.cc]) continue;
      seen[e.cc] = true;
      items.push({ code: e.cc, name: e.name });
    }
    items.sort(function (a, b) { return a.name.localeCompare(b.name); });
    const selected = selectedCountry || '';
    let html = '<option value=\"\">All countries (click map)</option>';
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const sel = it.code === selected ? ' selected' : '';
      html += '<option value=\"' + it.code + '\"' + sel + '>' + it.name + '</option>';
    }
    countrySelect.innerHTML = html;
  };

  if (countrySelect) {
    countrySelect.addEventListener('change', function () {
      const cc = countrySelect.value;
      if (!cc) return;
      selectedCountry = cc;
      showCountry(cc);
      if (markers[cc] && markers[cc].getLatLng) {
        map.panTo(markers[cc].getLatLng());
      }
    });
  }

  if (typeof YEAR_MIN !== 'undefined' && typeof YEAR_MAX !== 'undefined') {
    yearSlider.min = YEAR_MIN;
    yearSlider.max = YEAR_MAX;
  }

  yearSlider.addEventListener('input', function () {
    currentYear = yearSlider.value;
    yearDisplay.textContent = currentYear;
    renderYear(currentYear);
    if (selectedCountry) showCountry(selectedCountry);
  });

  document.getElementById('btn-prev').addEventListener('click', function () {
    const y = Math.max(YEAR_MIN || 2000, parseInt(currentYear, 10) - 1);
    currentYear = String(y);
    yearSlider.value = y;
    yearDisplay.textContent = currentYear;
    renderYear(currentYear);
    if (selectedCountry) showCountry(selectedCountry);
  });

  document.getElementById('btn-next').addEventListener('click', function () {
    const y = Math.min(YEAR_MAX || 2024, parseInt(currentYear, 10) + 1);
    currentYear = String(y);
    yearSlider.value = y;
    yearDisplay.textContent = currentYear;
    renderYear(currentYear);
    if (selectedCountry) showCountry(selectedCountry);
  });

  document.getElementById('btn-play').addEventListener('click', function () {
    if (playing) {
      playing = false;
      clearInterval(playInterval);
      document.getElementById('btn-play').textContent = '\u25B6 Play';
      document.getElementById('btn-play').className = 'btn primary';
    } else {
      playing = true;
      document.getElementById('btn-play').textContent = '\u23F8 Pause';
      document.getElementById('btn-play').className = 'btn';
      playInterval = setInterval(function () {
        let y = parseInt(currentYear, 10) + 1;
        if (y > (YEAR_MAX || 2024)) y = YEAR_MIN || 2000;
        currentYear = String(y);
        yearSlider.value = y;
        yearDisplay.textContent = currentYear;
        renderYear(currentYear);
        if (selectedCountry) showCountry(selectedCountry);
      }, 800);
    }
  });

  document.querySelectorAll('.disease-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.dataset.disease === 'coming') return;
      document.querySelectorAll('.disease-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentDisease = tab.dataset.disease;
      renderYear(currentYear);
    });
  });

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      if (geojsonLayer) { map.removeLayer(geojsonLayer); geojsonLayer = null; }
      renderYear(currentYear);
    });
  });

  loadVaccineData()
    .then(function () { renderYear(currentYear); })
    .catch(function () { renderYear(currentYear); });
})();
