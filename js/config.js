/**
 * Pathologic — Disease configuration
 *
 * R0: Reference basic reproduction number from literature (measles typically 12–18; we use 15).
 *     Used for SIR model (β, γ, peak fraction). See DATA_AND_METHODOLOGY.md.
 *
 * To add a new disease:
 * 1. Add an entry below with: label, R0, vaccineJsonUrl (and/or vaccineCsvUrl),
 *    antigen, coverageCategory, antigenLabel (e.g. 'MCV2' for measles).
 * 2. Add a tab in index.html: <div class="disease-tab" data-disease="yourKey">Your Label</div>
 */
const DISEASE_CONFIG = {
  measles: {
    label: 'Measles',
    R0: 15,  // literature range 12–18; used for SIR formulas
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'MCV2',
  },
  ebola: {
    label: 'Ebola',
    R0: 2,  // filler; literature ~1.5–2.5
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',  // filler: reuse measles vaccine data
    coverageCategory: 'ADMIN',
    antigenLabel: 'Ervebo',
  },
  cholera: {
    label: 'Cholera',
    R0: 2,
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'OCV',
  },
  covid19: {
    label: 'COVID-19',
    R0: 2.5,
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'COVID-19',
    casesLabel: 'Total cases',
  },
  mpox: {
    label: 'MPox',
    R0: 1,
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'JYNNEOS',
  },
  chickenpox: {
    label: 'Chickenpox',
    R0: 11,  // varicella typically 10–12
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'Varicella',
  },
  malaria: {
    label: 'Malaria',
    R0: 1.5,
    vaccineJsonUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.json',
    vaccineCsvUrl: 'Measles%20vaccination%20coverage%202026-17-02%2011-10%20UTC.csv',
    antigen: 'MCV2',
    coverageCategory: 'ADMIN',
    antigenLabel: 'RTS,S',
  },
};

/** R0 baseline per disease (derived from DISEASE_CONFIG) */
const R0_BASE = Object.fromEntries(
  Object.entries(DISEASE_CONFIG).map(function (entry) { return [entry[0], entry[1].R0]; })
);

/** Year range for the slider */
const YEAR_MIN = 2000;
const YEAR_MAX = 2028;

/** COVID-19: data from 2020 onwards */
const COVID19_YEAR_MIN = 2020;
const COVID19_YEAR_MAX = 2023;
