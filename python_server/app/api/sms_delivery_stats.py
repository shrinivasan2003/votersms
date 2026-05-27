from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/sms-delivery-stats")
def get_sms_delivery_stats(db: Session = Depends(_get_session)):
    try:
        rows = db.execute(text("""
            SELECT status, COUNT(*) AS cnt
            FROM sms_jobs
            GROUP BY status
        """)).fetchall()

        stats = {"total_jobs": 0, "sent": 0, "failed": 0, "pending": 0}
        for row in rows:
            status = (row[0] or "").lower()
            count = row[1] or 0
            stats["total_jobs"] += count
            if status in ("sent", "completed"):
                stats["sent"] += count
            elif status == "failed":
                stats["failed"] += count
            elif status == "pending":
                stats["pending"] += count

        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
