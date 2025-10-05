from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import verify_token
from sqlalchemy.orm import Session
from database import get_db
from models import User
from models import UserProfile, Activity, Document
from models import EmploymentStatus, MaritalStatus, ActivityType, ActivityStatus
from schemas import UserProfileUpdate

api_router = APIRouter()
security = HTTPBearer()

@api_router.get("/users/me")
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Get current authenticated user information
    """
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Prefer not to create a user if email is missing in access token
    auth0_id = payload.get("sub")
    if not auth0_id:
        raise HTTPException(status_code=400, detail="Missing sub in token")
    email = payload.get("email")

    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user and email:
        # Create only if we have a reliable email
        user = User(auth0_id=auth0_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "id": user.id if user else None,
        "sub": auth0_id,
        "email": email or (user.email if user else None),
        "name": payload.get("name"),
        "picture": payload.get("picture"),
        "created_at": str(user.created_at) if user else None,
    }

@api_router.get("/data")
async def get_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Example protected endpoint that returns some data
    """
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    return {
        "data": [
            {"id": 1, "name": "Item 1"},
            {"id": 2, "name": "Item 2"},
            {"id": 3, "name": "Item 3"}
        ]
    }


# Profile Endpoints
@api_router.get("/profile")
async def get_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    auth0_id = payload.get("sub")
    if not auth0_id:
        raise HTTPException(status_code=400, detail="Missing sub in token")

    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        # No user yet, so no profile
        return {}

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        return {}

    return {
        "legalFirstName": profile.legal_first_name,
        "legalMiddleName": profile.legal_middle_name,
        "legalLastName": profile.legal_last_name,
        "dateOfBirth": profile.date_of_birth,
        "ssn": profile.ssn,
        "email": user.email,
        "phone": profile.phone,
        "streetAddress": profile.street_address,
        "city": profile.city,
        "state": profile.state,
        "zipCode": profile.zip_code,
        "employmentStatus": profile.employment_status.value if profile.employment_status else None,
        "employerName": profile.employer_name,
        "jobTitle": profile.job_title,
        "annualIncome": profile.annual_income,
        "employmentStartDate": profile.employment_start_date,
        "maritalStatus": profile.marital_status.value if profile.marital_status else None,
        "numberOfDependents": profile.number_of_dependents,
        "veteranStatus": profile.veteran_status,
        "firstTimeHomeBuyer": profile.first_time_home_buyer,
    }


@api_router.put("/profile")
async def update_profile(
    data: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    auth0_id = payload.get("sub")
    if not auth0_id:
        raise HTTPException(status_code=400, detail="Missing sub in token")

    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        # Create user using email from payload or request body
        email = payload.get("email") or data.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email required to create user profile")
        user = User(auth0_id=auth0_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update email if provided in payload/body and different
        new_email = payload.get("email") or data.get("email")
        if new_email and new_email != user.email:
            user.email = new_email
            db.add(user)
            db.commit()
            db.refresh(user)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    # Map incoming fields to model columns
    profile.legal_first_name = data.get("legalFirstName")
    profile.legal_middle_name = data.get("legalMiddleName")
    profile.legal_last_name = data.get("legalLastName")
    profile.date_of_birth = data.get("dateOfBirth")
    profile.ssn = data.get("ssn")
    profile.phone = data.get("phone")
    profile.street_address = data.get("streetAddress")
    profile.city = data.get("city")
    profile.state = data.get("state")
    profile.zip_code = data.get("zipCode")
    if data.get("employmentStatus"):
        try:
            profile.employment_status = EmploymentStatus(data.get("employmentStatus"))
        except Exception:
            profile.employment_status = None
    profile.employer_name = data.get("employerName")
    profile.job_title = data.get("jobTitle")
    profile.annual_income = data.get("annualIncome")
    profile.employment_start_date = data.get("employmentStartDate")
    if data.get("maritalStatus"):
        try:
            profile.marital_status = MaritalStatus(data.get("maritalStatus"))
        except Exception:
            profile.marital_status = None
    profile.number_of_dependents = int(data.get("numberOfDependents") or 0)
    profile.veteran_status = bool(data.get("veteranStatus"))
    profile.first_time_home_buyer = bool(data.get("firstTimeHomeBuyer"))

    db.commit()
    db.refresh(profile)

    # Record an activity
    activity = Activity(
        user_id=user.id,
        activity_type=ActivityType.PROFILE_UPDATE,
        description="Updated profile details",
        status=ActivityStatus.SUCCESS,
    )
    db.add(activity)
    db.commit()

    return {"message": "Profile updated successfully"}


# List endpoints for Activities/Documents (minimal stubs)
@api_router.get("/activities")
async def list_activities(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    auth0_id = payload.get("sub")
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        return []

    rows = db.query(Activity).filter(Activity.user_id == user.id).order_by(Activity.timestamp.desc()).all()
    result = [
        {
            "id": a.id,
            "type": a.activity_type.value if hasattr(a.activity_type, "value") else a.activity_type,
            "description": a.description,
            "timestamp": a.timestamp.isoformat(),
            "status": a.status.value if hasattr(a.status, "value") else a.status,
            "documentName": a.document_name,
        }
        for a in rows
    ]
    return result


@api_router.get("/documents")
async def list_documents(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    auth0_id = payload.get("sub")
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    if not user:
        return []

    docs = db.query(Document).filter(Document.user_id == user.id).order_by(Document.upload_date.desc()).all()
    result = [
        {
            "id": d.id,
            "name": d.file_name,
            "uploadDate": d.upload_date.isoformat(),
            "size": f"{(d.file_size or 0) // 1024} KB",
            "status": (d.status.value if hasattr(d.status, "value") and d.status else "processed"),
            "extractedData": d.extracted_data,
        }
        for d in docs
    ]
    return result
