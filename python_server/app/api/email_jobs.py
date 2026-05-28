from fastapi import APIRouter, HTTPException, Body, Depends, BackgroundTasks
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import check_limit
from app.services.message_processor import process_email_job

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
            text("INSERT INTO email_templates (code, name, subject, body, status, customer_id) "
                 "VALUES (:code, :name, :subject, :body, :status, :customer_id)"),
            {"code": req.get('code'), "name": req.get('name'), "subject": req.get('subject'),
             "body": req.get('body'), "status": req.get('status', 'Active'),
             "customer_id": current_user.customer_id},
        )
        db.commit()
        return {"id": result.lastrowid, **req}
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
        db.execute(
            text(f"UPDATE email_templates SET code=:code, name=:name, subject=:subject, body=:body, status=:status WHERE {where}"),
            {"code": req.get('code'), "name": req.get('name'), "subject": req.get('subject'),
             "body": req.get('body'), "status": req.get('status'), "id": id, "cid": current_user.customer_id},
        )
        db.commit()
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
        db.execute(text(f"DELETE FROM email_templates WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
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
    background_tasks: BackgroundTasks = BackgroundTasks(),
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

        result = db.execute(
            text("""
                INSERT INTO email_jobs
                    (precinct_id, template_id, provider_id, scheduled_at, status, list_id, voter_id, customer_id)
                VALUES
                    (:precinct_id, :template_id, :provider_id, :scheduled_at, :status, :list_id, :voter_id, :customer_id)
            """),
            {
                "precinct_id":  req.get('precinct_id') or None,
                "template_id":  req.get('template_id'),
                "provider_id":  req.get('provider_id') or None,
                "scheduled_at": req.get('scheduled_at') or None,
                "status":       'Pending',
                "list_id":      req.get('list_id')  or None,
                "voter_id":     req.get('voter_id') or None,
                "customer_id":  current_user.customer_id,
            },
        )
        db.commit()
        job_id = result.lastrowid

        scheduled_at_str = req.get('scheduled_at') or None
        if not scheduled_at_str:
            # No schedule → send immediately
            background_tasks.add_task(process_email_job, job_id)
        # else: future schedule → scheduler loop will dispatch at the right time

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
        db.execute(text(f"DELETE FROM email_jobs WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
