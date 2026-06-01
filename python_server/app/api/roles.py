from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/roles")
def get_roles(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT * FROM roles ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roles")
def create_role(req: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("INSERT INTO roles (code, name, description, status) VALUES (:code, :name, :description, :status)"),
            {
                "code": req.get("code"),
                "name": req.get("name"),
                "description": req.get("description", ""),
                "status": req.get("status", "Active"),
            }
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/roles/{id}")
def update_role(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    try:
        db.execute(
            text("UPDATE roles SET code=:code, name=:name, description=:description, status=:status WHERE id=:id"),
            {
                "code": req.get("code"),
                "name": req.get("name"),
                "description": req.get("description", ""),
                "status": req.get("status", "Active"),
                "id": id,
            }
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/roles/{id}")
def delete_role(id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM role_permissions WHERE role_id=:id"), {"id": id})
        db.execute(text("DELETE FROM roles WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
