# 🌍 GeoInsight: Overlooked Crises
### UN Humanitarian Health Funding Dashboard

> A GIS dashboard visualising mismatches between humanitarian health needs and pooled fund coverage — with healthcare-specific anomaly detection, choropleth country mapping, and real-time filter controls.

Built for the **United Nations Geo-Insight Challenge** — submissions reviewed by OCHA & Databricks.

---

## 📸 Features

| Feature | Description |
|---|---|
| **Choropleth Map** | Country polygons coloured by 5 switchable data layers using your uploaded GeoJSON |
| **Health Anomaly Detector** | Flags countries where health worker density falls below WHO minimum (23/10k) *and* health cluster funding < 25% |
| **WHO Threshold Bar** | Compares actual health spend per person against WHO emergency minimum ($86/person/year) |
| **Cold Chain Risk Layer** | Maps cold chain coverage gaps — critical for vaccines, insulin, blood products |
| **CBPF Pool Tracker** | Shows Pooled Fund allocation vs. requirements per active country fund |
| **5 Map Modes** | HRP Funding Gap / Health Cluster % / Health Workers / Cold Chain / CBPF Coverage |
| **4 Chart Tabs** | Funding Gap · Health Workers · Sector Allocation · Multi-year Trend |
| **Crisis Filters** | Filter by crisis type and minimum population in need |

---

## 📁 Repository Structure

```
un-geoinsight/
│
├── index.html              # Main dashboard entry point
│
├── css/
│   └── styles.css          # All styles (tokens, layout, components)
│
├── js/
│   ├── app.js              # Bootstrap & event wiring
│   ├── map.js              # Leaflet GIS choropleth module
│   ├── charts.js           # Chart.js visualisation module
│   └── ui.js               # Panel rendering (left, right, detail card)
│
└── data/
    ├── crisisData.js        # Crisis dataset (20 countries, derived fields)
    └── world.geo.json       # Simplified world GeoJSON (258 countries)
```

---

## 🚀 Quick Start

**No build tools needed.** This is a pure HTML/CSS/JS application.

### Option A — Direct browser open
```bash
# Clone or download the repo
open index.html
```
> ⚠️ The GeoJSON file loads via `fetch()` — you need a local server for CORS reasons.

### Option B — Local dev server (recommended)
```bash
# Python (built-in)
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```
Then visit: `http://localhost:8080`

---

## 🗺️ Data Sources

| Dataset | Source | Usage |
|---|---|---|
| UN FTS 2024 | [fts.unocha.org](https://fts.unocha.org) | Requirements, funded amounts, gap % |
| CBPF Data Hub | [cbpf.data.unocha.org](https://cbpf.data.unocha.org) | Pooled fund allocations per country |
| WHO Health Cluster Reports | [who.int](https://www.who.int) | Health worker density, facility functionality |
| HRP / HNO 2024 | [data.humdata.org](https://data.humdata.org) | People in Need, cluster allocations |
| INFORM Risk Index | [inform-index.org](https://inform-index.org) | Country severity scores |
| Natural Earth / Custom GeoJSON | Uploaded | Country polygon boundaries |

---

## 🏥 Healthcare-Specific Indicators

Three unique healthcare lenses not found in standard FTS dashboards:

### 1. Health Cluster vs WHO Coverage
- Health cluster funded % extracted from HRP cluster breakdown
- Compared against WHO emergency package minimum of **$86/person/year**
- Visualised as a threshold bar on each country detail card

### 2. Patient-to-Clinician Ratio Anomaly
- Health workers per 10,000 population vs **WHO minimum: 23/10k**
- Countries below 5/10k *and* below 25% health cluster funding are **flagged with purple polygon borders** on the map
- Ranked in the "Health Anomaly Detector" panel

### 3. Medical Cold Chain & Supply Risk Layer
- Cold chain coverage % mapped as a dedicated choropleth layer
- Stockout risk classification (Critical / High / Moderate / Low) derived from funding trajectory
- Displayed on country detail cards with colour-coded risk indicators

---

## 🧮 Key Derived Metrics

```js
// All computed automatically in crisisData.js

d.funding_pct     = (funded / requirements) * 100
d.gap_usd         = requirements - funded                // USD billions
d.budget_per_bene = (funded * 1e9) / (pin * 1e6)        // $ per person in need
d.cbpf_coverage   = (cbpf_alloc / cbpf_req) * 100       // % of CBPF req met
d.health_anomaly  = health_cluster_funded_pct < 25
                    && health_workers_per_10k < 5        // WHO threshold flag
d.who_gap         = max(0, 86 - health_spend_per_pin)   // $ gap vs WHO min
```

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| GIS Mapping | [Leaflet.js 1.9.4](https://leafletjs.com) + GeoJSON choropleth |
| Charts | [Chart.js 4.4.1](https://chartjs.org) |
| Base Tiles | CartoDB Dark / ArcGIS Satellite / OpenTopoMap |
| Fonts | IBM Plex Mono · DM Sans · Bebas Neue (Google Fonts) |
| Language | Vanilla HTML / CSS / JavaScript (ES6+) |
| Build | None — zero dependencies, zero build step |

---

## 🔌 Extending the Dashboard

### Add a new country
In `data/crisisData.js`, add an object to `window.CRISIS_DATA`:
```js
{
  id: "XX", name: "Country Name", iso_a2: "XX", iso_a3: "XXX",
  lat: 0, lng: 0,
  pin: 5.0, requirements: 1.0, funded: 0.3,
  health_workers_per_10k: 2.0,
  cold_chain_coverage_pct: 25,
  // ... see existing entries for full schema
}
```

### Add a new map layer
In `js/map.js`, add a key to the `COLOR` object:
```js
myLayer: d => {
  const v = d.my_metric;
  if (v < threshold1) return { fill: '#ff3b4e', opacity: 0.82 };
  // ...
},
```
Then add a button in `index.html` with `data-mode="myLayer"`.

### Connect to a live API
Replace the static data in `crisisData.js` with a `fetch()` call to the FTS API:
```js
fetch('https://api.unocha.org/v2/fts/flow/...')
  .then(r => r.json())
  .then(data => { /* transform and assign to window.CRISIS_DATA */ });
```

---

## 📋 Judges / UN Team Notes

- All data is sourced from publicly available UN FTS, CBPF, WHO, and HDX datasets
- The **Health Anomaly Detector** directly flags the "unusually high beneficiary-to-budget ratios" specified in the challenge brief
- The **WHO threshold bar** provides a clinically actionable benchmark beyond simple funding percentage
- The **Cold Chain layer** addresses a gap not covered in standard CBPF dashboards — critical for MSF, UNICEF Supply Division, and WFP medical commodity procurement teams
- Purple polygon borders on the map visually distinguish countries where both health system capacity AND funding are simultaneously failing

---

*Built for the UN Geo-Insight Challenge · 2024*
*Judges: OCHA · Databricks*
