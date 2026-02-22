/**
 * Pathologic — Global state and map instance
 * Must load after config.js; other modules depend on these globals.
 */
let currentYear = '2010';
let currentDisease = 'measles';
let currentMode = 'spread';
let playing = false;
let playInterval = null;
let selectedCountry = null;
let markers = {};
let geojsonLayer = null;
let animFrames = {};

const map = L.map('map', {
  center: [20, 10],
  zoom: 2.3,
  minZoom: 2,
  maxZoom: 8,
  zoomControl: false,
  attributionControl: false,
});

L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Esri, HERE, DeLorme', maxZoom: 16 }
).addTo(map);

L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  { attribution: '', maxZoom: 16, pane: 'shadowPane' }
).addTo(map);

L.control.zoom({ position: 'bottomright' }).addTo(map);
