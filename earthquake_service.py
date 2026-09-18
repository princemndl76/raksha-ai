import httpx
from datetime import datetime, timezone


# USGS feed containing earthquakes from the past day
USGS_URL = (
    "https://earthquake.usgs.gov/"
    "earthquakes/feed/v1.0/summary/"
    "all_day.geojson"
)


# Approximate geographic monitoring region around Nepal.
# This is only a screening region, NOT an official hazard boundary.
NEPAL_MIN_LAT = 26.0
NEPAL_MAX_LAT = 31.5
NEPAL_MIN_LON = 79.0
NEPAL_MAX_LON = 89.0


def is_nepal_region(latitude: float, longitude: float) -> bool:
    """
    Check whether an earthquake falls inside
    the approximate Nepal monitoring region.
    """

    return (
        NEPAL_MIN_LAT <= latitude <= NEPAL_MAX_LAT
        and
        NEPAL_MIN_LON <= longitude <= NEPAL_MAX_LON
    )


def calculate_severity(magnitude: float) -> str:
    """
    Convert earthquake magnitude into a simple
    application-level severity label.

    This is NOT an official earthquake warning system.
    """

    if magnitude >= 5.0:
        return "HIGH"

    if magnitude >= 3.0:
        return "MEDIUM"

    return "LOW"


async def get_earthquakes():
    """
    Fetch earthquake data from USGS and return
    only earthquakes inside the Nepal monitoring region.
    """

    try:

        async with httpx.AsyncClient(
            timeout=15.0
        ) as client:

            response = await client.get(
                USGS_URL
            )

            response.raise_for_status()

            data = response.json()


        earthquakes = []


        for feature in data.get(
            "features",
            []
        ):

            properties = feature.get(
                "properties",
                {}
            )

            geometry = feature.get(
                "geometry",
                {}
            )

            coordinates = geometry.get(
                "coordinates",
                []
            )


            # Make sure latitude and longitude exist
            if len(coordinates) < 2:
                continue


            longitude = coordinates[0]
            latitude = coordinates[1]
            depth_km = float(coordinates[2]) if len(coordinates) > 2 and coordinates[2] is not None else 10.0

            # Ignore invalid coordinates
            if latitude is None or longitude is None:
                continue

            magnitude = properties.get(
                "mag"
            )

            # Ignore events without magnitude
            if magnitude is None:
                continue

            # ========================================
            # NEPAL REGION FILTER
            # ========================================

            if not is_nepal_region(
                latitude,
                longitude
            ):
                continue

            # ========================================
            # EVENT INFORMATION & 3D HYPOCENTER METRICS
            # ========================================

            place = properties.get(
                "place",
                "Unknown location"
            )

            event_time = properties.get(
                "time"
            )

            if event_time:
                timestamp = datetime.fromtimestamp(
                    event_time / 1000,
                    tz=timezone.utc
                ).isoformat()
            else:
                timestamp = datetime.now(
                    timezone.utc
                ).isoformat()

            severity = calculate_severity(
                magnitude
            )

            # Determine depth category (critical for mountain disaster severity)
            if depth_km < 20.0:
                depth_category = "SHALLOW (<20km - High Surface Rupture Risk)"
            elif depth_km <= 70.0:
                depth_category = "INTERMEDIATE (20-70km)"
            else:
                depth_category = "DEEP (>70km)"

            # Estimate Modified Mercalli Intensity (MMI)
            if magnitude >= 7.5:
                mmi = "IX - Violent"
            elif magnitude >= 6.5:
                mmi = "VIII - Severe"
            elif magnitude >= 5.5:
                mmi = "VII - Very Strong"
            elif magnitude >= 4.5:
                mmi = "V - Moderate"
            else:
                mmi = "III - Light"

            # ========================================
            # CREATE RAKSHAK AI EVENT WITH 3D TELEMETRY
            # ========================================

            earthquake = {
                "id": feature.get("id"),
                "type": "EARTHQUAKE",
                "region": "NEPAL_MONITORING_ZONE",
                "severity": severity,
                "title": f"Earthquake M{magnitude}",
                "message": (
                    f"Earthquake detected near {place} (Depth: {depth_km:.1f} km, {depth_category})"
                ),
                "location": place,
                "latitude": latitude,
                "longitude": longitude,
                "depth": round(depth_km, 1),
                "depth_category": depth_category,
                "magnitude": magnitude,
                "mmi": mmi,
                "fault_system": "Main Himalayan Thrust (MHT)",
                "source": "USGS",
                "timestamp": timestamp,
            }


            earthquakes.append(
                earthquake
            )


        # Newest events first
        earthquakes.sort(
            key=lambda event: event["timestamp"],
            reverse=True
        )


        return earthquakes


    except httpx.HTTPError as error:

        print(
            "USGS HTTP error:",
            error
        )

        return []


    except Exception as error:

        print(
            "Earthquake API error:",
            error
        )

        return []