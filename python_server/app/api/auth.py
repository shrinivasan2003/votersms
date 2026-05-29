import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import text, or_

from app.database import get_db
from app.models import User as UserModel
from app.utils.password import verify_password, hash_password
from app.utils.email import send_password_reset_email
from app.dependencies.security import create_access_token
from app.limiter import limiter

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator('username', 'password')
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Field cannot be empty')
        if len(v) > 256:
            raise ValueError('Field too long')
        return v

class ForgotPasswordRequest(BaseModel):
    username: str
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if len(v) > 128:
            raise ValueError('Password too long')
        return v


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    # Allow login by username OR email.
    # MySQL's default collation is case-insensitive, so we fetch first then
    # enforce case-sensitivity in Python for username (emails are case-insensitive by RFC).
    user = db.query(UserModel).filter(
        or_(UserModel.username == body.username, UserModel.email == body.username)
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Reject if neither username (case-sensitive) nor email (case-insensitive) truly matches
    username_match = (user.username == body.username)
    email_match    = bool(user.email and user.email.lower() == body.username.lower())
    if not username_match and not email_match:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Password verification — hashed only; plaintext passwords are not accepted
    if not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Block inactive or paused accounts
    status = getattr(user, "status", "Active")
    if status == "Inactive":
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact your administrator.")
    if status == "Paused":
        raise HTTPException(status_code=403, detail="Your account is currently paused. Please contact your administrator.")

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


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(
        UserModel.username == body.username,
        UserModel.email == body.email,
    ).first()
    # Always return success to avoid leaking which accounts exist
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    db.execute(
        text("UPDATE users SET reset_token=:tok, reset_token_expires=:exp WHERE id=:id"),
        {"tok": token, "exp": expires, "id": user.id},
    )
    db.commit()

    send_password_reset_email(user.email, token)
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT id, reset_token_expires FROM users WHERE reset_token=:tok"),
        {"tok": body.token},
    ).first()
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    if datetime.utcnow() > row.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired.")

    new_hashed = hash_password(body.new_password)
    db.execute(
        text("UPDATE users SET password=:pw, reset_token=NULL, reset_token_expires=NULL WHERE id=:id"),
        {"pw": new_hashed, "id": row.id},
    )
    db.commit()
    return {"message": "Password updated successfully."}
