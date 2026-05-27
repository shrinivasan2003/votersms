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

@router.get("/counties")
def get_counties(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("SELECT * FROM counties ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/counties")
def create_county(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(
            text("INSERT INTO counties (code, name, state, status) VALUES (:code, :name, :state, :status)"),
            {"code": req.get('code'), "name": req.get('name'), "state": req.get('state', 'GA'), "status": req.get('status', 'Active')}
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/counties/{id}")
def update_county(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        db.execute(
            text("UPDATE counties SET code=:code, name=:name, state=:state, status=:status WHERE id=:id"),
            {"code": req.get('code'), "name": req.get('name'), "state": req.get('state'), "status": req.get('status'), "id": id}
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/counties/{id}")
def delete_county(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM counties WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
