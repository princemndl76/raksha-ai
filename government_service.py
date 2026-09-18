"""
RAKSHAK AI - Government Operations & Critical Infrastructure Service
=====================================================================
Provides National Emergency Operation Centre (NEOC) & Ministry of Home Affairs (MoHA)
grade data structures, critical infrastructure monitoring, standard UN OCHA / NEOC
SITREP generation, and Inter-Agency Incident Command System (ICS) telemetry.
"""

from datetime import datetime, timezone
import hashlib
from casualty_service import get_casualty_recovery_data

# =====================================================================
# CRITICAL INFRASTRUCTURE (3D GEOLOCATED)
# =====================================================================

CRITICAL_INFRASTRUCTURE = [
    # Hydropower Dams & Reservoirs
    {
        "id": "dam-kulekhani",
        "name": "Kulekhani Hydropower Reservoir",
        "type": "DAM",
        "district": "Makwanpur",
        "province": "Bagmati",
        "latitude": 27.6042,
        "longitude": 85.1578,
        "elevation_m": 1530,
        "capacity_mw": 60,
        "risk_threshold_level": "92% Full",
        "status": "OPERATIONAL",
        "vulnerability": "High siltation and seismic rupture sensitivity",
    },
    {
        "id": "dam-uppertamakoshi",
        "name": "Upper Tamakoshi Hydropower Dam",
        "type": "DAM",
        "district": "Dolakha",
        "province": "Bagmati",
        "latitude": 27.8864,
        "longitude": 86.1558,
        "elevation_m": 1980,
        "capacity_mw": 456,
        "risk_threshold_level": "High River Discharge",
        "status": "OPERATIONAL",
        "vulnerability": "Glacial Lake Outburst Flood (GLOF) corridor",
    },
    {
        "id": "dam-kaligandaki",
        "name": "Kali Gandaki 'A' Hydroelectric Plant",
        "type": "DAM",
        "district": "Syangja",
        "province": "Gandaki",
        "latitude": 27.9944,
        "longitude": 83.6067,
        "elevation_m": 530,
        "capacity_mw": 144,
        "risk_threshold_level": "Normal Flow",
        "status": "OPERATIONAL",
        "vulnerability": "Monsoon debris torrent susceptibility",
    },
    {
        "id": "dam-trishuli",
        "name": "Trishuli Hydropower Station & Barrage",
        "type": "DAM",
        "district": "Nuwakot",
        "province": "Bagmati",
        "latitude": 27.9167,
        "longitude": 85.1500,
        "elevation_m": 600,
        "capacity_mw": 24,
        "risk_threshold_level": "High Inflow Alert",
        "status": "OPERATIONAL",
        "vulnerability": "Prithvi Highway lifeline corridor proximity",
    },

    # Strategic Lifeline Highways & Mountain Passes
    {
        "id": "hwy-prithvi",
        "name": "Prithvi Highway (Kathmandu-Pokhara Corridor)",
        "type": "HIGHWAY_LIFELINE",
        "district": "Dhading / Chitwan",
        "province": "Bagmati / Gandaki",
        "latitude": 27.8080,
        "longitude": 84.7350,
        "elevation_m": 480,
        "critical_junction": "Mugling Bridge & Narayangarh Gorge",
        "status": "CAUTION_LANDSLIDE_PRONE",
        "vulnerability": "Primary national food & fuel lifeline",
    },
    {
        "id": "hwy-araniko",
        "name": "Araniko Highway (Kodari - China Border)",
        "type": "HIGHWAY_LIFELINE",
        "district": "Sindhupalchok",
        "province": "Bagmati",
        "latitude": 27.9400,
        "longitude": 85.9400,
        "elevation_m": 1650,
        "critical_junction": "Bhotekoshi Gorge",
        "status": "HIGH_LANDSLIDE_RISK",
        "vulnerability": "Active geological fault rupture zone",
    },
    {
        "id": "hwy-bp",
        "name": "B.P. Koirala Highway (Mid-Hills Corridor)",
        "type": "HIGHWAY_LIFELINE",
        "district": "Kavrepalanchok / Sindhuli",
        "province": "Bagmati",
        "latitude": 27.3500,
        "longitude": 85.8000,
        "elevation_m": 1200,
        "critical_junction": "Roshi River Valley",
        "status": "OPERATIONAL",
        "vulnerability": "Flash flood embankment erosion",
    },

    # Civil & Military Strategic Airfields / Helipads
    {
        "id": "air-tia",
        "name": "Tribhuvan International Airport (TIA Command)",
        "type": "AIRFIELD_HELIPAD",
        "district": "Kathmandu",
        "province": "Bagmati",
        "latitude": 27.6966,
        "longitude": 85.3591,
        "elevation_m": 1338,
        "capabilities": "Heavy Transport (C-130), Nepal Army 11th Air Brigade",
        "helipads": 12,
        "status": "PRIMARY_HUB",
    },
    {
        "id": "air-pokhara",
        "name": "Pokhara International Airport",
        "type": "AIRFIELD_HELIPAD",
        "district": "Kaski",
        "province": "Gandaki",
        "latitude": 28.1889,
        "longitude": 83.9889,
        "elevation_m": 827,
        "capabilities": "Regional Airlift & Annapurna High-Altitude Rescue Base",
        "helipads": 6,
        "status": "OPERATIONAL",
    },
    {
        "id": "air-surkhet",
        "name": "Surkhet Army Aviation Base (Karnali Hub)",
        "type": "AIRFIELD_HELIPAD",
        "district": "Surkhet",
        "province": "Karnali",
        "latitude": 28.5861,
        "longitude": 81.6361,
        "elevation_m": 720,
        "capabilities": "Western Nepal Emergency Forward Operations",
        "helipads": 8,
        "status": "FORWARD_BASE",
    },
    {
        "id": "air-lukla",
        "name": "Tenzing-Hillary High-Altitude Airfield",
        "type": "AIRFIELD_HELIPAD",
        "district": "Solukhumbu",
        "province": "Koshi",
        "latitude": 27.6881,
        "longitude": 86.7314,
        "elevation_m": 2845,
        "capabilities": "STOL & High-Altitude AS350 B3 Rescue",
        "helipads": 4,
        "status": "MOUNTAIN_OPERATIONAL",
    },

    # Referral Medical Emergency Centers
    {
        "id": "med-tuth",
        "name": "Tribhuvan University Teaching Hospital (TUTH)",
        "type": "EMERGENCY_HOSPITAL",
        "district": "Kathmandu",
        "province": "Bagmati",
        "latitude": 27.7360,
        "longitude": 85.3300,
        "elevation_m": 1350,
        "trauma_beds": 250,
        "helipad_available": True,
        "status": "ACTIVE_TRAUMA_CENTER",
    },
    {
        "id": "med-bpkihs",
        "name": "B.P. Koirala Institute of Health Sciences",
        "type": "EMERGENCY_HOSPITAL",
        "district": "Sunsari",
        "province": "Koshi",
        "latitude": 26.8167,
        "longitude": 87.2833,
        "elevation_m": 350,
        "trauma_beds": 300,
        "helipad_available": True,
        "status": "ACTIVE_TRAUMA_CENTER",
    },
    {
        "id": "med-wrh",
        "name": "Western Regional Hospital",
        "type": "EMERGENCY_HOSPITAL",
        "district": "Kaski",
        "province": "Gandaki",
        "latitude": 28.2100,
        "longitude": 83.9900,
        "elevation_m": 840,
        "trauma_beds": 200,
        "helipad_available": True,
        "status": "ACTIVE_TRAUMA_CENTER",
    },
]

# Himalayan Tectonic Fault Trace (Main Himalayan Thrust - MHT / MBT)
TECTONIC_FAULT_LINE = [
    {"lat": 29.5, "lon": 80.5, "name": "Far-Western Segment (MHT)"},
    {"lat": 29.0, "lon": 82.0, "name": "Karnali Segment"},
    {"lat": 28.4, "lon": 83.8, "name": "Pokhara - Gandaki Fault Zone"},
    {"lat": 28.1, "lon": 84.8, "name": "Gorkha 2015 Rupture Zone"},
    {"lat": 27.8, "lon": 85.9, "name": "Sindhupalchok - Kodari Segment"},
    {"lat": 27.4, "lon": 87.2, "name": "Koshi - Eastern Segment"},
    {"lat": 27.1, "lon": 88.3, "name": "Sikkim Border Junction"},
]

# =====================================================================
# INTER-AGENCY ASSETS INVENTORY
# =====================================================================

INTER_AGENCY_RESOURCES = {
    "nepal_army": {
        "agency": "Nepal Army Disaster Management Directorate",
        "air_fleet": [
            {"type": "Mil Mi-17", "count": 6, "role": "Heavy Lift / Mass Evacuation", "readiness": "90%"},
            {"type": "Bell 407", "count": 4, "role": "Reconnaissance & Rapid Evacuation", "readiness": "100%"},
            {"type": "HAL Dhruv", "count": 2, "role": "High-Altitude Medical Rescue", "readiness": "75%"},
        ],
        "specialist_battalions": 4,
        "personnel_deployed": 1250,
        "mobile_bailey_bridges": 8,
    },
    "armed_police_force": {
        "agency": "Armed Police Force (APF) Disaster Management Base",
        "kurintar_training_school": "Active Rapid Response",
        "swift_water_rescue_teams": 18,
        "deep_divers": 45,
        "personnel_ready": 850,
        "inflatable_rescue_boats": 34,
    },
    "nepal_red_cross": {
        "agency": "Nepal Red Cross Society (NRCS) Emergency Relief",
        "emergency_tents": 12500,
        "water_purification_units": 45,
        "trauma_first_aid_kits": 5000,
        "volunteer_network": 8200,
    },
}

# =====================================================================
# SITREP (SITUATION REPORT) COMPILER
# =====================================================================

def generate_government_sitrep(
    risk_score: float,
    status_level: str,
    earthquakes: list,
    floods: list,
    weather_alerts: list,
) -> dict:
    """
    Generates a formal, official National Disaster Situation Report (SITREP)
    matching UN OCHA & NEOC Nepal guidelines.
    """
    now = datetime.now(timezone.utc)
    report_id = f"SITREP-NEOC-{now.strftime('%Y%m%d')}-{now.strftime('%H%M')}"
    raw_hash_input = f"{report_id}-{risk_score}-{status_level}"
    verification_hash = hashlib.sha256(raw_hash_input.encode()).hexdigest()[:16].upper()

    # Determine Disaster Level
    if risk_score >= 75 or status_level == "CRITICAL":
        disaster_level = "LEVEL 3 - NATIONAL EMERGENCY (Cabinet Mobilization)"
        color_code = "#EF4444"
        directive = "Immediate deployment of Nepal Army & APF search and rescue units; air operations clearance for Bagmati and Gandaki gorges."
    elif risk_score >= 50 or status_level == "HIGH":
        disaster_level = "LEVEL 2 - PROVINCIAL CRISIS (Joint Emergency Operations)"
        color_code = "#F97316"
        directive = "Activate District Emergency Operation Centers (DEOCs); pre-position excavator teams along lifeline highways."
    elif risk_score >= 25 or status_level == "MEDIUM":
        disaster_level = "LEVEL 1 - ELEVATED MONITORING (District Alert)"
        color_code = "#EAB308"
        directive = "Continuous hydrological monitoring on Koshi, Narayani, and Karnali river basins. Issue cell broadcast advisories."
    else:
        disaster_level = "ROUTINE WATCH (Normal Telemetry)"
        color_code = "#22C55E"
        directive = "Standard sensor sweep active across all 7 provinces."

    # Analyze affected districts
    affected_districts = set()
    for eq in earthquakes:
        loc = eq.get("location", "")
        if loc:
            affected_districts.add(loc)
    for fl in floods:
        dist = fl.get("district")
        if dist:
            affected_districts.add(dist)
    for wt in weather_alerts:
        dist = wt.get("district")
        if dist:
            affected_districts.add(dist)

    critical_dams_at_risk = [
        dam["name"] for dam in CRITICAL_INFRASTRUCTURE
        if dam["type"] == "DAM" and (risk_score > 40 or len(floods) > 0)
    ]

    # Fetch humanitarian life safety metrics
    casualty_data = get_casualty_recovery_data()
    life_safety = casualty_data.get("life_safety_summary", {})

    return {
        "sitrep_number": report_id,
        "verification_seal": f"NEOC-SHA256-{verification_hash}",
        "issuing_authority": "National Emergency Operation Centre (NEOC) / MoHA",
        "classification": "GOVERNMENT DISASTER SITUATION REPORT",
        "timestamp_utc": now.isoformat(),
        "timestamp_nepal": f"{now.strftime('%Y-%m-%d %H:%M:%S')} NPT (UTC+5:45)",
        "disaster_level": disaster_level,
        "national_risk_index": round(risk_score, 1),
        "status_code": status_level,
        "indicator_color": color_code,
        "executive_summary": (
            f"National situation assessment indicates {status_level} threat level with aggregate risk "
            f"index at {risk_score:.1f}/100. Seismic telemetry records {len(earthquakes)} regional events. "
            f"Hydrological stations flag {len(floods)} elevated river discharge anomalies. "
            f"Life safety records report {life_safety.get('rescued_alive', 0)} persons rescued alive, "
            f"{life_safety.get('deceased', 0)} confirmed fatalities, and {life_safety.get('displaced_sheltered', 0)} "
            f"individuals supported across emergency relief shelters. {directive}"
        ),
        "statistics": {
            "earthquake_events": len(earthquakes),
            "flood_basin_alerts": len(floods),
            "weather_warning_zones": len(weather_alerts),
            "districts_under_surveillance": len(affected_districts) or 1,
            "air_assets_on_standby": 12,
            "personnel_mobilized": 2100 if risk_score > 50 else 600,
            "rescued_alive": life_safety.get("rescued_alive", 0),
            "deceased": life_safety.get("deceased", 0),
            "hospitalized_critical": life_safety.get("hospitalized_critical", 0),
            "displaced_sheltered": life_safety.get("displaced_sheltered", 0),
            "missing_persons": life_safety.get("missing_persons", 0),
            "survival_rescue_rate_pct": life_safety.get("survival_rescue_rate_pct", 100),
        },
        "humanitarian_life_safety": life_safety,
        "affected_areas": list(affected_districts) or ["National Territory Wide"],
        "critical_infrastructure_assessment": {
            "monitored_dams": len([x for x in CRITICAL_INFRASTRUCTURE if x["type"] == "DAM"]),
            "dams_with_elevated_inflow": critical_dams_at_risk,
            "lifeline_highways_status": "Monitored with aerial and heavy road-clearance teams on standby",
            "medical_helipads_operational": "100% (TUTH, BPKIHS, WRH available)",
        },
        "inter_agency_resources": INTER_AGENCY_RESOURCES,
        "mandatory_actionable_directives": [
            "DEOCs to broadcast multilingual SMS warning alerts to high-vulnerability river settlements.",
            "Department of Roads rapid deployment division to station bulldozers at Mugling and Bhotekoshi.",
            "Nepal Army Aviation Wing to maintain two Mi-17 helicopters on 15-minute standby at TIA.",
            "Health Emergency Operation Center (HEOC) to verify trauma medicine stockpiles in provincial capitals.",
        ],
    }
