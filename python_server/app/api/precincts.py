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

@router.get("/precincts")
def get_precincts(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("SELECT * FROM precincts ORDER BY name ASC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/precincts-detailed")
def get_precincts_detailed(db: Session = Depends(_get_session)):
    try:
        result = db.execute(text("""
            SELECT p.*, c.name as county_name 
            FROM precincts p 
            LEFT JOIN counties c ON p.county_id = c.id 
            ORDER BY p.name ASC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/precincts")
def create_precinct(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(
            text("INSERT INTO precincts (code, name, county_id, zipcode) VALUES (:code, :name, :county_id, :zipcode)"),
            {"code": req.get('code'), "name": req.get('name'), "county_id": req.get('county_id'), "zipcode": req.get('zipcode')}
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/precincts/{id}")
def update_precinct(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        db.execute(
            text("UPDATE precincts SET code=:code, name=:name, county_id=:county_id, zipcode=:zipcode WHERE id=:id"),
            {"code": req.get('code'), "name": req.get('name'), "county_id": req.get('county_id'), "zipcode": req.get('zipcode'), "id": id}
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/precincts/{id}")
def delete_precinct(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM precincts WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
