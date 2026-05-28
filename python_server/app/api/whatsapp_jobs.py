from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import check_limit

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
            {cid_filter}
            ORDER BY j.id DESC
        """), params)
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

        result = db.execute(
            text("""
                INSERT INTO whatsapp_jobs
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
        return {"id": result.lastrowid, **req}
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
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        db.execute(text(f"DELETE FROM whatsapp_jobs WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
