/**
 * EpiWatch — Map color scales and year data
 * Depends: EPIDEMIC_DATA, R0_BASE, currentDisease (app-state.js)
 */
function caseColor(cases, maxCases) {
  if (!cases || cases === 0) return 'rgba(180,165,140,0.4)';
  const t = Math.pow(cases / maxCases, 0.4);
  if (t < 0.2) return 'rgba(184,134,11,' + (0.4 + t * 2) + ')';
  if (t < 0.4) return 'rgba(192,80,20,' + (0.6 + t) + ')';
  if (t < 0.7) return 'rgba(160,40,10,' + (0.7 + t * 0.4) + ')';
  return 'rgba(100,10,10,0.95)';
}

function fundingColor(gghedPerCapita) {
  if (!gghedPerCapita) return 'rgba(139,28,28,0.7)';
  const t = Math.min(gghedPerCapita / 500, 1);
  const r = Math.round(139 * (1 - t) + 60 * t);
  const g = Math.round(28 * (1 - t) + 100 * t);
  const b = Math.round(28 * (1 - t) + 58 * t);
  return 'rgba(' + r + ',' + g + ',' + b + ',0.75)';
}

function coverageColor(coveragePercentage) {
  if (coveragePercentage === null || coveragePercentage === undefined) return 'rgba(180,165,140,0.5)';
  const t = Math.min(Math.max(coveragePercentage, 0), 100) / 100;
  const r = Math.round(200 * (1 - t) + 60 * t);
  const g = Math.round(30 * (1 - t) + 140 * t);
  const b = Math.round(30 * (1 - t) + 60 * t);
  return 'rgba(' + r + ',' + g + ',' + b + ',0.75)';
}

function getYearData(year) {
  const yr = String(year);
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
  return entries;
}

function computeR0(popDensity) {
  const base = R0_BASE[currentDisease] || 5;
  return base * (1 + Math.log(Math.max(popDensity, 1)) / 20);
}

function spreadRadius(cases, popDensity, maxCases) {
  if (!cases || cases === 0) return 0;
  const normCases = cases / maxCases;
  const r0 = computeR0(popDensity);
  const baseR = 60000 + normCases * 800000;
  const r0Factor = r0 / (R0_BASE[currentDisease] || 5);
  return baseR * r0Factor;
}
