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

@router.get("/precincts")
def get_precincts(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("SELECT * FROM precincts WHERE customer_id=:cid ORDER BY name ASC"),
                {"cid": current_user.customer_id},
            )
        else:
            result = db.execute(text("SELECT * FROM precincts ORDER BY name ASC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/precincts-detailed")
def get_precincts_detailed(
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("""
                    SELECT p.*, c.name as county_name
                    FROM precincts p
                    LEFT JOIN counties c ON p.county_id = c.id
                    WHERE p.customer_id=:cid
                    ORDER BY p.name ASC
                """),
                {"cid": current_user.customer_id},
            )
        else:
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
def create_precinct(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        result = db.execute(
            text("INSERT INTO precincts (code, name, county_id, zipcode, customer_id) VALUES (:code, :name, :county_id, :zipcode, :customer_id)"),
            {
                "code": req.get('code'), "name": req.get('name'),
                "county_id": req.get('county_id'), "zipcode": req.get('zipcode'),
                "customer_id": current_user.customer_id,
            },
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/precincts/{id}")
def update_precinct(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(
            text("UPDATE precincts SET code=:code, name=:name, county_id=:county_id, zipcode=:zipcode WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {"code": req.get('code'), "name": req.get('name'), "county_id": req.get('county_id'),
             "zipcode": req.get('zipcode'), "id": id, "cid": current_user.customer_id},
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/precincts/{id}")
def delete_precinct(
    id: int,
    db: Session = Depends(_get_session),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(text("DELETE FROM precincts WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
