"""
Timezone utilities for scheduled job handling.

Supported timezones are kept as a small explicit list.
IANA names are stored in the DB; display labels are for the UI.
"""
from zoneinfo import ZoneInfo
from datetime import datetime

# Supported timezone options: IANA name → display label
TIMEZONE_OPTIONS = {
    'UTC':              'UTC (Coordinated Universal Time)',
    'Asia/Kolkata':     'IST — India Standard Time (UTC+5:30)',
    'America/New_York': 'EST/EDT — US Eastern Time (UTC-5/UTC-4)',
    'America/Chicago':  'CST/CDT — US Central Time (UTC-6/UTC-5)',
    'America/Denver':   'MST/MDT — US Mountain Time (UTC-7/UTC-6)',
    'America/Los_Angeles': 'PST/PDT — US Pacific Time (UTC-8/UTC-7)',
}

# Short labels shown in the UI scheduler section
TIMEZONE_SHORT = {
    'UTC':              'UTC',
    'Asia/Kolkata':     'IST',
    'America/New_York': 'EST',
    'America/Chicago':  'CST',
    'America/Denver':   'MST',
    'America/Los_Angeles': 'PST',
}


def naive_to_utc(naive_str: str, iana_tz: str) -> str:
    """
    Convert a naive datetime string (e.g. "2026-05-30T09:00") that is in
    the given IANA timezone to a UTC ISO string.

    Falls back to treating input as UTC if conversion fails.
    """
    try:
        tz   = ZoneInfo(iana_tz or 'UTC')
        utc  = ZoneInfo('UTC')
        naive = datetime.fromisoformat(naive_str)
        local = naive.replace(tzinfo=tz)
        return local.astimezone(utc).isoformat()
    except Exception:
        return naive_str   # treat as UTC on error


def utc_to_local(utc_dt, iana_tz: str) -> datetime:
    """Convert a UTC datetime object to the given IANA timezone."""
    try:
        tz = ZoneInfo(iana_tz or 'UTC')
        if utc_dt.tzinfo is None:
            utc_dt = utc_dt.replace(tzinfo=ZoneInfo('UTC'))
        return utc_dt.astimezone(tz)
    except Exception:
        return utc_dt


def get_customer_timezone(db, customer_id) -> str:
    """Fetch the IANA timezone for a customer. Returns 'UTC' if not set."""
    if not customer_id:
        return 'UTC'
    from sqlalchemy import text
    row = db.execute(
        text("SELECT timezone FROM customers WHERE id=:cid"),
        {"cid": customer_id}
    ).fetchone()
    return (row.timezone if row and row.timezone else 'UTC')
