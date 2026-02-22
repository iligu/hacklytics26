"""
Crisis Fatigue Detector — Actian VectorAI DB
=============================================
Uses real GHED + measles + population density data.

Each country gets a 7-dimensional vector:
  1. donor_withdrawal      — are international donors pulling out?
  2. population_burden     — are ordinary people paying more out of pocket?
  3. disease_severity      — how bad is the disease right now?
  4. disease_worsening     — is the disease getting worse over time?
  5. government_retreat    — is the government also cutting health spending?
  6. aid_delivery_difficulty — how hard is it to reach people? (population density)
  7. years_neglected       — how many years had high disease + low funding simultaneously?

Countries with similar vectors = on the same path to being forgotten.
"""

import pandas as pd
import numpy as np
from cortex import CortexClient, DistanceMetric
from flask import Flask, jsonify
from flask_cors import CORS

# ── Load real data ────────────────────────────────────────────
df = pd.read_csv("data/combined_ghed_measles_popdensity.csv")

TARGET_INCOME = ["Low", "Lower-middle"]
df = df[df["income"].isin(TARGET_INCOME)].copy()
df = df.fillna(0)

# ── Build per-country summary ─────────────────────────────────
def compute_country_vector(group):
    group = group.sort_values("year")

    mid    = len(group) // 2
    early  = group.iloc[:mid]
    recent = group.iloc[mid:]

    # ── DONOR WITHDRAWAL ─────────────────────────────────────
    # How much has international donor funding dropped?
    # 0 = donors stayed,  1 = donors completely pulled out
    donor_funding_early  = early["external_per_capita_usd"].mean()
    donor_funding_recent = recent["external_per_capita_usd"].mean()
    donor_withdrawal     = (donor_funding_early - donor_funding_recent) / (donor_funding_early + 1)
    donor_withdrawal     = max(0, min(donor_withdrawal, 1.0))

    # ── POPULATION BURDEN ────────────────────────────────────
    # Are ordinary people paying more out of their own pocket?
    # 0 = burden stable,  1 = people paying significantly more themselves
    out_of_pocket_early  = early["oop_per_capita_usd"].mean()
    out_of_pocket_recent = recent["oop_per_capita_usd"].mean()
    population_burden    = (out_of_pocket_recent - out_of_pocket_early) / (out_of_pocket_early + 1)
    population_burden    = max(0, min(population_burden, 1.0))

    # ── DISEASE SEVERITY ─────────────────────────────────────
    # How bad is the disease burden right now?
    # 0 = low,  1 = 50,000+ cases (maximum)
    measles_cases_recent = recent["measles_cases_reported"].mean()
    disease_severity     = min(measles_cases_recent / 50000, 1.0)

    # ── DISEASE WORSENING ────────────────────────────────────
    # Is the disease getting worse compared to earlier years?
    # 0 = stable or improving,  1 = cases have more than doubled
    measles_cases_early = early["measles_cases_reported"].mean()
    disease_worsening   = (measles_cases_recent - measles_cases_early) / (measles_cases_early + 1)
    disease_worsening   = max(0, min(disease_worsening, 1.0))

    # ── GOVERNMENT RETREAT ───────────────────────────────────
    # Is the government also cutting its own health spending?
    # 0 = government maintained spending,  1 = government also pulled back
    gov_spending_early  = early["gghed_per_capita_usd"].mean()
    gov_spending_recent = recent["gghed_per_capita_usd"].mean()
    government_retreat  = (gov_spending_early - gov_spending_recent) / (gov_spending_early + 1)
    government_retreat  = max(0, min(government_retreat, 1.0))

    # ── GOVERNMENT SPEND LEVEL (for fatigue score) ───────────
    gov_spend_level = min(gov_spending_recent / 200, 1.0)

    # ── AID DELIVERY DIFFICULTY ──────────────────────────────
    # How hard is it to physically reach people?
    # Based on population density — very dense = harder logistics
    aid_delivery_difficulty = min(group["pop_density"].mean() / 500, 1.0)

    # ── EXTERNAL DEPENDENCY ──────────────────────────────────
    total_health_spend_recent = recent["che_per_capita_usd"].mean()
    external_dependency       = donor_funding_recent / (total_health_spend_recent + 1)
    external_dependency       = min(external_dependency, 1.0)

    # ── YEARS NEGLECTED ──────────────────────────────────────
    # How many years had BOTH high disease burden AND low funding at the same time?
    # This is the most direct measure of sustained neglect
    years_neglected    = 0
    low_funding_cutoff = donor_funding_recent * 1.2
    for _, row in group.iterrows():
        disease_was_high  = row["measles_cases_reported"] > 1000
        funding_was_low   = row["external_per_capita_usd"] < (low_funding_cutoff + 1)
        if disease_was_high and funding_was_low:
            years_neglected += 1

    years_neglected_score = min(years_neglected / 10, 1.0)  # cap at 10 years → 1.0

    # ── FATIGUE SCORE ─────────────────────────────────────────
    # Overall 0–1 score of how "forgotten" this crisis is
    fatigue_score = round(
        0.25 * donor_withdrawal       +
        0.15 * population_burden      +
        0.10 * disease_severity       +
        0.10 * disease_worsening      +
        0.10 * government_retreat     +
        0.05 * (1 - gov_spend_level)  +
        0.25 * years_neglected_score,
        4
    )

    return {
        # ── Vector dimensions (what goes into VectorDB) ──────
        "donor_withdrawal":        round(float(donor_withdrawal), 4),
        "population_burden":       round(float(population_burden), 4),
        "disease_severity":        round(float(disease_severity), 4),
        "disease_worsening":       round(float(disease_worsening), 4),
        "government_retreat":      round(float(government_retreat), 4),
        "aid_delivery_difficulty": round(float(aid_delivery_difficulty), 4),
        "years_neglected_score":   round(float(years_neglected_score), 4),

        # ── Human-readable values (returned by API) ──────────
        "years_neglected":         int(years_neglected),
        "fatigue_score":           fatigue_score,
        "external_dependency":     round(float(external_dependency), 4),
        "gov_spend_level":         round(float(gov_spend_level), 4),
        "donor_usd_per_capita":    round(float(donor_funding_recent), 2),
        "out_of_pocket_usd":       round(float(out_of_pocket_recent), 2),
        "total_health_spend_usd":  round(float(total_health_spend_recent), 2),
        "gov_health_spend_usd":    round(float(gov_spending_recent), 2),
        "disease_cases_recent":    round(float(measles_cases_recent), 0),
        "disease_cases_early":     round(float(measles_cases_early), 0),
        "years_data":              len(group),
        "latest_year":             int(group["year"].max()),
    }


# ── Process all countries ─────────────────────────────────────
print("📊 Processing real data...")
summaries = []

for (country, code, region, income), group in df.groupby(
        ["country_name", "country_code", "region", "income"]):
    if len(group) < 4:
        continue
    stats = compute_country_vector(group)
    summaries.append({
        "iso":    code,
        "name":   country,
        "region": region,
        "income": income,
        **stats
    })

summaries = sorted(summaries, key=lambda x: x["fatigue_score"], reverse=True)
print(f"✅ Processed {len(summaries)} countries")

for s in summaries:
    if s["income"] in ("High", "Upper-middle"):
        s["risk"] = "STABLE"  # rich countries not flagged as crises
        continue
    if   s["fatigue_score"] > 0.5:  s["risk"] = "CRITICAL"
    elif s["fatigue_score"] > 0.35: s["risk"] = "HIGH"
    elif s["fatigue_score"] > 0.2:  s["risk"] = "MODERATE"
    else:                            s["risk"] = "STABLE"

print("\n🔥 Top 10 Most Forgotten Crises:")
for s in summaries[:10]:
    print(f"  {s['name']:30s}  fatigue={s['fatigue_score']:.3f}  "
          f"years_neglected={s['years_neglected']:2d}yrs  "
          f"disease_worsening={s['disease_worsening']:.2f}  "
          f"donor_withdrawal={s['donor_withdrawal']:.2f}")


# ── Insert into Actian VectorAI ───────────────────────────────
VECTOR_KEYS = [
    "donor_withdrawal",
    "population_burden",
    "disease_severity",
    "disease_worsening",
    "government_retreat",
    "aid_delivery_difficulty",
    "years_neglected_score",
]

def to_vector(s):
    return [s[k] for k in VECTOR_KEYS]

with CortexClient("localhost:50052") as client:
    client.recreate_collection(
        "crisis_fatigue",
        dimension=7,
        distance_metric=DistanceMetric.COSINE
    )

    client.batch_upsert(
        "crisis_fatigue",
        ids=list(range(len(summaries))),
        vectors=[to_vector(s) for s in summaries],
        payloads=summaries
    )
    print(f"\n✅ Inserted {len(summaries)} country vectors into Actian VectorAI")

    af_idx = next((i for i, s in enumerate(summaries) if s["iso"] == "AFG"), 0)
    af_vec = to_vector(summaries[af_idx])
    results = client.search("crisis_fatigue", query=af_vec, top_k=5)
    print("\n🔍 Countries with same pattern as Afghanistan:")
    for r in results:
        match = summaries[r.id]
        if match["iso"] != "AFG":
            print(f"  {match['name']:25s}  fatigue={match['fatigue_score']:.3f}  "
                  f"years_neglected={match['years_neglected']}yrs  "
                  f"similarity={r.score:.3f}")


# ── Flask API ─────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)


@app.route("/api/fatigue/all")
def all_fatigue():
    return jsonify(summaries)


@app.route("/api/fatigue/most-at-risk")
def most_at_risk():
    return jsonify([s for s in summaries if s["risk"] in ("CRITICAL", "HIGH")][:20])


def _explain_similarity(a, b):
    reasons = []
    if abs(a["years_neglected"] - b["years_neglected"]) <= 2:
        reasons.append(f"both neglected for ~{a['years_neglected']} years")
    if abs(a["disease_worsening"] - b["disease_worsening"]) < 0.1:
        reasons.append("disease worsening at the same rate")
    if abs(a["government_retreat"] - b["government_retreat"]) < 0.1:
        reasons.append("government also cutting health spending")
    if abs(a["donor_withdrawal"] - b["donor_withdrawal"]) < 0.1:
        reasons.append("donors withdrawing at the same pace")
    return reasons if reasons else ["overall crisis trajectory matches"]


@app.route("/api/fatigue/forgotten-twins/<iso>")
def forgotten_twins(iso):
    crisis = next((s for s in summaries if s["iso"] == iso.upper()), None)
    if not crisis:
        return jsonify([])
    vec = to_vector(crisis)
    with CortexClient("localhost:50052") as client:
        results = client.search("crisis_fatigue", query=vec, top_k=5)
    twins = []
    for r in results:
        match = summaries[r.id]
        if match["iso"] != iso.upper():
            twins.append({
                **match,
                "similarity":  round(r.score * 100, 1),
                "why_similar": _explain_similarity(crisis, match)
            })
    return jsonify(twins[:3])


@app.route("/api/fatigue/country/<iso>")
def country_detail(iso):
    crisis = next((s for s in summaries if s["iso"] == iso.upper()), None)
    if not crisis:
        return jsonify({"error": "not found"}), 404
    country_df = df[df["country_code"] == iso.upper()].sort_values("year")
    trend = country_df[[
        "year",
        "external_per_capita_usd",
        "oop_per_capita_usd",
        "gghed_per_capita_usd",
        "measles_cases_reported"
    ]].to_dict("records")
    return jsonify({**crisis, "trend": trend})


@app.route("/api/fatigue/summary")
def summary():
    critical    = len([s for s in summaries if s["risk"] == "CRITICAL"])
    high        = len([s for s in summaries if s["risk"] == "HIGH"])
    max_ignored = max(summaries, key=lambda x: x["years_neglected"])
    return jsonify({
        "total_countries":      len(summaries),
        "critical_count":       critical,
        "high_count":           high,
        "avg_fatigue":          round(sum(s["fatigue_score"] for s in summaries) / len(summaries), 3),
        "avg_years_neglected":  round(sum(s["years_neglected"] for s in summaries) / len(summaries), 1),
        "longest_neglected":    {"name": max_ignored["name"], "years": max_ignored["years_neglected"]},
        "most_forgotten":       summaries[0]["name"],
        "top5": [{"name": s["name"], "fatigue": s["fatigue_score"], "years_neglected": s["years_neglected"]} for s in summaries[:5]]
    })


if __name__ == "__main__":
    print("\n🚀 API running at http://localhost:3001")
    app.run(port=3001, debug=False)
