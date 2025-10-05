"""
Pydantic schemas for API request/response validation
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class EmploymentStatusEnum(str, Enum):
    EMPLOYED = "employed"
    SELF_EMPLOYED = "self-employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"


class MaritalStatusEnum(str, Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"


class DocumentStatusEnum(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class ActivityTypeEnum(str, Enum):
    UPLOAD = "upload"
    EXTRACTION = "extraction"
    DOWNLOAD = "download"
    PROFILE_UPDATE = "profile_update"


class ActivityStatusEnum(str, Enum):
    SUCCESS = "success"
    PENDING = "pending"
    FAILED = "failed"


# User Profile Schemas
class UserProfileBase(BaseModel):
    legal_first_name: Optional[str] = None
    legal_middle_name: Optional[str] = None
    legal_last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    ssn: Optional[str] = None
    phone: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    employment_status: Optional[EmploymentStatusEnum] = None
    employer_name: Optional[str] = None
    job_title: Optional[str] = None
    annual_income: Optional[str] = None
    employment_start_date: Optional[str] = None
    marital_status: Optional[MaritalStatusEnum] = None
    number_of_dependents: Optional[int] = 0
    veteran_status: Optional[bool] = False
    first_time_home_buyer: Optional[bool] = False


class UserProfileCreate(UserProfileBase):
    pass


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int
    email: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Document Schemas
class DocumentBase(BaseModel):
    file_name: str
    file_type: str
    document_category: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    id: int
    file_name: str
    file_size: int
    status: DocumentStatusEnum
    upload_date: datetime
    message: str


class DocumentResponse(BaseModel):
    id: int
    file_name: str
    file_size: Optional[int]
    file_type: str
    status: DocumentStatusEnum
    upload_date: datetime
    processed_date: Optional[datetime]
    document_category: Optional[str]
    extracted_data: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


# Activity Schemas
class ActivityBase(BaseModel):
    activity_type: ActivityTypeEnum
    description: str
    status: ActivityStatusEnum
    document_name: Optional[str] = None


class ActivityCreate(ActivityBase):
    document_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class ActivityResponse(BaseModel):
    id: int
    activity_type: ActivityTypeEnum
    description: str
    status: ActivityStatusEnum
    document_name: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


class ActivityListResponse(BaseModel):
    activities: List[ActivityResponse]
    total: int


# Extraction Result Schemas
class ExtractionResultBase(BaseModel):
    extraction_type: str
    extracted_fields: Dict[str, Any]
    confidence_score: Optional[int] = None
    model_name: Optional[str] = None


class ExtractionResultResponse(ExtractionResultBase):
    id: int
    document_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# User Schemas
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    auth0_id: str


class UserResponse(BaseModel):
    id: int
    auth0_id: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# API Response Schemas
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
