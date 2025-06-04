#!/usr/bin/env python3
"""
Database initialization script for Entrust RE Kanban Backend
Creates database tables and optionally sets up initial data
"""

import sys
import os
from pathlib import Path
from getpass import getpass

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from backend.database import engine, SessionLocal, create_tables
from backend.utils import create_admin_user, create_sample_tasks
from backend.models import User


def init_database():
    """Initialize the database and create tables"""
    print("🗃️  Creating database tables...")
    try:
        create_tables()
        print("✅ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        return False


def setup_admin_user(db: Session):
    """Set up admin user interactively"""
    print("\n👤 Setting up admin user...")
    
    # Check if any admin user already exists
    existing_admin = db.query(User).filter(User.is_admin == True).first()
    if existing_admin:
        print(f"⚠️  Admin user already exists: {existing_admin.username}")
        response = input("Do you want to create another admin user? (y/N): ").lower()
        if response != 'y':
            return existing_admin
    
    # Get admin user details
    print("Please provide admin user details:")
    
    while True:
        username = input("Username (default: admin): ").strip() or "admin"
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ Username '{username}' already exists. Please choose another.")
            continue
        break
    
    while True:
        email = input("Email (default: admin@entrustre.com): ").strip() or "admin@entrustre.com"
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            print(f"❌ Email '{email}' already exists. Please choose another.")
            continue
        break
    
    full_name = input("Full Name (default: System Administrator): ").strip() or "System Administrator"
    
    # Get password
    while True:
        password = getpass("Password (minimum 8 characters): ")
        if len(password) < 8:
            print("❌ Password must be at least 8 characters long.")
            continue
        
        confirm_password = getpass("Confirm password: ")
        if password != confirm_password:
            print("❌ Passwords do not match.")
            continue
        
        break
    
    try:
        admin_user = create_admin_user(
            db=db,
            username=username,
            email=email,
            password=password,
            full_name=full_name
        )
        print(f"✅ Admin user '{username}' created successfully!")
        return admin_user
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return None


def setup_sample_data(db: Session, user: User):
    """Set up sample tasks for demonstration"""
    print("\n📋 Setting up sample data...")
    
    response = input("Do you want to create sample tasks for demonstration? (y/N): ").lower()
    if response != 'y':
        print("⏭️  Skipping sample data creation.")
        return
    
    try:
        tasks = create_sample_tasks(db, user.id)
        print(f"✅ Created {len(tasks)} sample tasks!")
        
        # Print summary
        print("\nSample tasks created:")
        for task in tasks:
            status_emoji = {
                "todo": "📝",
                "in-review": "👀", 
                "awaiting-documents": "📄",
                "done": "✅"
            }
            processing_emoji = "🚨" if task.processing == "expedited" else "⏱️"
            
            print(f"  {status_emoji.get(task.status, '📋')} {processing_emoji} {task.client_name} - {task.task_type}")
            
    except Exception as e:
        print(f"❌ Error creating sample data: {e}")


def main():
    """Main initialization function"""
    print("🚀 Initializing Entrust RE Kanban Database")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = project_root / ".env"
    if not env_file.exists():
        print("⚠️  Warning: .env file not found!")
        print("📝 Please copy .env.example to .env and update the configuration")
        print("💡 Example: cp .env.example .env")
        
        response = input("\nDo you want to continue anyway? (y/N): ").lower()
        if response != 'y':
            print("Initialization cancelled.")
            sys.exit(1)
    
    # Initialize database
    if not init_database():
        print("❌ Database initialization failed!")
        sys.exit(1)
    
    # Set up admin user and sample data
    db = SessionLocal()
    try:
        admin_user = setup_admin_user(db)
        if admin_user:
            setup_sample_data(db, admin_user)
        
        print("\n🎉 Database initialization completed!")
        print("\n📚 Next steps:")
        print("1. Start the development server: python run_server.py")
        print("2. Visit the API documentation: http://localhost:8000/docs")
        print("3. Test the health endpoint: http://localhost:8000/health")
        
        if admin_user:
            print(f"4. Login with admin credentials: {admin_user.username}")
            
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        sys.exit(1)
        
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Initialization cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)