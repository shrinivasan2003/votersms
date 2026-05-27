from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

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
    user = db.query(UserModel).filter(UserModel.username == request.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Try hashed verification first; fall back to plaintext (legacy) and auto-upgrade
    if verify_password(request.password, user.password):
        pass
    elif request.password == user.password:
        user.password = hash_password(request.password)
        db.commit()
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "id": user.id,
        "username": user.username,
        "name": getattr(user, "name", user.username),
        "role": user.role,
        "status": getattr(user, "status", "Active"),
    }
