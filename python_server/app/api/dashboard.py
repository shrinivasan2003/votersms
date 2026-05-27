from fastapi import APIRouter, Depends
from typing import Dict
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal

router = APIRouter()

def _get_session():
    """Yield a fresh SQLAlchemy Session and ensure cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(_get_session)):
    """Return counts for various tables using a SQLAlchemy Session."""
    queries = {
        "counties": "SELECT COUNT(*) FROM counties",
        "precincts": "SELECT COUNT(*) FROM precincts",
        "voters": "SELECT COUNT(*) FROM voters",
        "smsTemplates": "SELECT COUNT(*) FROM sms_templates",
        "emailTemplates": "SELECT COUNT(*) FROM email_templates",
        "whatsappTemplates": "SELECT COUNT(*) FROM whatsapp_templates",
        "smsJobs": "SELECT COUNT(*) FROM sms_jobs",
        "emailJobs": "SELECT COUNT(*) FROM email_jobs",
        "whatsappJobs": "SELECT COUNT(*) FROM whatsapp_jobs",
        "activeUsers": "SELECT COUNT(*) FROM users",
    }
    stats: Dict[str, int] = {}
    for key, sql in queries.items():
        result = db.execute(text(sql))
        stats[key] = result.scalar() or 0
    return stats
@router.get("/recent-jobs")
def get_recent_jobs(db: Session = Depends(_get_session)):
    """Fetch the 10 most recent jobs across all job tables."""
    sql = text("""
        (SELECT j.id, 'SMS' as type, j.status, p.name as precinct, t.name as template, j.recipients, '0/0' as success_failed, j.created_at
         FROM sms_jobs j
         LEFT JOIN precincts p ON j.precinct_id = p.id
         LEFT JOIN sms_templates t ON j.template_id = t.id)
        UNION ALL
        (SELECT j.id, 'Email' as type, j.status, p.name as precinct, t.name as template, j.recipients, '0/0' as success_failed, j.created_at
         FROM email_jobs j
         LEFT JOIN precincts p ON j.precinct_id = p.id
         LEFT JOIN email_templates t ON j.template_id = t.id)
        UNION ALL
        (SELECT j.id, 'WhatsApp' as type, j.status, p.name as precinct, t.name as template, j.recipients, '0/0' as success_failed, j.created_at
         FROM whatsapp_jobs j
         LEFT JOIN precincts p ON j.precinct_id = p.id
         LEFT JOIN whatsapp_templates t ON j.template_id = t.id)
        ORDER BY created_at DESC LIMIT 10
    """)
    result = db.execute(sql)
    rows = [dict(row._mapping) for row in result]
    return rows

# SSE endpoint removed to revert to polling approach
