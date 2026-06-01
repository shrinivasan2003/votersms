from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.security import get_current_user
from app.schemas import UserOut

router = APIRouter()


@router.get("/counties")
def get_counties(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("SELECT * FROM counties WHERE customer_id=:cid ORDER BY id DESC"),
                {"cid": current_user.customer_id},
            )
        else:
            result = db.execute(text("SELECT * FROM counties ORDER BY id DESC"))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/counties")
def create_county(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        result = db.execute(
            text("INSERT INTO counties (code, name, state, status, customer_id) VALUES (:code, :name, :state, :status, :customer_id)"),
            {
                "code": req.get('code'), "name": req.get('name'),
                "state": req.get('state', 'GA'), "status": req.get('status', 'Active'),
                "customer_id": current_user.customer_id,
            },
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/counties/{id}")
def update_county(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(
            text("UPDATE counties SET code=:code, name=:name, state=:state, status=:status WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {"code": req.get('code'), "name": req.get('name'), "state": req.get('state'),
             "status": req.get('status'), "id": id, "cid": current_user.customer_id},
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/counties/{id}")
def delete_county(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(text("DELETE FROM counties WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
