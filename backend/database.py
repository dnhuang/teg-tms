"""
Database configuration and session management for SQLite/PostgreSQL
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Create database engine with conditional configuration
if settings.database_url.startswith("sqlite"):
    # SQLite configuration (for local development)
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},  # Required for SQLite
        echo=settings.debug  # Log SQL queries in debug mode
    )
else:
    # PostgreSQL configuration (for production)
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,  # Log SQL queries in debug mode
        pool_pre_ping=True,   # Verify connections before using
        pool_recycle=300      # Recycle connections every 5 minutes
    )

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session
    Yields a database session and ensures it's closed after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Create all database tables
    Call this when starting the application
    """
    Base.metadata.create_all(bind=engine)