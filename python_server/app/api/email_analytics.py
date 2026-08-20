"""
Email analytics API.

GET /api/email-analytics          — per-job aggregate stats (open rate, click rate…)
GET /api/email-analytics/{job_id} — detailed stats + recent event feed for one job
"""
from datetime import timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserOut
from app.dependencies.security import get_current_user

router = APIRouter()


_BOT_COL_AVAILABLE: bool | None = None   # None = unknown; checked lazily, cached per process


def _has_bot_column(db: Session) -> bool:
    """Whether email_events.is_bot_suspected exists (migrate_email_events_v3.py has run)."""
    global _BOT_COL_AVAILABLE
    if _BOT_COL_AVAILABLE is None:
        try:
            db.execute(text("SELECT is_bot_suspected FROM email_events LIMIT 0"))
            _BOT_COL_AVAILABLE = True
        except Exception:
            db.rollback()
            _BOT_COL_AVAILABLE = False
    return _BOT_COL_AVAILABLE


def _bot_exclude_sql(db: Session, alias: str = "ee") -> str:
    """
    SQL fragment (leading ' AND ...') that excludes events flagged as
    likely mail-gateway/scanner traffic from a CASE WHEN condition.
    Empty string if the migration hasn't been run yet.
    """
    if not _has_bot_column(db):
        return ""
    return f" AND ({alias}.is_bot_suspected IS NULL OR {alias}.is_bot_suspected = 0)"


def _iso_utc(dt):
    """Serialize a naive DB datetime (stored as true UTC) with an explicit UTC
    marker, so the frontend's Date parser doesn't misread it as local time."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc).isoformat()


def _calc_rates(row: dict) -> dict:
    """Adds open_rate and click_rate percentages to a stats dict."""
    sent = row.get("total_sent") or 0
    row["open_rate"] = (
        round((row.get("unique_opens") or 0) / sent * 100, 1) if sent > 0 else 0.0
    )
    row["click_rate"] = (
        round((row.get("unique_clicks") or 0) / sent * 100, 1) if sent > 0 else 0.0
    )
    return row


@router.get("/email-analytics")
def list_email_analytics(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    cid_filter = "WHERE ej.customer_id=:cid" if cid is not None else ""
    params = {"cid": cid} if cid is not None else {}
    bot_excl = _bot_exclude_sql(db)
    try:
        result = db.execute(text(f"""
            SELECT
                ej.id                                                       AS job_id,
                et.name                                                     AS template_name,
                ep.name                                                     AS provider_name,
                p.name                                                      AS precinct_name,
                cl.name                                                     AS list_name,
                ej.status,
                ej.created_at,
                COUNT(DISTINCT ejm.id)                                      AS total_sent,
                COUNT(DISTINCT CASE WHEN ee.event_type='open'{bot_excl}   THEN ee.postmark_message_id END)
                                                                            AS unique_opens,
                SUM(CASE WHEN ee.event_type='open'{bot_excl}    THEN 1 ELSE 0 END)   AS total_opens,
                COUNT(DISTINCT CASE WHEN ee.event_type='click'{bot_excl}  THEN ee.postmark_message_id END)
                                                                            AS unique_clicks,
                SUM(CASE WHEN ee.event_type='click'{bot_excl}   THEN 1 ELSE 0 END)   AS total_clicks,
                SUM(CASE WHEN ee.event_type='bounce'  THEN 1 ELSE 0 END)   AS bounces,
                SUM(CASE WHEN ee.event_type='spam'    THEN 1 ELSE 0 END)   AS spam_complaints,
                SUM(CASE WHEN ee.event_type='delivery' THEN 1 ELSE 0 END)  AS deliveries
            FROM email_jobs ej
            LEFT JOIN email_templates et  ON ej.template_id  = et.id
            LEFT JOIN email_providers ep  ON ej.provider_id  = ep.id
            LEFT JOIN precincts       p   ON ej.precinct_id  = p.id
            LEFT JOIN contact_lists   cl  ON ej.list_id      = cl.id
            LEFT JOIN email_job_messages ejm ON ej.id        = ejm.job_id
            LEFT JOIN email_events    ee  ON ejm.postmark_message_id = ee.postmark_message_id
            {cid_filter}
            GROUP BY ej.id, et.name, ep.name, p.name, cl.name, ej.status, ej.created_at
            ORDER BY ej.id DESC
        """), params)
        return [_calc_rates(dict(r._mapping)) for r in result]
    except Exception as e:
        err_str = str(e).lower()
        if "doesn't exist" in err_str or "no such table" in err_str or "1146" in err_str:
            try:
                fallback = db.execute(text(f"""
                    SELECT ej.id AS job_id,
                           et.name AS template_name, ep.name AS provider_name,
                           p.name AS precinct_name, cl.name AS list_name,
                           ej.status, ej.created_at,
                           0 AS total_sent, 0 AS unique_opens, 0 AS total_opens,
                           0 AS unique_clicks, 0 AS total_clicks,
                           0 AS bounces, 0 AS spam_complaints, 0 AS deliveries
                    FROM email_jobs ej
                    LEFT JOIN email_templates et  ON ej.template_id = et.id
                    LEFT JOIN email_providers ep  ON ej.provider_id = ep.id
                    LEFT JOIN precincts       p   ON ej.precinct_id = p.id
                    LEFT JOIN contact_lists   cl  ON ej.list_id     = cl.id
                    {cid_filter}
                    ORDER BY ej.id DESC
                """), params)
                return [_calc_rates(dict(r._mapping)) for r in fallback]
            except Exception:
                return []
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/email-analytics/{job_id}")
def get_email_analytics_detail(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Detailed analytics for a single job:
      • summary stats
      • per-platform/client breakdown for opens
      • recent event feed (latest 200 events)
    """
    try:
        bot_excl = _bot_exclude_sql(db)
        has_bot_col = _has_bot_column(db)

        # ── Aggregate summary ──
        # unique_opens/total_opens/unique_clicks/total_clicks exclude events
        # flagged as likely mail-gateway/scanner traffic (is_bot_suspected),
        # since those aren't genuine recipient engagement. bot_suspected_*
        # is reported separately so nothing is silently hidden.
        summary_row = db.execute(text(f"""
            SELECT
                COUNT(DISTINCT ejm.id)                                          AS total_sent,
                COUNT(DISTINCT CASE WHEN ee.event_type='open'{bot_excl}  THEN ejm.id END)AS unique_opens,
                SUM(CASE WHEN ee.event_type='open'{bot_excl}   THEN 1 ELSE 0 END)        AS total_opens,
                COUNT(DISTINCT CASE WHEN ee.event_type='click'{bot_excl} THEN ejm.id END)AS unique_clicks,
                SUM(CASE WHEN ee.event_type='click'{bot_excl}  THEN 1 ELSE 0 END)        AS total_clicks,
                SUM(CASE WHEN ee.event_type='bounce' THEN 1 ELSE 0 END)        AS bounces,
                SUM(CASE WHEN ee.event_type='spam'   THEN 1 ELSE 0 END)        AS spam_complaints,
                SUM(CASE WHEN ee.event_type='delivery' THEN 1 ELSE 0 END)      AS deliveries
                {", SUM(CASE WHEN ee.event_type='open' AND ee.is_bot_suspected=1 THEN 1 ELSE 0 END) AS bot_suspected_opens,"
                 " SUM(CASE WHEN ee.event_type='click' AND ee.is_bot_suspected=1 THEN 1 ELSE 0 END) AS bot_suspected_clicks" if has_bot_col else
                 ", 0 AS bot_suspected_opens, 0 AS bot_suspected_clicks"}
            FROM email_job_messages ejm
            LEFT JOIN email_events ee ON ejm.postmark_message_id = ee.postmark_message_id
            WHERE ejm.job_id = :jid
        """), {"jid": job_id}).fetchone()

        summary = _calc_rates(dict(summary_row._mapping)) if summary_row else {}

        # ── Platform breakdown (opens only) ──
        platforms = db.execute(text("""
            SELECT
                COALESCE(ee.platform, 'Unknown')    AS platform,
                COUNT(*)                            AS opens
            FROM email_events ee
            JOIN email_job_messages ejm ON ee.postmark_message_id = ejm.postmark_message_id
            WHERE ejm.job_id = :jid AND ee.event_type = 'open'
            GROUP BY platform
            ORDER BY opens DESC
        """), {"jid": job_id}).fetchall()

        # ── Client breakdown (opens only) ──
        clients = db.execute(text("""
            SELECT
                COALESCE(ee.client_name, 'Unknown') AS client,
                COUNT(*)                            AS opens
            FROM email_events ee
            JOIN email_job_messages ejm ON ee.postmark_message_id = ejm.postmark_message_id
            WHERE ejm.job_id = :jid AND ee.event_type = 'open'
            GROUP BY client
            ORDER BY opens DESC
        """), {"jid": job_id}).fetchall()

        # ── Recent event feed ──
        bot_col_select = "ee.is_bot_suspected" if has_bot_col else "0 AS is_bot_suspected"
        events = db.execute(text(f"""
            SELECT
                ee.recipient_email,
                ee.event_type,
                ee.platform,
                ee.client_name,
                ee.os_name,
                ee.click_url,
                ee.read_seconds,
                ee.is_first_event,
                {bot_col_select},
                ee.occurred_at
            FROM email_events ee
            JOIN email_job_messages ejm ON ee.postmark_message_id = ejm.postmark_message_id
            WHERE ejm.job_id = :jid
            ORDER BY ee.occurred_at DESC
            LIMIT 200
        """), {"jid": job_id}).fetchall()

        # ── Per-recipient status ──
        # opened/clicked/last_*_at exclude bot-suspected events so a recipient
        # isn't shown as having "opened" an email a security scanner prefetched.
        recipients = db.execute(text(f"""
            SELECT
                ejm.voter_id,
                COALESCE(NULLIF(TRIM(CONCAT(v.first_name, ' ', COALESCE(v.last_name,''))), ''), ejm.recipient_email)
                                                                        AS recipient_name,
                ejm.recipient_email,
                ejm.sent_at,
                MAX(CASE WHEN ee.event_type='delivery' THEN 1 ELSE 0 END) AS delivered,
                MAX(CASE WHEN ee.event_type='open'{bot_excl}     THEN 1 ELSE 0 END) AS opened,
                MAX(CASE WHEN ee.event_type='click'{bot_excl}    THEN 1 ELSE 0 END) AS clicked,
                MAX(CASE WHEN ee.event_type='bounce'   THEN 1 ELSE 0 END) AS bounced,
                MAX(CASE WHEN ee.event_type='spam'     THEN 1 ELSE 0 END) AS spam,
                SUM(CASE WHEN ee.event_type='open'{bot_excl}     THEN 1 ELSE 0 END) AS total_opens,
                MAX(CASE WHEN ee.event_type='open'{bot_excl}  THEN ee.occurred_at END) AS last_opened_at,
                MAX(CASE WHEN ee.event_type='click'{bot_excl} THEN ee.occurred_at END) AS last_clicked_at
            FROM email_job_messages ejm
            LEFT JOIN voters      v  ON ejm.voter_id        = v.id
            LEFT JOIN email_events ee ON ejm.postmark_message_id = ee.postmark_message_id
            WHERE ejm.job_id = :jid
            GROUP BY ejm.id, ejm.voter_id, ejm.recipient_email, ejm.sent_at,
                     v.first_name, v.last_name
            ORDER BY
                MAX(CASE WHEN ee.event_type='open'{bot_excl} THEN 1 ELSE 0 END) DESC,
                ejm.sent_at ASC
        """), {"jid": job_id}).fetchall()

        # ── Serialize: mark naive-UTC datetimes explicitly so the frontend's
        #    Date parser doesn't misread them as local time (the root cause
        #    of the "wrong When times" bug) ──
        events_out = []
        for r in events:
            row = dict(r._mapping)
            row["occurred_at"] = _iso_utc(row.get("occurred_at"))
            events_out.append(row)

        recipients_out = []
        for r in recipients:
            row = dict(r._mapping)
            row["sent_at"]         = _iso_utc(row.get("sent_at"))
            row["last_opened_at"]  = _iso_utc(row.get("last_opened_at"))
            row["last_clicked_at"] = _iso_utc(row.get("last_clicked_at"))
            recipients_out.append(row)

        return {
            "job_id": job_id,
            "summary": summary,
            "platforms": [dict(r._mapping) for r in platforms],
            "clients": [dict(r._mapping) for r in clients],
            "recent_events": events_out,
            "recipients": recipients_out,
        }
    except Exception as e:
        err_str = str(e).lower()
        if "doesn't exist" in err_str or "no such table" in err_str or "1146" in err_str:
            return {
                "job_id": job_id,
                "summary": {"total_sent": 0, "unique_opens": 0, "total_opens": 0,
                            "unique_clicks": 0, "total_clicks": 0, "bounces": 0,
                            "spam_complaints": 0, "deliveries": 0, "open_rate": 0.0, "click_rate": 0.0},
                "platforms": [],
                "clients": [],
                "recent_events": [],
                "recipients": [],
            }
        raise HTTPException(status_code=500, detail=str(e))
