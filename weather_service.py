# ============================================================
# RAKSHAK AI - WEATHER SERVICE
# Open-Meteo based Nepal weather monitoring
# ============================================================

import asyncio
import httpx
from datetime import datetime, timezone


# ============================================================
# OPEN-METEO CONFIGURATION
# ============================================================

OPEN_METEO_URL = (
    "https://api.open-meteo.com/v1/forecast"
)


# ============================================================
# NEPAL MONITORING LOCATIONS
# ============================================================

NEPAL_LOCATIONS = [

    # ========================================================
    # KOSHI
    # ========================================================

    {
        "name": "Biratnagar",
        "province": "Koshi",
        "district": "Morang",
        "latitude": 26.4525,
        "longitude": 87.2718,
    },

    {
        "name": "Dharan",
        "province": "Koshi",
        "district": "Sunsari",
        "latitude": 26.8125,
        "longitude": 87.2836,
    },

    {
        "name": "Ilam",
        "province": "Koshi",
        "district": "Ilam",
        "latitude": 26.9094,
        "longitude": 87.9282,
    },

    # ========================================================
    # MADHESH
    # ========================================================

    {
        "name": "Janakpur",
        "province": "Madhesh",
        "district": "Dhanusha",
        "latitude": 26.7288,
        "longitude": 85.9263,
    },

    {
        "name": "Birgunj",
        "province": "Madhesh",
        "district": "Parsa",
        "latitude": 27.0000,
        "longitude": 84.8667,
    },

    {
        "name": "Rajbiraj",
        "province": "Madhesh",
        "district": "Saptari",
        "latitude": 26.5333,
        "longitude": 86.7333,
    },

    # ========================================================
    # BAGMATI
    # ========================================================

    {
        "name": "Kathmandu",
        "province": "Bagmati",
        "district": "Kathmandu",
        "latitude": 27.7172,
        "longitude": 85.3240,
    },

    {
        "name": "Hetauda",
        "province": "Bagmati",
        "district": "Makwanpur",
        "latitude": 27.4284,
        "longitude": 85.0322,
    },

    {
        "name": "Dhulikhel",
        "province": "Bagmati",
        "district": "Kavrepalanchok",
        "latitude": 27.6210,
        "longitude": 85.5397,
    },

    # ========================================================
    # GANDAKI
    # ========================================================

    {
        "name": "Pokhara",
        "province": "Gandaki",
        "district": "Kaski",
        "latitude": 28.2096,
        "longitude": 83.9856,
    },

    {
        "name": "Gorkha",
        "province": "Gandaki",
        "district": "Gorkha",
        "latitude": 28.0000,
        "longitude": 84.6333,
    },

    {
        "name": "Baglung",
        "province": "Gandaki",
        "district": "Baglung",
        "latitude": 28.2667,
        "longitude": 83.6000,
    },

    # ========================================================
    # LUMBINI
    # ========================================================

    {
        "name": "Butwal",
        "province": "Lumbini",
        "district": "Rupandehi",
        "latitude": 27.7006,
        "longitude": 83.4484,
    },

    {
        "name": "Nepalgunj",
        "province": "Lumbini",
        "district": "Banke",
        "latitude": 28.0500,
        "longitude": 81.6167,
    },

    {
        "name": "Bhairahawa",
        "province": "Lumbini",
        "district": "Rupandehi",
        "latitude": 27.5050,
        "longitude": 83.4163,
    },

    # ========================================================
    # KARNALI
    # ========================================================

    {
        "name": "Surkhet",
        "province": "Karnali",
        "district": "Surkhet",
        "latitude": 28.6000,
        "longitude": 81.6333,
    },

    {
        "name": "Jumla",
        "province": "Karnali",
        "district": "Jumla",
        "latitude": 29.2747,
        "longitude": 82.1838,
    },

    {
        "name": "Dailekh",
        "province": "Karnali",
        "district": "Dailekh",
        "latitude": 28.8448,
        "longitude": 81.7100,
    },

    # ========================================================
    # SUDURPASHCHIM
    # ========================================================

    {
        "name": "Dhangadhi",
        "province": "Sudurpashchim",
        "district": "Kailali",
        "latitude": 28.6833,
        "longitude": 80.6000,
    },

    {
        "name": "Dadeldhura",
        "province": "Sudurpashchim",
        "district": "Dadeldhura",
        "latitude": 29.2988,
        "longitude": 80.5806,
    },

    {
        "name": "Mahendranagar",
        "province": "Sudurpashchim",
        "district": "Kanchanpur",
        "latitude": 28.9630,
        "longitude": 80.1775,
    },
]


# ============================================================
# WMO WEATHER CODE DESCRIPTION
# ============================================================

def weather_code_description(code: int | None) -> str:

    descriptions = {

        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",

        45: "Fog",
        48: "Rime fog",

        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",

        56: "Light freezing drizzle",
        57: "Dense freezing drizzle",

        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",

        66: "Light freezing rain",
        67: "Heavy freezing rain",

        71: "Slight snowfall",
        73: "Moderate snowfall",
        75: "Heavy snowfall",

        77: "Snow grains",

        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",

        85: "Slight snow showers",
        86: "Heavy snow showers",

        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }

    return descriptions.get(
        code,
        "Unknown weather"
    )


# ============================================================
# WEATHER SEVERITY
# ============================================================

def calculate_weather_severity(
    precipitation: float | None,
    wind_speed: float | None,
    wind_gusts: float | None,
    weather_code: int | None,
) -> str:

    precipitation = precipitation or 0
    wind_speed = wind_speed or 0
    wind_gusts = wind_gusts or 0
    weather_code = weather_code or 0

    # Severe thunderstorm
    if weather_code in {95, 96, 99}:
        return "HIGH"

    # Very heavy precipitation
    if precipitation >= 30:
        return "HIGH"

    # Strong wind
    if wind_gusts >= 80 or wind_speed >= 60:
        return "HIGH"

    # Significant rain
    if precipitation >= 15:
        return "MEDIUM"

    # Normal weather
    return "LOW"


# ============================================================
# SAFE LIST ACCESS
# ============================================================

def value_at(
    values: list,
    index: int,
):
    if index < len(values):
        return values[index]

    return None


# ============================================================
# SAFE NUMERIC VALUE
# ============================================================

def _safe_num(
    value,
    default=0,
):
    return default if value is None else value


# ============================================================
# WEATHER CACHE TO PREVENT 429 RATE LIMITS
# ============================================================
import time

_last_weather_cache = []
_last_weather_cache_time = 0


# ============================================================
# GET WEATHER FOR ALL NEPAL LOCATIONS
# ============================================================

async def get_weather():
    global _last_weather_cache, _last_weather_cache_time
    now = time.time()

    # Serve cached weather if fetched within last 180 seconds (3 minutes)
    if _last_weather_cache and (now - _last_weather_cache_time) < 180:
        return _last_weather_cache

    weather_events = []

    # ========================================================
    # BUILD MULTI-LOCATION REQUEST
    # ========================================================

    latitude = ",".join(
        str(location["latitude"])
        for location in NEPAL_LOCATIONS
    )

    longitude = ",".join(
        str(location["longitude"])
        for location in NEPAL_LOCATIONS
    )

    params = {

        "latitude": latitude,

        "longitude": longitude,

        # ----------------------------------------------------
        # CURRENT
        # ----------------------------------------------------

        "current": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation",
            "rain",
            "showers",
            "weather_code",
            "wind_speed_10m",
            "wind_gusts_10m",
            "wind_direction_10m",
        ]),

        # ----------------------------------------------------
        # HOURLY
        # ----------------------------------------------------

        "hourly": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
            "rain",
            "weather_code",
            "wind_speed_10m",
            "wind_gusts_10m",
        ]),

        # ----------------------------------------------------
        # DAILY
        # ----------------------------------------------------

        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "precipitation_sum",
            "rain_sum",
            "precipitation_probability_max",
            "weather_code",
        ]),

        "forecast_days": 7,

        "timezone": "Asia/Kathmandu",
    }

    # ========================================================
    # OPEN-METEO REQUEST
    # ========================================================

    retry_delays = [10, 20, 40]

    try:

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=10.0,
                read=30.0,
                write=30.0,
                pool=10.0,
            ),
            headers={
                "Accept": "application/json",
                "User-Agent": "RAKSHAK-AI/1.0",
            },
        ) as client:

            response = None

            for attempt in range(
                len(retry_delays) + 1
            ):

                response = await client.get(
                    OPEN_METEO_URL,
                    params=params,
                )

                # ------------------------------------------------
                # SUCCESS
                # ------------------------------------------------

                if response.status_code == 200:
                    break

                # ------------------------------------------------
                # RATE LIMIT
                # ------------------------------------------------

                if response.status_code == 429:

                    if attempt >= len(retry_delays):

                        print(
                            "⚠️ Open-Meteo rate limit still "
                            "active after retries."
                        )

                        return []

                    retry_after = response.headers.get(
                        "Retry-After"
                    )

                    if retry_after:

                        try:

                            wait_seconds = min(
                                int(retry_after),
                                60,
                            )

                        except ValueError:

                            wait_seconds = (
                                retry_delays[attempt]
                            )

                    else:

                        wait_seconds = (
                            retry_delays[attempt]
                        )

                    print(
                        f"⚠️ Open-Meteo HTTP 429. "
                        f"Retrying in {wait_seconds}s "
                        f"(attempt "
                        f"{attempt + 1}/"
                        f"{len(retry_delays)})..."
                    )

                    await asyncio.sleep(
                        wait_seconds
                    )

                    continue

                # ------------------------------------------------
                # OTHER HTTP ERROR
                # ------------------------------------------------

                print(
                    f"❌ Open-Meteo HTTP "
                    f"{response.status_code}: "
                    f"{response.text[:500]}"
                )

                return []

            if response is None:

                print(
                    "❌ No response received "
                    "from Open-Meteo."
                )

                return []

            if response.status_code != 200:

                print(
                    "❌ Open-Meteo did not return "
                    "HTTP 200."
                )

                return []

            data = response.json()

    # ========================================================
    # EXCEPTIONS
    # ========================================================

    except httpx.TimeoutException as error:

        print(
            "❌ Open-Meteo timeout:",
            error
        )

        return []

    except httpx.HTTPError as error:

        print(
            "❌ Open-Meteo HTTP error:",
            error
        )

        return []

    except Exception as error:

        print(
            "❌ Weather request error:",
            error
        )

        return []

    # ========================================================
    # NORMALIZE RESPONSE
    # ========================================================

    if isinstance(data, dict):

        data = [data]

    if not isinstance(data, list):

        print(
            "❌ Unexpected Open-Meteo "
            "response format."
        )

        return []

    if len(data) == 0:

        print(
            "⚠️ Open-Meteo returned "
            "zero locations."
        )

        return []

    print(
        f"ℹ️ Open-Meteo returned "
        f"{len(data)} location responses."
    )

    # ========================================================
    # PROCESS LOCATIONS
    # ========================================================

    for index, location in enumerate(
        NEPAL_LOCATIONS
    ):

        if index >= len(data):
            break

        location_data = data[index]

        if not isinstance(
            location_data,
            dict
        ):

            print(
                f"⚠️ Invalid payload for "
                f"{location['name']}"
            )

            continue

        current = location_data.get(
            "current",
            {}
        ) or {}

        hourly = location_data.get(
            "hourly",
            {}
        ) or {}

        daily = location_data.get(
            "daily",
            {}
        ) or {}

        # ====================================================
        # CURRENT WEATHER
        # ====================================================

        temperature = current.get(
            "temperature_2m"
        )

        feels_like = current.get(
            "apparent_temperature"
        )

        humidity = current.get(
            "relative_humidity_2m"
        )

        precipitation = _safe_num(
            current.get("precipitation")
        )

        rain = _safe_num(
            current.get("rain")
        )

        showers = _safe_num(
            current.get("showers")
        )

        weather_code = current.get(
            "weather_code"
        )

        wind_speed = _safe_num(
            current.get("wind_speed_10m")
        )

        wind_gusts = _safe_num(
            current.get("wind_gusts_10m")
        )

        wind_direction = current.get(
            "wind_direction_10m"
        )

        severity = calculate_weather_severity(
            precipitation=precipitation,
            wind_speed=wind_speed,
            wind_gusts=wind_gusts,
            weather_code=_safe_num(
                weather_code
            ),
        )

        current_weather_desc = (
            weather_code_description(
                weather_code
            )
            if weather_code is not None
            else "Unknown"
        )

        # ====================================================
        # HOURLY ARRAYS
        # ====================================================

        hourly_times = hourly.get(
            "time",
            []
        )

        hourly_temperatures = hourly.get(
            "temperature_2m",
            []
        )

        hourly_apparent_temperatures = (
            hourly.get(
                "apparent_temperature",
                []
            )
        )

        hourly_rain_probability = (
            hourly.get(
                "precipitation_probability",
                []
            )
        )

        hourly_precipitation = hourly.get(
            "precipitation",
            []
        )

        hourly_rain = hourly.get(
            "rain",
            []
        )

        hourly_weather_codes = hourly.get(
            "weather_code",
            []
        )

        hourly_wind_speed = hourly.get(
            "wind_speed_10m",
            []
        )

        hourly_wind_gusts = hourly.get(
            "wind_gusts_10m",
            []
        )

        # ====================================================
        # 24-HOUR FORECAST
        # ====================================================

        forecast_24h = []

        hourly_limit = min(
            24,
            len(hourly_times)
        )

        for hour_index in range(
            hourly_limit
        ):

            hourly_code = value_at(
                hourly_weather_codes,
                hour_index,
            )

            forecast_24h.append({

                "time": value_at(
                    hourly_times,
                    hour_index,
                ),

                "temperature": value_at(
                    hourly_temperatures,
                    hour_index,
                ),

                "feels_like": value_at(
                    hourly_apparent_temperatures,
                    hour_index,
                ),

                "rain_probability": value_at(
                    hourly_rain_probability,
                    hour_index,
                ),

                "precipitation": value_at(
                    hourly_precipitation,
                    hour_index,
                ),

                "rain": value_at(
                    hourly_rain,
                    hour_index,
                ),

                "weather_code": hourly_code,

                "weather": (
                    weather_code_description(
                        hourly_code
                    )
                    if hourly_code is not None
                    else "Unknown"
                ),

                "wind_speed": value_at(
                    hourly_wind_speed,
                    hour_index,
                ),

                "wind_gusts": value_at(
                    hourly_wind_gusts,
                    hour_index,
                ),
            })

        # ====================================================
        # DAILY ARRAYS
        # ====================================================

        daily_times = daily.get(
            "time",
            []
        )

        daily_max_temperature = daily.get(
            "temperature_2m_max",
            []
        )

        daily_min_temperature = daily.get(
            "temperature_2m_min",
            []
        )

        daily_max_feels_like = daily.get(
            "apparent_temperature_max",
            []
        )

        daily_min_feels_like = daily.get(
            "apparent_temperature_min",
            []
        )

        daily_precipitation = daily.get(
            "precipitation_sum",
            []
        )

        daily_rain = daily.get(
            "rain_sum",
            []
        )

        daily_rain_probability = daily.get(
            "precipitation_probability_max",
            []
        )

        daily_weather_codes = daily.get(
            "weather_code",
            []
        )

        # ====================================================
        # 7-DAY FORECAST
        # ====================================================

        forecast_7d = []

        daily_limit = min(
            7,
            len(daily_times)
        )

        for day_index in range(
            daily_limit
        ):

            daily_code = value_at(
                daily_weather_codes,
                day_index,
            )

            forecast_7d.append({

                "date": value_at(
                    daily_times,
                    day_index,
                ),

                "max_temperature": value_at(
                    daily_max_temperature,
                    day_index,
                ),

                "min_temperature": value_at(
                    daily_min_temperature,
                    day_index,
                ),

                "max_feels_like": value_at(
                    daily_max_feels_like,
                    day_index,
                ),

                "min_feels_like": value_at(
                    daily_min_feels_like,
                    day_index,
                ),

                "precipitation": value_at(
                    daily_precipitation,
                    day_index,
                ),

                "rain": value_at(
                    daily_rain,
                    day_index,
                ),

                "rain_probability": value_at(
                    daily_rain_probability,
                    day_index,
                ),

                "weather_code": daily_code,

                "weather": (
                    weather_code_description(
                        daily_code
                    )
                    if daily_code is not None
                    else "Unknown"
                ),
            })

        # ====================================================
        # FINAL WEATHER EVENT
        # ====================================================

        weather_event = {

            "id": (
                f"weather-"
                f"{location['name']}"
            ),

            "type": "WEATHER",

            "severity": severity,

            "title": (
                f"Weather - "
                f"{location['name']}"
            ),

            "message": (
                f"{current_weather_desc} "
                f"in {location['name']}. "
                f"Current temperature: "
                f"{temperature}°C."
            ),

            "location": (
                f"{location['name']}, "
                f"{location['district']}, "
                f"Nepal"
            ),

            "province": location[
                "province"
            ],

            "district": location[
                "district"
            ],

            "latitude": location[
                "latitude"
            ],

            "longitude": location[
                "longitude"
            ],

            # ------------------------------------------------
            # CURRENT
            # ------------------------------------------------

            "current": {

                "temperature": temperature,

                "feels_like": feels_like,

                "humidity": humidity,

                "precipitation": precipitation,

                "rain": rain,

                "showers": showers,

                "weather_code": weather_code,

                "weather": current_weather_desc,

                "wind_speed": wind_speed,

                "wind_gusts": wind_gusts,

                "wind_direction": wind_direction,
            },

            # ------------------------------------------------
            # 24 HOUR
            # ------------------------------------------------

            "forecast_24h": forecast_24h,

            # ------------------------------------------------
            # 7 DAY
            # ------------------------------------------------

            "forecast_7d": forecast_7d,

            # ------------------------------------------------
            # SOURCE
            # ------------------------------------------------

            "source": "OPEN-METEO",

            "timestamp": (
                datetime.now(
                    timezone.utc
                ).isoformat()
            ),

            "is_test": False,
        }

        weather_events.append(
            weather_event
        )

    # ========================================================
    # FINAL
    # ========================================================

    print(
        f"✅ Weather loaded successfully: "
        f"{len(weather_events)} locations"
    )

    return weather_events