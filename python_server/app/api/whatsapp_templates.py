from fastapi import APIRouter, HTTPException, Body, Depends, Query
from typing import Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import check_limit
from app.utils.audit import log_audit

router = APIRouter()


@router.get("/whatsapp-templates")
def get_whatsapp_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.customer_id:
            result = db.execute(
                text("SELECT * FROM whatsapp_templates WHERE customer_id=:cid ORDER BY id DESC LIMIT :limit OFFSET :skip"),
                {"cid": current_user.customer_id, "limit": limit, "skip": skip},
            )
        else:
            result = db.execute(text("SELECT * FROM whatsapp_templates ORDER BY id DESC LIMIT :limit OFFSET :skip"), {"limit": limit, "skip": skip})
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/whatsapp-templates")
def create_whatsapp_template(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM whatsapp_templates WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_whatsapp_templates", current_count, "WhatsApp Template")

        result = db.execute(
            text("INSERT INTO whatsapp_templates (code, name, body, status, customer_id, created_by) VALUES (:code, :name, :body, :status, :customer_id, :created_by)"),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'),
             "status": req.get('status', 'Active'), "customer_id": current_user.customer_id,
             "created_by": current_user.id},
        )
        db.commit()
        new_id = result.lastrowid
        log_audit(db, current_user.customer_id, 'whatsapp_template', new_id, req.get('name'), 'CREATE', current_user, new_values=req)
        return {"id": new_id, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/whatsapp-templates/{id}")
def update_whatsapp_template(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        old_row = db.execute(text("SELECT * FROM whatsapp_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(
            text("UPDATE whatsapp_templates SET code=:code, name=:name, body=:body, status=:status WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {"code": req.get('code'), "name": req.get('name'), "body": req.get('body'),
             "status": req.get('status'), "id": id, "cid": current_user.customer_id},
        )
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'whatsapp_template', id, req.get('name'), 'UPDATE', current_user, old_values=old_vals, new_values=req)
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/whatsapp-templates/{id}")
def delete_whatsapp_template(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        old_row = db.execute(text("SELECT * FROM whatsapp_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id}).fetchone()
        old_vals = dict(old_row._mapping) if old_row else None
        db.execute(text("DELETE FROM whatsapp_templates WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        cid = (old_vals or {}).get('customer_id') or current_user.customer_id
        log_audit(db, cid, 'whatsapp_template', id, (old_vals or {}).get('name'), 'DELETE', current_user, old_values=old_vals)
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
