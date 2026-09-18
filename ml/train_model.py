"""
RAKSHAK AI - Model Training
============================

Trains THREE models from ml/training_data.csv:

1. RandomForestRegressor   -> predicts a continuous risk_score (0-100)
2. RandomForestClassifier  -> predicts a risk_level category
                               (LOW / MEDIUM / HIGH / CRITICAL)
3. IsolationForest         -> anomaly detector trained ONLY on weather
                               features, used for early-warning: flags
                               weather readings that look statistically
                               unusual even if no single rule fires.

WHY TWO MODELS FOR RISK (regressor + classifier) INSTEAD OF ONE?
- The regressor gives a smooth 0-100 score (good for dashboards,
  trend charts, comparing "62 vs 58").
- The classifier is trained and evaluated directly on the category
  boundaries, so its LOW/MEDIUM/HIGH/CRITICAL calls are more
  reliable than just re-bucketing the regressor's output.
Both are cheap to run, so we use each for what it's better at.

WHY RandomForest?
- Handles non-linear relationships and feature interactions
  (e.g. "magnitude matters more when recent") without needing
  us to hand-craft every interaction term.
- Robust to outliers and doesn't require feature scaling.
- Gives us feature_importances_, so we can explain WHY the model
  raised the alarm (important for a disaster system - a black
  box that just says "62% risk" with no explanation is not
  trustworthy for real decisions).

WHY IsolationForest for anomaly detection?
- It doesn't need labeled "anomaly" examples at all - it learns
  what "normal" looks like and flags points that are easy to
  isolate (few splits needed) as outliers. Good fit for catching
  weather patterns that don't match anything in training, even
  freak combinations we didn't explicitly simulate.
"""

import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

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

WEATHER_ANOMALY_COLUMNS = [
    "weather_max_precip",
    "weather_max_wind_gust",
    "weather_max_wind_speed",
]


def main():
    df = pd.read_csv("ml/training_data.csv")

    X = df[FEATURE_COLUMNS]
    y_score = df["risk_score"]
    y_level = df["risk_level"]

    X_train, X_test, yscore_train, yscore_test, ylevel_train, ylevel_test = train_test_split(
        X, y_score, y_level, test_size=0.2, random_state=42, stratify=y_level
    )

    # ---------------- Regressor ----------------
    regressor = RandomForestRegressor(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    regressor.fit(X_train, yscore_train)

    pred = regressor.predict(X_test)
    mae = mean_absolute_error(yscore_test, pred)
    r2 = r2_score(yscore_test, pred)
    print(f"[Regressor]  MAE: {mae:.2f}  R^2: {r2:.3f}")

    # ---------------- Classifier ----------------
    classifier = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        class_weight="balanced",   # rare classes (CRITICAL) matter just as much
        random_state=42,
        n_jobs=-1,
    )
    classifier.fit(X_train, ylevel_train)

    level_pred = classifier.predict(X_test)
    print("[Classifier] Report:")
    print(classification_report(ylevel_test, level_pred))

    # ---------------- Anomaly detector (weather only) ----------------
    anomaly_detector = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
    )
    anomaly_detector.fit(df[WEATHER_ANOMALY_COLUMNS])

    # ---------------- Feature importance (for explainability) ----------------
    importances = dict(zip(FEATURE_COLUMNS, regressor.feature_importances_.round(4)))
    importances = dict(sorted(importances.items(), key=lambda kv: -kv[1]))
    print("\n[Feature importance - regressor]")
    for name, value in importances.items():
        print(f"  {name:30s} {value}")

    # ---------------- Save everything ----------------
    joblib.dump(regressor, "ml/models/risk_regressor.joblib")
    joblib.dump(classifier, "ml/models/risk_classifier.joblib")
    joblib.dump(anomaly_detector, "ml/models/weather_anomaly_detector.joblib")

    with open("ml/models/feature_importance.json", "w") as f:
        json.dump(importances, f, indent=2)

    with open("ml/models/metadata.json", "w") as f:
        json.dump(
            {
                "feature_columns": FEATURE_COLUMNS,
                "weather_anomaly_columns": WEATHER_ANOMALY_COLUMNS,
                "regressor_mae": round(mae, 3),
                "regressor_r2": round(r2, 3),
                "class_labels": sorted(y_level.unique().tolist()),
            },
            f,
            indent=2,
        )

    print("\nSaved models to ml/models/")


if __name__ == "__main__":
    main()
