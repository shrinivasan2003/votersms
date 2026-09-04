"""
SMS analytics API — replaces the old job-status-counting
/api/sms-delivery-stats, which counted jobs by their overall status
(labeled "Sent"/"Failed"/"Pending") rather than actual per-recipient
delivery outcomes. Now that sms_job_messages exists (real per-message
status from Twilio's status-callback webhook), this returns real
delivered/failed/pending counts per job instead.

Older jobs sent before sms_job_messages existed have no rows there —
for those, sent/failed fall back to the job-level success_count/
failed_count (whether Twilio's API accepted each send), and delivered/
pending/delivery_rate are returned as None (there's genuinely no
per-recipient data for them, not a bug — the frontend should render
that as "—", not "0").
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.security import get_current_user

router = APIRouter()


@router.get("/sms-analytics")
def list_sms_analytics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        jobs = db.execute(text("""
            SELECT j.id, j.status, j.created_at, j.recipients,
                   j.success_count, j.failed_count,
                   p.name  AS precinct_name,
                   t.name  AS template_name,
                   pr.name AS provider_name
            FROM sms_jobs j
            LEFT JOIN precincts     p  ON j.precinct_id = p.id
            LEFT JOIN sms_templates t  ON j.template_id = t.id
            LEFT JOIN sms_providers pr ON j.provider_id = pr.id
            WHERE (:cid IS NULL OR j.customer_id = :cid)
            ORDER BY j.id DESC
        """), {"cid": cid}).fetchall()

        msg_stats = db.execute(text("""
            SELECT job_id,
                   COUNT(*)                                                    AS total_messages,
                   SUM(CASE WHEN status = 'delivered'                THEN 1 ELSE 0 END) AS delivered,
                   SUM(CASE WHEN status IN ('failed','undelivered')  THEN 1 ELSE 0 END) AS failed,
                   SUM(CASE WHEN status IN ('queued','sending','sent') THEN 1 ELSE 0 END) AS pending
            FROM sms_job_messages
            GROUP BY job_id
        """)).fetchall()
        stats_by_job = {r.job_id: dict(r._mapping) for r in msg_stats}

        result = []
        for j in jobs:
            row = dict(j._mapping)
            ms = stats_by_job.get(row["id"])
            if ms and ms["total_messages"]:
                total = ms["total_messages"]
                row["sent"]             = total
                row["delivered"]        = ms["delivered"]
                row["failed"]           = ms["failed"]
                row["pending"]          = ms["pending"]
                row["delivery_rate"]    = round(ms["delivered"] / total * 100, 1)
                row["has_message_data"] = True
            else:
                # Sent before per-recipient tracking existed — only the
                # job-level API-acceptance counts are available.
                row["sent"]             = row["success_count"] or 0
                row["delivered"]        = None
                row["failed"]           = row["failed_count"] or 0
                row["pending"]          = None
                row["delivery_rate"]    = None
                row["has_message_data"] = False
            result.append(row)
        return result
    except Exception as e:
        err = str(e).lower()
        if "doesn't exist" in err or "1146" in err:
            return []
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sms-analytics/{job_id}")
def get_sms_analytics_detail(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Per-recipient detail for one SMS job — powers the "view" button on
    the SMS Analytics report, mirroring what the Eye button already does
    for email jobs. Twilio only ever reports current status (queued ->
    sent -> delivered/failed), not a full event history the way Postmark
    does for email, so this shows one row per recipient with their
    latest known status rather than an event feed.
    """
    cid = current_user.customer_id
    job_row = db.execute(text("""
        SELECT j.id, j.status, j.created_at, j.recipients,
               j.success_count, j.failed_count,
               p.name  AS precinct_name,
               t.name  AS template_name,
               pr.name AS provider_name
        FROM sms_jobs j
        LEFT JOIN precincts     p  ON j.precinct_id = p.id
        LEFT JOIN sms_templates t  ON j.template_id = t.id
        LEFT JOIN sms_providers pr ON j.provider_id = pr.id
        WHERE j.id = :id AND (:cid IS NULL OR j.customer_id = :cid)
    """), {"id": job_id, "cid": cid}).fetchone()
    if not job_row:
        raise HTTPException(status_code=404, detail="Job not found")
    job = dict(job_row._mapping)

    messages = db.execute(text("""
        SELECT sjm.id, sjm.recipient_phone, sjm.status, sjm.error_code,
               sjm.error_message, sjm.sent_at, sjm.updated_at,
               COALESCE(NULLIF(TRIM(CONCAT(v.first_name, ' ', COALESCE(v.last_name, ''))), ''), sjm.recipient_phone)
                                                                        AS recipient_name
        FROM sms_job_messages sjm
        LEFT JOIN voters v ON sjm.voter_id = v.id
        WHERE sjm.job_id = :id
        ORDER BY sjm.id
    """), {"id": job_id}).fetchall()
    recipients = [dict(r._mapping) for r in messages]

    total = len(recipients)
    if total:
        delivered = sum(1 for r in recipients if r["status"] == "delivered")
        failed    = sum(1 for r in recipients if r["status"] in ("failed", "undelivered"))
        pending   = sum(1 for r in recipients if r["status"] in ("queued", "sending", "sent"))
        summary = {
            "total_sent": total,
            "delivered": delivered,
            "failed": failed,
            "pending": pending,
            "delivery_rate": round(delivered / total * 100, 1),
            "has_message_data": True,
        }
    else:
        summary = {
            "total_sent": job["success_count"] or 0,
            "delivered": None,
            "failed": job["failed_count"] or 0,
            "pending": None,
            "delivery_rate": None,
            "has_message_data": False,
        }

    return {"job": job, "summary": summary, "recipients": recipients}
