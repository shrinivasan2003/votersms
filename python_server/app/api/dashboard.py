from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.schemas import UserOut
from app.dependencies.security import get_current_user

router = APIRouter()


@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    # When cid is set (customer user), filter every table by customer_id.
    # When cid is None (platform admin), count everything.
    if cid is not None:
        params = {"cid": cid}
        queries = {
            "voters":           "SELECT COUNT(*) FROM voters          WHERE customer_id=:cid",
            "smsTemplates":     "SELECT COUNT(*) FROM sms_templates   WHERE customer_id=:cid",
            "emailTemplates":   "SELECT COUNT(*) FROM email_templates  WHERE customer_id=:cid",
            "whatsappTemplates":"SELECT COUNT(*) FROM whatsapp_templates WHERE customer_id=:cid",
            "smsJobs":          "SELECT COUNT(*) FROM sms_jobs        WHERE customer_id=:cid",
            "emailJobs":        "SELECT COUNT(*) FROM email_jobs      WHERE customer_id=:cid",
            "whatsappJobs":     "SELECT COUNT(*) FROM whatsapp_jobs   WHERE customer_id=:cid",
            "activeUsers":      "SELECT COUNT(*) FROM users           WHERE customer_id=:cid AND status='Active'",
        }
    else:
        params = {}
        queries = {
            "voters":           "SELECT COUNT(*) FROM voters",
            "smsTemplates":     "SELECT COUNT(*) FROM sms_templates",
            "emailTemplates":   "SELECT COUNT(*) FROM email_templates",
            "whatsappTemplates":"SELECT COUNT(*) FROM whatsapp_templates",
            "smsJobs":          "SELECT COUNT(*) FROM sms_jobs",
            "emailJobs":        "SELECT COUNT(*) FROM email_jobs",
            "whatsappJobs":     "SELECT COUNT(*) FROM whatsapp_jobs",
            "activeUsers":      "SELECT COUNT(*) FROM users WHERE status='Active'",
        }

    stats = {}
    for key, sql in queries.items():
        stats[key] = db.execute(text(sql), params).scalar() or 0
    return stats


@router.get("/recent-jobs")
def get_recent_jobs(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id

    if cid is not None:
        cid_filter = "WHERE j.customer_id=:cid"
        params = {"cid": cid}
    else:
        cid_filter = ""
        params = {}

    sql = text(f"""
        (SELECT j.id, 'SMS' AS type, j.status,
                t.name AS template, j.recipients,
                '0/0' AS success_failed,
                j.created_at
         FROM sms_jobs j
         LEFT JOIN sms_templates t ON j.template_id = t.id
         {cid_filter})
        UNION ALL
        (SELECT j.id, 'Email' AS type, j.status,
                t.name AS template, j.recipients,
                '0/0' AS success_failed,
                j.created_at
         FROM email_jobs j
         LEFT JOIN email_templates t ON j.template_id = t.id
         {cid_filter})
        UNION ALL
        (SELECT j.id, 'WhatsApp' AS type, j.status,
                t.name AS template, j.recipients,
                '0/0' AS success_failed,
                j.created_at
         FROM whatsapp_jobs j
         LEFT JOIN whatsapp_templates t ON j.template_id = t.id
         {cid_filter})
        ORDER BY created_at DESC LIMIT 20
    """)

    rows = db.execute(sql, params).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/recent-activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    """
    Returns the last 8 activity events derived from job tables
    and (if available) the voters table.  Each item has:
        label, event_type, occurred_at (ISO string)
    """
    cid = current_user.customer_id
    cid_filter = "AND j.customer_id=:cid" if cid is not None else ""
    params = {"cid": cid} if cid is not None else {}

    sql = text(f"""
        SELECT
            j.id,
            'sms'        AS job_type,
            j.status,
            t.name       AS template_name,
            j.created_at AS occurred_at
        FROM sms_jobs j
        LEFT JOIN sms_templates t ON j.template_id = t.id
        WHERE 1=1 {cid_filter}

        UNION ALL

        SELECT
            j.id,
            'email'      AS job_type,
            j.status,
            t.name       AS template_name,
            j.created_at AS occurred_at
        FROM email_jobs j
        LEFT JOIN email_templates t ON j.template_id = t.id
        WHERE 1=1 {cid_filter}

        UNION ALL

        SELECT
            j.id,
            'whatsapp'   AS job_type,
            j.status,
            t.name       AS template_name,
            j.created_at AS occurred_at
        FROM whatsapp_jobs j
        LEFT JOIN whatsapp_templates t ON j.template_id = t.id
        WHERE 1=1 {cid_filter}

        ORDER BY occurred_at DESC
        LIMIT 8
    """)

    rows = db.execute(sql, params).fetchall()

    events = []
    for r in rows:
        row = dict(r._mapping)
        jtype = (row.get("job_type") or "").upper()   # SMS / EMAIL / WHATSAPP
        status = row.get("status") or "Pending"
        tpl = row.get("template_name") or ""
        suffix = f" — {tpl}" if tpl else ""
        jid    = row.get("id", "")

        if status == "Completed":
            label = f"{jtype} campaign completed{suffix}"
            event_type = "completed"
        elif status == "Failed":
            label = f"{jtype} campaign failed{suffix}"
            event_type = "failed"
        elif status == "Processing":
            label = f"{jtype} campaign is processing{suffix}"
            event_type = "processing"
        elif status == "Scheduled":
            label = f"{jtype} campaign scheduled{suffix}"
            event_type = "scheduled"
        else:
            label = f"New {jtype} campaign created{suffix}"
            event_type = "created"

        occurred_at = row.get("occurred_at")
        events.append({
            "label": label,
            "event_type": event_type,
            "job_type": jtype,
            "job_id": jid,
            "occurred_at": occurred_at.isoformat() if hasattr(occurred_at, "isoformat") else str(occurred_at),
        })

    # Try to fetch recent voter imports (requires created_at column on voters)
    try:
        voter_filter = "WHERE customer_id=:cid" if cid is not None else ""
        voter_rows = db.execute(text(f"""
            SELECT MAX(created_at) AS occurred_at, COUNT(*) AS cnt
            FROM voters
            {voter_filter}
            HAVING occurred_at IS NOT NULL
        """), params).fetchall()

        for vr in voter_rows:
            vrow = dict(vr._mapping)
            if vrow.get("occurred_at"):
                occurred_at = vrow["occurred_at"]
                cnt = vrow.get("cnt", 0)
                events.append({
                    "label": f"Recipients updated ({cnt} total)",
                    "event_type": "import",
                    "job_type": "IMPORT",
                    "job_id": None,
                    "occurred_at": occurred_at.isoformat() if hasattr(occurred_at, "isoformat") else str(occurred_at),
                })
    except Exception:
        pass  # voters table may not have created_at — silently skip

    # Re-sort combined list and return latest 8
    events.sort(key=lambda x: x["occurred_at"] or "", reverse=True)
    return events[:8]
