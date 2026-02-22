import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add docs to path so we can import vectordb_setup
sys.path.append(str(Path(__file__).parent / "docs"))
from flask import Flask, jsonify, request
from flask_cors import CORS
from vectordb_setup import (
    CRISIS_HISTORY,
    compute_fatigue_vector,
    compute_fatigue_score,
    predict_next_forgotten,
    DB_CONFIG,
)
from llama_index.core import (
    StorageContext, load_index_from_storage, Settings
)
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.memory import ChatMemoryBuffer
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)  # allow frontend on port 5500 to call this API

# ── RAG System Initialization ────────────────────────────────
CHAT_ENGINE = None

def init_rag():
    global CHAT_ENGINE
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("⚠️ GEMINI_API_KEY not found. RAG Chat will be disabled.")
        return

    try:
        # Use same settings as rag_chatbot.py
        Settings.llm = GoogleGenAI(api_key=api_key, model="gemini-2.0-flash")
        Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
        
        index_dir = "./index_storage"
        if os.path.exists(index_dir):
            storage_context = StorageContext.from_defaults(persist_dir=index_dir)
            index = load_index_from_storage(storage_context)
            memory = ChatMemoryBuffer.from_defaults(token_limit=3000)
            CHAT_ENGINE = index.as_chat_engine(
                chat_mode="context",
                memory=memory
            )
            print("✅ RAG System initialized for API")
        else:
            print("⚠️ index_storage not found. Run rag_chatbot.py first to build index.")
    except Exception as e:
        print(f"❌ Failed to init RAG: {e}")

init_rag()


def get_conn():
    return psycopg2.connect(**DB_CONFIG)


def row_to_dict(row, cursor):
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


# ── GET /api/fatigue/all ──────────────────────────────────────
@app.route("/api/fatigue/all")
def all_crises():
    """Return all crises with fatigue scores and yearly trend data."""
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT iso_code, country_name, region, crisis_type,
               start_year, crisis_age, lat, lng,
               fatigue_score, latest_funding_pct, latest_need_score,
               prediction, yearly_data
        FROM crisis_fatigue
        ORDER BY fatigue_score DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    result = []
    for r in rows:
        entry = dict(r)
        # Build time-series arrays for frontend charts
        yearly = entry["yearly_data"]
        years  = sorted(int(y) for y in yearly.keys())
        entry["years"]       = years
        entry["funding_trend"] = [yearly[str(y)][0] for y in years]
        entry["need_trend"]    = [yearly[str(y)][1] for y in years]
        entry["media_trend"]   = [yearly[str(y)][2] for y in years]
        result.append(entry)

    return jsonify(result)


# ── GET /api/fatigue/similar/<iso> ────────────────────────────
@app.route("/api/fatigue/similar/<iso>")
def similar_crises(iso):
    """
    Vector similarity search: find crises with same fatigue pattern.
    Uses cosine similarity on the 12-dim embedding.
    """
    # Get the query crisis
    crisis = next((c for c in CRISIS_HISTORY if c["iso"] == iso.upper()), None)
    if not crisis:
        return jsonify({"error": f"Crisis {iso} not found"}), 404

    query_vec = compute_fatigue_vector(crisis)

    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT iso_code, country_name, region, crisis_type,
               start_year, crisis_age, fatigue_score,
               latest_funding_pct, latest_need_score, prediction,
               1 - (embedding <=> %s::vector) AS similarity
        FROM crisis_fatigue
        WHERE iso_code != %s
        ORDER BY embedding <=> %s::vector
        LIMIT 4
    """, (str(query_vec), iso.upper(), str(query_vec)))

    rows = cur.fetchall()
    cur.close()
    conn.close()

    results = []
    for r in rows:
        entry = dict(r)
        entry["similarity_pct"] = round(float(entry["similarity"]) * 100, 1)
        entry["insight"] = _generate_insight(entry, crisis)
        results.append(entry)

    return jsonify({
        "source": {
            "iso": crisis["iso"],
            "name": crisis["name"],
            "fatigue_score": compute_fatigue_score(crisis),
        },
        "similar": results,
    })


# ── GET /api/fatigue/predict/<iso> ────────────────────────────
@app.route("/api/fatigue/predict/<iso>")
def predict_crisis(iso):
    """Return funding decay prediction for 2025–2026."""
    crisis = next((c for c in CRISIS_HISTORY if c["iso"] == iso.upper()), None)
    if not crisis:
        return jsonify({"error": f"Crisis {iso} not found"}), 404

    prediction  = predict_next_forgotten(crisis)
    fatigue     = compute_fatigue_score(crisis)
    years       = sorted(crisis["yearly"].keys())
    latest      = crisis["yearly"][years[-1]]

    # Extend projection to 2027
    decay = prediction["annual_decay_pct"]
    pred_2027 = max(5, prediction["2026_funding_pct"] + decay)

    return jsonify({
        "iso": crisis["iso"],
        "name": crisis["name"],
        "fatigue_score": fatigue,
        "current_funding_pct": latest[0],
        "current_need_score": latest[1],
        "crisis_age_years": 2024 - crisis["start_year"],
        "prediction": {
            **prediction,
            "2027_funding_pct": round(pred_2027, 1),
        },
        "alert": _alert_level(prediction["2026_funding_pct"]),
        "message": _prediction_message(crisis, prediction, fatigue),
        "yearly_data": crisis["yearly"],
    })


# ── GET /api/fatigue/ranking ──────────────────────────────────
@app.route("/api/fatigue/ranking")
def fatigue_ranking():
    """Return crises ranked by fatigue score — most forgotten first."""
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT iso_code, country_name, region, crisis_type,
               start_year, crisis_age, fatigue_score,
               latest_funding_pct, latest_need_score, prediction,
               lat, lng
        FROM crisis_fatigue
        ORDER BY fatigue_score DESC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()

    # Add rank and labels
    for i, r in enumerate(rows):
        r["rank"] = i + 1
        r["status"] = _fatigue_label(r["fatigue_score"])

    return jsonify(rows)


# ── GET /api/fatigue/next-victims ─────────────────────────────
@app.route("/api/fatigue/next-victims")
def next_victims():
    """
    Crises predicted to become critically underfunded (<25%) by 2026.
    These are the 'next to be forgotten' — the core finding of our model.
    """
    conn = get_conn()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT iso_code, country_name, region, crisis_type,
               start_year, crisis_age, fatigue_score,
               latest_funding_pct, latest_need_score,
               prediction, lat, lng
        FROM crisis_fatigue
        WHERE (prediction->>'will_hit_critical')::boolean = true
           OR (prediction->>'2026_funding_pct')::float < 30
        ORDER BY (prediction->>'2026_funding_pct')::float ASC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()

    # Enrich with similarity — find what past crisis each resembles
    enriched = []
    for r in rows:
        similar_resp = app.test_client().get(f"/api/fatigue/similar/{r['iso_code']}")
        similar_data = json.loads(similar_resp.data)
        top_similar  = similar_data.get("similar", [{}])[0]
        r["resembles"] = top_similar.get("country_name", "Unknown")
        r["resembles_similarity"] = top_similar.get("similarity_pct", 0)
        enriched.append(r)

    return jsonify({
        "total": len(enriched),
        "headline": f"{len(enriched)} crises projected to become critically underfunded by 2026",
        "crises": enriched,
    })


# ── POST /api/chat ────────────────────────────────────────────
from flask import request

@app.route("/api/chat", methods=["POST"])
def chat():
    """RAG Chat endpoint"""
    if not CHAT_ENGINE:
        return jsonify({"response": "RAG system not initialized. Please check server logs."}), 503
    
    data = request.json
    user_msg = data.get("message")
    if not user_msg:
        return jsonify({"error": "No message provided"}), 400
    
    try:
        response = CHAT_ENGINE.chat(user_msg)
        return jsonify({
            "response": str(response),
            "sources": [] # Could extend to show source docs later
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Helpers ───────────────────────────────────────────────────
def _alert_level(funding_pct: float) -> str:
    if funding_pct < 20:  return "critical"
    if funding_pct < 30:  return "severe"
    if funding_pct < 45:  return "high"
    return "moderate"


def _fatigue_label(score: float) -> str:
    if score > 0.75: return "Forgotten"
    if score > 0.55: return "Fading"
    if score > 0.35: return "Declining"
    return "Monitored"


def _generate_insight(similar: dict, source: dict) -> str:
    age_diff = abs((2024 - source["start_year"]) - similar["crisis_age"])
    return (
        f"Followed a similar funding decay pattern — "
        f"{similar['latest_funding_pct']:.0f}% funded after "
        f"{similar['crisis_age']} years. "
        f"{'Both crises share conflict-driven displacement.' if similar['crisis_type'] == source['crisis_type'] else ''}"
    )


def _prediction_message(crisis: dict, pred: dict, fatigue: float) -> str:
    name    = crisis["name"]
    decay   = abs(pred["annual_decay_pct"])
    funding = pred["2026_funding_pct"]
    age     = 2024 - crisis["start_year"]

    if pred["will_hit_critical"]:
        return (
            f"{name} has been in crisis for {age} years. "
            f"Funding is decaying at {decay:.1f}% per year. "
            f"At this rate, coverage will fall to {funding:.0f}% by 2026 — "
            f"critically below the humanitarian threshold. "
            f"The world is not disengaging because the crisis improved."
        )
    return (
        f"{name}'s funding has declined {decay:.1f}% annually over {age} years "
        f"while humanitarian need remains at {crisis['yearly'][max(crisis['yearly'].keys())][1]:.1f}/10. "
        f"Crisis fatigue score: {fatigue:.2f}/1.0"
    )


if __name__ == "__main__":
    app.run(port=5001, debug=True)
