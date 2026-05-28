import os
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any

from app.database import get_db
from app.schemas import CustomerCreate, UserOut
from app.dependencies.security import get_current_user
from app.utils.password import hash_password
from app.utils.email import send_welcome_email

router = APIRouter()


def _require_platform_admin(current_user: UserOut = Depends(get_current_user)):
    """Only platform admins (role=admin, no customer_id) may manage customers."""
    if getattr(current_user, "role", "").lower() != "admin" or current_user.customer_id is not None:
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user


@router.get("/customers")
def list_customers(
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    rows = db.execute(text("""
        SELECT u.id, u.username, u.email, u.first_name, u.last_name,
               u.status, u.last_login, u.customer_id,
               c.name AS organization_name
        FROM users u
        LEFT JOIN customers c ON u.customer_id = c.id
        WHERE u.customer_id IS NOT NULL
        ORDER BY u.id DESC
    """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/customers", status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    # Check username uniqueness
    existing = db.execute(
        text("SELECT id FROM users WHERE username = :u"), {"u": payload.username}
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create the customer organization record
    result = db.execute(
        text("INSERT INTO customers (name, email, status) VALUES (:name, :email, 'Active')"),
        {"name": payload.organization_name, "email": payload.email},
    )
    db.flush()
    customer_id = result.lastrowid

    # Create the customer's initial admin user
    hashed = hash_password(payload.password)
    full_name = f"{payload.first_name} {payload.last_name}".strip()
    db.execute(
        text(
            "INSERT INTO users "
            "(username, password, name, first_name, last_name, email, role, status, customer_id) "
            "VALUES (:username, :password, :name, :first_name, :last_name, :email, 'admin', 'Active', :customer_id)"
        ),
        {
            "username":   payload.username,
            "password":   hashed,
            "name":       full_name,
            "first_name": payload.first_name,
            "last_name":  payload.last_name,
            "email":      payload.email,
            "customer_id": customer_id,
        },
    )
    db.commit()

    # Auto-create default limits row for the new customer
    db.execute(
        text("INSERT IGNORE INTO customer_limits (customer_id) VALUES (:cid)"),
        {"cid": customer_id},
    )
    db.commit()

    # Send welcome email (non-blocking — failure doesn't abort the request)
    email_sent = send_welcome_email(
        to_email=payload.email,
        username=payload.username,
        password=payload.password,
        customer_name=payload.organization_name,
    )

    return {
        "id": customer_id,
        "organization_name": payload.organization_name,
        "email": payload.email,
        "status": "Active",
        "email_sent": email_sent,
    }


@router.patch("/customers/users/{user_id}/pause")
def pause_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    db.execute(
        text("UPDATE users SET status='Paused' WHERE id=:id AND customer_id IS NOT NULL"),
        {"id": user_id},
    )
    db.commit()
    return {"message": "Account paused"}


@router.patch("/customers/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    db.execute(
        text("UPDATE users SET status='Inactive' WHERE id=:id AND customer_id IS NOT NULL"),
        {"id": user_id},
    )
    db.commit()
    return {"message": "Account deactivated"}


@router.patch("/customers/users/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    db.execute(
        text("UPDATE users SET status='Active' WHERE id=:id AND customer_id IS NOT NULL"),
        {"id": user_id},
    )
    db.commit()
    return {"message": "Account activated"}


@router.delete("/customers/users/{user_id}")
def delete_customer_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    row = db.execute(
        text("SELECT customer_id FROM users WHERE id=:id AND customer_id IS NOT NULL"), {"id": user_id}
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Customer user not found")

    db.execute(text("DELETE FROM users WHERE id=:id"), {"id": user_id})
    # If no more users for this customer, delete the customer record too
    remaining = db.execute(
        text("SELECT COUNT(*) AS cnt FROM users WHERE customer_id=:cid"),
        {"cid": row.customer_id},
    ).first()
    if remaining.cnt == 0:
        db.execute(text("DELETE FROM customers WHERE id=:cid"), {"cid": row.customer_id})
    db.commit()
    return {"message": "User deleted"}


@router.put("/customers/{customer_id}")
def update_customer(
    customer_id: int,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    db.execute(
        text("UPDATE customers SET name=:name, email=:email, status=:status WHERE id=:id"),
        {
            "name": payload.get("name"),
            "email": payload.get("email"),
            "status": payload.get("status", "Active"),
            "id": customer_id,
        },
    )
    db.commit()
    return {"message": "Updated successfully"}


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    db.execute(text("DELETE FROM users WHERE customer_id=:id"), {"id": customer_id})
    db.execute(text("DELETE FROM customers WHERE id=:id"), {"id": customer_id})
    db.commit()
    return {"message": "Deleted successfully"}


# ── Platform settings ─────────────────────────────────────────────────────────

_EDITABLE_KEYS = {"postmark_sender_email", "postmark_sender_name"}


@router.get("/admin/settings")
def get_settings(
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    rows = db.execute(text("SELECT `key`, value FROM platform_settings")).fetchall()
    data = {r.key: r.value for r in rows}
    # Merge defaults from env
    data.setdefault("postmark_sender_email", os.getenv("POSTMARK_SENDER_EMAIL", ""))
    data.setdefault("postmark_sender_name",  os.getenv("POSTMARK_SENDER_NAME", "BallotDA"))
    # Report connection status without exposing the key
    api_key = os.getenv("POSTMARK_API_KEY", "")
    data["postmark_configured"] = bool(api_key and api_key != "POSTMARK_API_KEY_HERE")
    return data


@router.put("/admin/settings")
def update_settings(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    _: UserOut = Depends(_require_platform_admin),
):
    for key, value in payload.items():
        if key not in _EDITABLE_KEYS:
            continue
        existing = db.execute(
            text("SELECT id FROM platform_settings WHERE `key`=:k"), {"k": key}
        ).first()
        if existing:
            db.execute(
                text("UPDATE platform_settings SET value=:v WHERE `key`=:k"),
                {"v": str(value), "k": key},
            )
        else:
            db.execute(
                text("INSERT INTO platform_settings (`key`, value) VALUES (:k, :v)"),
                {"k": key, "v": str(value)},
            )
    db.commit()
    return {"message": "Settings saved"}
