from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import check_limit
from app.utils.audit import log_audit
from app.utils.timezone import get_customer_timezone, naive_to_utc

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/whatsapp-jobs")
def get_whatsapp_jobs(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
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
                        WHEN j.voter_id    IS NOT NULL THEN 1
                        WHEN j.list_id     IS NOT NULL THEN
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
            FROM whatsapp_jobs j
            LEFT JOIN precincts          p  ON j.precinct_id = p.id
            LEFT JOIN whatsapp_templates t  ON j.template_id = t.id
            LEFT JOIN whatsapp_providers pr ON j.provider_id = pr.id
            LEFT JOIN contact_lists      cl ON j.list_id     = cl.id
            LEFT JOIN voters             v  ON j.voter_id    = v.id
            WHERE (:cid IS NULL OR j.customer_id = :cid)
            ORDER BY j.id DESC
        """), {"cid": current_user.customer_id})
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatsapp-jobs")
def create_whatsapp_job(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM whatsapp_jobs WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_whatsapp_jobs", current_count, "WhatsApp Job")

        # Convert scheduled_at from customer's timezone to UTC, then validate
        scheduled_at_str = req.get('scheduled_at') or None
        if scheduled_at_str:
            try:
                cust_tz = get_customer_timezone(db, current_user.customer_id)
                scheduled_at_str = naive_to_utc(scheduled_at_str.replace('Z', ''), cust_tz)
                scheduled_at_str = scheduled_at_str[:19]
                sched_dt = datetime.fromisoformat(scheduled_at_str).replace(tzinfo=timezone.utc)
                if sched_dt <= datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Scheduled time must be in the future.")
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid scheduled_at format.")

        template_name = None
        if req.get('template_id'):
            t_row = db.execute(text("SELECT name FROM whatsapp_templates WHERE id=:id"), {"id": req['template_id']}).fetchone()
            template_name = t_row.name if t_row else None

        result = db.execute(
            text("""
                INSERT INTO whatsapp_jobs
                    (name, precinct_id, template_id, provider_id, scheduled_at, status, list_id, voter_id, customer_id, created_by)
                VALUES
                    (:name, :precinct_id, :template_id, :provider_id, :scheduled_at, :status, :list_id, :voter_id, :customer_id, :created_by)
            """),
            {
                "name":         req.get('name') or template_name,
                "precinct_id":  req.get('precinct_id') or None,
                "template_id":  req.get('template_id'),
                "provider_id":  req.get('provider_id') or None,
                "scheduled_at": scheduled_at_str,
                "status":       'Pending',
                "list_id":      req.get('list_id')  or None,
                "voter_id":     req.get('voter_id') or None,
                "customer_id":  current_user.customer_id,
                "created_by":   current_user.id,
            },
        )
        db.commit()
        new_id = result.lastrowid
        log_audit(db, current_user.customer_id, 'whatsapp_job', new_id,
                  req.get('name') or template_name, 'CREATE', current_user, new_values=req)
        return {"id": new_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/whatsapp-jobs/{id}")
def delete_whatsapp_job(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        old_row = db.execute(text("SELECT * FROM whatsapp_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(text("DELETE FROM whatsapp_jobs WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'whatsapp_job', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
