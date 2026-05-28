"""
Contact Lists API

GET    /api/contact-lists                            — list all lists (+ member_count)
GET    /api/contact-lists/master-count               — count of all active recipients with email
POST   /api/contact-lists                            — create a list
PUT    /api/contact-lists/{id}                       — update a list
DELETE /api/contact-lists/{id}                       — delete a list

GET    /api/contact-lists/{list_id}/members          — members of a list
POST   /api/contact-lists/{list_id}/members          — add one member  {voter_id}
DELETE /api/contact-lists/{list_id}/members/{voter_id} — remove one member
POST   /api/contact-lists/{list_id}/members/bulk     — bulk add [{email|voter_id}, ...]
"""
from fastapi import APIRouter, HTTPException, Body, Depends
from typing import Dict, Any, List
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import UserOut
from app.dependencies.security import get_current_user
from app.utils.limits import check_limit

router = APIRouter()


# ── Contact Lists CRUD ────────────────────────────────────────────────────────

@router.get("/contact-lists/master-count")
def get_master_count(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    try:
        if cid is not None:
            row = db.execute(text(
                "SELECT COUNT(*) AS cnt FROM voters "
                "WHERE status='Active' AND email IS NOT NULL AND email != '' AND customer_id=:cid"
            ), {"cid": cid}).fetchone()
        else:
            row = db.execute(text(
                "SELECT COUNT(*) AS cnt FROM voters "
                "WHERE status='Active' AND email IS NOT NULL AND email != ''"
            )).fetchone()
        return {"count": row[0] if row else 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/contact-lists")
def get_contact_lists(
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    try:
        if cid is not None:
            result = db.execute(text("""
                SELECT cl.*, COUNT(lm.id) AS member_count
                FROM contact_lists cl
                LEFT JOIN list_members lm ON cl.id = lm.list_id
                WHERE cl.customer_id=:cid
                GROUP BY cl.id
                ORDER BY cl.id DESC
            """), {"cid": cid})
        else:
            result = db.execute(text("""
                SELECT cl.*, COUNT(lm.id) AS member_count
                FROM contact_lists cl
                LEFT JOIN list_members lm ON cl.id = lm.list_id
                GROUP BY cl.id
                ORDER BY cl.id DESC
            """))
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contact-lists")
def create_contact_list(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM contact_lists WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_contact_lists", current_count, "Contact List")

        result = db.execute(
            text("INSERT INTO contact_lists (name, description, status, customer_id) "
                 "VALUES (:name, :description, :status, :customer_id)"),
            {
                "name": req.get("name"),
                "description": req.get("description", ""),
                "status": req.get("status", "Active"),
                "customer_id": current_user.customer_id,
            }
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/contact-lists/{id}")
def update_contact_list(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    try:
        db.execute(
            text("UPDATE contact_lists SET name=:name, description=:description, status=:status "
                 "WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {
                "name": req.get("name"),
                "description": req.get("description", ""),
                "status": req.get("status", "Active"),
                "id": id,
                "cid": cid,
            }
        )
        db.commit()
        return {"id": id, **req}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/contact-lists/{id}")
def delete_contact_list(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    try:
        db.execute(
            text("DELETE FROM contact_lists WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {"id": id, "cid": cid}
        )
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── List Members ──────────────────────────────────────────────────────────────

@router.get("/contact-lists/{list_id}/members")
def get_list_members(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    try:
        # Verify the list belongs to this customer before returning members
        owner = db.execute(
            text("SELECT id FROM contact_lists WHERE id=:lid AND (customer_id=:cid OR :cid IS NULL)"),
            {"lid": list_id, "cid": cid}
        ).first()
        if not owner:
            raise HTTPException(status_code=404, detail="List not found")

        result = db.execute(text("""
            SELECT v.id AS voter_id,
                   v.first_name, v.last_name,
                   v.email, v.phone, v.status,
                   lm.added_at
            FROM list_members lm
            JOIN voters v ON lm.voter_id = v.id
            WHERE lm.list_id = :list_id
            ORDER BY v.first_name, v.last_name
        """), {"list_id": list_id})
        return [dict(row._mapping) for row in result]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contact-lists/{list_id}/members")
def add_list_member(
    list_id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    try:
        voter_id = req.get("voter_id")
        if not voter_id:
            raise HTTPException(status_code=400, detail="voter_id is required")
        # Ensure voter belongs to this customer
        voter = db.execute(
            text("SELECT id FROM voters WHERE id=:vid AND (customer_id=:cid OR :cid IS NULL)"),
            {"vid": voter_id, "cid": cid}
        ).first()
        if not voter:
            raise HTTPException(status_code=404, detail="Voter not found")
        db.execute(
            text("INSERT IGNORE INTO list_members (list_id, voter_id) VALUES (:list_id, :voter_id)"),
            {"list_id": list_id, "voter_id": voter_id}
        )
        db.commit()
        return {"message": "Member added"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/contact-lists/{list_id}/members/{voter_id}")
def remove_list_member(
    list_id: int,
    voter_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(
            text("DELETE FROM list_members WHERE list_id=:list_id AND voter_id=:voter_id"),
            {"list_id": list_id, "voter_id": voter_id}
        )
        db.commit()
        return {"message": "Member removed"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contact-lists/{list_id}/members/bulk")
def bulk_add_list_members(
    list_id: int,
    req: List[Dict[str, Any]] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    cid = current_user.customer_id
    added = 0
    skipped = 0
    try:
        for item in req:
            voter_id = item.get("voter_id")
            email = item.get("email", "").strip()

            if not voter_id and email:
                # Only find voters that belong to this customer
                cid_clause = "AND customer_id=:cid" if cid is not None else ""
                row = db.execute(
                    text(f"SELECT id FROM voters WHERE LOWER(email)=LOWER(:email) {cid_clause} LIMIT 1"),
                    {"email": email, "cid": cid} if cid is not None else {"email": email}
                ).fetchone()
                if row:
                    voter_id = row[0]

            if voter_id:
                db.execute(
                    text("INSERT IGNORE INTO list_members (list_id, voter_id) VALUES (:list_id, :voter_id)"),
                    {"list_id": list_id, "voter_id": voter_id}
                )
                added += 1
            else:
                skipped += 1

        db.commit()
        return {"added": added, "skipped": skipped}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
