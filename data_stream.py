from earthquake_service import get_earthquakes
from flood_service import get_flood_alerts
from weather_service import get_weather


# ============================================================
# RAKSHAK AI DATA STREAM
# ============================================================

async def collect_all_data():
    """
    Collect the latest data from all connected
    disaster-monitoring services.
    """

    earthquakes = await get_earthquakes()

    floods = await get_flood_alerts()

    weather = await get_weather()

    return {
        "earthquakes": earthquakes,
        "floods": floods,
        "weather": weather,
    }


# ============================================================
# STREAM STATISTICS
# ============================================================

def calculate_stream_statistics(
    data: dict
) -> dict:

    earthquakes = data.get(
        "earthquakes",
        []
    )

    floods = data.get(
        "floods",
        []
    )

    weather = data.get(
        "weather",
        []
    )

    high_critical = []

    for event in [
        *earthquakes,
        *floods,
        *weather,
    ]:

        severity = str(
            event.get(
                "severity",
                ""
            )
        ).upper()

        if severity in {
            "HIGH",
            "CRITICAL",
        }:

            high_critical.append(
                event
            )

    return {

        "earthquake_count": (
            len(earthquakes)
        ),

        "flood_count": (
            len(floods)
        ),

        "weather_count": (
            len(weather)
        ),

        "high_critical_count": (
            len(high_critical)
        ),

        "total_events": (
            len(earthquakes)
            + len(floods)
            + len(weather)
        ),
    }