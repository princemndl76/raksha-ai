from datetime import datetime, timezone


# ============================================================
# RAKSHAK AI - NEPAL SITUATION STATUS ENGINE
# ============================================================

SEVERITY_SCORE = {
    "LOW": 5,
    "MEDIUM": 15,
    "HIGH": 35,
    "CRITICAL": 60,
}


def get_severity_score(
    severity: str
) -> int:

    return SEVERITY_SCORE.get(
        str(severity).upper(),
        0
    )


def calculate_status(
    all_events: list[dict]
) -> tuple[str, int]:

    if not all_events:
        return "NORMAL", 0

    total_score = 0

    highest_severity = "LOW"

    severity_order = {
        "LOW": 1,
        "MEDIUM": 2,
        "HIGH": 3,
        "CRITICAL": 4,
    }

    for event in all_events:

        severity = str(
            event.get(
                "severity",
                "LOW"
            )
        ).upper()

        total_score += get_severity_score(
            severity
        )

        if severity_order.get(
            severity,
            0
        ) > severity_order.get(
            highest_severity,
            0
        ):

            highest_severity = severity

    if highest_severity == "CRITICAL":
        return "CRITICAL", total_score

    if highest_severity == "HIGH":
        return "WARNING", total_score

    if (
        highest_severity == "MEDIUM"
        or total_score >= 25
    ):

        return "WATCH", total_score

    return "NORMAL", total_score


def create_summary(
    status: str,
    earthquake_count: int,
    flood_count: int,
    weather_count: int,
    high_critical_count: int,
) -> str:

    if status == "CRITICAL":

        return (
            "Critical indicators are currently "
            "present in the connected monitoring data. "
            "Affected locations require immediate attention."
        )

    if status == "WARNING":

        return (
            "Elevated disaster or severe-weather "
            "indicators are currently being detected. "
            "Continue close monitoring."
        )

    if status == "WATCH":

        return (
            "Some developing environmental or disaster "
            "indicators are present. RAKSHAK AI is "
            "continuing active monitoring."
        )

    if (
        earthquake_count == 0
        and flood_count == 0
    ):

        return (
            "No current earthquake or flood alerts "
            "are available from the connected services. "
            f"Weather is being monitored across "
            f"{weather_count} locations."
        )

    return (
        "Current connected disaster indicators remain "
        "below the configured warning threshold."
    )


def build_nepal_status(
    earthquakes: list[dict],
    floods: list[dict],
    weather: list[dict] | None = None,
) -> dict:

    earthquakes = earthquakes or []

    floods = floods or []

    weather = weather or []

    all_events = [
        *earthquakes,
        *floods,
        *weather,
    ]

    status, risk_score = calculate_status(
        all_events
    )

    high_critical_count = sum(

        1

        for event in all_events

        if str(
            event.get(
                "severity",
                ""
            )
        ).upper() in {
            "HIGH",
            "CRITICAL",
        }

    )

    summary = create_summary(
        status=status,
        earthquake_count=len(
            earthquakes
        ),
        flood_count=len(
            floods
        ),
        weather_count=len(
            weather
        ),
        high_critical_count=(
            high_critical_count
        ),
    )

    return {

        "country": "Nepal",

        "status": status,

        "risk_score": risk_score,

        "summary": summary,

        "earthquakes": {
            "count": len(
                earthquakes
            ),
            "events": earthquakes,
        },

        "floods": {
            "count": len(
                floods
            ),
            "events": floods,
        },

        "weather": {
            "count": len(
                weather
            ),
            "locations": weather,
        },

        "high_critical_alerts": (
            high_critical_count
        ),

        "monitoring": {

            "earthquake": True,

            "flood": True,

            "weather": True,
        },

        "sources": [
            "USGS",
            "DHM",
            "OPEN-METEO",
        ],

        "assessment_type": (
            "SOURCE_BASED_RULE_ENGINE"
        ),

        "is_ai_generated": False,

        "last_updated": (
            datetime.now(
                timezone.utc
            ).isoformat()
        ),
    }