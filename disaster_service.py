from datetime import datetime, timezone


def get_disaster_alerts():

    alerts = []

    alerts.append({
        "id": "test-001",
        "type": "TEST",
        "severity": "INFO",
        "title": "RAKSHAK AI System Test",
        "message": "Disaster monitoring pipeline is operational.",
        "location": "Nepal",
        "latitude": 28.3949,
        "longitude": 84.1240,
        "source": "RAKSHAK AI",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat()
    })

    return alerts