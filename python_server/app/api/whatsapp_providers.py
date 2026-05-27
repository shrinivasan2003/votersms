from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.schemas import UserOut

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

_SAFE_FIELDS = "id, code, name, type, from_number, status, customer_id"


@router.get("/whatsapp-providers")
def get_whatsapp_providers(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text(f"SELECT {_SAFE_FIELDS} FROM whatsapp_providers WHERE customer_id=:cid ORDER BY id DESC"),
                {"cid": current_user.customer_id},
            )
        else:
            result = db.execute(text(f"SELECT {_SAFE_FIELDS} FROM whatsapp_providers ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/whatsapp-providers")
def create_whatsapp_provider(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        result = db.execute(text("""
            INSERT INTO whatsapp_providers
                (code, name, type, account_sid, auth_token, from_number, status, customer_id)
            VALUES
                (:code, :name, :type, :account_sid, :auth_token, :from_number, :status, :customer_id)
        """), {
            "code":        req.get('code'),
            "name":        req.get('name'),
            "type":        req.get('type', 'Twilio'),
            "account_sid": req.get('account_sid'),
            "auth_token":  req.get('auth_token'),
            "from_number": req.get('from_number'),
            "status":      req.get('status', 'Active'),
            "customer_id": current_user.customer_id,
        })
        db.commit()
        safe = {k: req[k] for k in ('code', 'name', 'type', 'from_number', 'status') if k in req}
        return {"id": result.lastrowid, **safe}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/whatsapp-providers/{id}")
def update_whatsapp_provider(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        db.execute(text(f"""
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
            WHERE {where}
        """), {
            "code":        req.get('code'),
            "name":        req.get('name'),
            "type":        req.get('type'),
            "from_number": req.get('from_number'),
            "status":      req.get('status'),
            "account_sid": req.get('account_sid') or None,
            "auth_token":  req.get('auth_token')  or None,
            "id":          id,
            "cid":         current_user.customer_id,
        })
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/whatsapp-providers/{id}")
def delete_whatsapp_provider(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        db.execute(text(f"DELETE FROM whatsapp_providers WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
