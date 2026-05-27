from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

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
