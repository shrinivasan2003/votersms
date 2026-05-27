from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List, Dict, Any
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

@router.get("/sms-templates")
def get_sms_templates(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("SELECT * FROM sms_templates ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sms-templates")
def create_sms_template(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(
            text("INSERT INTO sms_templates (code, name, body, status) VALUES (:code, :name, :body, :status)"),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'), "status": req.get('status', 'Active')}
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sms-templates/{id}")
def update_sms_template(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        db.execute(
            text("UPDATE sms_templates SET code=:code, name=:name, body=:body, status=:status WHERE id=:id"),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'), "status": req.get('status'), "id": id}
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sms-templates/{id}")
def delete_sms_template(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM sms_templates WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
