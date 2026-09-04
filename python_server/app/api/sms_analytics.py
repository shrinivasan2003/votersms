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
