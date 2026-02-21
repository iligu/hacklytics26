/**
 * EpiWatch — Vaccine coverage data loader (JSON/CSV)
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
