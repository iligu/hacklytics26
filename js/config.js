/**
 * EpiWatch — Disease configuration
 *
 * To add a new disease:
 * 1. Add an entry below with: label, R0, vaccineJsonUrl (and/or vaccineCsvUrl),
 *    antigen, coverageCategory, antigenLabel (e.g. 'MCV2' for measles).
 * 2. Add a tab in index.html: <div class="disease-tab" data-disease="yourKey">Your Label</div>
 */
const DISEASE_CONFIG = {
  measles: {
    label: 'Measles',
    R0: 15,
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'MCV2',
  },
  // Example for adding more:
  // polio: {
  //   label: 'Polio',
  //   R0: 6,
  //   vaccineJsonUrl: 'polio-coverage.json',
  //   vaccineCsvUrl: 'polio-coverage.csv',
  //   antigen: 'POL3',
  //   coverageCategory: 'ADMIN',
  //   antigenLabel: 'POL3',
  // },
};

/** R0 baseline per disease (derived from DISEASE_CONFIG) */
const R0_BASE = Object.fromEntries(
  Object.entries(DISEASE_CONFIG).map(function (entry) { return [entry[0], entry[1].R0]; })
);

/** Year range for the slider */
const YEAR_MIN = 2000;
const YEAR_MAX = 2024;
