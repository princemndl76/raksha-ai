"""
RAKSHAK AI - Humanitarian Casualty, Recovery & Life Safety Service
===================================================================
Maintains government-grade humanitarian casualty records, search-and-rescue
recovery counts, hospital trauma/ICU capacities, missing persons registry,
and humanitarian relief distribution metrics across all 7 provinces of Nepal.
"""

from datetime import datetime, timezone
import uuid

# Global in-memory state for casualty & recovery tracking
CASUALTY_STATE = {
    "baseline": {
        "deceased": 18,
        "rescued_alive": 142,
        "hospitalized_critical": 34,
        "hospitalized_stable": 86,
        "displaced_shelter": 1840,
        "missing_persons": 27,
    },
    "drill_multiplier": 1.0,
    "active_drill": None,
}

# Breakdown by cause of death / injury
FATALITY_CAUSES = {
    "structural_collapse": {"count": 9, "label": "Building / Masonry Collapse", "pct": 50},
    "landslide_debris": {"count": 5, "label": "Mountain Landslide & Rockfall", "pct": 28},
    "flood_drowning": {"count": 3, "label": "River Torrent & Drowning", "pct": 17},
    "hypothermia_exposure": {"count": 1, "label": "High-Altitude Exposure", "pct": 5},
}

# Extraction Agency Breakdown
RESCUE_AGENCIES = {
    "nepal_army_air": {"rescued": 58, "label": "Nepal Army 11th Air Brigade (MI-17 / Bell 407)"},
    "apf_swift_water": {"rescued": 44, "label": "Armed Police Force (Kurintar Swift Water & Divers)"},
    "police_k9_sar": {"rescued": 26, "label": "Nepal Police K9 & Urban Search Teams"},
    "community_volunteers": {"rescued": 14, "label": "Red Cross & Local Community First Responders"},
}

# Referral Hospital Emergency Trauma & ICU Matrix
HOSPITAL_MATRIX = [
    {
        "id": "hosp-bir",
        "name": "Bir Hospital (National Trauma Center)",
        "location": "Kathmandu, Bagmati",
        "total_beds": 450,
        "occupied_beds": 380,
        "icu_total": 50,
        "icu_available": 6,
        "ventilators_free": 4,
        "blood_reserve": "Adequate (O+, A+ Critical Reserve)",
        "trauma_status": "HIGH_SURGE",
    },
    {
        "id": "hosp-tuth",
        "name": "Tribhuvan University Teaching Hospital (TUTH)",
        "location": "Maharajgunj, Kathmandu",
        "total_beds": 500,
        "occupied_beds": 415,
        "icu_total": 60,
        "icu_available": 9,
        "ventilators_free": 7,
        "blood_reserve": "Optimal",
        "trauma_status": "NORMAL_SURGE",
    },
    {
        "id": "hosp-wrh",
        "name": "Western Regional Hospital (Pokhara Academy)",
        "location": "Pokhara, Gandaki",
        "total_beds": 350,
        "occupied_beds": 290,
        "icu_total": 35,
        "icu_available": 4,
        "ventilators_free": 2,
        "blood_reserve": "Moderate (Requires B+ / O- Donors)",
        "trauma_status": "ELEVATED_SURGE",
    },
    {
        "id": "hosp-bpkihs",
        "name": "B.P. Koirala Institute of Health Sciences (BPKIHS)",
        "location": "Dharan, Koshi",
        "total_beds": 400,
        "occupied_beds": 310,
        "icu_total": 40,
        "icu_available": 8,
        "ventilators_free": 5,
        "blood_reserve": "Optimal",
        "trauma_status": "NORMAL_SURGE",
    },
    {
        "id": "hosp-patan",
        "name": "Patan Hospital (Academy of Health Sciences)",
        "location": "Lalitpur, Bagmati",
        "total_beds": 320,
        "occupied_beds": 265,
        "icu_total": 30,
        "icu_available": 5,
        "ventilators_free": 3,
        "blood_reserve": "Adequate",
        "trauma_status": "NORMAL_SURGE",
    },
]

# Provincial and District Breakdown
DISTRICT_CASUALTY_RECORDS = [
    {
        "district": "Gorkha",
        "province": "Gandaki",
        "deceased": 6,
        "rescued_alive": 42,
        "hospitalized": 24,
        "displaced": 480,
        "missing": 7,
        "primary_hazard": "Seismic Fault Rupture",
        "relief_camp_status": "3 Shelters Active",
    },
    {
        "district": "Sindhupalchok",
        "province": "Bagmati",
        "deceased": 5,
        "rescued_alive": 36,
        "hospitalized": 28,
        "displaced": 540,
        "missing": 9,
        "primary_hazard": "Landslide / Slope Failure",
        "relief_camp_status": "4 Shelters Active",
    },
    {
        "district": "Kathmandu Valley",
        "province": "Bagmati",
        "deceased": 3,
        "rescued_alive": 28,
        "hospitalized": 35,
        "displaced": 210,
        "missing": 3,
        "primary_hazard": "Structural Masonry / Urban",
        "relief_camp_status": "TUTH & Bir Forward Triage",
    },
    {
        "district": "Dolakha",
        "province": "Bagmati",
        "deceased": 2,
        "rescued_alive": 18,
        "hospitalized": 14,
        "displaced": 320,
        "missing": 4,
        "primary_hazard": "Tama Koshi GLOF Surge",
        "relief_camp_status": "Upper Valley High Ground Camp",
    },
    {
        "district": "Chitwan / Dhading",
        "province": "Bagmati",
        "deceased": 2,
        "rescued_alive": 18,
        "hospitalized": 19,
        "displaced": 290,
        "missing": 4,
        "primary_hazard": "Trishuli River Flash Flood",
        "relief_camp_status": "Mugling Relief Staging Hub",
    },
]

# Initial Missing Persons & Family Tracing Registry
MISSING_PERSONS_REGISTRY = [
    {
        "id": "MP-2026-0101",
        "full_name": "Ramesh Shrestha",
        "age": 34,
        "gender": "Male",
        "last_seen_district": "Barpak, Gorkha",
        "last_seen_location": "Ward 4 Market Area",
        "reported_by": "Sunita Shrestha (Spouse)",
        "contact_number": "+977-9841XXXXXX",
        "status": "UNDER_SEARCH",
        "registered_at": "2026-09-17T08:30:00Z",
        "notes": "Was near agricultural terrace when rockfall initiated.",
    },
    {
        "id": "MP-2026-0102",
        "full_name": "Pasang Tamang",
        "age": 28,
        "gender": "Female",
        "last_seen_district": "Sindhupalchok",
        "last_seen_location": "Bhotekoshi Riverside Camp",
        "reported_by": "Dawa Tamang (Brother)",
        "contact_number": "+977-9803XXXXXX",
        "status": "RESCUED_ALIVE",
        "registered_at": "2026-09-17T09:15:00Z",
        "notes": "Rescued by APF Kurintar boat crew; receiving minor wound dressing at local health post.",
    },
    {
        "id": "MP-2026-0103",
        "full_name": "Bikash Thapa",
        "age": 42,
        "gender": "Male",
        "last_seen_district": "Dhading",
        "last_seen_location": "Mugling - Trishuli Highway Cut",
        "reported_by": "Transport Syndicate Office",
        "contact_number": "+977-9812XXXXXX",
        "status": "HOSPITALIZED",
        "registered_at": "2026-09-17T11:00:00Z",
        "notes": "Admitted to Bharatpur Hospital trauma ward. Conscious and stable.",
    },
    {
        "id": "MP-2026-0104",
        "full_name": "Maya Gurung",
        "age": 19,
        "gender": "Female",
        "last_seen_district": "Gorkha",
        "last_seen_location": "Laprak Suspension Trail",
        "reported_by": "Karna Gurung (Father)",
        "contact_number": "+977-9846XXXXXX",
        "status": "UNDER_SEARCH",
        "registered_at": "2026-09-17T12:20:00Z",
        "notes": "Nepal Police K9 squad assigned to sector grid GP-04.",
    },
    {
        "id": "MP-2026-0105",
        "full_name": "Devi Prasad Kandel",
        "age": 55,
        "gender": "Male",
        "last_seen_district": "Dolakha",
        "last_seen_location": "Upper Tamakoshi Intake Road",
        "reported_by": "Project Safety Directorate",
        "contact_number": "+977-9851XXXXXX",
        "status": "REUNITED",
        "registered_at": "2026-09-17T07:45:00Z",
        "notes": "Found safe in upstream highland station; reunited with family.",
    },
]

# Humanitarian Relief Aid Logistics
RELIEF_AID_METRICS = {
    "food_rations_dispatched_tons": 42.5,
    "drinking_water_liters": 125000,
    "water_purification_tablets": 85000,
    "emergency_shelter_tents": 1650,
    "thermal_blankets_distributed": 4800,
    "trauma_first_aid_kits_issued": 1200,
    "active_relief_camps": 14,
}

# =====================================================================
# API METHODS
# =====================================================================

def get_casualty_recovery_data() -> dict:
    """
    Returns full humanitarian casualty and recovery status, incorporating
    any active drill multipliers.
    """
    mult = CASUALTY_STATE["drill_multiplier"]
    base = CASUALTY_STATE["baseline"]

    # Calculate current numbers
    current_deceased = int(base["deceased"] * mult)
    current_rescued = int(base["rescued_alive"] * mult)
    current_critical = int(base["hospitalized_critical"] * mult)
    current_stable = int(base["hospitalized_stable"] * mult)
    current_displaced = int(base["displaced_shelter"] * mult)
    current_missing = int(base["missing_persons"] * mult)

    # Compute recovery survival ratio
    total_victims = current_deceased + current_rescued
    survival_rate = round((current_rescued / total_victims * 100), 1) if total_victims > 0 else 100.0

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "is_drill_active": CASUALTY_STATE["active_drill"] is not None,
        "active_drill": CASUALTY_STATE["active_drill"],
        "life_safety_summary": {
            "rescued_alive": current_rescued,
            "deceased": current_deceased,
            "hospitalized_critical": current_critical,
            "hospitalized_stable": current_stable,
            "total_hospitalized": current_critical + current_stable,
            "displaced_sheltered": current_displaced,
            "missing_persons": current_missing,
            "survival_rescue_rate_pct": survival_rate,
        },
        "fatality_causes": FATALITY_CAUSES,
        "rescue_agencies": RESCUE_AGENCIES,
        "hospital_capacity": HOSPITAL_MATRIX,
        "district_records": DISTRICT_CASUALTY_RECORDS,
        "missing_persons": MISSING_PERSONS_REGISTRY,
        "relief_distribution": RELIEF_AID_METRICS,
    }


def report_missing_person(data: dict) -> dict:
    """
    Adds a new missing person report to the official national registry.
    """
    new_id = f"MP-2026-{str(uuid.uuid4().int)[:4]}"
    record = {
        "id": new_id,
        "full_name": data.get("full_name", "Anonymous / Unidentified"),
        "age": data.get("age", "--"),
        "gender": data.get("gender", "Unspecified"),
        "last_seen_district": data.get("last_seen_district", "Unknown"),
        "last_seen_location": data.get("last_seen_location", "Not specified"),
        "reported_by": data.get("reported_by", "Field Inquirer"),
        "contact_number": data.get("contact_number", "--"),
        "status": "UNDER_SEARCH",
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "notes": data.get("notes", "New emergency intake report."),
    }

    MISSING_PERSONS_REGISTRY.insert(0, record)
    CASUALTY_STATE["baseline"]["missing_persons"] += 1

    return {
        "status": "SUCCESS",
        "message": f"Missing person {record['full_name']} registered successfully with ID {new_id}",
        "record": record,
    }


def resolve_person_status(person_id: str, new_status: str) -> dict:
    """
    Updates the status of a registered missing person (e.g. RESCUED_ALIVE, REUNITED, HOSPITALIZED).
    """
    for person in MISSING_PERSONS_REGISTRY:
        if person["id"] == person_id:
            old_status = person["status"]
            person["status"] = new_status
            if new_status in ["RESCUED_ALIVE", "REUNITED"] and old_status == "UNDER_SEARCH":
                CASUALTY_STATE["baseline"]["missing_persons"] = max(0, CASUALTY_STATE["baseline"]["missing_persons"] - 1)
                CASUALTY_STATE["baseline"]["rescued_alive"] += 1
            return {
                "status": "SUCCESS",
                "message": f"Updated status of {person['full_name']} to {new_status}",
                "person": person,
            }

    return {"status": "ERROR", "message": f"Person ID {person_id} not found."}


def apply_drill_casualty_modifier(scenario_type: str):
    """
    Scales casualty & recovery numbers realistically during emergency simulation drills.
    """
    if scenario_type == "EARTHQUAKE_M78":
        CASUALTY_STATE["drill_multiplier"] = 4.2
        CASUALTY_STATE["active_drill"] = "M7.8 Central Himalayan Mega-Earthquake Drill"
    elif scenario_type == "GLOF_FLOOD":
        CASUALTY_STATE["drill_multiplier"] = 2.8
        CASUALTY_STATE["active_drill"] = "Tama Koshi GLOF Surge Drill"
    else:
        CASUALTY_STATE["drill_multiplier"] = 3.5
        CASUALTY_STATE["active_drill"] = "Compound Landslide-Dam Outburst Drill"


def reset_drill_casualty_modifier():
    """
    Clears drill simulation multipliers and restores baseline records.
    """
    CASUALTY_STATE["drill_multiplier"] = 1.0
    CASUALTY_STATE["active_drill"] = None
