"""
RAKSHAK AI - Emergency Notification & Outward Dispatch Service
==============================================================
Provides multi-channel outward emergency alerting:
1. Sparrow SMS (Nepal NTC / Ncell mobile network)
2. Telegram Bot (Instant free smartphone push notifications)
3. Discord / Civil Defense Webhooks
4. Local Incident Dispatch Registry (audit trail & mock simulator)
"""

import os
import json
import httpx
from datetime import datetime, timezone
from pathlib import Path

LOGS_FILE = Path(__file__).parent / "dispatch_log.json"


def get_channel_config():
    """Check which outward messaging channels are currently active / configured."""
    return {
        "sparrow_sms": {
            "configured": bool(os.getenv("SPARROW_SMS_TOKEN")),
            "sender_identity": os.getenv("SPARROW_SMS_IDENTITY", "RAKSHAK_AI"),
        },
        "telegram": {
            "configured": bool(
                os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHAT_ID")
            ),
            "chat_id": os.getenv("TELEGRAM_CHAT_ID", ""),
        },
        "webhook": {
            "configured": bool(
                os.getenv("EMERGENCY_WEBHOOK_URL")
                or os.getenv("DISCORD_WEBHOOK_URL")
            ),
        },
        "simulation_mode": True,
    }


async def send_sparrow_sms(phone: str, text: str):
    token = os.getenv("SPARROW_SMS_TOKEN")
    identity = os.getenv("SPARROW_SMS_IDENTITY", "RAKSHAK_AI")
    if not token:
        return {
            "status": "MOCK_DISPATCHED",
            "gateway": "Sparrow SMS (Nepal)",
            "phone": phone,
            "sample_payload": text[:160],
            "note": "Set SPARROW_SMS_TOKEN in .env for live NTC/Ncell cell broadcast",
        }

    url = "http://api.sparrowsms.com/v2/sms/"
    params = {
        "token": token,
        "from": identity,
        "to": phone,
        "text": text[:160],
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params=params)
            return {
                "status": "TRANSMITTED" if res.status_code == 200 else "ERROR",
                "response": res.text,
                "gateway": "Sparrow SMS (Nepal)",
            }
    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "gateway": "Sparrow SMS (Nepal)",
        }


async def send_telegram_alert(text: str):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return {
            "status": "MOCK_DISPATCHED",
            "gateway": "Telegram Bot",
            "note": "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env for instant smartphone push alerts",
        }

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload)
            return {
                "status": "TRANSMITTED" if res.status_code == 200 else "ERROR",
                "gateway": "Telegram Bot",
                "response": res.text,
            }
    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "gateway": "Telegram Bot",
        }


async def send_webhook_alert(data: dict):
    url = os.getenv("EMERGENCY_WEBHOOK_URL") or os.getenv("DISCORD_WEBHOOK_URL")
    if not url:
        return {
            "status": "MOCK_DISPATCHED",
            "gateway": "Civil Defense Webhook",
            "note": "Set EMERGENCY_WEBHOOK_URL or DISCORD_WEBHOOK_URL in .env",
        }

    is_discord = "discord.com" in url
    if is_discord:
        payload = {
            "content": f"🚨 **RAKSHAK AI EMERGENCY OUT-ALARM**\n{data.get('message', '')}",
            "embeds": [
                {
                    "title": data.get("title", "Critical Disaster Alert"),
                    "color": 15158332,
                    "fields": [
                        {
                            "name": "Hazard Probability",
                            "value": f"{data.get('chance', 90)}%",
                            "inline": True,
                        },
                        {
                            "name": "Severity",
                            "value": str(data.get("severity", "CRITICAL")),
                            "inline": True,
                        },
                        {
                            "name": "Incident Address",
                            "value": data.get(
                                "address", data.get("location", "Nepal")
                            ),
                            "inline": False,
                        },
                        {
                            "name": "Recommended Safe Haven",
                            "value": data.get(
                                "safeHaven", "DEOC Emergency Camp"
                            ),
                            "inline": False,
                        },
                    ],
                }
            ],
        }
    else:
        payload = data

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload)
            return {
                "status": (
                    "TRANSMITTED" if res.status_code in [200, 204] else "ERROR"
                ),
                "gateway": "Civil Defense Webhook",
            }
    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "gateway": "Civil Defense Webhook",
        }


async def dispatch_emergency_alert(event_data: dict, phone: str = None):
    """
    Format and broadcast the emergency out-alarm across all channels:
    - Sparrow SMS (if phone provided or configured default)
    - Telegram Bot
    - Webhook
    - Saves entry into dispatch log
    """
    chance = event_data.get("chance", 92)
    address = (
        event_data.get("address") or event_data.get("location") or "Nepal"
    )
    title = event_data.get("title") or "DISASTER ALERT"
    safe_haven = (
        event_data.get("safeHaven")
        or "DEOC Assembly Ground & Tundikhel Shelter"
    )
    lat = event_data.get("latitude", 28.2096)
    lon = event_data.get("longitude", 84.7538)

    # Format 1: Multilingual or standard clean 160-char SMS for NTC / Ncell
    sms_text = event_data.get("custom_sms") or (
        f"🚨 RAKSHAK ALERT: {title}. Chance: {chance}%. "
        f"Loc: {address}. Safe Haven: {safe_haven}. "
        f"Map: https://maps.google.com/?q={lat},{lon}"
    )

    # Format 2: Rich Markdown for Telegram
    telegram_text = (
        f"🚨 *RAKSHAK AI EMERGENCY OUT-ALARM*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"⚠️ *Event:* {title}\n"
        f"📊 *Occurrence Probability:* `{chance}%`\n"
        f"📍 *Target Address:* {address}\n"
        f"🌐 *Coordinates:* `{lat:.4f}°N, {lon:.4f}°E`\n"
        f"🛡️ *Recommended Safe Haven:* {safe_haven}\n"
        f"🗺️ [Open in Google Maps](https://maps.google.com/?q={lat},{lon})\n"
        f"⏱️ *Timestamp:* {datetime.now(timezone.utc).strftime('%H:%M:%S UTC')} | NEOC Intercept"
    )

    results = {}
    target_phone = phone or os.getenv("DEFAULT_EMERGENCY_PHONE", "9800000000")
    results["sparrow_sms"] = await send_sparrow_sms(target_phone, sms_text)
    results["telegram"] = await send_telegram_alert(telegram_text)
    results["webhook"] = await send_webhook_alert(event_data)

    log_entry = {
        "id": f"DISP-{int(datetime.now().timestamp())}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_title": title,
        "chance": chance,
        "address": address,
        "recipient_phone": target_phone,
        "formatted_sms": sms_text,
        "results": results,
    }

    save_dispatch_log(log_entry)
    return log_entry


def save_dispatch_log(entry: dict):
    history = []
    if LOGS_FILE.exists():
        try:
            with open(LOGS_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
    history.insert(0, entry)
    history = history[:50]
    try:
        with open(LOGS_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print("❌ Error saving dispatch log:", e)


def get_dispatch_logs():
    if not LOGS_FILE.exists():
        return []
    try:
        with open(LOGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []
