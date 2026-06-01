from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.dependencies.security import get_current_user
from app.schemas import UserOut, EmailProviderOut
from app.utils.crypto import encrypt_field

router = APIRouter()

def _get_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

_SAFE_FIELDS = "id, code, name, type, smtp_host, smtp_port, smtp_user, config_email, status, customer_id"


@router.get("/email-providers", response_model=list[EmailProviderOut])
def get_email_providers(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text(f"SELECT {_SAFE_FIELDS} FROM email_providers WHERE customer_id=:cid ORDER BY id DESC"),
                {"cid": current_user.customer_id},
            )
        else:
            result = db.execute(text(f"SELECT {_SAFE_FIELDS} FROM email_providers ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email-providers", response_model=EmailProviderOut)
def create_email_provider(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        result = db.execute(text("""
            INSERT INTO email_providers
                (code, name, type, smtp_host, smtp_port, smtp_user, smtp_pass, config_email, status, customer_id)
            VALUES
                (:code, :name, :type, :smtp_host, :smtp_port, :smtp_user, :smtp_pass, :config_email, :status, :customer_id)
        """), {
            "code":         req.get('code'),
            "name":         req.get('name'),
            "type":         req.get('type'),
            "smtp_host":    req.get('smtp_host'),
            "smtp_port":    req.get('smtp_port'),
            "smtp_user":    req.get('smtp_user'),
            "smtp_pass":    encrypt_field(req.get('smtp_pass')),
            "config_email": req.get('config_email'),
            "status":       req.get('status', 'Active'),
            "customer_id":  current_user.customer_id,
        })
        db.commit()
        return {
            "id":           result.lastrowid,
            "code":         req.get('code'),
            "name":         req.get('name'),
            "type":         req.get('type'),
            "smtp_host":    req.get('smtp_host'),
            "smtp_port":    req.get('smtp_port'),
            "smtp_user":    req.get('smtp_user'),
            "config_email": req.get('config_email'),
            "status":       req.get('status'),
            "customer_id":  current_user.customer_id,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/email-providers/{id}")
def update_email_provider(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(text(f"""
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
            WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)
        """), {
            "code":         req.get('code'),
            "name":         req.get('name'),
            "type":         req.get('type'),
            "smtp_host":    req.get('smtp_host'),
            "smtp_port":    req.get('smtp_port'),
            "smtp_user":    req.get('smtp_user'),
            "smtp_pass":    encrypt_field(req.get('smtp_pass') or None),
            "config_email": req.get('config_email'),
            "status":       req.get('status'),
            "id":           id,
            "cid":          current_user.customer_id,
        })
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/email-providers/{id}")
def delete_email_provider(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(text("DELETE FROM email_providers WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
