from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.models.all_models import User
from backend.app.schemas.all_schemas import UserCreate, UserLogin, UserOut, UserUpdate, Token
from backend.app.api.deps import get_current_user, get_current_admin, log_audit

router = APIRouter(prefix="/auth", tags=["Authentication & Accounts"])

@router.post("/register", response_model=UserOut)
def register_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    # Check existing user
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(
            status_code=400,
            detail="A user with this email address already exists."
        )
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(
            status_code=400,
            detail="A user with this username already exists."
        )

    # First user can be admin if no users exist; otherwise normal registration is always 'planner'
    total_users = db.query(User).count()
    assigned_role = "admin" if total_users == 0 else "planner"
    # Even if someone sends role="admin", prevent privilege escalation unless they are first user
    if user_in.role == "admin" and total_users > 0:
        assigned_role = "planner"

    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
        role=assigned_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit(
        db,
        action="REGISTER",
        user_id=new_user.id,
        resource_type="User",
        resource_id=str(new_user.id),
        details={"username": new_user.username, "role": assigned_role},
        request=request
    )

    return new_user

@router.post("/login", response_model=Token)
def login_user(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    # Lookup by username or email
    user = db.query(User).filter(
        (User.username == credentials.username_or_email) | (User.email == credentials.username_or_email)
    ).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        log_audit(
            db,
            action="LOGIN_FAILED",
            resource_type="User",
            details={"attempted_identifier": credentials.username_or_email},
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled.")

    access_token = create_access_token(subject=user.id, role=user.role)

    log_audit(
        db,
        action="LOGIN_SUCCESS",
        user_id=user.id,
        resource_type="User",
        resource_id=str(user.id),
        details={"role": user.role},
        request=request
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_all_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator-only user listing."""
    return db.query(User).order_by(User.id).all()

@router.put("/users/{user_id}", response_model=UserOut)
def update_user_status(
    user_id: int,
    user_update: UserUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator-only account role & status management."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.role:
        target_user.role = user_update.role
    if user_update.is_active is not None:
        target_user.is_active = user_update.is_active
    if user_update.full_name:
        target_user.full_name = user_update.full_name

    db.commit()
    db.refresh(target_user)
    return target_user
