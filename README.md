# Pathologic — Global Disease Surveillance

Geospatial dashboard for epidemic data, funding gaps, and vaccine coverage. Built for hackathon use; modular so you can add more diseases easily.

## How to run the dashboard (Python server for JSON/CSV)

The app loads vaccine data from JSON (or CSV) files via `fetch()`. Browsers block local file requests when you open the HTML with `file://`, so you need to serve the project over HTTP.

**1. Open a terminal** and go to the project folder:
```bash
cd /path/to/hacklytics26
```
(Use your actual path, e.g. `cd ~/hacklytics26`.)

**2. Start the Python HTTP server:**
```bash
python3 -m http.server 8000
```
You should see something like: `Serving HTTP on 0.0.0.0 port 8000 ...`

**3. Open the dashboard in your browser:**
- Go to: **http://localhost:8000/index.html**
- Or: **http://localhost:8000/** (if the server shows `index.html` by default).

**4. Leave the terminal running** while you use the dashboard. To stop the server, press `Ctrl+C` in the terminal.

Vaccine JSON/CSV files in the project folder (e.g. `Measles vaccination coverage 2026-17-02 11-10 UTC.json`) will load correctly when the page is served this way.

## Chat with Data Expert (optional)

The **Chat with Data Expert** widget in the dashboard calls a separate API. To use it:

**1. In a second terminal**, from the project folder, start the chat API:
```bash
cd /path/to/hacklytics26
python3 api.py
```
You should see: `* Running on http://127.0.0.1:5001` (and a note if RAG is enabled).

**2. (Optional) For RAG answers** from your docs, set a Gemini API key and build the index once:
- Create a `.env` file in the project root with: `GEMINI_API_KEY=your_key`
- Run once to build the index: `python3 rag_chatbot.py` (then exit); this creates `index_storage/`
- Then run `python3 api.py` as above.

**3. Keep the API running** while you use the chat. If you see “Error connecting to server”, the API is not running or not reachable on port 5001.

## Project structure

| Path | Purpose |
|------|--------|
| `index.html` | Entry point; minimal HTML and script order |
| `css/main.css` | All styles (parchment theme, sidebar, map, panels) |
| `js/config.js` | **Disease configuration** — single place to add diseases |
| `js/app-state.js` | Global state (year, disease, mode) and Leaflet map init |
| `js/epidemic-data.js` | `EPIDEMIC_DATA` (case counts, funding, etc. by country/year) |
| `js/world-geo.js` | `WORLD_GEOJSON` (country shapes for choropleth) |
| `js/data-loader.js` | Vaccine JSON/CSV loading and merge into `EPIDEMIC_DATA` |
| `js/map-utils.js` | Colors, `getYearData()`, R0/spread helpers |
| `js/map-render.js` | `renderYear()`, circle/GeoJSON rendering, legend |
| `js/panel.js` | Country detail panel and sparklines |
| `js/app.js` | Event handlers (year, play, disease tabs, map mode), bootstrap |

## Adding a new disease

1. **Add config** in `js/config.js`:
   ```javascript
   // In DISEASE_CONFIG, add e.g.:
   polio: {
     label: 'Polio',
     R0: 6,
     vaccineJsonUrl: 'polio-coverage.json',   // or vaccineCsvUrl
     vaccineCsvUrl: 'polio-coverage.csv',
     antigen: 'POL3',
     coverageCategory: 'ADMIN',
     antigenLabel: 'POL3',
   },
   ```
   `R0_BASE` is derived from `DISEASE_CONFIG`, so no separate step.

2. **Add a tab** in `index.html` (inside `.disease-tabs`):
   ```html
   <div class="disease-tab" data-disease="polio">Polio</div>
   ```
   Remove or replace the “+ More Soon” placeholder if you like.

3. **Vaccine data**: Use the same JSON shape (array of `{ GROUP, CODE, NAME, YEAR, ANTIGEN, COVERAGE_CATEGORY, TARGET_NUMBER, DOSES, COVERAGE }`) or CSV with columns `GROUP,CODE,NAME,YEAR,ANTIGEN,...,TARGET_NUMBER,DOSES,COVERAGE`. Put the file in the project root (or set `vaccineJsonUrl` / `vaccineCsvUrl` to the path). The loader filters by `antigen` and `coverageCategory` from config.

4. **Epidemic/case data**: To show case counts for the new disease, extend `EPIDEMIC_DATA` in `js/epidemic-data.js` (or add a separate data file and merge at load time) so each country’s `years` include the new disease’s cases. The current code assumes a `measles` field per year; for multiple diseases you could use a `cases` field keyed by disease or add a small adapter in `getYearData` / config.

## Data files

- **Vaccine coverage**: `Measles vaccination coverage 2026-17-02 11-10 UTC.json` (or `.csv`) in project root. Other diseases: add their JSON/CSV and set `vaccineJsonUrl` / `vaccineCsvUrl` in `DISEASE_CONFIG`.
- **Epidemic data**: `js/epidemic-data.js` defines `EPIDEMIC_DATA`.
- **World map**: `js/world-geo.js` defines `WORLD_GEOJSON` for the funding choropleth and vaccine-only country centroids.

## Map modes

- **Spread Circles**: Case-based circles (and R0-style radius).
- **Funding Gap**: Choropleth or circles by funding per capita.
- **Vaccine Coverage**: Circles colored by coverage % (red = gap, green = on target); 95% target line in the panel.

Legend and country panel labels (e.g. “Measles case load”, “Vaccine Coverage (MCV2)”) use `DISEASE_CONFIG[currentDisease]` so they stay correct when you add diseases.
