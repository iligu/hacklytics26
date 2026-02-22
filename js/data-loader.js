/**
 * Pathologic — Vaccine coverage data loader (JSON/CSV)
 * Merges into EPIDEMIC_DATA and adds vaccine-only countries using WORLD_GEOJSON centroids.
 * Depends: EPIDEMIC_DATA, WORLD_GEOJSON, DISEASE_CONFIG
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (!inQuotes && c === ',') { result.push(current.trim()); current = ''; continue; }
    current += c;
  }
  result.push(current.trim());
  return result;
}

/**
 * Forward-fill null vaccine_coverage: if a year has null, use the most recent
 * non-null value from an earlier year (e.g. 2022=95, 2023=null → 2023 becomes 95).
 */
function fillNullCoverageWithPrevious(vaccineByCodeYear) {
  for (const code of Object.keys(vaccineByCodeYear)) {
    const yearData = vaccineByCodeYear[code];
    const years = Object.keys(yearData).sort(function (a, b) { return Number(a) - Number(b); });
    let lastKnown = null;
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      const yd = yearData[y];
      if (yd.vaccine_coverage != null && !isNaN(yd.vaccine_coverage)) {
        lastKnown = yd.vaccine_coverage;
      } else if (lastKnown != null) {
        yd.vaccine_coverage = lastKnown;
      }
    }
  }
}

/**
 * Backward-fill null vaccine_coverage: if a year has null and no earlier non-null,
 * use the next (future) year's non-null value (e.g. 2020=null, 2021=null, 2022=95 → 2020 and 2021 become 95).
 * Run after forward-fill so any null reverts to the latest available non-null in either direction.
 */
function fillNullCoverageWithNext(vaccineByCodeYear) {
  for (const code of Object.keys(vaccineByCodeYear)) {
    const yearData = vaccineByCodeYear[code];
    const years = Object.keys(yearData).sort(function (a, b) { return Number(b) - Number(a); });
    let nextKnown = null;
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      const yd = yearData[y];
      if (yd.vaccine_coverage != null && !isNaN(yd.vaccine_coverage)) {
        nextKnown = yd.vaccine_coverage;
      } else if (nextKnown != null) {
        yd.vaccine_coverage = nextKnown;
      }
    }
  }
}

/**
 * Enforce non-decreasing coverage over time: coverage should not decrease as year increases.
 * For each country, set each year's coverage = max(own value, previous year's value).
 */
function enforceNonDecreasingCoverage(vaccineByCodeYear) {
  for (const code of Object.keys(vaccineByCodeYear)) {
    const yearData = vaccineByCodeYear[code];
    const years = Object.keys(yearData).sort(function (a, b) { return Number(a) - Number(b); });
    let prev = null;
    for (let i = 0; i < years.length; i++) {
      const yd = yearData[years[i]];
      if (yd.vaccine_coverage != null && !isNaN(yd.vaccine_coverage)) {
        if (prev != null && yd.vaccine_coverage < prev) yd.vaccine_coverage = prev;
        prev = yd.vaccine_coverage;
      } else if (prev != null) {
        yd.vaccine_coverage = prev;
      }
    }
  }
}

function mergeVaccineIntoEpidemicData(vaccineByCodeYear) {
  for (const code of Object.keys(vaccineByCodeYear)) {
    const v = EPIDEMIC_DATA[code];
    if (!v || !v.years) continue;
    const yearData = vaccineByCodeYear[code];
    for (const year of Object.keys(yearData)) {
      const yd = yearData[year];
      if (!v.years[year]) {
        const years = Object.keys(v.years).sort();
        const lastYear = years[years.length - 1];
        v.years[year] = lastYear ? { ...v.years[lastYear], measles: 0 } : { measles: 0 };
      }
      if (yd.vaccine_coverage != null) v.years[year].vaccine_coverage = yd.vaccine_coverage;
      if (yd.target_number != null) v.years[year].target_number = yd.target_number;
      if (yd.doses != null) v.years[year].doses = yd.doses;
    }
  }
}

function getCountryCentroids() {
  if (!WORLD_GEOJSON || !WORLD_GEOJSON.features) return {};
  const out = {};
  for (let i = 0; i < WORLD_GEOJSON.features.length; i++) {
    const f = WORLD_GEOJSON.features[i];
    const cc = f.properties.iso_a3 || f.properties.ISO_A3 || f.properties.ADM0_A3 || f.properties.iso3;
    if (!cc) continue;
    const c = centroidOfGeometry(f.geometry);
    if (c) out[cc] = c;
  }
  return out;
}

function centroidOfGeometry(geom) {
  if (!geom || !geom.coordinates) return null;
  if (geom.type === 'MultiPolygon') {
    let sumLng = 0, sumLat = 0, n = 0;
    for (let p = 0; p < geom.coordinates.length; p++) {
      const ring = geom.coordinates[p][0];
      for (let j = 0; j < ring.length; j++) {
        sumLng += ring[j][0];
        sumLat += ring[j][1];
        n++;
      }
    }
    return n ? [sumLat / n, sumLng / n] : null;
  }
  if (geom.type === 'Polygon' && geom.coordinates[0]) {
    const ring = geom.coordinates[0];
    let sumLng = 0, sumLat = 0;
    for (let k = 0; k < ring.length; k++) {
      sumLng += ring[k][0];
      sumLat += ring[k][1];
    }
    return [sumLat / ring.length, sumLng / ring.length];
  }
  return null;
}

function addVaccineOnlyCountries(vaccineByCodeYear, vaccineCountryNames, countryCentroids) {
  for (const code of Object.keys(vaccineByCodeYear)) {
    if (EPIDEMIC_DATA[code]) continue;
    const coords = countryCentroids[code];
    if (!coords) continue;
    const name = vaccineCountryNames[code] || code;
    const yearData = vaccineByCodeYear[code];
    const years = {};
    for (const year of Object.keys(yearData)) {
      const yd = yearData[year];
      years[year] = {
        measles: 0,
        pop_density: 1,
        gghed_per_capita: 0,
        vaccine_coverage: yd.vaccine_coverage != null ? yd.vaccine_coverage : undefined,
        target_number: yd.target_number != null ? yd.target_number : undefined,
        doses: yd.doses != null ? yd.doses : undefined,
      };
    }
    EPIDEMIC_DATA[code] = {
      name: name,
      region: '',
      income: '',
      lat: coords[0],
      lng: coords[1],
      years: years,
    };
  }
}

function parseAndMergeVaccineJSON(arr, config) {
  config = config || DISEASE_CONFIG.measles;
  const antigen = config.antigen || 'MCV2';
  const acceptedCategories = ['ADMIN', 'WUENIC', 'OFFICIAL'];
  if (!Array.isArray(arr) || arr.length === 0) return;
  const vaccineByCodeYear = {};
  const vaccineCountryNames = {};
  // Single pass: for each (code, year) use the highest coverage across ADMIN, WUENIC, OFFICIAL
  for (let i = 0; i < arr.length; i++) {
    const row = arr[i];
    if (row.GROUP !== 'COUNTRIES' || row.ANTIGEN !== antigen || acceptedCategories.indexOf(row.COVERAGE_CATEGORY) === -1) continue;
    const code = row.CODE;
    if (!vaccineCountryNames[code] && row.NAME) vaccineCountryNames[code] = row.NAME;
    const year = String(row.YEAR);
    if (year === '2024') continue;
    const coverage = row.COVERAGE != null && !isNaN(row.COVERAGE) ? Number(row.COVERAGE) : null;
    const targetNumber = row.TARGET_NUMBER != null && !isNaN(row.TARGET_NUMBER) ? Number(row.TARGET_NUMBER) : null;
    const doses = row.DOSES != null && !isNaN(row.DOSES) ? Number(row.DOSES) : null;
    if (!vaccineByCodeYear[code]) vaccineByCodeYear[code] = {};
    if (!vaccineByCodeYear[code][year]) {
      vaccineByCodeYear[code][year] = { vaccine_coverage: coverage, target_number: targetNumber, doses: doses };
    } else {
      const yd = vaccineByCodeYear[code][year];
      if (coverage != null && (yd.vaccine_coverage == null || coverage > yd.vaccine_coverage)) {
        yd.vaccine_coverage = coverage;
        if (targetNumber != null) yd.target_number = targetNumber;
        if (doses != null) yd.doses = doses;
      } else if (yd.vaccine_coverage == null && coverage != null) {
        yd.vaccine_coverage = coverage;
        if (targetNumber != null) yd.target_number = targetNumber;
        if (doses != null) yd.doses = doses;
      }
    }
  }
  fillNullCoverageWithPrevious(vaccineByCodeYear);
  fillNullCoverageWithNext(vaccineByCodeYear);
  enforceNonDecreasingCoverage(vaccineByCodeYear);
  mergeVaccineIntoEpidemicData(vaccineByCodeYear);
  addVaccineOnlyCountries(vaccineByCodeYear, vaccineCountryNames, getCountryCentroids());
}

function parseAndMergeVaccineCSV(text, config) {
  config = config || DISEASE_CONFIG.measles;
  const antigen = config.antigen || 'MCV2';
  const coverageCategory = config.coverageCategory || 'ADMIN';
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return;
  const vaccineByCodeYear = {};
  const vaccineCountryNames = {};
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 11) continue;
    if (row[0] !== 'COUNTRIES' || row[4] !== antigen || row[6] !== coverageCategory) continue;
    const code = row[1];
    if (!vaccineCountryNames[code] && row[2]) vaccineCountryNames[code] = row[2];
    const year = String(row[3]);
    if (year === '2024') continue;
    const targetNumber = row[8] ? parseInt(row[8], 10) : null;
    const doses = row[9] ? parseInt(row[9], 10) : null;
    let coverage = null;
    if (row[10]) {
      const c = parseFloat(String(row[10]).replace(/[^\d.-]/g, ''));
      if (!isNaN(c)) coverage = c;
    }
    if (!vaccineByCodeYear[code]) vaccineByCodeYear[code] = {};
    vaccineByCodeYear[code][year] = { vaccine_coverage: coverage, target_number: targetNumber, doses: doses };
  }
  fillNullCoverageWithPrevious(vaccineByCodeYear);
  fillNullCoverageWithNext(vaccineByCodeYear);
  enforceNonDecreasingCoverage(vaccineByCodeYear);
  mergeVaccineIntoEpidemicData(vaccineByCodeYear);
  addVaccineOnlyCountries(vaccineByCodeYear, vaccineCountryNames, getCountryCentroids());
}

function loadVaccineData(diseaseKey) {
  diseaseKey = diseaseKey || currentDisease;
  const config = DISEASE_CONFIG[diseaseKey] || DISEASE_CONFIG.measles;
  if (!config.vaccineJsonUrl && !config.vaccineCsvUrl) return Promise.resolve();
  const jsonUrl = config.vaccineJsonUrl != null ? config.vaccineJsonUrl : 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json';
  const csvUrl = config.vaccineCsvUrl != null ? config.vaccineCsvUrl : 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv';
  return fetch(jsonUrl)
    .then(function (r) { return r.json(); })
    .then(function (arr) { parseAndMergeVaccineJSON(arr, config); })
    .catch(function () {
      return fetch(csvUrl)
        .then(function (r) { return r.text(); })
        .then(function (text) { parseAndMergeVaccineCSV(text, config); })
        .catch(function (e) { console.warn('Vaccine data not loaded (serve folder over HTTP):', e); });
    });
}

/** Build name -> ISO3 code from EPIDEMIC_DATA for matching forecast CSV country names. */
function getCountryNameToCode() {
  const nameToCode = {};
  for (const code of Object.keys(EPIDEMIC_DATA)) {
    const name = EPIDEMIC_DATA[code].name;
    if (name) nameToCode[name] = code;
  }
  return nameToCode;
}

/**
 * Parse measles_5yr_forecast.csv and merge 2024–2028 forecast cases into EPIDEMIC_DATA.
 * CSV columns: country, region, income, r0, r_eff, 2024, 2025, 2026, 2027, 2028, total_forecast.
 */
function parseAndMergeMeaslesForecastCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return;
  const nameToCode = getCountryNameToCode();
  const forecastYears = ['2024', '2025', '2026', '2027', '2028'];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 10) continue;
    const countryName = (row[0] || '').trim();
    const code = nameToCode[countryName];
    if (!code) continue;
    const v = EPIDEMIC_DATA[code];
    if (!v || !v.years) continue;
    const years = Object.keys(v.years).sort(function (a, b) { return Number(a) - Number(b); });
    let lastYear = years.length ? years[years.length - 1] : null;
    for (let j = 0; j < forecastYears.length; j++) {
      const yr = forecastYears[j];
      const colIdx = 5 + j;
      let val = parseFloat(String(row[colIdx] || '0').replace(/[^\d.-]/g, ''));
      if (isNaN(val)) val = 0;
      if (!v.years[yr]) {
        v.years[yr] = lastYear ? { ...v.years[lastYear], measles: 0 } : { measles: 0 };
      }
      v.years[yr].measles = Math.round(val);
      lastYear = yr;
    }
  }
}

function loadMeaslesForecast() {
  return fetch('data/measles_5yr_forecast.csv')
    .then(function (r) { return r.text(); })
    .then(function (text) { parseAndMergeMeaslesForecastCSV(text); })
    .catch(function (e) { console.warn('Measles 5-year forecast not loaded:', e); });
}

/** COVID-19: cases and vaccine doses by country/year. Uses same funding (EPIDEMIC_DATA) for gap. */
var COVID19_CASES = {};       // cc -> { year -> casesPer1M (converted to total when population available) }
var COVID19_CASES_RAW = {};   // cc -> { year -> casesPer1M } (always per 1M, for conversion)
var COVID19_VACCINE = {};     // cc -> { year -> { dosesPer1M, vaccine_coverage } }
var COVID19_NAMES = {};       // cc -> entity name
var COVID19_POPULATION = {};  // cc -> population (2020 or single year) for per-1M → total conversion

function parseCovid19CasesCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 4) continue;
    const name = (row[0] || '').trim();
    const code = (row[1] || '').trim();
    const year = String((row[2] || '').trim());
    if (!code || year === '2024') continue;
    let val = parseFloat(String(row[3] || '0').replace(/[^\d.-]/g, ''));
    if (isNaN(val)) val = 0;
    if (!COVID19_CASES_RAW[code]) COVID19_CASES_RAW[code] = {};
    COVID19_CASES_RAW[code][year] = val;
    if (name && !COVID19_NAMES[code]) COVID19_NAMES[code] = name;
  }
  applyCovid19PopulationConversion();
}

/** Convert cases per 1M to total cases using COVID19_POPULATION when available. */
function applyCovid19PopulationConversion() {
  COVID19_CASES = {};
  for (const code of Object.keys(COVID19_CASES_RAW)) {
    COVID19_CASES[code] = {};
    const pop = COVID19_POPULATION[code] != null ? Number(COVID19_POPULATION[code]) : null;
    for (const year of Object.keys(COVID19_CASES_RAW[code])) {
      const per1M = COVID19_CASES_RAW[code][year];
      if (pop != null && pop > 0) {
        COVID19_CASES[code][year] = (per1M / 1e6) * pop;
      } else {
        COVID19_CASES[code][year] = per1M;
      }
    }
  }
}

function parseCovid19VaccineCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 4) continue;
    const code = (row[1] || '').trim();
    const year = String((row[2] || '').trim());
    if (!code || year === '2024') continue;
    const name = (row[0] || '').trim();
    let dosesPer1M = parseFloat(String(row[3] || '0').replace(/[^\d.-]/g, ''));
    if (isNaN(dosesPer1M)) dosesPer1M = 0;
    if (!COVID19_VACCINE[code]) COVID19_VACCINE[code] = {};
    COVID19_VACCINE[code][year] = { dosesPer1M: dosesPer1M / 2 };
    if (name && !COVID19_NAMES[code]) COVID19_NAMES[code] = name;
  }
  enforceNonDecreasingCovid19Vaccine();
}

/** Vaccine should not logically decrease (like measles coverage). Enforce running max by year. */
function enforceNonDecreasingCovid19Vaccine() {
  for (const code of Object.keys(COVID19_VACCINE)) {
    const byYear = COVID19_VACCINE[code];
    const years = Object.keys(byYear).sort(function (a, b) { return Number(a) - Number(b); });
    let prev = 0;
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      const v = byYear[y].dosesPer1M != null ? byYear[y].dosesPer1M : 0;
      const next = Math.max(v, prev);
      byYear[y].dosesPer1M = next;
      prev = next;
    }
  }
}

function loadCovid19Data() {
  const config = DISEASE_CONFIG.covid19;
  if (!config || !config.casesCsvUrl || !config.vaccineCsvUrl) return Promise.resolve();
  const loadPopulation = config.populationJsonUrl
    ? fetch(config.populationJsonUrl).then(function (r) { return r.json(); }).then(function (obj) { COVID19_POPULATION = obj || {}; }).catch(function () { COVID19_POPULATION = {}; })
    : Promise.resolve();
  return loadPopulation.then(function () {
    return Promise.all([
      fetch(config.casesCsvUrl).then(function (r) { return r.text(); }),
      fetch(config.vaccineCsvUrl).then(function (r) { return r.text(); })
    ]);
  }).then(function (texts) {
    parseCovid19CasesCSV(texts[0]);
    parseCovid19VaccineCSV(texts[1]);
  }).catch(function (e) { console.warn('COVID-19 data not loaded:', e); });
}

/** Build year entries for COVID-19: cases + vaccine from CSV, funding/geo from EPIDEMIC_DATA or centroids. */
function getCovid19YearData(yr) {
  const allCc = new Set();
  Object.keys(COVID19_CASES).forEach(function (cc) { if (COVID19_CASES[cc][yr] != null) allCc.add(cc); });
  Object.keys(COVID19_VACCINE).forEach(function (cc) { if (COVID19_VACCINE[cc][yr]) allCc.add(cc); });
  var maxDosesPer1M = 0;
  allCc.forEach(function (cc) {
    const vac = COVID19_VACCINE[cc] && COVID19_VACCINE[cc][yr];
    if (vac && vac.dosesPer1M != null && vac.dosesPer1M > maxDosesPer1M) maxDosesPer1M = vac.dosesPer1M;
  });
  const centroids = getCountryCentroids();
  const entries = [];
  allCc.forEach(function (cc) {
    const v = EPIDEMIC_DATA[cc];
    const casesVal = COVID19_CASES[cc] && COVID19_CASES[cc][yr] != null ? COVID19_CASES[cc][yr] : 0;
    const casesPer1M = COVID19_CASES_RAW[cc] && COVID19_CASES_RAW[cc][yr] != null ? COVID19_CASES_RAW[cc][yr] : null;
    const vac = COVID19_VACCINE[cc] && COVID19_VACCINE[cc][yr] ? COVID19_VACCINE[cc][yr] : null;
    const yd = v && v.years && v.years[yr] ? v.years[yr] : {};
    const coords = (v && v.lat != null && v.lng != null) ? { lat: v.lat, lng: v.lng } : (centroids[cc] ? { lat: centroids[cc][0], lng: centroids[cc][1] } : null);
    if (!coords) return;
    const dosesPer1M = vac ? vac.dosesPer1M : null;
    const vaccineCoverageForMap = (maxDosesPer1M > 0 && dosesPer1M != null) ? (dosesPer1M / maxDosesPer1M) * 100 : null;
    entries.push({
      cc: cc,
      name: (v && v.name) || COVID19_NAMES[cc] || cc,
      region: v && v.region,
      income: v && v.income,
      lat: coords.lat,
      lng: coords.lng,
      measles: casesVal,
      cases_per_1M: casesPer1M,
      vaccine_coverage: vaccineCoverageForMap,
      doses: dosesPer1M,
      target_number: null,
      gghed_per_capita: yd.gghed_per_capita != null ? yd.gghed_per_capita : (v && v.avg_gghed),
      pop_density: yd.pop_density != null ? yd.pop_density : null,
      underfunded: v && v.underfunded_score,
      avg_gghed: v && v.avg_gghed,
      peak_measles: null,
      peak_year: null,
    });
  });
  var maxCases = 0;
  var maxFunding = 0;
  for (var i = 0; i < entries.length; i++) {
    var c = entries[i].measles;
    var f = entries[i].gghed_per_capita;
    if (c != null && c > maxCases) maxCases = c;
    if (f != null && f > maxFunding) maxFunding = f;
  }
  maxCases = Math.max(maxCases, 1);
  maxFunding = Math.max(maxFunding, 1);
  for (i = 0; i < entries.length; i++) {
    var need = (entries[i].measles != null ? entries[i].measles : 0) / maxCases;
    var fundLevel = (entries[i].gghed_per_capita != null ? entries[i].gghed_per_capita : 0) / maxFunding;
    entries[i].funding_gap = need * (1 - Math.min(fundLevel, 1));
  }
  return entries;
}
if (typeof window !== 'undefined') { window.getCovid19YearData = getCovid19YearData; }

/** Return a v-like object for the country panel when currentDisease is COVID-19. */
function getCovid19CountryForPanel(cc) {
  const casesByYear = COVID19_CASES[cc];
  const vaccineByYear = COVID19_VACCINE[cc];
  if (!casesByYear && !vaccineByYear) return null;
  const v = EPIDEMIC_DATA[cc] || {};
  const allYears = new Set();
  if (casesByYear) Object.keys(casesByYear).forEach(function (y) { allYears.add(y); });
  if (vaccineByYear) Object.keys(vaccineByYear).forEach(function (y) { allYears.add(y); });
  const years = {};
  let peak_measles = null;
  let peak_year = null;
  allYears.forEach(function (y) {
    const yd = v.years && v.years[y] ? { ...v.years[y] } : {};
    if (casesByYear && casesByYear[y] != null) yd.measles = casesByYear[y];
    if (vaccineByYear && vaccineByYear[y]) {
      yd.doses = vaccineByYear[y].dosesPer1M;
      yd.vaccine_coverage = null;
    }
    years[y] = yd;
    if (yd.measles != null && (peak_measles == null || yd.measles > peak_measles)) {
      peak_measles = yd.measles;
      peak_year = y;
    }
  });
  return {
    name: v.name || COVID19_NAMES[cc] || cc,
    region: v.region,
    income: v.income,
    years: years,
    peak_measles: peak_measles,
    peak_year: peak_year,
  };
}
if (typeof window !== 'undefined') { window.getCovid19CountryForPanel = getCovid19CountryForPanel; }
