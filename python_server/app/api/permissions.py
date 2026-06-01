from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any, List
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/permissions")
def get_permissions(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("""
            SELECT p.*, COUNT(rp.role_id) AS role_count
            FROM permissions p
            LEFT JOIN role_permissions rp ON p.id = rp.permission_id
            GROUP BY p.id
            ORDER BY p.display_order ASC, p.id DESC
        """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/{id}")
def get_permission(id: int, db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT * FROM permissions WHERE id=:id"), {"id": id})
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Permission not found")
        perm = dict(row._mapping)
        roles_result = db.execute(
            text("SELECT role_id FROM role_permissions WHERE permission_id=:id"), {"id": id}
        )
        perm["roleIds"] = [r[0] for r in roles_result.fetchall()]
        return perm
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/permissions")
def create_permission(req: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    try:
        result = db.execute(
            text("""
                INSERT INTO permissions
                    (name, code, resource_path, resource_type, parent_menu, icon, display_order, description, status)
                VALUES
                    (:name, :code, :resource_path, :resource_type, :parent_menu, :icon, :display_order, :description, :status)
            """),
            {
                "name": req.get("name"),
                "code": req.get("code"),
                "resource_path": req.get("resource_path", ""),
                "resource_type": req.get("resource_type", ""),
                "parent_menu": req.get("parent_menu", ""),
                "icon": req.get("icon", ""),
                "display_order": req.get("display_order", 0),
                "description": req.get("description", ""),
                "status": req.get("status", "Active"),
            }
        )
        perm_id = result.lastrowid
        db.commit()

        role_ids: List[int] = req.get("roleIds") or []
        for role_id in role_ids:
            db.execute(
                text("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)"),
                {"role_id": role_id, "perm_id": perm_id}
            )
        db.commit()
        return {"id": perm_id, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/permissions/{id}")
def update_permission(id: int, req: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    try:
        db.execute(
            text("""
                UPDATE permissions SET
                    name=:name, code=:code, resource_path=:resource_path, resource_type=:resource_type,
                    parent_menu=:parent_menu, icon=:icon, display_order=:display_order,
                    description=:description, status=:status
                WHERE id=:id
            """),
            {
                "name": req.get("name"),
                "code": req.get("code"),
                "resource_path": req.get("resource_path", ""),
                "resource_type": req.get("resource_type", ""),
                "parent_menu": req.get("parent_menu", ""),
                "icon": req.get("icon", ""),
                "display_order": req.get("display_order", 0),
                "description": req.get("description", ""),
                "status": req.get("status", "Active"),
                "id": id,
            }
        )
        db.commit()

        # Reassign roles
        db.execute(text("DELETE FROM role_permissions WHERE permission_id=:id"), {"id": id})
        role_ids: List[int] = req.get("roleIds") or []
        for role_id in role_ids:
            db.execute(
                text("INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)"),
                {"role_id": role_id, "perm_id": id}
            )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/permissions/{id}")
def delete_permission(id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM role_permissions WHERE permission_id=:id"), {"id": id})
        db.execute(text("DELETE FROM permissions WHERE id=:id"), {"id": id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
