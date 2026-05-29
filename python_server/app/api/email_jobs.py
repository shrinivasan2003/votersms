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

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── Email Templates ────────────────────────────────────────────────────────────

@router.get("/email-templates")
def get_email_templates(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("SELECT * FROM email_templates WHERE customer_id=:cid ORDER BY id DESC"),
                {"cid": current_user.customer_id},
            )
        else:
            result = db.execute(text("SELECT * FROM email_templates ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-templates")
def create_email_template(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM email_templates WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_email_templates", current_count, "Email Template")

        result = db.execute(
            text("INSERT INTO email_templates (code, name, subject, body, status, customer_id, created_by) "
                 "VALUES (:code, :name, :subject, :body, :status, :customer_id, :created_by)"),
            {"code": req.get('code'), "name": req.get('name'), "subject": req.get('subject'),
             "body": req.get('body'), "status": req.get('status', 'Active'),
             "customer_id": current_user.customer_id, "created_by": current_user.id},
        )
        db.commit()
        new_id = result.lastrowid
        log_audit(db, current_user.customer_id, 'email_template', new_id, req.get('name'), 'CREATE', current_user, new_values=req)
        return {"id": new_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/email-templates/{id}")
def update_email_template(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        old_row = db.execute(text(f"SELECT * FROM email_templates WHERE {where}"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(
            text(f"UPDATE email_templates SET code=:code, name=:name, subject=:subject, body=:body, status=:status WHERE {where}"),
            {"code": req.get('code'), "name": req.get('name'), "subject": req.get('subject'),
             "body": req.get('body'), "status": req.get('status'), "id": id, "cid": current_user.customer_id},
        )
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'email_template', id, req.get('name'), 'UPDATE', current_user, old_values=old_vals, new_values=req)
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/email-templates/{id}")
def delete_email_template(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        old_row = db.execute(text(f"SELECT * FROM email_templates WHERE {where}"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None

        # Detach any jobs that reference this template before deleting
        db.execute(text("UPDATE email_jobs SET template_id=NULL WHERE template_id=:id"), {"id": id})

        db.execute(text(f"DELETE FROM email_templates WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'email_template', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
        return {"message": "Deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── Email Jobs ─────────────────────────────────────────────────────────────────

@router.get("/email-jobs")
def get_email_jobs(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid_filter = "WHERE j.customer_id=:cid" if current_user.customer_id else ""
        params = {"cid": current_user.customer_id} if current_user.customer_id else {}
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
                               AND vv.email IS NOT NULL AND vv.email != ''
                               AND vv.status = 'Active')
                        WHEN j.precinct_id IS NOT NULL THEN
                            (SELECT COUNT(*) FROM voters vv
                             WHERE vv.precinct_id = j.precinct_id
                               AND vv.email IS NOT NULL AND vv.email != ''
                               AND vv.status = 'Active')
                        ELSE
                            (SELECT COUNT(*) FROM voters vv
                             WHERE vv.email IS NOT NULL AND vv.email != ''
                               AND vv.status = 'Active')
                    END
                ) AS recipients
            FROM email_jobs j
            LEFT JOIN precincts       p  ON j.precinct_id = p.id
            LEFT JOIN email_templates t  ON j.template_id = t.id
            LEFT JOIN email_providers pr ON j.provider_id = pr.id
            LEFT JOIN contact_lists   cl ON j.list_id     = cl.id
            LEFT JOIN voters          v  ON j.voter_id    = v.id
            {cid_filter}
            ORDER BY j.id DESC
        """), params)
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/email-jobs")
def create_email_job(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM email_jobs WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_email_jobs", current_count, "Email Job")

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
            t_row = db.execute(text("SELECT name FROM email_templates WHERE id=:id"), {"id": req['template_id']}).fetchone()
            template_name = t_row.name if t_row else None

        result = db.execute(
            text("""
                INSERT INTO email_jobs
                    (name, precinct_id, template_id, provider_id, scheduled_at, status,
                     list_id, voter_id, customer_id, created_by,
                     repeat_type, repeat_every, repeat_days, repeat_time, repeat_until)
                VALUES
                    (:name, :precinct_id, :template_id, :provider_id, :scheduled_at, :status,
                     :list_id, :voter_id, :customer_id, :created_by,
                     :repeat_type, :repeat_every, :repeat_days, :repeat_time, :repeat_until)
            """),
            {
                "name":         req.get('name') or template_name,
                "precinct_id":  req.get('precinct_id') or None,
                "template_id":  req.get('template_id'),
                "provider_id":  req.get('provider_id') or None,
                "scheduled_at": req.get('scheduled_at') or None,
                "status":       'Pending',
                "list_id":      req.get('list_id')  or None,
                "voter_id":     req.get('voter_id') or None,
                "customer_id":  current_user.customer_id,
                "created_by":   current_user.id,
                "repeat_type":  req.get('repeat_type')  or None,
                "repeat_every": req.get('repeat_every') or 1,
                "repeat_days":  req.get('repeat_days')  or None,
                "repeat_time":  req.get('repeat_time')  or None,
                "repeat_until": req.get('repeat_until') or None,
            },
        )
        db.commit()
        job_id = result.lastrowid
        log_audit(db, current_user.customer_id, 'email_job', job_id,
                  req.get('name') or template_name, 'CREATE', current_user, new_values=req)

        return {"id": job_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/email-jobs/{id}")
def delete_email_job(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        old_row = db.execute(text(f"SELECT * FROM email_jobs WHERE {where}"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(text(f"DELETE FROM email_jobs WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'email_job', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
