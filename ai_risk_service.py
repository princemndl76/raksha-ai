"""
RAKSHAK AI - AI Risk Service
=============================

This module replaces the plain rule engine (nepal_status_service.py)
with a trained machine-learning pipeline, while returning the SAME
JSON shape the frontend already expects (plus a few extra AI fields).

Pipeline:
  live events (earthquakes, floods, weather)
        |
        v
  feature extraction  (this file)
        |
        v
  ml/models/*.joblib  (trained by ml/train_model.py)
        |
        v
  risk_score (0-100), risk_level, anomaly flags, explanation

Everything runs locally - no external AI API calls, no internet
dependency beyond what your existing services already use to fetch
raw earthquake/flood/weather data.

If the model files are missing (e.g. fresh clone, before running
`python ml/train_model.py`), this module falls back to the original
rule engine so the app never crashes because of a missing model.
"""

from datetime import datetime, timezone
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from nepal_status_service import build_nepal_status, create_summary

LOG_PATH = Path(__file__).parent / "ml" / "prediction_log.jsonl"


def log_prediction(features: dict, risk_score: float, risk_level: str, weather_anomaly: bool) -> None:
    """
    Append every prediction to a local log file. This is how you build a
    REAL historical dataset over time, instead of the simulated one used
    to train the initial models. Each line is one JSON record.

    Once you've collected weeks/months of these, you can eventually
    replace ml/generate_training_data.py's synthetic data with this real
    log (ideally after adding an "actual outcome" label you fill in
    afterward - was this a false alarm or a real event?) and retrain
    with ml/train_model.py for a model grounded in your own region's
    real conditions instead of simulated ones.
    """
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "weather_anomaly_detected": weather_anomaly,
            "features": features,
        }
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except OSError:
        # Logging must never break the API - if the disk write fails,
        # just skip it silently and keep serving predictions.
        pass

MODEL_DIR = Path(__file__).parent / "ml" / "models"

FEATURE_COLUMNS = [
    "eq_count",
    "eq_max_magnitude",
    "eq_avg_magnitude",
    "eq_recent_hours",
    "flood_count",
    "flood_severity_score",
    "weather_max_precip",
    "weather_max_wind_gust",
    "weather_max_wind_speed",
    "weather_high_count",
    "weather_locations_monitored",
]

SEVERITY_TO_FLOOD_SCORE = {
    "LOW": 5,
    "MEDIUM": 20,
    "HIGH": 40,
    "CRITICAL": 60,
}

_models_cache = {}


def _load_models():
    """Load trained models once and cache them in memory."""

    if _models_cache:
        return _models_cache

    try:
        _models_cache["regressor"] = joblib.load(MODEL_DIR / "risk_regressor.joblib")
        _models_cache["classifier"] = joblib.load(MODEL_DIR / "risk_classifier.joblib")
        _models_cache["anomaly_detector"] = joblib.load(
            MODEL_DIR / "weather_anomaly_detector.joblib"
        )
    except FileNotFoundError:
        _models_cache["unavailable"] = True

    return _models_cache


# ============================================================
# FEATURE EXTRACTION
# Converts raw live event lists into the exact numeric vector
# the models were trained on (see ml/generate_training_data.py).
# ============================================================

def _hours_since(timestamp_str: str | None) -> float:
    if not timestamp_str:
        return 999.0
    try:
        event_time = datetime.fromisoformat(timestamp_str)
        if event_time.tzinfo is None:
            event_time = event_time.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - event_time
        return max(0.0, delta.total_seconds() / 3600.0)
    except (ValueError, TypeError):
        return 999.0


def extract_features(earthquakes: list[dict], floods: list[dict], weather: list[dict]) -> dict:
    earthquakes = earthquakes or []
    floods = floods or []
    weather = weather or []

    magnitudes = [e.get("magnitude", 0) or 0 for e in earthquakes]
    eq_recent_hours = (
        min(_hours_since(e.get("timestamp")) for e in earthquakes)
        if earthquakes
        else 999.0
    )

    flood_severity_score = sum(
        SEVERITY_TO_FLOOD_SCORE.get(str(f.get("severity", "LOW")).upper(), 0)
        for f in floods
    )

    precip_values = [w.get("current", {}).get("precipitation", 0) or 0 for w in weather]
    gust_values = [w.get("current", {}).get("wind_gusts", 0) or 0 for w in weather]
    wind_values = [w.get("current", {}).get("wind_speed", 0) or 0 for w in weather]

    # weather_service events may store current conditions under different
    # keys depending on version - fall back to top-level fields too.
    if not any(precip_values) and weather:
        precip_values = [w.get("precipitation", 0) or 0 for w in weather]
    if not any(gust_values) and weather:
        gust_values = [w.get("wind_gusts", 0) or 0 for w in weather]
    if not any(wind_values) and weather:
        wind_values = [w.get("wind_speed", 0) or 0 for w in weather]

    weather_high_count = sum(
        1 for w in weather if str(w.get("severity", "LOW")).upper() in {"HIGH", "CRITICAL"}
    )

    return {
        "eq_count": len(earthquakes),
        "eq_max_magnitude": max(magnitudes) if magnitudes else 0.0,
        "eq_avg_magnitude": (sum(magnitudes) / len(magnitudes)) if magnitudes else 0.0,
        "eq_recent_hours": eq_recent_hours,
        "flood_count": len(floods),
        "flood_severity_score": flood_severity_score,
        "weather_max_precip": max(precip_values) if precip_values else 0.0,
        "weather_max_wind_gust": max(gust_values) if gust_values else 0.0,
        "weather_max_wind_speed": max(wind_values) if wind_values else 0.0,
        "weather_high_count": weather_high_count,
        "weather_locations_monitored": len(weather),
    }


def _feature_vector(features: dict) -> pd.DataFrame:
    return pd.DataFrame([[features[col] for col in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)


def _explain(features: dict) -> list[str]:
    """Plain-language explanation of what's driving the score."""

    reasons = []
    if features["eq_max_magnitude"] >= 5.0:
        reasons.append(
            f"Strong earthquake activity detected (max magnitude {features['eq_max_magnitude']:.1f})"
        )
    elif features["eq_max_magnitude"] >= 3.0:
        reasons.append(
            f"Moderate earthquake activity detected (max magnitude {features['eq_max_magnitude']:.1f})"
        )

    if features["flood_severity_score"] > 0:
        reasons.append("Active flood alerts contributing to risk")

    if features["weather_max_precip"] >= 30:
        reasons.append(
            f"Very heavy rainfall detected ({features['weather_max_precip']:.0f}mm)"
        )
    elif features["weather_max_precip"] >= 15:
        reasons.append(
            f"Significant rainfall detected ({features['weather_max_precip']:.0f}mm)"
        )

    if features["weather_max_wind_gust"] >= 80:
        reasons.append(
            f"Dangerous wind gusts detected ({features['weather_max_wind_gust']:.0f} km/h)"
        )

    active_hazards = sum([
        features["eq_max_magnitude"] > 4.0,
        features["flood_count"] > 0,
        features["weather_max_precip"] >= 15 or features["weather_max_wind_gust"] >= 50,
    ])
    if active_hazards >= 2:
        reasons.append("Multiple simultaneous hazards detected - compounded risk")

    if not reasons:
        reasons.append("No significant hazard indicators detected")

    return reasons


def check_weather_anomaly(models: dict, features: dict) -> bool:
    """
    Early-warning: is this weather reading statistically unusual,
    even if it doesn't cross any single hard threshold?
    """

    detector = models.get("anomaly_detector")
    if detector is None:
        return False

    vector = pd.DataFrame(
        [[
            features["weather_max_precip"],
            features["weather_max_wind_gust"],
            features["weather_max_wind_speed"],
        ]],
        columns=["weather_max_precip", "weather_max_wind_gust", "weather_max_wind_speed"],
    )

    # IsolationForest: -1 means anomaly, 1 means normal
    prediction = detector.predict(vector)[0]
    return bool(prediction == -1)


# ============================================================
# PUBLIC ENTRY POINT (used by main.py)
# ============================================================

def build_ai_nepal_status(
    earthquakes: list[dict],
    floods: list[dict],
    weather: list[dict] | None = None,
) -> dict:

    earthquakes = earthquakes or []
    floods = floods or []
    weather = weather or []

    models = _load_models()

    if models.get("unavailable"):
        # Graceful fallback - never crash the API because the
        # model hasn't been trained yet.
        fallback = build_nepal_status(earthquakes, floods, weather)
        fallback["assessment_type"] = "RULE_ENGINE_FALLBACK_MODEL_NOT_TRAINED"
        fallback["is_ai_generated"] = False
        return fallback

    features = extract_features(earthquakes, floods, weather)
    vector = _feature_vector(features)

    risk_score = float(np.clip(models["regressor"].predict(vector)[0], 0, 100))
    risk_level = str(models["classifier"].predict(vector)[0])

    class_probabilities = dict(zip(
        models["classifier"].classes_,
        models["classifier"].predict_proba(vector)[0].round(3),
    ))
    confidence = float(max(class_probabilities.values()))

    weather_anomaly = check_weather_anomaly(models, features)

    log_prediction(features, risk_score, risk_level, weather_anomaly)

    high_critical_count = sum(
        1
        for event in [*earthquakes, *floods, *weather]
        if str(event.get("severity", "")).upper() in {"HIGH", "CRITICAL"}
    )

    summary = create_summary(
        status=risk_level if risk_level != "CRITICAL" else "CRITICAL",
        earthquake_count=len(earthquakes),
        flood_count=len(floods),
        weather_count=len(weather),
        high_critical_count=high_critical_count,
    )

    if weather_anomaly:
        summary += " An unusual weather pattern was also flagged by the anomaly detector for extra caution."

    return {
        "country": "Nepal",
        "status": risk_level,
        "risk_score": round(risk_score, 1),
        "summary": summary,
        "earthquakes": {"count": len(earthquakes), "events": earthquakes},
        "floods": {"count": len(floods), "events": floods},
        "weather": {"count": len(weather), "locations": weather},
        "high_critical_alerts": high_critical_count,
        "monitoring": {"earthquake": True, "flood": True, "weather": True},
        "sources": ["USGS", "DHM", "OPEN-METEO"],
        "assessment_type": "AI_ML_ENGINE",
        "is_ai_generated": True,
        "ai_details": {
            "model_confidence": confidence,
            "class_probabilities": class_probabilities,
            "weather_anomaly_detected": weather_anomaly,
            "explanation": _explain(features),
            "features_used": features,
        },
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
