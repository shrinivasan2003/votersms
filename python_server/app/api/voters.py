from fastapi import APIRouter, HTTPException, Body, Depends, Query
from typing import List, Dict, Any, Optional
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

@router.get("/voters")
def get_voters(search: Optional[str] = Query(None), db: Session = Depends(_get_session)):
    try:
        if search:
            q = f"%{search}%"
            result = db.execute(text("""
                SELECT v.*, p.name as precinct_name
                FROM voters v
                LEFT JOIN precincts p ON v.precinct_id = p.id
                WHERE v.first_name LIKE :q OR v.last_name LIKE :q
                   OR v.email LIKE :q OR v.phone LIKE :q
                   OR CONCAT(v.first_name, ' ', v.last_name) LIKE :q
                ORDER BY v.first_name, v.last_name
                LIMIT 50
            """), {"q": q})
        else:
            result = db.execute(text("""
                SELECT v.*, p.name as precinct_name
                FROM voters v
                LEFT JOIN precincts p ON v.precinct_id = p.id
                ORDER BY v.id DESC
            """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voters")
def create_voter(req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        result = db.execute(
            text("INSERT INTO voters (first_name, last_name, email, phone, precinct_id, status) VALUES (:first_name, :last_name, :email, :phone, :precinct_id, :status)"),
            {
                "first_name": req.get('first_name'), "last_name": req.get('last_name'), 
                "email": req.get('email'), "phone": req.get('phone'), 
                "precinct_id": req.get('precinct_id'), "status": req.get('status', 'Active')
            }
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/voters/{id}")
def update_voter(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(_get_session)):
    try:
        db.execute(
            text("UPDATE voters SET first_name=:first_name, last_name=:last_name, email=:email, phone=:phone, precinct_id=:precinct_id, status=:status WHERE id=:id"),
            {
                "first_name": req.get('first_name'), "last_name": req.get('last_name'), 
                "email": req.get('email'), "phone": req.get('phone'), 
                "precinct_id": req.get('precinct_id'), "status": req.get('status'), "id": id
            }
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/voters/{id}")
def delete_voter(id: int, db: Session = Depends(_get_session)):
    try:
        db.execute(text("DELETE FROM voters WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voters/bulk")
def bulk_voters_upload(voters: List[Dict[str, Any]] = Body(...), db: Session = Depends(_get_session)):
    if not voters:
        raise HTTPException(status_code=400, detail={'message': 'No voter data provided'})
    try:
        precincts_result = db.execute(text("SELECT id, name, code FROM precincts"))
        precincts = [dict(row._mapping) for row in precincts_result]
        precinct_map = {}
        for p in precincts:
            precinct_map[str(p['id'])] = p['id']
            precinct_map[p['name'].lower()] = p['id']
            precinct_map[p['code'].lower()] = p['id']
        values = []
        for v in voters:
            pid = v.get('precinct_id')
            pid_key = str(pid).lower() if pid else None
            resolved_pid = precinct_map.get(pid_key)
            if resolved_pid is not None:
                values.append({
                    "precinct_id": resolved_pid,
                    "first_name": v.get('first_name', ''),
                    "last_name": v.get('last_name', ''),
                    "email": v.get('email', None),
                    "phone": v.get('phone', None),
                    "status": v.get('status', 'Active')
                })
        if not values:
            raise HTTPException(status_code=400, detail={'message': 'No valid precincts found in the data. Please ensure precinct_id matches an existing Precinct ID, Name, or Code.'})
        
        result = db.execute(
            text("INSERT INTO voters (precinct_id, first_name, last_name, email, phone, status) VALUES (:precinct_id, :first_name, :last_name, :email, :phone, :status)"),
            values
        )
        db.commit()
        inserted_count = result.rowcount
        return {
            "message": "Bulk upload successful",
            "total": len(voters),
            "inserted": inserted_count,
            "failed": len(voters) - inserted_count
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
