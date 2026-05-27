from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.models import User as UserModel

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/sms-jobs")
def get_sms_jobs(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("""
            SELECT j.*,
                p.name   AS precinct_name,
                t.name   AS template_name,
                pr.name  AS provider_name,
                cl.name  AS list_name,
                CONCAT(v.first_name, ' ', v.last_name) AS voter_name,
                COALESCE(
                    NULLIF(j.recipients, 0),
                    CASE
                        WHEN j.voter_id   IS NOT NULL THEN 1
                        WHEN j.list_id    IS NOT NULL THEN
                            (SELECT COUNT(*) FROM list_members lm
                             JOIN voters vv ON lm.voter_id = vv.id
                             WHERE lm.list_id = j.list_id
                               AND vv.phone IS NOT NULL AND vv.phone != ''
                               AND vv.status = 'Active')
                        WHEN j.precinct_id IS NOT NULL THEN
                            (SELECT COUNT(*) FROM voters vv
                             WHERE vv.precinct_id = j.precinct_id
                               AND vv.phone IS NOT NULL AND vv.phone != ''
                               AND vv.status = 'Active')
                        ELSE
                            (SELECT COUNT(*) FROM voters vv
                             WHERE vv.phone IS NOT NULL AND vv.phone != ''
                               AND vv.status = 'Active')
                    END
                ) AS recipients
            FROM sms_jobs j
            LEFT JOIN precincts     p  ON j.precinct_id = p.id
            LEFT JOIN sms_templates t  ON j.template_id = t.id
            LEFT JOIN sms_providers pr ON j.provider_id = pr.id
            LEFT JOIN contact_lists cl ON j.list_id     = cl.id
            LEFT JOIN voters        v  ON j.voter_id    = v.id
            ORDER BY j.id DESC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sms-jobs")
def create_sms_job(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(
            text("""
                INSERT INTO sms_jobs
                    (precinct_id, template_id, provider_id, scheduled_at, status, list_id, voter_id)
                VALUES
                    (:precinct_id, :template_id, :provider_id, :scheduled_at, :status, :list_id, :voter_id)
            """),
            {
                "precinct_id": req.get('precinct_id') or None,
                "template_id": req.get('template_id'),
                "provider_id": req.get('provider_id') or None,
                "scheduled_at": req.get('scheduled_at') or None,
                "status": 'Pending',
                "list_id":  req.get('list_id')  or None,
                "voter_id": req.get('voter_id') or None,
            }
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sms-jobs/{id}")
def delete_sms_job(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM sms_jobs WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sms-jobs/{id}")
def update_sms_job(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserModel = Depends(get_current_user)
):
    if getattr(current_user, "role", "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin rights required")
    try:
        db.execute(
            text("""
                UPDATE sms_jobs SET
                    precinct_id  = :precinct_id,
                    template_id  = :template_id,
                    provider_id  = :provider_id,
                    scheduled_at = :scheduled_at,
                    status       = :status,
                    list_id      = :list_id,
                    voter_id     = :voter_id
                WHERE id = :id
            """),
            {
                "id":           id,
                "precinct_id":  req.get('precinct_id')  or None,
                "template_id":  req.get('template_id'),
                "provider_id":  req.get('provider_id')  or None,
                "scheduled_at": req.get('scheduled_at') or None,
                "status":       req.get('status', 'Pending'),
                "list_id":      req.get('list_id')  or None,
                "voter_id":     req.get('voter_id') or None,
            }
        )
        db.commit()
        return {"id": id, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
