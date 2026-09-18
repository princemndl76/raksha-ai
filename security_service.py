"""
RAKSHAK AI - Security, Authentication & Defense Guard
=====================================================
Provides:
1. Operator / Admin Token-based Authentication
2. DoS Prevention & In-Memory IP Rate Limiting
3. Input Validation & Strict Sanitization
4. Security Audit Logging
"""

import os
import re
import time
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security_scheme = HTTPBearer(auto_error=False)

# Configurable Operator Clearance Key
DEFAULT_ADMIN_KEY = "rakshak-admin-2026"
SECURITY_LOG_FILE = Path(__file__).parent / "security_audit.json"

# In-memory storage for rate limiting: ip -> list of timestamps
_rate_limit_records = defaultdict(list)


def get_admin_key() -> str:
    return os.getenv("ADMIN_API_KEY", DEFAULT_ADMIN_KEY)


def verify_admin_token(request: Request, credentials: HTTPAuthorizationCredentials = Security(security_scheme)):
    """
    Verifies that the caller has valid Operator / Admin Clearance.
    Checks:
    1. HTTP Bearer Token: 'Authorization: Bearer <KEY>'
    2. Custom Header: 'X-Admin-Key: <KEY>'
    3. Query Parameter: '?admin_key=<KEY>'
    """
    expected_key = get_admin_key()
    provided_key = None

    if credentials and credentials.credentials:
        provided_key = credentials.credentials.strip()
    elif "X-Admin-Key" in request.headers:
        provided_key = request.headers["X-Admin-Key"].strip()
    elif "x-admin-key" in request.headers:
        provided_key = request.headers["x-admin-key"].strip()
    elif "admin_key" in request.query_params:
        provided_key = request.query_params["admin_key"].strip()

    client_ip = request.client.host if request.client else "unknown"

    if not provided_key or provided_key != expected_key:
        log_security_event(
            event_type="UNAUTHORIZED_ACCESS_BLOCKED",
            client_ip=client_ip,
            endpoint=str(request.url.path),
            detail="Invalid or missing operator clearance token.",
        )
        raise HTTPException(
            status_code=401,
            detail="Operator Clearance Required: Invalid or missing authentication key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True


def check_rate_limit(client_ip: str, limit: int = 10, window_seconds: int = 60, action: str = "general"):
    """
    Enforces sliding-window rate limit per client IP.
    """
    now = time.time()
    key = f"{client_ip}:{action}"
    timestamps = _rate_limit_records[key]

    # Filter out timestamps older than window
    valid_timestamps = [t for t in timestamps if now - t < window_seconds]
    _rate_limit_records[key] = valid_timestamps

    if len(valid_timestamps) >= limit:
        log_security_event(
            event_type="RATE_LIMIT_EXCEEDED",
            client_ip=client_ip,
            endpoint=action,
            detail=f"Exceeded {limit} requests per {window_seconds}s.",
        )
        retry_after = int(window_seconds - (now - valid_timestamps[0])) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded for {action}. Please try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    _rate_limit_records[key].append(now)


def validate_nepal_phone(phone: str) -> str:
    """
    Validates and cleans phone numbers.
    Accepts standard Nepali 10-digit mobile numbers (starting with 97 or 98)
    or with +977 / 977 country code.
    """
    cleaned = re.sub(r"[\s\-\(\)]", "", str(phone or ""))
    if cleaned.startswith("+977"):
        cleaned = cleaned[4:]
    elif cleaned.startswith("977"):
        cleaned = cleaned[3:]

    # Must be 10 digits and start with 9
    if not re.match(r"^9[678]\d{8}$", cleaned):
        raise HTTPException(
            status_code=400,
            detail="Invalid Nepali mobile phone number. Must be a 10-digit number starting with 98 or 97.",
        )
    return cleaned


def sanitize_string(val: str, max_length: int = 500) -> str:
    """
    Sanitizes user input string:
    - Removes HTML tags and script injections
    - Truncates to max_length
    """
    if not val:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r"<[^>]*?>", "", str(val))
    # Replace excessive spaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:max_length]


def log_security_event(event_type: str, client_ip: str, endpoint: str, detail: str):
    """
    Logs suspicious or restricted activity to the audit file.
    """
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "client_ip": client_ip,
        "endpoint": endpoint,
        "detail": detail,
    }
    history = []
    if SECURITY_LOG_FILE.exists():
        try:
            with open(SECURITY_LOG_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
    history.insert(0, event)
    history = history[:100]
    try:
        with open(SECURITY_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass


def get_security_audit_logs():
    if not SECURITY_LOG_FILE.exists():
        return []
    try:
        with open(SECURITY_LOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []
