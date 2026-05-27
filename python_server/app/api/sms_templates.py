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

@router.get("/sms-templates")
def get_sms_templates(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("SELECT * FROM sms_templates WHERE customer_id=:cid ORDER BY id DESC"),
                {"cid": current_user.customer_id},
            )
        else:
            result = db.execute(text("SELECT * FROM sms_templates ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sms-templates")
def create_sms_template(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        result = db.execute(
            text("INSERT INTO sms_templates (code, name, body, status, customer_id) VALUES (:code, :name, :body, :status, :customer_id)"),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'),
             "status": req.get('status', 'Active'), "customer_id": current_user.customer_id},
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sms-templates/{id}")
def update_sms_template(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        db.execute(
            text(f"UPDATE sms_templates SET code=:code, name=:name, body=:body, status=:status WHERE {where}"),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'),
             "status": req.get('status'), "id": id, "cid": current_user.customer_id},
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sms-templates/{id}")
def delete_sms_template(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        where = "id=:id AND (customer_id=:cid OR :cid IS NULL)"
        db.execute(text(f"DELETE FROM sms_templates WHERE {where}"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
