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

# Whatsapp Templates
@router.get("/whatsapp-templates")
def get_whatsapp_templates(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("SELECT * FROM whatsapp_templates ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatsapp-templates")
def create_whatsapp_template(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(
            text("""
                INSERT INTO whatsapp_templates (code, name, body, status)
                VALUES (:code, :name, :body, :status)
            """),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'), "status": req.get('status', 'Active')}
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/whatsapp-templates/{id}")
def update_whatsapp_template(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        db.execute(
            text("""
                UPDATE whatsapp_templates
                SET code=:code, name=:name, body=:body, status=:status
                WHERE id=:id
            """),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'), "status": req.get('status'), "id": id}
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/whatsapp-templates/{id}")
def delete_whatsapp_template(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM whatsapp_templates WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
