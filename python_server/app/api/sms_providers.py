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


# ── Safe fields returned to the frontend (never expose credentials) ───────────
_SAFE_FIELDS = "id, code, name, type, priority, from_number, status"


@router.get("/sms-providers")
def get_sms_providers(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text(
            f"SELECT {_SAFE_FIELDS} FROM sms_providers ORDER BY priority ASC"
        ))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sms-providers")
def create_sms_provider(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("""
            INSERT INTO sms_providers
                (code, name, type, priority, account_sid, auth_token, from_number, status)
            VALUES
                (:code, :name, :type, :priority, :account_sid, :auth_token, :from_number, :status)
        """), {
            "code":        req.get('code'),
            "name":        req.get('name'),
            "type":        req.get('type', 'Twilio'),
            "priority":    req.get('priority', 1),
            "account_sid": req.get('account_sid'),
            "auth_token":  req.get('auth_token'),
            "from_number": req.get('from_number'),
            "status":      req.get('status', 'Active'),
        })
        db.commit()
        # Return safe fields only
        safe = {k: req[k] for k in ('code', 'name', 'type', 'priority', 'from_number', 'status') if k in req}
        return {"id": result.lastrowid, **safe}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sms-providers/{id}")
def update_sms_provider(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        # Only overwrite credentials if the caller actually provided them (not empty / None)
        db.execute(text("""
            UPDATE sms_providers
            SET code        = :code,
                name        = :name,
                type        = :type,
                priority    = :priority,
                from_number = :from_number,
                status      = :status,
                account_sid = CASE
                    WHEN :account_sid IS NOT NULL AND :account_sid <> ''
                    THEN :account_sid ELSE account_sid END,
                auth_token  = CASE
                    WHEN :auth_token IS NOT NULL AND :auth_token <> ''
                    THEN :auth_token  ELSE auth_token  END
            WHERE id = :id
        """), {
            "code":        req.get('code'),
            "name":        req.get('name'),
            "type":        req.get('type'),
            "priority":    req.get('priority'),
            "from_number": req.get('from_number'),
            "status":      req.get('status'),
            "account_sid": req.get('account_sid') or None,
            "auth_token":  req.get('auth_token')  or None,
            "id":          id,
        })
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sms-providers/{id}")
def delete_sms_provider(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM sms_providers WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
