#!/usr/bin/env python3
"""
Render deployment startup script
Handles database initialization and starts the FastAPI server
"""

import os
import sys
import uvicorn
from backend.database import create_tables
from backend.config import settings

def main():
    """Main startup function for Render deployment"""
    
    print("🚀 Starting Entrust RE Kanban application...")
    print(f"Environment: {settings.environment}")
    print(f"Database URL: {settings.database_url[:20]}...")
    
    # Create database tables
    print("📦 Creating database tables...")
    try:
        create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        sys.exit(1)
    
    # Get port from environment (Render sets PORT env var)
    port = int(os.environ.get("PORT", 8000))
    
    print(f"🌐 Starting server on port {port}...")
    
    # Start the server
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()