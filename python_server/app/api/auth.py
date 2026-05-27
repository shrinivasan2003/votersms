import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models import User as UserModel
from app.utils.password import verify_password, hash_password
from app.dependencies.security import create_access_token

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Check env-var admin override (platform super-admin shortcut)
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")

    user = db.query(UserModel).filter(UserModel.username == request.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Password verification: hashed first, then plaintext fallback with auto-upgrade
    if verify_password(request.password, user.password):
        pass
    elif request.password == user.password:
        user.password = hash_password(request.password)
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Record last login time
    db.execute(
        text("UPDATE users SET last_login=:ts WHERE id=:id"),
        {"ts": datetime.utcnow(), "id": user.id},
    )
    db.commit()

    customer_id = getattr(user, "customer_id", None)

    # Fetch organization name for the welcome UI
    org_name = None
    if customer_id:
        row = db.execute(
            text("SELECT name FROM customers WHERE id=:cid"), {"cid": customer_id}
        ).first()
        if row:
            org_name = row.name

    token = create_access_token({"sub": str(user.id), "role": user.role, "customer_id": customer_id})
    return {
        "access_token":      token,
        "token_type":        "bearer",
        "id":                user.id,
        "username":          user.username,
        "name":              getattr(user, "name", user.username),
        "first_name":        getattr(user, "first_name", None),
        "last_name":         getattr(user, "last_name", None),
        "email":             getattr(user, "email", None),
        "role":              user.role,
        "status":            getattr(user, "status", "Active"),
        "customer_id":       customer_id,
        "organization_name": org_name,
    }
