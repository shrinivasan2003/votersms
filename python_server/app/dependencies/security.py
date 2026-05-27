import os
from datetime import datetime, timedelta
from typing import Generator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User as UserModel
from app.schemas import UserOut

# Load JWT secret — refuse to start with an insecure default
JWT_SECRET = os.getenv('JWT_SECRET', '')
_INSECURE_DEFAULTS = {'', 'super-secret-key', 'secret', 'changeme', 'change-me'}
if JWT_SECRET in _INSECURE_DEFAULTS:
    raise RuntimeError(
        "JWT_SECRET is not set or is using an insecure default. "
        "Set a strong random secret in python_server/.env.\n"
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
JWT_ALGORITHM = 'HS256'
JWT_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '1440'))  # default 1 day

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserOut:
    payload = decode_access_token(token)
    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    out = UserOut.from_orm(user)
    # customer_id may not be on the ORM object if not yet reflected; fall back to token payload
    if out.customer_id is None:
        out.customer_id = payload.get("customer_id")
    return out

def require_role(role_name: str):
    def role_checker(current_user: UserOut = Depends(get_current_user)):
        if getattr(current_user, "role", "").lower() != role_name.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"{role_name} role required")
        return current_user
    return role_checker

def require_self_or_admin(user_id: int, current_user: UserOut = Depends(get_current_user)):
    if getattr(current_user, "role", "").lower() != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this operation")
    return current_user
