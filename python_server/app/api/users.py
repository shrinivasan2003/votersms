from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List

from sqlalchemy.orm import Session

from app.dependencies.security import get_current_user, require_role, require_self_or_admin
from app.database import get_db
from app.models import User as UserModel
from app.schemas import UserCreate, UserUpdate, UserOut
from app.utils.password import hash_password

router = APIRouter()

# Admin can list all users with pagination
@router.get("/users", response_model=List[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1),
    db: Session = Depends(get_db),
    _: UserOut = Depends(require_role("admin")),
):
    users = db.query(UserModel).offset(skip).limit(limit).all()
    return users

# Get current logged‑in user info
@router.get("/users/me", response_model=UserOut)
def read_self(current_user: UserOut = Depends(get_current_user)):
    return current_user

# Get a specific user (admin or self)
@router.get("/users/{user_id}", response_model=UserOut)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: UserOut = Depends(require_self_or_admin),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Create a new user – admin can set any role, normal registration defaults to "User"
@router.post("/users", response_model=UserOut)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    # If the caller is admin, allow role from payload; otherwise force "User"
    role = user_in.role if current_user.role == "admin" else "User"
    # Inherit customer_id from the creating user (tenant isolation)
    customer_id = current_user.customer_id
    hashed_pwd = hash_password(user_in.password)
    new_user = UserModel(
        username=user_in.username,
        password=hashed_pwd,
        name=user_in.full_name,
        role=role,
        status=user_in.status,
        customer_id=customer_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# Update a user – admin can update any, user can update self
@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(require_self_or_admin),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.password:
        user.password = hash_password(user_in.password)
    if user_in.username:
        user.username = user_in.username
    if user_in.full_name:
        user.name = user_in.full_name
    # Only admins can change roles — prevent self-escalation
    if user_in.role and current_user.role == "admin":
        user.role = user_in.role
    if user_in.status:
        user.status = user_in.status
    db.commit()
    db.refresh(user)
    return user

# Delete a user – admin or self
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserOut = Depends(require_self_or_admin),
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Prevent deleting the last admin account
    if user.role == "admin":
        admin_count = db.query(UserModel).filter(UserModel.role == "admin").count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account.")
    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}
