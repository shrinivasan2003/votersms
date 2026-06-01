"""
Customer-level rate limiting utilities.

Usage in any endpoint:
    from app.utils.limits import check_limit, get_usage

    check_limit(db, customer_id, "max_voters",
                current=count_voters(db, customer_id),
                label="Voter")
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

# Default values — used when a limits row is missing or a column is NULL
DEFAULTS = {
    "max_voters":              10_000,
    "max_contact_lists":           20,
    "max_sms_templates":           50,
    "max_email_templates":         50,
    "max_whatsapp_templates":      50,
    "max_sms_jobs":               500,
    "max_email_jobs":             500,
    "max_whatsapp_jobs":          500,
    "max_sms_per_month":       50_000,
    "max_emails_per_month":    50_000,
    "max_whatsapp_per_month":  10_000,
    "ai_monthly_limit":            50,
    "ai_tokens_monthly_limit": 500_000,
}


def _get_limits_row(db: Session, customer_id: int) -> dict:
    """Return the limits row for a customer, creating defaults if missing."""
    row = db.execute(
        text("SELECT * FROM customer_limits WHERE customer_id=:cid"),
        {"cid": customer_id},
    ).fetchone()
    if row:
        return dict(row._mapping)
    # Auto-create with defaults
    db.execute(
        text("INSERT IGNORE INTO customer_limits (customer_id) VALUES (:cid)"),
        {"cid": customer_id},
    )
    db.commit()
    row = db.execute(
        text("SELECT * FROM customer_limits WHERE customer_id=:cid"),
        {"cid": customer_id},
    ).fetchone()
    return dict(row._mapping) if row else {}


def check_limit(db: Session, customer_id: int | None, limit_key: str, current: int, label: str):
    """
    Raise HTTP 429 if the customer has reached their limit.
    No-op for platform admins (customer_id=None).
    """
    if customer_id is None:
        return   # platform admin — no limits

    limits = _get_limits_row(db, customer_id)
    maximum = limits.get(limit_key) or DEFAULTS.get(limit_key, 0)
    if maximum > 0 and current >= maximum:
        raise HTTPException(
            status_code=429,
            detail=f"{label} limit reached: {current}/{maximum}. "
                   f"Contact your administrator to increase this limit.",
        )


# ── Usage counters ─────────────────────────────────────────────────────────────

# Explicit whitelist — only these table names may be used in _count / _monthly_sum.
# This prevents accidental f-string injection if the call site ever changes.
_ALLOWED_COUNT_TABLES = frozenset({
    "voters", "contact_lists",
    "sms_templates", "email_templates", "whatsapp_templates",
    "sms_jobs", "email_jobs", "whatsapp_jobs",
})


def _count(db: Session, table: str, customer_id: int) -> int:
    if table not in _ALLOWED_COUNT_TABLES:
        raise ValueError(f"_count called with unknown table: {table!r}")
    # Table name is validated against the whitelist above; values are parameterised.
    r = db.execute(
        text(f"SELECT COUNT(*) AS c FROM {table} WHERE customer_id=:cid"),  # noqa: S608
        {"cid": customer_id},
    ).fetchone()
    return r.c if r else 0


def _monthly_sum(db: Session, table: str, customer_id: int) -> int:
    if table not in _ALLOWED_COUNT_TABLES:
        raise ValueError(f"_monthly_sum called with unknown table: {table!r}")
    # Table name is validated against the whitelist above; values are parameterised.
    r = db.execute(
        text(f"""
            SELECT COALESCE(SUM(recipients), 0) AS c
            FROM {table}
            WHERE customer_id=:cid
              AND status='Completed'
              AND YEAR(created_at)  = YEAR(NOW())
              AND MONTH(created_at) = MONTH(NOW())
        """),  # noqa: S608
        {"cid": customer_id},
    ).fetchone()
    return int(r.c) if r else 0


def _emails_this_month(db: Session, customer_id: int) -> int:
    r = db.execute(
        text("""
            SELECT COUNT(*) AS c
            FROM email_job_messages ejm
            JOIN email_jobs ej ON ejm.job_id = ej.id
            WHERE ej.customer_id=:cid
              AND YEAR(ejm.sent_at)  = YEAR(NOW())
              AND MONTH(ejm.sent_at) = MONTH(NOW())
        """),
        {"cid": customer_id},
    ).fetchone()
    return r.c if r else 0


def _ai_usage_this_month(db: Session, customer_id: int) -> dict:
    """Return AI generation count and token totals for the current calendar month."""
    r = db.execute(
        text("""
            SELECT
                COUNT(*)                    AS generations,
                COALESCE(SUM(total_tokens), 0) AS tokens
            FROM ai_usage_logs
            WHERE customer_id = :cid
              AND YEAR(created_at)  = YEAR(NOW())
              AND MONTH(created_at) = MONTH(NOW())
        """),
        {"cid": customer_id},
    ).fetchone()
    if r:
        return {"generations": int(r[0] or 0), "tokens": int(r[1] or 0)}
    return {"generations": 0, "tokens": 0}


def get_usage(db: Session, customer_id: int) -> dict:
    """Return current usage figures for a customer."""
    ai = _ai_usage_this_month(db, customer_id)
    return {
        "voters":              _count(db, "voters",              customer_id),
        "contact_lists":       _count(db, "contact_lists",       customer_id),
        "sms_templates":       _count(db, "sms_templates",       customer_id),
        "email_templates":     _count(db, "email_templates",     customer_id),
        "whatsapp_templates":  _count(db, "whatsapp_templates",  customer_id),
        "sms_jobs":            _count(db, "sms_jobs",            customer_id),
        "email_jobs":          _count(db, "email_jobs",          customer_id),
        "whatsapp_jobs":       _count(db, "whatsapp_jobs",       customer_id),
        "sms_this_month":      _monthly_sum(db, "sms_jobs",      customer_id),
        "emails_this_month":   _emails_this_month(db,            customer_id),
        "whatsapp_this_month": _monthly_sum(db, "whatsapp_jobs", customer_id),
        "ai_generations_this_month": ai["generations"],
        "ai_tokens_this_month":      ai["tokens"],
    }
