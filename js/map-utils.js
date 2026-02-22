/**
 * Pathologic — Map color scales and year data
 * Depends: EPIDEMIC_DATA, R0_BASE, currentDisease (app-state.js)
 * Scales pegged to median/percentiles for professional, stable interpretation.
 */
var NO_DATA_FILL = 'rgba(228,224,218,0.55)';

function percentile(arr, p) {
  if (!arr.length) return 0;
  var sorted = arr.slice().sort(function (a, b) { return a - b; });
  var idx = (p / 100) * (sorted.length - 1);
  var lo = Math.floor(idx);
  var hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

/** Spread: white (low) → yellow → red (high). t pegged to median/p75 when stats provided. */
function caseColor(cases, maxCases, stats) {
  if (cases == null || cases === 0) return NO_DATA_FILL;
  if (maxCases <= 0) return NO_DATA_FILL;
  var t;
  if (stats && stats.median != null && stats.p75 != null && stats.median > 0) {
    if (cases <= stats.median) t = 0.5 * (cases / stats.median);
    else t = 0.5 + 0.5 * Math.min((cases - stats.median) / (stats.p75 - stats.median + 1e-9), 1);
    t = Math.min(t, 1);
  } else {
    t = Math.min(Math.pow(cases / maxCases, 0.45), 1);
  }
  return scaleWhiteYellowRed(t);
}

/** Funding gap: blue (overfunded/low gap) → white (neutral) → red (underfunded). */
function gapColor(gapNorm, stats) {
  if (gapNorm == null || isNaN(gapNorm)) return NO_DATA_FILL;
  var t;
  if (stats && stats.median != null && stats.p75 != null) {
    if (gapNorm <= stats.median) t = 0.5 * (stats.median > 0 ? gapNorm / stats.median : 0);
    else t = 0.5 + 0.5 * Math.min((gapNorm - stats.median) / (stats.p75 - stats.median + 1e-9), 1);
    t = Math.min(t, 1);
  } else {
    t = Math.min(gapNorm, 1);
  }
  return scaleGreenWhiteRed(t);
}

function fundingColor(gghedPerCapita) {
  if (gghedPerCapita == null || gghedPerCapita === 0) return NO_DATA_FILL;
  var t = Math.min(gghedPerCapita / 500, 1);
  return scaleBlueWhiteRed(1 - t);
}

/** Vaccine: red (low) → yellow → green (high). 95% = target green. */
function coverageColor(coveragePercentage, stats) {
  if (coveragePercentage === null || coveragePercentage === undefined) return NO_DATA_FILL;
  var t = Math.min(Math.max(coveragePercentage, 0), 100) / 100;
  return scaleRedYellowGreen(t);
}

/** t in [0,1]: 0 = white, 0.5 = yellow, 1 = red (spread / case load) */
function scaleWhiteYellowRed(t) {
  t = Math.max(0, Math.min(1, t));
  if (t <= 0) return 'rgba(252,250,245,0.88)';
  if (t < 0.4) {
    var s = t / 0.4;
    return 'rgba(' + Math.round(252 - s * 20) + ',' + Math.round(250 - s * 55) + ',' + Math.round(245 - s * 145) + ',0.9)';
  }
  if (t < 0.75) {
    var s2 = (t - 0.4) / 0.35;
    return 'rgba(' + Math.round(232 + s2 * 30) + ',' + Math.round(195 - s2 * 85) + ',' + Math.round(100 - s2 * 75) + ',0.92)';
  }
  var s3 = (t - 0.75) / 0.25;
  return 'rgba(' + Math.round(262 - s3 * 125) + ',' + Math.round(110 - s3 * 85) + ',' + Math.round(25 - s3 * 8) + ',0.94)';
}

/** t in [0,1]: 0 = red, 0.5 = yellow, 1 = green (vaccine coverage) */
function scaleRedYellowGreen(t) {
  t = Math.max(0, Math.min(1, t));
  if (t <= 0) return 'rgba(180,50,45,0.82)';
  if (t < 0.5) {
    var s = t / 0.5;
    return 'rgba(' + Math.round(180 + s * 75) + ',' + Math.round(50 + s * 160) + ',' + Math.round(45 + s * 30) + ',0.88)';
  }
  var s2 = (t - 0.5) / 0.5;
  return 'rgba(' + Math.round(255 - s2 * 155) + ',' + Math.round(210 - s2 * 50) + ',' + Math.round(75 + s2 * 95) + ',0.9)';
}

/** t in [0,1]: 0 = blue (overfunded), 0.5 = white, 1 = red (underfunded) */
function scaleBlueWhiteRed(t) {
  t = Math.max(0, Math.min(1, t));
  if (t <= 0) return 'rgba(65,105,165,0.78)';
  if (t < 0.5) {
    var s = t / 0.5;
    return 'rgba(' + Math.round(65 + s * 195) + ',' + Math.round(105 + s * 148) + ',' + Math.round(165 + s * 85) + ',0.88)';
  }
  var s2 = (t - 0.5) / 0.5;
  return 'rgba(' + Math.round(260 - s2 * 95) + ',' + Math.round(253 - s2 * 223) + ',' + Math.round(250 - s2 * 230) + ',0.9)';
}

/** t in [0,1]: 0 = green (overfunded/low gap), 0.5 = #d1e6c3, 1 = red (underfunded) */
function scaleGreenWhiteRed(t) {
  t = Math.max(0, Math.min(1, t));
  if (t <= 0) return 'rgba(60,140,80,0.82)';
  if (t < 0.5) {
    var s = t / 0.5;
    return 'rgba(' + Math.round(60 + s * 149) + ',' + Math.round(140 + s * 90) + ',' + Math.round(80 + s * 115) + ',0.88)';
  }
  var s2 = (t - 0.5) / 0.5;
  return 'rgba(' + Math.round(209 - s2 * 9) + ',' + Math.round(230 - s2 * 200) + ',' + Math.round(195 - s2 * 175) + ',0.9)';
}

function getYearData(year) {
  const yr = String(year);
  if (currentDisease === 'covid19' && typeof window.getCovid19YearData === 'function') {
    return window.getCovid19YearData(yr);
  }
  const entries = [];
  for (const key of Object.keys(EPIDEMIC_DATA)) {
    const v = EPIDEMIC_DATA[key];
    const yd = v.years[yr];
    if (yd) {
      entries.push({
        cc: key,
        name: v.name,
        region: v.region,
        income: v.income,
        lat: v.lat,
        lng: v.lng,
        ...yd,
        underfunded: v.underfunded_score,
        avg_gghed: v.avg_gghed,
        peak_measles: v.peak_measles,
        peak_year: v.peak_year,
      });
    }
  }
  // Funding–measles gap: mismatch between burden and funding (high cases + low funding = high gap)
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

/** Reference R₀ from literature (no density adjustment). Use this for SIR formulas (β, γ, peak fraction). */
function getReferenceR0() {
  return R0_BASE[currentDisease] || 5;
}

/**
 * Density-adjusted R₀ (indicative only): used for map circle scaling.
 * Formula is ad hoc, not from published model. Do not use for SIR parameter derivation.
 */
function computeR0(popDensity) {
  const base = R0_BASE[currentDisease] || 5;
  return base * (1 + Math.log(Math.max(popDensity, 1)) / 20);
}

function spreadRadius(cases, popDensity, maxCases) {
  if (!cases || cases === 0) return 0;
  const normCases = cases / maxCases;
  const r0 = computeR0(popDensity);
  const baseR = 60000 + normCases * 800000;
  const r0Factor = r0 / getReferenceR0();
  return baseR * r0Factor;
}
