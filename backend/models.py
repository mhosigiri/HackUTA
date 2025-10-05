"""
Database models for Mortgage Document Extraction Application
"""

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class EmploymentStatus(str, enum.Enum):
    EMPLOYED = "employed"
    SELF_EMPLOYED = "self-employed"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"


class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"


class DocumentStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"


class ActivityType(str, enum.Enum):
    UPLOAD = "upload"
    EXTRACTION = "extraction"
    DOWNLOAD = "download"
    PROFILE_UPDATE = "profile_update"


class ActivityStatus(str, enum.Enum):
    SUCCESS = "success"
    PENDING = "pending"
    FAILED = "failed"


class User(Base):
    """User model - stores Auth0 user information and profile data"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    auth0_id = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    """User profile model - stores detailed mortgage application information"""
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Personal Information
    legal_first_name = Column(String(100))
    legal_middle_name = Column(String(100))
    legal_last_name = Column(String(100))
    date_of_birth = Column(String(50))
    ssn = Column(String(255))  # Encrypted in production
    phone = Column(String(50))

    # Address
    street_address = Column(String(255))
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))

    # Employment
    employment_status = Column(Enum(EmploymentStatus))
    employer_name = Column(String(255))
    job_title = Column(String(100))
    annual_income = Column(String(50))
    employment_start_date = Column(String(50))

    # Additional Information
    marital_status = Column(Enum(MaritalStatus))
    number_of_dependents = Column(Integer, default=0)
    veteran_status = Column(Boolean, default=False)
    first_time_home_buyer = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")


class Document(Base):
    """Document model - stores uploaded mortgage documents"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Document metadata
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500))  # GCP Cloud Storage path
    file_size = Column(Integer)  # Size in bytes
    file_type = Column(String(50))  # pdf, jpg, png, etc.

    # Processing information
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADED)
    upload_date = Column(DateTime, default=datetime.utcnow)
    processed_date = Column(DateTime, nullable=True)

    # Extracted data from AI
    extracted_data = Column(JSON, nullable=True)

    # Document category (e.g., W2, bank statement, tax return, etc.)
    document_category = Column(String(100))

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="documents")


class Activity(Base):
    """Activity model - tracks user actions and history"""
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Activity information
    activity_type = Column(Enum(ActivityType), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(ActivityStatus), default=ActivityStatus.SUCCESS)

    # Related document (if applicable)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    document_name = Column(String(255), nullable=True)

    # Additional metadata
    activity_metadata = Column(JSON, nullable=True)

    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="activities")


class ExtractionResult(Base):
    """Extraction result model - stores AI extraction results with versioning"""
    __tablename__ = "extraction_results"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)

    # Extraction information
    extraction_type = Column(String(100))  # personal_info, income, employment, etc.
    extracted_fields = Column(JSON, nullable=False)  # The actual extracted data
    confidence_score = Column(Integer)  # 0-100 confidence in extraction

    # AI model information
    model_name = Column(String(100))  # e.g., "gemini-pro", "gpt-4", etc.
    model_version = Column(String(50))

    created_at = Column(DateTime, default=datetime.utcnow)
