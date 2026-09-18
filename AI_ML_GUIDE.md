# RAKSHAK AI — AI/ML Guide (Read This First)

## 0. What was actually broken with the frontend (read this if you're confused why nothing updated)

Your `index.html` was a **hand-built static HTML/CSS mockup** — it had no
`<script>` tag loading `main.jsx`, and no `id="root"` div. Vite was serving
that static file directly, so your real React app (`App.jsx`) never ran at
all, no matter what changes were made to it. This is why the dashboard
always showed the same fixed numbers ("105 / backend score") and why
clicking the sidebar did nothing — it was plain HTML with no JavaScript
behind it.

**Fixed**: `index.html` now correctly loads `main.jsx`, which mounts the
real `App.jsx`. Also added the three missing files your `App.jsx` was
importing but that didn't exist anywhere in your project:
`components/DisasterMap.jsx` (real Leaflet map), `components/WeatherDashboard.jsx`,
and `components/NepalStatus.jsx` (detailed event log). All three are real,
working components now, not placeholders.


## 1. What was broken, and what I fixed

`main.py` had two bugs stopping the app from starting:
- Line 10 imported `ai_risk_service`, a file that didn't exist.
- The `/api/nepal-status` route had broken indentation (a Python
  syntax error).

Both are fixed. The app now boots cleanly.

## 2. What "AI/ML" means in this project, concretely

Before, `nepal_status_service.py` used a **rule engine**: fixed
if/else thresholds ("magnitude >= 5 → HIGH"). That's not learning
anything — it's just hardcoded logic.

Now, `ai_risk_service.py` uses **three trained machine learning
models** that look at the combination of signals (not just one
threshold at a time) and learned, from data, how those signals
interact:

| Model | Type | Job |
|---|---|---|
| `risk_regressor.joblib` | Random Forest Regression | Predicts a continuous 0–100 risk score |
| `risk_classifier.joblib` | Random Forest Classification | Predicts LOW / MEDIUM / HIGH / CRITICAL |
| `weather_anomaly_detector.joblib` | Isolation Forest | Flags weather that looks statistically unusual, even if no single rule fires |

## 3. The honest part: where the training data comes from

There is no public, labeled "these exact conditions caused this much
damage in Nepal" dataset we can download. So `ml/generate_training_data.py`
**simulates** thousands of realistic disaster scenarios using real
hazard-science relationships (earthquake magnitude → damage curves,
rainfall/wind thresholds used by real weather agencies, and the fact
that multiple simultaneous hazards compound risk). The models are
trained to approximate that scoring logic from raw features alone.
This is a standard technique called **surrogate modeling** — used
whenever real outcome data is scarce.

**Upgrade path for later:** if you can get a real historical dataset
(Nepal's DesInventar disaster database, or your own logged RAKSHAK AI
alerts over time), swap it into `ml/training_data.csv` in the same
format and rerun `train_model.py`. Nothing else changes.

## 4. How the pieces fit together (the ML pipeline)

```
earthquake_service.py  \
flood_service.py        }---> main.py ---> ai_risk_service.py ---> models ---> response
weather_service.py     /
```

1. Your existing services fetch live data (unchanged).
2. `ai_risk_service.extract_features()` turns that raw data into
   the 11 numbers the models were trained on (magnitude, rainfall,
   wind, recency, etc.) — this step is called **feature engineering**
   and it's usually the most important part of any ML system.
3. The models predict a score, a category, and an anomaly flag.
4. `_explain()` turns the numbers back into plain language so the
   output isn't a black box.

## 5. Files added

```
ai_risk_service.py              <- the missing file main.py needed
ml/generate_training_data.py    <- builds the simulated training set
ml/train_model.py               <- trains and saves the 3 models
ml/training_data.csv            <- generated data (12,000 scenarios)
ml/models/*.joblib               <- trained models
ml/models/metadata.json          <- accuracy metrics, feature list
ml/models/feature_importance.json
requirements.txt                 <- Python dependencies
```

## 6. Running it yourself

```bash
# one-time setup
pip install -r requirements.txt

# (re)train the models — only needed once, or after changing the data
python ml/generate_training_data.py
python ml/train_model.py

# run the backend
uvicorn main:app --reload

# in another terminal, run the frontend
npm install
npm run dev
```

Then visit `http://localhost:5173`.

## 7. What the new API response looks like

`GET /api/nepal-status` now includes an `ai_details` block:

```json
{
  "status": "CRITICAL",
  "risk_score": 78.4,
  "assessment_type": "AI_ML_ENGINE",
  "is_ai_generated": true,
  "ai_details": {
    "model_confidence": 0.737,
    "class_probabilities": {"CRITICAL": 0.737, "HIGH": 0.238, ...},
    "weather_anomaly_detected": true,
    "explanation": [
      "Strong earthquake activity detected (max magnitude 6.4)",
      "Very heavy rainfall detected (45mm)",
      "Multiple simultaneous hazards detected - compounded risk"
    ]
  }
}
```

Your frontend can display `explanation` directly as bullet points —
that's the "explainable AI" part that makes this trustworthy instead
of a mystery number.

## 8. Model performance (from training)

- Regressor: R² = 0.972 (explains 97% of score variance), MAE = 2.4 points
- Classifier: 94% overall accuracy, 94% recall on CRITICAL cases specifically
  (recall matters most here — missing a real CRITICAL is far worse than
  a false alarm)

## 9. Where to go next (in order of value)

1. **Prediction logging is now live** (`ml/prediction_log.jsonl`) — every
   real prediction the API makes gets appended automatically. Just let
   this run for weeks/months of real usage; it becomes your first real
   historical dataset. Once you have enough, you can eventually replace
   the simulated `ml/training_data.csv` with real logged data (ideally
   after manually labeling which predictions turned out to be real
   events vs false alarms) and retrain with `ml/train_model.py`.
2. **Wire `ai_details.explanation` into the React frontend** — done,
   see the AI RISK ASSESSMENT panel on the Overview page.
3. **Flood live feed** — done. `flood_service.py` now uses Open-Meteo's
   free Global Flood API (GloFAS data), comparing each monitored
   location's river discharge to its own 30-day baseline. See section 10.
4. **Time-series forecasting** (e.g. "risk trending up over 6 hours")
   using the alert history you're already storing in `current_alerts`.
5. **Model monitoring** — track prediction confidence over time to
   catch when the model starts seeing patterns very unlike its
   training data (a sign it needs retraining).

## 10. How the flood feed works

`flood_service.py` calls Open-Meteo's free Flood API (no key needed,
same as weather) for all 21 monitored locations in one batched request.
It gets each location's simulated river discharge (m³/s) for the last
30 days plus today, powered by GloFAS — the same global flood-modeling
system real agencies use.

**Why "ratio to baseline" instead of a fixed number?** A big river
naturally carries far more water than a small one, so a raw discharge
number means nothing across different rivers. Instead, each location is
compared to its OWN recent normal:

```
ratio = today's discharge / that river's 30-day median discharge
```

| Ratio | Severity |
|---|---|
| < 1.5x | LOW (not shown as an alert) |
| 1.5x – 2.5x | MEDIUM |
| 2.5x – 4x | HIGH |
| ≥ 4x | CRITICAL |

These thresholds are a reasonable starting point, not an officially
calibrated Nepal-specific standard — adjust `discharge_ratio_to_severity()`
in `flood_service.py` if better local data becomes available. The
`DHM_FLOOD_MONITOR_URL` constant is kept as a placeholder in case a real
machine-readable Nepal DHM feed becomes available later; GloFAS is a
credible global stand-in until then.

Ask me about any of these when you're ready — we'll do them the same
way: understand the data first, then build the smallest correct
version, then test it before adding the next layer.
