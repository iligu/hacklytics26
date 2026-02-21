# EpiWatch — Data sources and methodology

This document describes where the data comes from and how key numbers (including R₀ and SIR estimates) are computed, so you can verify accuracy and understand limitations.

---

## 1. Data sources

| Data | Source | Notes |
|------|--------|--------|
| **Measles cases, population density, health spending** | `data/combined_ghed_measles_popdensity.csv` (and embedded in `js/epidemic-data.js`) | Combines WHO/other epidemiological and spending data; cases = reported measles cases; `gghed_per_capita` = government health expenditure per capita (USD). |
| **Vaccine coverage (MCV2), doses, target numbers** | WHO/UNICEF-style data: `Measles vaccination coverage 2026-17-02 11-10 UTC.csv` (and/or `.json`) | Same structure as WHO/UNICEF Estimates of National Immunization Coverage (WUENIC). ADMIN = administrative coverage. |
| **Country boundaries / map** | `js/world-geo.js` | GeoJSON for choropleth (Funding gap mode). |

**Accuracy:** Case counts and vaccine coverage are from official/administrative sources. Gaps or “No data available” mean the value is missing or not reported, not that it is zero.

---

## 2. R₀ (basic reproduction number)

**What R₀ is:** The average number of secondary cases one infectious person causes in a fully susceptible population.

**Measles in the literature:**  
Published estimates for measles R₀ are typically **12–18** (e.g. Anderson & May; Lancet Infectious Diseases systematic review). The dashboard uses a **reference value of 15** for measles, which lies in this range.

**How the dashboard uses R₀:**

- **Reference R₀ (used for SIR model):** Fixed at **15** for measles (from `DISEASE_CONFIG.measles.R0`). This is used to compute β, γ, and the theoretical “peak fraction” in the SIR box. So the **SIR estimates are based on standard epidemiology**, not on local data.
- **Adjusted R₀ (indicative only):** The formula  
  `Adj. R₀ = 15 × (1 + ln(pop_density) / 20)`  
  is a **simple, indicative** way to scale R₀ by population density (higher density → higher contact potential). It is **not** from a published model. It is used only for **map circle scaling** and is shown in the panel as “Adj. R₀ (indicative)” so users know it is not the standard R₀.

**Bottom line:** The **R₀ value used for all SIR formulas (β, γ, peak fraction) is the reference value 15**. The density-adjusted value is clearly labeled as indicative.

---

## 3. SIR model parameters (country panel)

The “SIR Model Estimates” box uses the **standard SIR model** with the **reference R₀** (15 for measles).

- **γ (recovery rate) = 1/14 ≈ 0.0714**  
  Corresponds to an **infectious period of 14 days**, consistent with the usual **~7–14 day** infectious period for measles (CDC Pink Book, WHO).

- **β (transmission rate)**  
  In the simple SIR model, R₀ = β/γ, so  
  **β = R₀ × γ = 15 × (1/14) ≈ 1.0714**  
  (rounded in the app). This is the transmission rate that gives R₀ = 15 with a 14-day infectious period.

- **Est. peak fraction**  
  In a fully susceptible population, the **peak fraction infected** in the SIR model is  
  **1 − 1/R₀ − ln(R₀)/R₀**  
  (Hethcote, “The Mathematics of Infectious Diseases”). For R₀ = 15 this is about **79%**. This is a **theoretical** peak (no vaccination, no immunity); real epidemics are lower due to vaccination and prior immunity.

- **Peak year / Peak cases**  
  These come from the **data** (per-country peak of reported cases over time) when available. If missing, the panel shows “No data available”.

---

## 4. Colour scales and disclaimers

- **Case load (spread):** White → yellow → red. Scales are pegged to the **median** and **75th percentile** of reported cases for the selected year so that colours are stable and comparable.
- **Vaccine coverage:** Red (low) → yellow → green (high). 95% is the WHO target (green).
- **Funding gap:** Blue (overfunded / low gap) → white (neutral) → red (underfunded / high gap). Pegged to median and 75th percentile of the gap metric for the year.
- **Data cautions** are shown in the dashboard: reported cases may understate true incidence; funding gap is indicative; see Data & methodology for full sources.

---

## 5. Funding gap (map and panel)

**Definition:** For each country-year,  
`funding_gap = (measles_burden_normalized) × (1 − funding_level_normalized)`  
so that **high burden + low funding → high gap**.  
Used only to **highlight mismatch** between burden and funding, not to replace official finance or burden metrics.

---

## 6. Summary: what is standard vs indicative

| Item | Status | Notes |
|------|--------|--------|
| R₀ = 15 (measles) | **Standard** | Within published range 12–18. |
| γ = 1/14 (14-day infectious period) | **Standard** | Matches measles epidemiology. |
| β = R₀ × γ | **Standard** | Correct SIR relation. |
| Peak fraction = 1 − 1/R₀ − ln(R₀)/R₀ | **Standard** | Classical SIR formula. |
| Adj. R₀ (density-adjusted) | **Indicative** | Simple scaling for visualization only; not from a published model. |
| Peak year / Peak cases | **From data** | When present; otherwise “No data available”. |
| Case counts, coverage, spending | **From data** | As provided by sources; missing shown as “No data available”. |

---

## 7. References (for verification)

- Anderson RM, May RM. *Infectious Diseases of Humans*. Oxford University Press. (R₀ and herd immunity.)
- Hethcote HW. The Mathematics of Infectious Diseases. *SIAM Review* 2000. (SIR peak fraction formula.)
- CDC. Epidemiology and Prevention of Vaccine-Preventable Diseases (Pink Book) – Measles. (Infectious period.)
- WHO. Measles fact sheet. (Infectious period, R₀ range.)
- Guerra FM et al. The basic reproduction number (R₀) of measles: a systematic review. *Lancet Infect Dis* 2017. (R₀ 12–18 for measles.)
- WHO/UNICEF Estimates of National Immunization Coverage (WUENIC). (Vaccine coverage data.)

If you want to double-check the math, use R₀ = 15 and γ = 1/14; then β = 15/14 and the peak fraction formula above should give about 79%.
