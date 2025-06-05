"""
Configuration settings for the Entrust RE Kanban Backend
"""

from pydantic_settings import BaseSettings
from typing import Optional, List, Union
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Database - will use PostgreSQL DATABASE_URL from Render, fallback to SQLite for local dev
    database_url: str = "sqlite:///./kanban_board.db"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS - Allow all origins in production, specific ones for local dev
    allowed_origins: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    
    # Production environment detection
    environment: str = "development"
    
    # Application
    app_name: str = "TEG Task Management System API"
    debug: bool = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Convert string to list if needed (for environment variables)
        if isinstance(self.allowed_origins, str):
            self.allowed_origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        
        # In production, allow all origins for CORS (Render provides HTTPS)
        if self.environment == "production" or self.database_url.startswith("postgresql"):
            self.allowed_origins = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()