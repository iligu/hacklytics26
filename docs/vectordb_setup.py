"""
Crisis Fatigue Detector — VectorDB Setup
========================================
Embeds crisis temporal data into Actian VectorAI DB.
Each crisis is stored as a multi-dimensional time-series vector
capturing funding decay, attention decay, and need persistence.

Run ONCE to populate the DB:
  python vectordb_setup.py

Requirements:
  pip install psycopg2-binary numpy pandas flask flask-cors scikit-learn
"""

import json
import math
import numpy as np
import psycopg2
from psycopg2.extras import Json

# ── DB connection (Actian VectorAI via Docker) ────────────────
DB_CONFIG = {
    "host":     "localhost",
    "port":     5466,
    "database": "vectorai",
    "user":     "admin",
    "password": "admin",
}

# ── Historical crisis data (2018–2024) ────────────────────────
# Each entry: name, iso, start_year, yearly funding_pct, yearly need score
# funding_pct: how much of requirements were met each year (0–100)
# need_score:  humanitarian need severity (0–10, higher = worse)
# This is the "fatigue signal": need stays high, funding drops

CRISIS_HISTORY = [
    {
        "iso": "YE", "name": "Yemen", "region": "Middle East",
        "start_year": 2015, "crisis_type": "conflict",
        "lat": 15.5, "lng": 48.5,
        "yearly": {
            # year: [funding_pct, need_score, media_index]
            # media_index: 0–10, proxy for global attention
            2018: [67, 9.2, 8.1],
            2019: [59, 9.4, 7.2],
            2020: [53, 9.1, 6.1],
            2021: [47, 9.3, 4.8],
            2022: [42, 9.0, 3.9],
            2023: [38, 8.8, 3.1],
            2024: [31, 8.9, 2.4],
        }
    },
    {
        "iso": "SS", "name": "South Sudan", "region": "Sub-Saharan Africa",
        "start_year": 2013, "crisis_type": "conflict",
        "lat": 7.0, "lng": 30.0,
        "yearly": {
            2018: [52, 8.8, 4.2],
            2019: [48, 8.6, 3.5],
            2020: [41, 8.9, 2.8],
            2021: [37, 9.0, 2.1],
            2022: [33, 8.7, 1.9],
            2023: [29, 8.5, 1.6],
            2024: [25, 8.6, 1.3],
        }
    },
    {
        "iso": "CD", "name": "DR Congo", "region": "Sub-Saharan Africa",
        "start_year": 1996, "crisis_type": "conflict",
        "lat": -4.0, "lng": 21.7,
        "yearly": {
            2018: [44, 8.5, 3.8],
            2019: [39, 8.7, 3.1],
            2020: [35, 8.9, 2.7],
            2021: [32, 9.0, 2.3],
            2022: [28, 9.1, 2.0],
            2023: [25, 9.2, 1.8],
            2024: [22, 9.3, 1.5],
        }
    },
    {
        "iso": "SY", "name": "Syria", "region": "Middle East",
        "start_year": 2011, "crisis_type": "conflict",
        "lat": 34.8, "lng": 38.9,
        "yearly": {
            2018: [58, 9.5, 7.1],
            2019: [51, 9.3, 5.9],
            2020: [44, 9.1, 4.2],
            2021: [38, 8.9, 3.3],
            2022: [33, 8.7, 2.8],
            2023: [29, 8.8, 2.5],
            2024: [24, 8.9, 2.0],
        }
    },
    {
        "iso": "ET", "name": "Ethiopia", "region": "Sub-Saharan Africa",
        "start_year": 2020, "crisis_type": "conflict",
        "lat": 9.1, "lng": 40.5,
        "yearly": {
            2020: [71, 7.2, 6.8],
            2021: [63, 8.1, 5.9],
            2022: [54, 8.8, 4.1],
            2023: [46, 8.5, 2.9],
            2024: [38, 8.3, 2.1],
        }
    },
    {
        "iso": "AF", "name": "Afghanistan", "region": "Asia",
        "start_year": 2001, "crisis_type": "conflict",
        "lat": 33.9, "lng": 67.7,
        "yearly": {
            2018: [55, 8.9, 5.1],
            2019: [51, 9.0, 4.8],
            2020: [49, 9.1, 5.2],
            2021: [62, 9.5, 9.1],  # spike: Taliban takeover
            2022: [44, 9.8, 6.2],
            2023: [37, 9.6, 3.1],
            2024: [31, 9.7, 2.3],
        }
    },
    {
        "iso": "SO", "name": "Somalia", "region": "Sub-Saharan Africa",
        "start_year": 1991, "crisis_type": "conflict",
        "lat": 5.1, "lng": 46.2,
        "yearly": {
            2018: [48, 8.7, 3.2],
            2019: [42, 8.5, 2.8],
            2020: [38, 8.8, 2.3],
            2021: [35, 9.1, 2.1],
            2022: [31, 9.3, 2.4],
            2023: [28, 9.0, 1.9],
            2024: [23, 8.9, 1.6],
        }
    },
    {
        "iso": "SD", "name": "Sudan", "region": "Sub-Saharan Africa",
        "start_year": 2023, "crisis_type": "conflict",
        "lat": 12.8, "lng": 30.2,
        "yearly": {
            2023: [68, 8.1, 7.9],
            2024: [41, 9.2, 4.8],
        }
    },
    {
        "iso": "NG", "name": "Nigeria", "region": "Sub-Saharan Africa",
        "start_year": 2014, "crisis_type": "food",
        "lat": 9.1, "lng": 8.7,
        "yearly": {
            2018: [43, 7.8, 3.1],
            2019: [38, 7.9, 2.7],
            2020: [35, 8.2, 2.4],
            2021: [31, 8.4, 2.1],
            2022: [27, 8.5, 1.8],
            2023: [24, 8.6, 1.5],
            2024: [21, 8.7, 1.3],
        }
    },
    {
        "iso": "ML", "name": "Mali", "region": "Sub-Saharan Africa",
        "start_year": 2012, "crisis_type": "conflict",
        "lat": 17.6, "lng": -4.0,
        "yearly": {
            2018: [51, 7.5, 3.4],
            2019: [46, 7.8, 2.9],
            2020: [41, 8.1, 2.5],
            2021: [36, 8.3, 2.2],
            2022: [31, 8.4, 1.9],
            2023: [27, 8.2, 1.6],
            2024: [23, 8.3, 1.4],
        }
    },
    {
        "iso": "UA", "name": "Ukraine", "region": "Europe",
        "start_year": 2022, "crisis_type": "conflict",
        "lat": 48.4, "lng": 31.2,
        "yearly": {
            2022: [89, 9.3, 9.8],
            2023: [71, 9.1, 7.2],
            2024: [58, 9.0, 5.9],
        }
    },
    {
        "iso": "HT", "name": "Haiti", "region": "Americas",
        "start_year": 2010, "crisis_type": "displacement",
        "lat": 18.9, "lng": -72.3,
        "yearly": {
            2018: [39, 7.1, 2.3],
            2019: [35, 7.3, 2.1],
            2020: [33, 7.5, 2.4],
            2021: [42, 8.1, 5.1],  # spike: earthquake
            2022: [36, 8.4, 3.2],
            2023: [31, 8.7, 2.8],
            2024: [27, 9.1, 2.1],
        }
    },
]


# ── Vector construction ────────────────────────────────────────
def compute_fatigue_vector(crisis: dict) -> list:
    """
    Build a 12-dimensional fatigue vector for VectorAI similarity search.

    Dimensions:
    [0]  Crisis age in years (normalized)
    [1]  Mean funding % across all years
    [2]  Funding slope (decay rate) — negative = getting worse
    [3]  Latest year funding %
    [4]  Mean need score
    [5]  Latest need score
    [6]  Need persistence (need stayed high while funding dropped)
    [7]  Media attention slope (how fast world stopped caring)
    [8]  Latest media index
    [9]  Fatigue score (our compound metric)
    [10] Funding volatility (std dev)
    [11] Crisis type encoding
    """
    years = sorted(crisis["yearly"].keys())
    funding = [crisis["yearly"][y][0] for y in years]
    need    = [crisis["yearly"][y][1] for y in years]
    media   = [crisis["yearly"][y][2] for y in years]

    crisis_age = 2024 - crisis["start_year"]

    # Linear regression slope
    def slope(values):
        n = len(values)
        if n < 2:
            return 0.0
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        num = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
        den = sum((x[i] - x_mean) ** 2 for i in range(n))
        return num / den if den != 0 else 0.0

    funding_slope = slope(funding)   # negative = declining funding
    media_slope   = slope(media)     # negative = declining attention

    mean_funding   = sum(funding) / len(funding)
    mean_need      = sum(need) / len(need)
    latest_funding = funding[-1]
    latest_need    = need[-1]
    latest_media   = media[-1]

    # Need persistence: high need + low funding = forgotten
    need_persistence = latest_need * (1 - latest_funding / 100)

    # Fatigue score: combines age, funding decay, need persistence
    fatigue_score = (
        min(crisis_age / 20, 1.0) * 0.3 +          # age weight
        max(-funding_slope / 10, 0) * 0.35 +         # funding decay weight
        need_persistence / 10 * 0.35                  # need persistence weight
    )

    # Funding volatility
    funding_std = np.std(funding)

    # Crisis type encoding
    type_enc = {"conflict": 0.9, "food": 0.6, "displacement": 0.5,
                "climate": 0.4, "health": 0.7}.get(crisis["crisis_type"], 0.5)

    vector = [
        min(crisis_age / 30.0, 1.0),           # [0] age
        mean_funding / 100.0,                   # [1] mean funding
        max(min(-funding_slope / 15.0, 1), -1), # [2] funding slope (neg = decay)
        latest_funding / 100.0,                 # [3] latest funding
        mean_need / 10.0,                       # [4] mean need
        latest_need / 10.0,                     # [5] latest need
        need_persistence / 10.0,                # [6] need persistence
        max(min(-media_slope / 5.0, 1), -1),   # [7] media slope (neg = decay)
        latest_media / 10.0,                    # [8] latest media
        fatigue_score,                           # [9] fatigue compound score
        funding_std / 30.0,                     # [10] volatility
        type_enc,                               # [11] crisis type
    ]

    return [round(float(v), 6) for v in vector]


def compute_fatigue_score(crisis: dict) -> float:
    """Return the compound fatigue score (0–1, higher = more forgotten)."""
    vec = compute_fatigue_vector(crisis)
    return round(vec[9], 4)


def predict_next_forgotten(crisis: dict) -> dict:
    """
    Project future funding using decay regression.
    Returns predictions for 2025 and 2026.
    """
    years   = sorted(crisis["yearly"].keys())
    funding = [crisis["yearly"][y][0] for y in years]
    need    = [crisis["yearly"][y][1] for y in years]

    # Fit linear trend to last 3 years
    recent_years   = years[-3:]
    recent_funding = funding[-3:]
    n = len(recent_years)
    x_mean = sum(range(n)) / n
    y_mean = sum(recent_funding) / n
    num = sum((i - x_mean) * (recent_funding[i] - y_mean) for i in range(n))
    den = sum((i - x_mean) ** 2 for i in range(n))
    trend = num / den if den != 0 else 0.0

    pred_2025 = max(5, min(100, recent_funding[-1] + trend))
    pred_2026 = max(5, min(100, pred_2025 + trend))

    return {
        "2025_funding_pct": round(pred_2025, 1),
        "2026_funding_pct": round(pred_2026, 1),
        "annual_decay_pct": round(trend, 1),
        "will_hit_critical": pred_2026 < 25,   # critical = <25% funded
    }


# ── DB setup & ingestion ──────────────────────────────────────
def setup_database():
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()

    # Drop and recreate for clean state
    cur.execute("DROP TABLE IF EXISTS crisis_fatigue")
    cur.execute("""
        CREATE TABLE crisis_fatigue (
            id           SERIAL PRIMARY KEY,
            iso_code     VARCHAR(3) UNIQUE NOT NULL,
            country_name VARCHAR(100),
            region       VARCHAR(50),
            crisis_type  VARCHAR(30),
            start_year   INTEGER,
            crisis_age   INTEGER,
            lat          FLOAT,
            lng          FLOAT,
            fatigue_score FLOAT,
            latest_funding_pct FLOAT,
            latest_need_score  FLOAT,
            prediction   JSONB,
            yearly_data  JSONB,
            embedding    VECTOR(12)
        )
    """)

    # Index for fast vector search
    cur.execute("""
        CREATE INDEX IF NOT EXISTS crisis_vec_idx
        ON crisis_fatigue USING ivfflat (embedding vector_cosine_ops)
    """)

    conn.commit()
    print("✅ Table created")

    # Ingest all crisis records
    for crisis in CRISIS_HISTORY:
        vector      = compute_fatigue_vector(crisis)
        fatigue     = compute_fatigue_score(crisis)
        prediction  = predict_next_forgotten(crisis)
        crisis_age  = 2024 - crisis["start_year"]
        years       = sorted(crisis["yearly"].keys())
        latest      = crisis["yearly"][years[-1]]

        cur.execute("""
            INSERT INTO crisis_fatigue
            (iso_code, country_name, region, crisis_type, start_year,
             crisis_age, lat, lng, fatigue_score, latest_funding_pct,
             latest_need_score, prediction, yearly_data, embedding)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector)
            ON CONFLICT (iso_code) DO UPDATE SET
                fatigue_score       = EXCLUDED.fatigue_score,
                latest_funding_pct  = EXCLUDED.latest_funding_pct,
                embedding           = EXCLUDED.embedding
        """, (
            crisis["iso"],
            crisis["name"],
            crisis["region"],
            crisis["crisis_type"],
            crisis["start_year"],
            crisis_age,
            crisis["lat"],
            crisis["lng"],
            fatigue,
            latest[0],
            latest[1],
            Json(prediction),
            Json(crisis["yearly"]),
            str(vector),
        ))
        print(f"  ✅ Inserted {crisis['name']} — fatigue score: {fatigue:.3f}")

    conn.commit()
    cur.close()
    conn.close()
    print("\n🚀 VectorDB populated with all crisis fatigue embeddings")


if __name__ == "__main__":
    setup_database()
