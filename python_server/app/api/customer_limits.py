"""
Endpoints for reading and updating per-customer rate limits.
Platform admin only.
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any

from app.database import get_db
from app.schemas import UserOut
from app.dependencies.security import get_current_user
from app.utils.limits import _get_limits_row, get_usage, DEFAULTS

router = APIRouter()

_LIMIT_KEYS = list(DEFAULTS.keys())


def _require_platform_admin(current_user: UserOut = Depends(get_current_user)):
    if getattr(current_user, "role", "").lower() != "admin" or current_user.customer_id is not None:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user


@router.get("/customers/{customer_id}/limits")
def get_customer_limits(
    customer_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    """Return limits + live usage for a customer."""
    limits_row = _get_limits_row(db, customer_id)
    limits = {k: limits_row.get(k, DEFAULTS[k]) for k in _LIMIT_KEYS}
    usage  = get_usage(db, customer_id)
    return {"limits": limits, "usage": usage}


@router.put("/customers/{customer_id}/limits")
def update_customer_limits(
    customer_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    """Update one or more limit values for a customer."""
    # Only allow known limit keys
    updates = {k: int(v) for k, v in payload.items() if k in _LIMIT_KEYS}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid limit keys provided")

    # Upsert
    existing = db.execute(
        text("SELECT id FROM customer_limits WHERE customer_id=:cid"),
        {"cid": customer_id},
    ).fetchone()

    if existing:
        set_clause = ", ".join(f"{k}=:{k}" for k in updates)
        db.execute(
            text(f"UPDATE customer_limits SET {set_clause} WHERE customer_id=:customer_id"),
            {**updates, "customer_id": customer_id},
        )
    else:
        cols = "customer_id, " + ", ".join(updates.keys())
        vals = ":customer_id, " + ", ".join(f":{k}" for k in updates)
        db.execute(
            text(f"INSERT INTO customer_limits ({cols}) VALUES ({vals})"),
            {**updates, "customer_id": customer_id},
        )

    db.commit()
    return {"message": "Limits updated successfully"}
