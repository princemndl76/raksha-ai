"""
RAKSHAK AI - Training Data Generator
=====================================

WHY THIS FILE EXISTS (read this first):
----------------------------------------
Machine learning models learn patterns from labeled examples
(feature -> correct answer). For a real disaster-outcome model
you would want historical records like:
    "magnitude 6.1 earthquake + 40mm rain that week -> X damage"

Nepal does not have an open, machine-readable dataset like that
available to us here. So instead of pretending to have one, we
build a SIMULATOR grounded in real hazard science:

  - Earthquake damage potential follows well-known relationships
    between magnitude, depth, and distance (similar in spirit to
    USGS "ShakeMap" / Modified Mercalli Intensity reasoning).
  - Flood/storm risk follows rainfall-intensity and wind-speed
    thresholds used by real meteorological warning systems
    (e.g. IMD/DHM heavy-rain categories, Beaufort wind scale).
  - Multi-hazard overlap (e.g. earthquake + heavy rain at once)
    compounds risk faster than either alone - this is real
    disaster-science behavior (secondary hazards / landslides).

We sample thousands of realistic scenarios, score each one with
this physics-informed formula plus a bit of random noise (to
simulate real-world unpredictability), and use THAT as our
training labels. The ML model then learns to approximate this
complex, non-linear scoring function from the raw features alone.

This is a legitimate and common ML technique called "surrogate
modeling" - used constantly in engineering/science when real
labeled outcome data is scarce or expensive to collect.

UPGRADE PATH: if you later get access to a real historical
incident dataset (e.g. Nepal's DesInventar database, or your
own logged RAKSHAK AI alert outcomes), replace this generator's
output with real records and retrain - the rest of the pipeline
(train_model.py, ai_risk_service.py) does not need to change.
"""

import numpy as np
import pandas as pd

RANDOM_SEED = 42
N_SAMPLES = 12000


def simulate_scenario(rng: np.random.Generator) -> dict:
    """Sample one plausible multi-hazard scenario."""

    # ---- Earthquake features ----
    # Most days: no quake. Sometimes a small one. Rarely a big one.
    has_earthquake = rng.random() < 0.35
    if has_earthquake:
        eq_count = rng.integers(1, 4)
        eq_max_magnitude = float(np.clip(rng.exponential(1.8) + 2.5, 2.5, 8.5))
        eq_avg_magnitude = float(eq_max_magnitude * rng.uniform(0.7, 1.0))
        eq_recent_hours = float(rng.uniform(0, 48))
    else:
        eq_count = 0
        eq_max_magnitude = 0.0
        eq_avg_magnitude = 0.0
        eq_recent_hours = 999.0

    # ---- Flood features ----
    has_flood_report = rng.random() < 0.15
    if has_flood_report:
        flood_count = rng.integers(1, 3)
        flood_severity_score = float(rng.uniform(15, 60))
    else:
        flood_count = 0
        flood_severity_score = 0.0

    # ---- Weather features (aggregated across monitored locations) ----
    weather_max_precip = float(np.clip(rng.exponential(6), 0, 120))       # mm
    weather_max_wind_gust = float(np.clip(rng.exponential(15) + 5, 0, 160))  # km/h
    weather_max_wind_speed = float(weather_max_wind_gust * rng.uniform(0.5, 0.8))
    weather_high_count = int(
        rng.integers(0, 3) if weather_max_precip > 15 or weather_max_wind_gust > 60 else 0
    )
    weather_locations_monitored = int(rng.integers(3, 12))

    return {
        "eq_count": eq_count,
        "eq_max_magnitude": eq_max_magnitude,
        "eq_avg_magnitude": eq_avg_magnitude,
        "eq_recent_hours": eq_recent_hours,
        "flood_count": flood_count,
        "flood_severity_score": flood_severity_score,
        "weather_max_precip": weather_max_precip,
        "weather_max_wind_gust": weather_max_wind_gust,
        "weather_max_wind_speed": weather_max_wind_speed,
        "weather_high_count": weather_high_count,
        "weather_locations_monitored": weather_locations_monitored,
    }


def score_scenario(row: dict, rng: np.random.Generator) -> float:
    """
    Physics-informed ground-truth risk score (0-100).
    This plays the role that "actual historical outcome" would
    play if we had real records.
    """

    score = 0.0

    # --- Earthquake contribution ---
    # Damage potential grows steeply with magnitude (roughly
    # exponential, mirroring real seismic energy release).
    if row["eq_max_magnitude"] > 0:
        magnitude_component = max(0.0, row["eq_max_magnitude"] - 3.0) ** 2.2
        recency_decay = np.exp(-row["eq_recent_hours"] / 24.0)  # fresher = more relevant
        score += magnitude_component * (0.5 + 0.5 * recency_decay) * 3.2

    # --- Flood contribution ---
    score += row["flood_severity_score"] * 0.9

    # --- Weather contribution ---
    if row["weather_max_precip"] >= 30:
        score += (row["weather_max_precip"] - 30) * 1.1 + 25
    elif row["weather_max_precip"] >= 15:
        score += (row["weather_max_precip"] - 15) * 0.8 + 8

    if row["weather_max_wind_gust"] >= 80:
        score += (row["weather_max_wind_gust"] - 80) * 0.6 + 20
    elif row["weather_max_wind_gust"] >= 50:
        score += (row["weather_max_wind_gust"] - 50) * 0.3 + 5

    score += row["weather_high_count"] * 6

    # --- Compounding effect ---
    # Multiple simultaneous hazards are disproportionately worse
    # (e.g. earthquake-triggered landslides made worse by rain).
    active_hazards = sum([
        row["eq_max_magnitude"] > 4.0,
        row["flood_count"] > 0,
        row["weather_max_precip"] >= 15 or row["weather_max_wind_gust"] >= 50,
    ])
    if active_hazards >= 2:
        score *= 1.25
    if active_hazards >= 3:
        score *= 1.15

    # --- Real-world unpredictability ---
    score += rng.normal(0, 3.5)

    return float(np.clip(score, 0, 100))


def score_to_level(score: float) -> str:
    if score >= 55:
        return "CRITICAL"
    if score >= 30:
        return "HIGH"
    if score >= 12:
        return "MEDIUM"
    return "LOW"


def main():
    rng = np.random.default_rng(RANDOM_SEED)

    rows = []
    for _ in range(N_SAMPLES):
        scenario = simulate_scenario(rng)
        risk_score = score_scenario(scenario, rng)
        risk_level = score_to_level(risk_score)
        scenario["risk_score"] = round(risk_score, 2)
        scenario["risk_level"] = risk_level
        rows.append(scenario)

    df = pd.DataFrame(rows)
    df.to_csv("ml/training_data.csv", index=False)

    print(f"Generated {len(df)} training scenarios -> ml/training_data.csv")
    print(df["risk_level"].value_counts())


if __name__ == "__main__":
    main()
