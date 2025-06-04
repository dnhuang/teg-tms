"""
Configuration settings for the Entrust RE Kanban Backend
"""

from pydantic_settings import BaseSettings
from typing import Optional, List, Union
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Database
    database_url: str = "sqlite:///./kanban_board.db"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # CORS - Handle both string and list formats
    allowed_origins: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    
    # Application
    app_name: str = "Entrust RE Kanban API"
    debug: bool = False
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Convert string to list if needed (for environment variables)
        if isinstance(self.allowed_origins, str):
            self.allowed_origins = [origin.strip() for origin in self.allowed_origins.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create settings instance
settings = Settings()