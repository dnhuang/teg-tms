#!/usr/bin/env python3
"""
Development server runner for Entrust RE Kanban Backend
"""

import uvicorn
import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Import the FastAPI app
from backend.main import app

if __name__ == "__main__":
    # Check if .env file exists
    env_file = project_root / ".env"
    if not env_file.exists():
        print("⚠️  Warning: .env file not found!")
        print("📝 Please copy .env.example to .env and update the configuration")
        print("💡 Example: cp .env.example .env")
        print()
    
    # Development server configuration
    config = {
        "app": "backend.main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "reload": True,
        "log_level": "info",
        "access_log": True,
    }
    
    print("🚀 Starting Entrust RE Kanban Backend...")
    print(f"📍 Server will be available at: http://localhost:8000")
    print(f"📚 API Documentation: http://localhost:8000/docs")
    print(f"🔍 Alternative docs: http://localhost:8000/redoc")
    print(f"❤️  Health check: http://localhost:8000/health")
    print("=" * 50)
    
    try:
        uvicorn.run(**config)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)