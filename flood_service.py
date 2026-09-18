"""
RAKSHAK AI - Flood Monitoring Service
=======================================

Uses Open-Meteo's free Global Flood API (https://open-meteo.com/en/docs/flood-api),
which is powered by GloFAS (Global Flood Awareness System) - the same
system used by real government flood-warning agencies worldwide. No API
key required, same as the weather service.

HOW SEVERITY IS DETERMINED
---------------------------
The Flood API gives simulated river discharge (m3/s) - how much water is
flowing through the nearest river to each location. A single discharge
number means nothing on its own (a big river naturally carries far more
water than a small one), so we compare TODAY's discharge to that same
river's own recent baseline (the median of the last 30 days at that
exact point). This ratio is what actually indicates a flood risk:

    ratio = today's discharge / that river's recent normal discharge

This mirrors how real hydrological flood warnings work - they alert on
anomalies relative to a river's own normal flow, not on an absolute
number that would be meaningless across different rivers.

DHM_FLOOD_MONITOR_URL is kept in case a real DHM (Nepal Department of
Hydrology and Meteorology) machine-readable feed becomes available
later - GloFAS is a credible global stand-in until then, not a
replacement for an official Nepal-specific warning system.
"""

import asyncio
from datetime import datetime, timezone

import httpx

from weather_service import NEPAL_LOCATIONS

FLOOD_API_URL = "https://flood-api.open-meteo.com/v1/flood"

DHM_FLOOD_MONITOR_URL = (
    "https://dhm.gov.np/hydrology/floodMonitoring"
)

# How many days of history to use as each river's "normal" baseline.
BASELINE_DAYS = 30


def discharge_ratio_to_severity(ratio: float) -> str:
    """
    Converts (today's discharge / recent baseline discharge) into a
    severity level. These thresholds are a reasonable, documented
    starting point (roughly: 50% above normal is worth watching, more
    than 4x normal is a serious event) - not an officially calibrated
    Nepal-specific standard. Adjust here if better local data emerges.
    """
    if ratio >= 4.0:
        return "CRITICAL"
    if ratio >= 2.5:
        return "HIGH"
    if ratio >= 1.5:
        return "MEDIUM"
    return "LOW"


async def get_flood_alerts():
    """
    Fetches river discharge for all monitored Nepal locations in a
    single batched request (Open-Meteo supports comma-separated
    coordinates, same pattern already used in weather_service.py),
    compares each to its own recent baseline, and returns an alert
    for any location at MEDIUM severity or above.

    Locations that are LOW severity (normal river flow) are not
    returned as alerts, matching the pattern of only surfacing
    events worth attention - same as how earthquake/weather do it.
    """

    latitude = ",".join(str(loc["latitude"]) for loc in NEPAL_LOCATIONS)
    longitude = ",".join(str(loc["longitude"]) for loc in NEPAL_LOCATIONS)

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "river_discharge",
        "past_days": BASELINE_DAYS,
        "forecast_days": 1,
        "timezone": "Asia/Kathmandu",
    }

    retry_delays = [10, 20, 40]

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=10.0, read=30.0, write=30.0, pool=10.0),
            headers={"Accept": "application/json", "User-Agent": "RAKSHAK-AI/1.0"},
        ) as client:

            response = None

            for attempt in range(len(retry_delays) + 1):
                response = await client.get(FLOOD_API_URL, params=params)

                if response.status_code == 200:
                    break

                if response.status_code == 429:
                    if attempt >= len(retry_delays):
                        print("WARNING: Open-Meteo Flood API rate limit still active after retries.")
                        return []

                    wait_seconds = retry_delays[attempt]
                    print(
                        f"WARNING: Open-Meteo Flood API HTTP 429. "
                        f"Retrying in {wait_seconds}s (attempt {attempt + 1}/{len(retry_delays)})..."
                    )
                    await asyncio.sleep(wait_seconds)
                    continue

                print(f"ERROR: Open-Meteo Flood API HTTP {response.status_code}: {response.text[:500]}")
                return []

            if response is None or response.status_code != 200:
                print("ERROR: No valid response from Open-Meteo Flood API.")
                return []

            data = response.json()

    except httpx.TimeoutException as error:
        print("ERROR: Open-Meteo Flood API timeout:", error)
        return []
    except httpx.HTTPError as error:
        print("ERROR: Open-Meteo Flood API HTTP error:", error)
        return []
    except Exception as error:
        print("ERROR: Flood request error:", error)
        return []

    # Single location -> API returns one object. Multiple -> a list.
    if isinstance(data, dict):
        data = [data]

    flood_events = []

    for location, result in zip(NEPAL_LOCATIONS, data):
        try:
            daily = result.get("daily", {})
            discharge_series = daily.get("river_discharge", [])

            if not discharge_series or len(discharge_series) < 2:
                continue

            # Last entry is "today" (forecast_days=1); everything
            # before that is the baseline history.
            today_discharge = discharge_series[-1]
            baseline_series = [v for v in discharge_series[:-1] if v is not None]

            if today_discharge is None or not baseline_series:
                continue

            baseline_sorted = sorted(baseline_series)
            mid = len(baseline_sorted) // 2
            baseline_median = (
                baseline_sorted[mid]
                if len(baseline_sorted) % 2 == 1
                else (baseline_sorted[mid - 1] + baseline_sorted[mid]) / 2
            )

            if baseline_median <= 0:
                continue

            ratio = today_discharge / baseline_median
            severity = discharge_ratio_to_severity(ratio)

            if severity == "LOW":
                continue

            flood_events.append({
                "id": f"flood-{location['name']}",
                "type": "FLOOD",
                "severity": severity,
                "title": f"Flood Risk - {location['name']}",
                "message": (
                    f"River discharge near {location['name']} is "
                    f"{today_discharge:.1f} m3/s, about {ratio:.1f}x its "
                    f"{BASELINE_DAYS}-day normal ({baseline_median:.1f} m3/s)."
                ),
                "location": f"{location['name']}, {location['district']}, Nepal",
                "province": location["province"],
                "district": location["district"],
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "river_discharge_m3s": round(today_discharge, 2),
                "baseline_discharge_m3s": round(baseline_median, 2),
                "discharge_ratio": round(ratio, 2),
                "source": "GLOFAS (via OPEN-METEO)",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_test": False,
            })

        except (KeyError, TypeError, IndexError, ZeroDivisionError) as error:
            print(f"WARNING: Skipped flood parsing for {location['name']}: {error}")
            continue

    return flood_events


# ============================================================
# DEVELOPMENT TEST FLOOD ALERT
# ============================================================

def create_test_flood_alert():
    """
    Development-only test flood alert.

    This is NOT a real emergency warning.
    """

    return {
        "id": (
            "test-flood-"
            f"{datetime.now().timestamp()}"
        ),
        "type": "FLOOD",
        "severity": "CRITICAL",
        "title": "RAKSHAK AI Flood Test",
        "message": (
            "Development flood alert. "
            "This is NOT a real emergency warning."
        ),
        "location": "Kathmandu, Nepal",
        "latitude": 27.7172,
        "longitude": 85.3240,
        "source": "RAKSHAK AI DEVELOPMENT",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat(),
        "is_test": True
    }
