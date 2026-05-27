from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
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


# ── Safe fields returned to the frontend (smtp_pass is never exposed) ─────────
_SAFE_FIELDS = "id, code, name, type, smtp_host, smtp_port, smtp_user, config_email, status"


@router.get("/email-providers")
def get_email_providers(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text(
            f"SELECT {_SAFE_FIELDS} FROM email_providers ORDER BY id DESC"
        ))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email-providers")
def create_email_provider(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("""
            INSERT INTO email_providers
                (code, name, type, smtp_host, smtp_port, smtp_user, smtp_pass, config_email, status)
            VALUES
                (:code, :name, :type, :smtp_host, :smtp_port, :smtp_user, :smtp_pass, :config_email, :status)
        """), {
            "code":         req.get('code'),
            "name":         req.get('name'),
            "type":         req.get('type'),
            "smtp_host":    req.get('smtp_host'),
            "smtp_port":    req.get('smtp_port'),
            "smtp_user":    req.get('smtp_user'),
            "smtp_pass":    req.get('smtp_pass'),
            "config_email": req.get('config_email'),
            "status":       req.get('status', 'Active'),
        })
        db.commit()
        safe = {k: req[k] for k in
                ('code', 'name', 'type', 'smtp_host', 'smtp_port', 'smtp_user', 'config_email', 'status')
                if k in req}
        return {"id": result.lastrowid, **safe}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/email-providers/{id}")
def update_email_provider(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        # Only overwrite smtp_pass if the caller actually provided a non-empty value
        db.execute(text("""
            UPDATE email_providers
            SET code         = :code,
                name         = :name,
                type         = :type,
                smtp_host    = :smtp_host,
                smtp_port    = :smtp_port,
                smtp_user    = :smtp_user,
                config_email = :config_email,
                status       = :status,
                smtp_pass    = CASE
                    WHEN :smtp_pass IS NOT NULL AND :smtp_pass <> ''
                    THEN :smtp_pass ELSE smtp_pass END
            WHERE id = :id
        """), {
            "code":         req.get('code'),
            "name":         req.get('name'),
            "type":         req.get('type'),
            "smtp_host":    req.get('smtp_host'),
            "smtp_port":    req.get('smtp_port'),
            "smtp_user":    req.get('smtp_user'),
            "smtp_pass":    req.get('smtp_pass') or None,
            "config_email": req.get('config_email'),
            "status":       req.get('status'),
            "id":           id,
        })
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/email-providers/{id}")
def delete_email_provider(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM email_providers WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
