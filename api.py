import sys
import os
from pathlib import Path
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# RAG Imports
from llama_index.core import (
    StorageContext, load_index_from_storage, Settings, PropertyGraphIndex
)
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.memory import ChatMemoryBuffer

load_dotenv()

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

    # External donor funding DECAY (positive = donors pulling out)
    ext_early  = early["external_per_capita_usd"].mean()
    ext_recent = recent["external_per_capita_usd"].mean()
    ext_decay  = (ext_early - ext_recent) / (ext_early + 1)
    ext_decay  = max(0, min(ext_decay, 1.0))

    # Out-of-pocket burden RISE (positive = population paying more)
    oop_early  = early["oop_per_capita_usd"].mean()
    oop_recent = recent["oop_per_capita_usd"].mean()
    oop_rise   = (oop_recent - oop_early) / (oop_early + 1)
    oop_rise   = max(0, min(oop_rise, 1.0))

    # Measles CURRENT BURDEN
    measles_recent = recent["measles_cases_reported"].mean()
    measles_burden = min(measles_recent / 50000, 1.0)

    # Measles GROWTH RATE (positive = disease worsening while funding drops)
    measles_early  = early["measles_cases_reported"].mean()
    measles_growth = (measles_recent - measles_early) / (measles_early + 1)
    measles_growth = max(0, min(measles_growth, 1.0))

    # Government health funding TREND (positive = gov spending falling)
    gov_early  = early["gghed_per_capita_usd"].mean()
    gov_recent = recent["gghed_per_capita_usd"].mean()
    gov_decay  = (gov_early - gov_recent) / (gov_early + 1)
    gov_decay  = max(0, min(gov_decay, 1.0))

    # Government health spending LEVEL
    gov_spend_norm = min(gov_recent / 200, 1.0)

    # Population density
    pop_density_norm = min(group["pop_density"].mean() / 500, 1.0)

    # External dependency ratio
    che_recent = recent["che_per_capita_usd"].mean()
    ext_dep    = ext_recent / (che_recent + 1)
    ext_dep    = min(ext_dep, 1.0)

    # Fatigue Score
    fatigue = round(
        0.30 * ext_decay       +
        0.20 * oop_rise        +
        0.15 * measles_burden  +
        0.15 * measles_growth  +
        0.10 * gov_decay       +
        0.10 * (1 - gov_spend_norm),
        4
    )

    return {
        "ext_decay":               round(float(ext_decay), 4),
        "oop_rise":                round(float(oop_rise), 4),
        "measles_burden":          round(float(measles_burden), 4),
        "measles_growth":          round(float(measles_growth), 4),
        "gov_decay":               round(float(gov_decay), 4),
        "pop_density_norm":        round(float(pop_density_norm), 4),
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

for s in summaries:
    if   s["fatigue_score"] > 0.5:  s["risk"] = "CRITICAL"
    elif s["fatigue_score"] > 0.35: s["risk"] = "HIGH"
    elif s["fatigue_score"] > 0.2:  s["risk"] = "MODERATE"
    else:                            s["risk"] = "STABLE"

print("\n🔥 Top 10 Most Forgotten Crises:")
for s in summaries[:10]:
    print(f"  {s['name']:30s}  fatigue={s['fatigue_score']:.3f}  "
          f"measles_growth={s['measles_growth']:.2f}  "
          f"gov_decay={s['gov_decay']:.2f}  "
          f"ext_decay={s['ext_decay']:.2f}")


# ── Try to connect to Actian VectorAI (optional) ─────────────
VECTOR_KEYS = [
    "ext_decay",
    "oop_rise",
    "measles_burden",
    "measles_growth",
    "gov_decay",
    "pop_density_norm",
]

def to_vector(s):
    return [s[k] for k in VECTOR_KEYS]

try:
    from cortex import CortexClient, DistanceMetric
    with CortexClient("localhost:50052") as client:
        client.recreate_collection(
            "crisis_fatigue",
            dimension=6,
            distance_metric=DistanceMetric.COSINE
        )
        client.batch_upsert(
            "crisis_fatigue",
            ids=list(range(len(summaries))),
            vectors=[to_vector(s) for s in summaries],
            payloads=summaries
        )
        print(f"\n✅ Inserted {len(summaries)} country vectors into Actian VectorAI")

        # Quick similarity check: Afghanistan's crisis twins
        af_idx = next((i for i, s in enumerate(summaries) if s["iso"] == "AFG"), 0)
        af_vec = to_vector(summaries[af_idx])
        results = client.search("crisis_fatigue", query=af_vec, top_k=5)
        print("\n🔍 Countries with same growth pattern as Afghanistan:")
        for r in results:
            match = summaries[r.id]
            if match["iso"] != "AFG":
                print(f"  {match['name']:25s}  fatigue={match['fatigue_score']:.3f}  "
                      f"similarity={r.score:.3f}")

    ACTIAN_AVAILABLE = True

except Exception as e:
    print(f"\n⚠️  Actian VectorAI not available ({e}) — running without vector similarity")
    ACTIAN_AVAILABLE = False


# ── Helper: explain why two countries are similar ─────────────
def _explain_similarity(a, b):
    reasons = []
    if abs(a["measles_growth"] - b["measles_growth"]) < 0.1:
        reasons.append("similar disease growth rate")
    if abs(a["gov_decay"] - b["gov_decay"]) < 0.1:
        reasons.append("government also cutting health spending")
    if abs(a["ext_decay"] - b["ext_decay"]) < 0.1:
        reasons.append("donors withdrawing at the same pace")
    if abs(a["pop_density_norm"] - b["pop_density_norm"]) < 0.15:
        reasons.append("similar population density challenges")
    return reasons if reasons else ["overall fatigue trajectory matches"]


# ── RAG System Initialization ────────────────────────────────
CHAT_ENGINE = None

def init_rag():
    """Initializes the RAG system as a READ-ONLY consumer."""
    global CHAT_ENGINE
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("⚠️ GEMINI_API_KEY not found. RAG Chat will be disabled.")
        return

    try:
        # Use gemini-flash-latest as verified by diagnostics
        Settings.llm = GoogleGenAI(api_key=api_key, model="models/gemini-flash-latest")
        Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
        
        graph_storage = Path("./graph_storage")
        vector_storage = Path("./index_storage")
        
        if graph_storage.exists() and any(graph_storage.iterdir()):
            print("🌐 Found local GraphRAG storage. Loading...")
            storage_context = StorageContext.from_defaults(persist_dir=str(graph_storage))
            index = PropertyGraphIndex.from_existing(storage_context=storage_context)
            memory = ChatMemoryBuffer.from_defaults(token_limit=3000)
            CHAT_ENGINE = index.as_chat_engine(memory=memory)
            print("✅ GraphRAG loaded")
        elif vector_storage.exists() and any(vector_storage.iterdir()):
            print("📍 Found local VectorRAG storage. Loading...")
            storage_context = StorageContext.from_defaults(persist_dir=str(vector_storage))
            index = load_index_from_storage(storage_context)
            memory = ChatMemoryBuffer.from_defaults(token_limit=3000)
            CHAT_ENGINE = index.as_chat_engine(chat_mode="context", memory=memory)
            print("✅ VectorRAG loaded")
        else:
            print("⚠️ No prepared RAG storage found.")
    except Exception as e:
        print(f"❌ Failed to load RAG: {e}")

init_rag()

# ── Flask API ─────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)


@app.route("/api/chat", methods=["POST"])
def chat():
    """RAG Chat endpoint using LlamaIndex"""
    if not CHAT_ENGINE:
        return jsonify({"response": "RAG system not initialized. Check server logs."}), 503
    
    data = request.json or {}
    user_msg = data.get("message")
    if not user_msg:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        # Augmented context from the summary statistics
        crisis_summary = f"Currently tracking {len(summaries)} countries. Top risk: {summaries[0]['name']}."
        response = CHAT_ENGINE.chat(f"{user_msg}\n\nContext: {crisis_summary}")
        return jsonify({
            "response": str(response),
            "sources": []
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/fatigue/all")
def all_fatigue():
    return jsonify(summaries)


@app.route("/api/fatigue/most-at-risk")
def most_at_risk():
    return jsonify([s for s in summaries if s["risk"] in ("CRITICAL", "HIGH")][:20])


@app.route("/api/fatigue/forgotten-twins/<iso>")
def forgotten_twins(iso):
    crisis = next((s for s in summaries if s["iso"] == iso.upper()), None)
    if not crisis:
        return jsonify([])

    if not ACTIAN_AVAILABLE:
        # Fallback: sort by Euclidean distance on VECTOR_KEYS
        def dist(a, b):
            return sum((a[k] - b[k]) ** 2 for k in VECTOR_KEYS) ** 0.5
        sorted_by_dist = sorted(
            [s for s in summaries if s["iso"] != iso.upper()],
            key=lambda s: dist(crisis, s)
        )
        twins = []
        for match in sorted_by_dist[:3]:
            twins.append({
                **match,
                "similarity": round((1 - dist(crisis, match)) * 100, 1),
                "why_similar": _explain_similarity(crisis, match)
            })
        return jsonify(twins)

    vec = to_vector(crisis)
    try:
        from cortex import CortexClient
        with CortexClient("localhost:50052") as client:
            results = client.search("crisis_fatigue", query=vec, top_k=5)
        twins = []
        for r in results:
            match = summaries[r.id]
            if match["iso"] != iso.upper():
                twins.append({
                    **match,
                    "similarity": round(r.score * 100, 1),
                    "why_similar": _explain_similarity(crisis, match)
                })
        return jsonify(twins[:3])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
    critical = len([s for s in summaries if s["risk"] == "CRITICAL"])
    high     = len([s for s in summaries if s["risk"] == "HIGH"])
    return jsonify({
        "total_countries":    len(summaries),
        "critical_count":     critical,
        "high_count":         high,
        "avg_fatigue":        round(sum(s["fatigue_score"] for s in summaries) / len(summaries), 3),
        "avg_measles_growth": round(sum(s["measles_growth"] for s in summaries) / len(summaries), 3),
        "most_forgotten":     summaries[0]["name"],
        "top5": [{"name": s["name"], "fatigue": s["fatigue_score"]} for s in summaries[:5]]
    })


if __name__ == "__main__":
    print("\n🚀 API running at http://localhost:5001")
    app.run(port=5001, debug=False)