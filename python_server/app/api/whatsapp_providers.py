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
_SAFE_FIELDS = "id, code, name, type, from_number, status"


@router.get("/whatsapp-providers")
def get_whatsapp_providers(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text(
            f"SELECT {_SAFE_FIELDS} FROM whatsapp_providers ORDER BY id DESC"
        ))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/whatsapp-providers")
def create_whatsapp_provider(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("""
            INSERT INTO whatsapp_providers
                (code, name, type, account_sid, auth_token, from_number, status)
            VALUES
                (:code, :name, :type, :account_sid, :auth_token, :from_number, :status)
        """), {
            "code":        req.get('code'),
            "name":        req.get('name'),
            "type":        req.get('type', 'Twilio'),
            "account_sid": req.get('account_sid'),
            "auth_token":  req.get('auth_token'),
            "from_number": req.get('from_number'),
            "status":      req.get('status', 'Active'),
        })
        db.commit()
        safe = {k: req[k] for k in ('code', 'name', 'type', 'from_number', 'status') if k in req}
        return {"id": result.lastrowid, **safe}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/whatsapp-providers/{id}")
def update_whatsapp_provider(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        # Only overwrite credentials if the caller actually provided them
        db.execute(text("""
            UPDATE whatsapp_providers
            SET code        = :code,
                name        = :name,
                type        = :type,
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


@router.delete("/whatsapp-providers/{id}")
def delete_whatsapp_provider(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM whatsapp_providers WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
