from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.models import User as UserModel
from app.utils.limits import check_limit
from app.utils.audit import log_audit

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/sms-jobs")
def get_sms_jobs(
    db: Session = Depends(_get_session),
    current_user = Depends(get_current_user),
):
    try:
        cid_filter = "WHERE j.customer_id=:cid" if getattr(current_user, 'customer_id', None) else ""
        params = {"cid": current_user.customer_id} if getattr(current_user, 'customer_id', None) else {}
        result = db.execute(text(f"""
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
            {cid_filter}
            ORDER BY j.id DESC
        """), params)
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sms-jobs")
def create_sms_job(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user = Depends(get_current_user),
):
    try:
        cid = getattr(current_user, 'customer_id', None)
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM sms_jobs WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_sms_jobs", current_count, "SMS Job")

        # Reject past scheduled times
        scheduled_at_str = req.get('scheduled_at') or None
        if scheduled_at_str:
            try:
                sched_dt = datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00'))
                if sched_dt.tzinfo is None:
                    sched_dt = sched_dt.replace(tzinfo=timezone.utc)
                if sched_dt <= datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Scheduled time must be in the future.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid scheduled_at format.")

        template_name = None
        if req.get('template_id'):
            t_row = db.execute(text("SELECT name FROM sms_templates WHERE id=:id"), {"id": req['template_id']}).fetchone()
            template_name = t_row.name if t_row else None

        result = db.execute(
            text("""
                INSERT INTO sms_jobs
                    (name, precinct_id, template_id, provider_id, scheduled_at, status, list_id, voter_id, customer_id, created_by)
                VALUES
                    (:name, :precinct_id, :template_id, :provider_id, :scheduled_at, :status, :list_id, :voter_id, :customer_id, :created_by)
            """),
            {
                "name":        req.get('name') or template_name,
                "precinct_id": req.get('precinct_id') or None,
                "template_id": req.get('template_id'),
                "provider_id": req.get('provider_id') or None,
                "scheduled_at": req.get('scheduled_at') or None,
                "status": 'Pending',
                "list_id":  req.get('list_id')  or None,
                "voter_id": req.get('voter_id') or None,
                "customer_id": getattr(current_user, 'customer_id', None),
                "created_by":  getattr(current_user, 'id', None),
            }
        )
        db.commit()
        job_id = result.lastrowid
        log_audit(db, getattr(current_user, 'customer_id', None), 'sms_job', job_id,
                  req.get('name') or template_name, 'CREATE', current_user, new_values=req)

        return {"id": job_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sms-jobs/{id}")
def delete_sms_job(id: int, db: Session = Depends(_get_session), current_user = Depends(get_current_user)):
    try:
        old_row = db.execute(text("SELECT * FROM sms_jobs WHERE id=:id"), {"id": id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(text("DELETE FROM sms_jobs WHERE id=:id"), {"id": id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or getattr(current_user, 'customer_id', None)
        log_audit(db, cid, 'sms_job', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
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
        old_row = db.execute(text("SELECT * FROM sms_jobs WHERE id=:id"), {"id": id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
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
        cid = (old_vals or {}).get('customer_id') or getattr(current_user, 'customer_id', None)
        log_audit(db, cid, 'sms_job', id, (old_vals or {}).get('name'), 'UPDATE', current_user, old_values=old_vals, new_values=req)
        return {"id": id, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
