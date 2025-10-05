"""
Database configuration and connection setup for GCP Cloud SQL (PostgreSQL)

Instructions:
1. Create a Cloud SQL instance on GCP (PostgreSQL)
2. Create a database named 'mortgage_doc_db'
3. Get connection credentials from GCP Console
4. Add credentials to .env file
5. Install required packages: pip install sqlalchemy psycopg2-binary google-cloud-sql-connector
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from google.cloud.sql.connector import Connector
    CLOUD_SQL_AVAILABLE = True
except ImportError:
    CLOUD_SQL_AVAILABLE = False
    print("Warning: google-cloud-sql-connector not available. Cloud SQL connections will not work.")

# Database configuration from environment variables
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "mortgage_doc_db")
DB_HOST = os.getenv("DB_HOST", "localhost")  # For local development
DB_PORT = os.getenv("DB_PORT", "5432")

# GCP Cloud SQL specific
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")
GCP_INSTANCE_NAME = os.getenv("GCP_INSTANCE_NAME", "")
USE_CLOUD_SQL = os.getenv("USE_CLOUD_SQL", "false").lower() == "true"

Base = declarative_base()


def get_database_url():
    """Get database URL based on environment (local or GCP Cloud SQL)"""
    if USE_CLOUD_SQL:
        # For GCP Cloud SQL with connector
        return f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?host=/cloudsql/{GCP_PROJECT_ID}:{GCP_REGION}:{GCP_INSTANCE_NAME}"
    else:
        # For local PostgreSQL
        return f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


def get_connector_connection():
    """Create Cloud SQL connector for GCP"""
    connector = Connector()

    def getconn():
        conn = connector.connect(
            f"{GCP_PROJECT_ID}:{GCP_REGION}:{GCP_INSTANCE_NAME}",
            "pg8000",
            user=DB_USER,
            password=DB_PASSWORD,
            db=DB_NAME,
        )
        return conn

    return getconn


# Create database engine
if USE_CLOUD_SQL:
    # Use Cloud SQL connector
    engine = create_engine(
        "postgresql+pg8000://",
        creator=get_connector_connection(),
    )
else:
    # Use standard connection
    DATABASE_URL = get_database_url()
    engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for FastAPI to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
