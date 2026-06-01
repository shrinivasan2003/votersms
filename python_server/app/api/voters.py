from fastapi import APIRouter, HTTPException, Body, Depends, Query
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies.security import get_current_user
from app.schemas import UserOut
from app.utils.limits import check_limit

router = APIRouter()


@router.get("/voters")
def get_voters(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if search:
            q = f"%{search}%"
            result = db.execute(text("""
                SELECT v.*, p.name as precinct_name
                FROM voters v
                LEFT JOIN precincts p ON v.precinct_id = p.id
                WHERE (v.first_name LIKE :q OR v.last_name LIKE :q
                   OR v.email LIKE :q OR v.phone LIKE :q
                   OR CONCAT(v.first_name, ' ', v.last_name) LIKE :q)
                AND (:cid IS NULL OR v.customer_id = :cid)
                ORDER BY v.first_name, v.last_name
                LIMIT :limit OFFSET :skip
            """), {"q": q, "cid": cid, "limit": limit, "skip": skip})
        else:
            result = db.execute(text("""
                SELECT v.*, p.name as precinct_name
                FROM voters v
                LEFT JOIN precincts p ON v.precinct_id = p.id
                WHERE (:cid IS NULL OR v.customer_id = :cid)
                ORDER BY v.id DESC
                LIMIT :limit OFFSET :skip
            """), {"cid": cid, "limit": limit, "skip": skip})
        return [dict(row._mapping) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voters")
def create_voter(
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM voters WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_voters", current_count, "Voter")

        result = db.execute(
            text("INSERT INTO voters (first_name, last_name, email, phone, precinct_id, status, customer_id) "
                 "VALUES (:first_name, :last_name, :email, :phone, :precinct_id, :status, :customer_id)"),
            {
                "first_name": req.get('first_name'), "last_name": req.get('last_name'),
                "email": req.get('email'), "phone": req.get('phone'),
                "precinct_id": req.get('precinct_id'), "status": req.get('status', 'Active'),
                "customer_id": current_user.customer_id,
            },
        )
        db.commit()
        return {"id": result.lastrowid, **req}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/voters/{id}")
def update_voter(
    id: int,
    req: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(
            text("UPDATE voters SET first_name=:first_name, last_name=:last_name, "
                 "email=:email, phone=:phone, precinct_id=:precinct_id, status=:status "
                 "WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"),
            {
                "first_name": req.get('first_name'), "last_name": req.get('last_name'),
                "email": req.get('email'), "phone": req.get('phone'),
                "precinct_id": req.get('precinct_id'), "status": req.get('status'),
                "id": id, "cid": current_user.customer_id,
            },
        )
        db.commit()
        return {"message": "Updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/voters/{id}")
def delete_voter(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        db.execute(text("DELETE FROM voters WHERE id=:id AND (customer_id=:cid OR :cid IS NULL)"), {"id": id, "cid": current_user.customer_id})
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/voters/bulk")
def bulk_voters_upload(
    voters: List[Dict[str, Any]] = Body(...),
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if not voters:
        raise HTTPException(status_code=400, detail={'message': 'No voter data provided'})
    try:
        cid = current_user.customer_id
        if cid is not None:
            current_count = db.execute(
                text("SELECT COUNT(*) AS c FROM voters WHERE customer_id=:cid"),
                {"cid": cid},
            ).fetchone().c
            check_limit(db, cid, "max_voters", current_count + len(voters) - 1, "Voter")
        precincts_result = db.execute(
            text("SELECT id, name, code FROM precincts WHERE (:cid IS NULL OR customer_id = :cid)"),
            {"cid": cid},
        )
        precincts = [dict(row._mapping) for row in precincts_result]
        precinct_map = {}
        for p in precincts:
            precinct_map[str(p['id'])] = p['id']
            precinct_map[p['name'].lower()] = p['id']
            if p.get('code'):
                precinct_map[p['code'].lower()] = p['id']
        # If there is exactly one precinct, auto-assign rows that omit it
        auto_precinct = precincts[0]['id'] if len(precincts) == 1 else None

        values = []
        skipped = 0
        for v in voters:
            first = str(v.get('first_name') or '').strip()
            last  = str(v.get('last_name')  or '').strip()
            if not first and not last:
                skipped += 1
                continue  # completely empty row

            # Accept both 'precinct_id' and 'precinct' column names
            raw_pid = v.get('precinct_id') or v.get('precinct') or None
            if raw_pid:
                pid_key = str(raw_pid).lower().strip()
                resolved_pid = precinct_map.get(pid_key)
            else:
                resolved_pid = auto_precinct  # None if multiple precincts exist

            values.append({
                "precinct_id": resolved_pid,
                "first_name":  first,
                "last_name":   last,
                "email":       str(v.get('email')  or '').strip() or None,
                "phone":       str(v.get('phone')  or '').strip() or None,
                "status":      str(v.get('status') or 'Active').strip() or 'Active',
                "customer_id": cid,
            })

        if not values:
            raise HTTPException(
                status_code=400,
                detail={'message': 'No valid rows found in the file. Make sure first_name or last_name columns are present.'},
            )

        result = db.execute(
            text("INSERT INTO voters (precinct_id, first_name, last_name, email, phone, status, customer_id) "
                 "VALUES (:precinct_id, :first_name, :last_name, :email, :phone, :status, :customer_id)"),
            values,
        )
        db.commit()
        inserted_count = result.rowcount
        return {
            "message": "Bulk upload successful",
            "total":    len(voters),
            "inserted": inserted_count,
            "skipped":  skipped,
            "failed":   len(voters) - inserted_count - skipped,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
