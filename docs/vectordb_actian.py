"""
Crisis Fatigue Detector — Actian VectorAI DB
=============================================
Uses real GHED + measles + population density data.

Vector captures GROWTH PATTERNS of:
  - Virus (measles) case growth rate
  - Government health funding trend
  - External donor funding decay
  - Out-of-pocket burden rise
  - Population density
  - Years unaddressed (how long high need + low funding coexisted)

Countries with the same vector = same trajectory of being forgotten.
"""

import os
import pandas as pd
import numpy as np
from cortex import CortexClient, DistanceMetric
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ── Load real data ────────────────────────────────────────────
df = pd.read_csv("data/combined_ghed_measles_popdensity.csv")

# Comment out to include all 195 countries
# TARGET_INCOME = ["Low", "Lower-middle"]
# df = df[df["income"].isin(TARGET_INCOME)].copy()
df = df.fillna(0)

# ── Build per-country summary ─────────────────────────────────
def compute_country_vector(group):
    group = group.sort_values("year")

    mid    = len(group) // 2
    early  = group.iloc[:mid]
    recent = group.iloc[mid:]

    # ── External donor funding DECAY ─────────────────────────
    ext_early  = early["external_per_capita_usd"].mean()
    ext_recent = recent["external_per_capita_usd"].mean()
    ext_decay  = (ext_early - ext_recent) / (ext_early + 1)
    ext_decay  = max(0, min(ext_decay, 1.0))

    # ── Out-of-pocket burden RISE ─────────────────────────────
    oop_early  = early["oop_per_capita_usd"].mean()
    oop_recent = recent["oop_per_capita_usd"].mean()
    oop_rise   = (oop_recent - oop_early) / (oop_early + 1)
    oop_rise   = max(0, min(oop_rise, 1.0))

    # ── Measles CURRENT BURDEN ────────────────────────────────
    measles_recent = recent["measles_cases_reported"].mean()
    measles_burden = min(measles_recent / 50000, 1.0)

    # ── Measles GROWTH RATE ───────────────────────────────────
    measles_early  = early["measles_cases_reported"].mean()
    measles_growth = (measles_recent - measles_early) / (measles_early + 1)
    measles_growth = max(0, min(measles_growth, 1.0))

    # ── Government health funding TREND ───────────────────────
    gov_early  = early["gghed_per_capita_usd"].mean()
    gov_recent = recent["gghed_per_capita_usd"].mean()
    gov_decay  = (gov_early - gov_recent) / (gov_early + 1)
    gov_decay  = max(0, min(gov_decay, 1.0))

    # ── Government health spending LEVEL ─────────────────────
    gov_spend_norm = min(gov_recent / 200, 1.0)

    # ── Population density ────────────────────────────────────
    pop_density_norm = min(group["pop_density"].mean() / 500, 1.0)

    # ── External dependency ratio ─────────────────────────────
    che_recent = recent["che_per_capita_usd"].mean()
    ext_dep    = ext_recent / (che_recent + 1)
    ext_dep    = min(ext_dep, 1.0)

    # ── YEARS UNADDRESSED ─────────────────────────────────────
    # Count every year where disease burden was HIGH but funding was LOW
    years_unaddressed = 0
    funding_threshold = ext_recent * 1.2
    for _, row in group.iterrows():
        high_need   = row["measles_cases_reported"] > 1000
        low_funding = row["external_per_capita_usd"] < (funding_threshold + 1)
        if high_need and low_funding:
            years_unaddressed += 1

    years_unaddressed_norm = min(years_unaddressed / 10, 1.0)

    # ── Fatigue Score ─────────────────────────────────────────
    fatigue = round(
        0.25 * ext_decay              +
        0.15 * oop_rise               +
        0.10 * measles_burden         +
        0.10 * measles_growth         +
        0.10 * gov_decay              +
        0.05 * (1 - gov_spend_norm)   +
        0.25 * years_unaddressed_norm,
        4
    )

    return {
        "ext_decay":               round(float(ext_decay), 4),
        "oop_rise":                round(float(oop_rise), 4),
        "measles_burden":          round(float(measles_burden), 4),
        "measles_growth":          round(float(measles_growth), 4),
        "gov_decay":               round(float(gov_decay), 4),
        "pop_density_norm":        round(float(pop_density_norm), 4),
        "years_unaddressed_norm":  round(float(years_unaddressed_norm), 4),
        "years_unaddressed":       int(years_unaddressed),
        "fatigue_score":           fatigue,
        "ext_dependency":          round(float(ext_dep), 4),
        "gov_spend_norm":          round(float(gov_spend_norm), 4),
        "ext_per_capita_recent":   round(float(ext_recent), 2),
        "oop_per_capita_recent":   round(float(oop_recent), 2),
        "che_per_capita_recent":   round(float(che_recent), 2),
        "gov_per_capita_recent":   round(float(gov_recent), 2),
        "measles_recent":          round(float(measles_recent), 0),
        "measles_early":           round(float(measles_early), 0),
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

# Rich countries never flagged as CRITICAL/HIGH
for s in summaries:
    if s["income"] in ("High", "Upper-middle"):
        s["risk"] = "STABLE"
        continue
    if   s["fatigue_score"] > 0.5:  s["risk"] = "CRITICAL"
    elif s["fatigue_score"] > 0.35: s["risk"] = "HIGH"
    elif s["fatigue_score"] > 0.2:  s["risk"] = "MODERATE"
    else:                            s["risk"] = "STABLE"

print("\n🔥 Top 10 Most Forgotten Crises:")
for s in summaries[:10]:
    print(f"  {s['name']:30s}  fatigue={s['fatigue_score']:.3f}  "
          f"years_unaddressed={s['years_unaddressed']:2d}yrs  "
          f"measles_growth={s['measles_growth']:.2f}  "
          f"ext_decay={s['ext_decay']:.2f}")


# ── Insert into Actian VectorAI ───────────────────────────────
VECTOR_KEYS = [
    "ext_decay",
    "oop_rise",
    "measles_burden",
    "measles_growth",
    "gov_decay",
    "pop_density_norm",
    "years_unaddressed_norm",
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
                  f"years_unaddressed={match['years_unaddressed']}yrs  "
                  f"similarity={r.score:.3f}")


# ── Flask API ─────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)


@app.route("/api/chat", methods=["POST"])
def chat():
    import google.generativeai as genai
    data = request.json
    message = data.get("message", "")

    crisis_context = ""
    try:
        crisis_context = f"Most forgotten: {summaries[0]['name']}. "
        crisis_context += f"Critical crises: {len([s for s in summaries if s['risk'] == 'CRITICAL'])}.\n"
        crisis_context += f"Longest ignored: {max(summaries, key=lambda x: x['years_unaddressed'])['name']} "
        crisis_context += f"({max(summaries, key=lambda x: x['years_unaddressed'])['years_unaddressed']} years).\n"
        crisis_context += "Top at-risk countries:\n"
        for s in [s for s in summaries if s["risk"] in ("CRITICAL", "HIGH")][:5]:
            crisis_context += f"  {s['name']}: fatigue={s['fatigue_score']}, years_unaddressed={s['years_unaddressed']}\n"
    except:
        pass

    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-2.0-flash")
        system = "You are EpiWatch AI, an expert on humanitarian crisis fatigue and disease funding gaps. Answer concisely using the live data provided."
        augmented = f"{system}\n\nUser question: {message}\n\nLive crisis data:\n{crisis_context}"
        response = model.generate_content(augmented)
        return jsonify({"response": response.text})
    except Exception as e:
        return jsonify({"response": f"Error: {e}"}), 500


@app.route("/api/fatigue/all")
def all_fatigue():
    return jsonify(summaries)


@app.route("/api/fatigue/most-at-risk")
def most_at_risk():
    return jsonify([s for s in summaries if s["risk"] in ("CRITICAL", "HIGH")][:20])


def _explain_similarity(a, b):
    reasons = []
    if abs(a["years_unaddressed"] - b["years_unaddressed"]) <= 2:
        reasons.append(f"both ignored for ~{a['years_unaddressed']} years")
    if abs(a["measles_growth"] - b["measles_growth"]) < 0.1:
        reasons.append("similar disease growth rate")
    if abs(a["gov_decay"] - b["gov_decay"]) < 0.1:
        reasons.append("government also cutting health spending")
    if abs(a["ext_decay"] - b["ext_decay"]) < 0.1:
        reasons.append("donors withdrawing at the same pace")
    return reasons if reasons else ["overall fatigue trajectory matches"]


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
    max_ignored = max(summaries, key=lambda x: x["years_unaddressed"])
    return jsonify({
        "total_countries":       len(summaries),
        "critical_count":        critical,
        "high_count":            high,
        "avg_fatigue":           round(sum(s["fatigue_score"] for s in summaries) / len(summaries), 3),
        "avg_years_unaddressed": round(sum(s["years_unaddressed"] for s in summaries) / len(summaries), 1),
        "longest_ignored":       {"name": max_ignored["name"], "years": max_ignored["years_unaddressed"]},
        "most_forgotten":        summaries[0]["name"],
        "top5": [{"name": s["name"], "fatigue": s["fatigue_score"], "years_unaddressed": s["years_unaddressed"]} for s in summaries[:5]]
    })


if __name__ == "__main__":
    print("\n🚀 API running at http://localhost:3001")
    app.run(port=3001, debug=False)