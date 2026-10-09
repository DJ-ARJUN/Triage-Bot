from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import (
    PatientLoginRequest, ReviewerLoginRequest, TokenResponse,
    UserCreateRequest, UserResponse
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/patient-login", response_model=TokenResponse)
async def patient_login(req: PatientLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == req.patient_id.strip()))
    user = result.scalars().first()
    
    if not user or user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Patient ID or password"
        )
    
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Patient ID or password"
        )
        
    token = create_access_token(data={"sub": user.user_id, "role": user.role, "name": user.full_name})
    return TokenResponse(
        access_token=token,
        user_id=user.user_id,
        role=user.role,
        full_name=user.full_name,
        preferred_language=user.preferred_language
    )

@router.post("/reviewer-login", response_model=TokenResponse)
async def reviewer_login(req: ReviewerLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.user_id == req.reviewer_id.strip()))
    user = result.scalars().first()
    
    if not user or user.role not in ["reviewer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Reviewer ID or password"
        )
    
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Reviewer ID or password"
        )
        
    token = create_access_token(data={"sub": user.user_id, "role": user.role, "name": user.full_name})
    return TokenResponse(
        access_token=token,
        user_id=user.user_id,
        role=user.role,
        full_name=user.full_name,
        preferred_language=user.preferred_language
    )

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/demo-accounts")
async def get_demo_accounts(db: AsyncSession = Depends(get_db)):
    """Returns sample test IDs so judges and reviewers can log in without typing."""
    patients_res = await db.execute(select(User).where(User.role == "patient").limit(5))
    reviewers_res = await db.execute(select(User).where(User.role == "reviewer").limit(5))
    
    patients = patients_res.scalars().all()
    reviewers = reviewers_res.scalars().all()
    
    return {
        "patients": [
            {"id": p.user_id, "name": p.full_name, "password": "patient123", "age": p.age, "gender": p.gender}
            for p in patients
        ],
        "reviewers": [
            {"id": r.user_id, "name": r.full_name, "password": "doctor123", "role": r.role}
            for r in reviewers
        ]
    }

@router.post("/register", response_model=UserResponse)
async def register_user(req: UserCreateRequest, db: AsyncSession = Depends(get_db)):
    """Institute registration endpoint for new Patient IDs or Reviewer IDs."""
    existing = await db.execute(select(User).where(User.user_id == req.user_id.strip()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="User ID already exists")

    new_user = User(
        user_id=req.user_id.strip(),
        role=req.role,
        full_name=req.full_name.strip(),
        hashed_password=get_password_hash(req.password),
        phone=req.phone,
        age=req.age,
        gender=req.gender,
        preferred_language=req.preferred_language or "en"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

