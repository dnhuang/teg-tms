"""
Utility functions for the Entrust RE Kanban Backend
"""

from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from .models import User, Task, TaskHistory, UserSession
from .auth import get_password_hash


def create_admin_user(
    db: Session,
    username: str = "admin",
    email: str = "admin@entrustre.com",
    password: str = "admin123",
    full_name: str = "System Administrator"
) -> User:
    """
    Create an admin user for initial setup
    
    Args:
        db: Database session
        username: Admin username
        email: Admin email
        password: Admin password
        full_name: Admin full name
    
    Returns:
        Created admin user
    
    Raises:
        ValueError: If user already exists
    """
    # Check if admin user already exists
    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        raise ValueError(f"User with username '{username}' or email '{email}' already exists")
    
    # Create admin user
    admin_user = User(
        username=username,
        email=email,
        full_name=full_name,
        hashed_password=get_password_hash(password),
        is_active=True,
        is_admin=True
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    return admin_user


def create_sample_tasks(db: Session, user_id: int) -> list[Task]:
    """
    Create sample tasks for testing and demonstration
    
    Args:
        db: Database session
        user_id: User ID to assign tasks to
    
    Returns:
        List of created sample tasks
    """
    sample_tasks = [
        {
            "client_name": "Johnson Properties",
            "task_type": "BDL",
            "address": "123 Main St, Springfield, IL 62701",
            "processing": "normal",
            "status": "todo",
            "description": "Business development loan application for commercial property",
            "priority_order": 0
        },
        {
            "client_name": "Smith Realty Group",
            "task_type": "SDL",
            "address": "456 Oak Ave, Chicago, IL 60601",
            "processing": "expedited",
            "status": "in-review",
            "description": "Standard development loan for residential complex",
            "priority_order": 0
        },
        {
            "client_name": "Green Valley Estates",
            "task_type": "nBDL",
            "address": "789 Pine Rd, Aurora, IL 60502",
            "processing": "normal",
            "status": "awaiting-documents",
            "description": "Non-standard business development loan requiring additional documentation",
            "priority_order": 0
        },
        {
            "client_name": "Urban Development Corp",
            "task_type": "nPO",
            "address": "321 Elm St, Naperville, IL 60540",
            "processing": "expedited",
            "status": "todo",
            "description": "Non-standard purchase order for mixed-use development",
            "priority_order": 1
        },
        {
            "client_name": "Heritage Homes LLC",
            "task_type": "Misc - Title Review",
            "address": "654 Maple Dr, Rockford, IL 61101",
            "processing": "normal",
            "status": "done",
            "description": "Title review and clearance for historic property",
            "priority_order": 0,
            "completed_at": datetime.utcnow() - timedelta(days=2)
        }
    ]
    
    created_tasks = []
    
    for task_data in sample_tasks:
        task = Task(
            client_name=task_data["client_name"],
            task_type=task_data["task_type"],
            address=task_data["address"],
            processing=task_data["processing"],
            status=task_data["status"],
            description=task_data["description"],
            priority_order=task_data["priority_order"],
            owner_id=user_id,
            completed_at=task_data.get("completed_at")
        )
        
        db.add(task)
        created_tasks.append(task)
    
    db.commit()
    
    # Refresh all tasks to get their IDs
    for task in created_tasks:
        db.refresh(task)
    
    return created_tasks


def cleanup_expired_sessions(db: Session) -> int:
    """
    Clean up expired user sessions
    
    Args:
        db: Database session
    
    Returns:
        Number of sessions cleaned up
    """
    expired_count = db.query(UserSession).filter(
        UserSession.expires_at < datetime.utcnow(),
        UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    return expired_count


def get_task_statistics(db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Get comprehensive task statistics
    
    Args:
        db: Database session
        user_id: Optional user ID to filter by (if None, returns system-wide stats)
    
    Returns:
        Dictionary containing various statistics
    """
    query = db.query(Task)
    
    if user_id:
        query = query.filter(Task.owner_id == user_id)
    
    all_tasks = query.all()
    
    if not all_tasks:
        return {
            "total_tasks": 0,
            "by_status": {},
            "by_type": {},
            "by_processing": {},
            "completion_rate": 0,
            "average_completion_time": None
        }
    
    # Count by status
    by_status = {}
    for task in all_tasks:
        by_status[task.status] = by_status.get(task.status, 0) + 1
    
    # Count by task type
    by_type = {}
    for task in all_tasks:
        task_type = task.task_type.split(' - ')[0]  # Get base type for Misc tasks
        by_type[task_type] = by_type.get(task_type, 0) + 1
    
    # Count by processing type
    by_processing = {}
    for task in all_tasks:
        by_processing[task.processing] = by_processing.get(task.processing, 0) + 1
    
    # Calculate completion rate
    completed_tasks = by_status.get("done", 0)
    completion_rate = (completed_tasks / len(all_tasks)) * 100 if all_tasks else 0
    
    # Calculate average completion time for completed tasks
    completed_with_times = [
        task for task in all_tasks 
        if task.status == "done" and task.completed_at
    ]
    
    average_completion_time = None
    if completed_with_times:
        total_hours = sum([
            (task.completed_at - task.created_at).total_seconds() / 3600
            for task in completed_with_times
        ])
        average_completion_time = total_hours / len(completed_with_times)
    
    return {
        "total_tasks": len(all_tasks),
        "by_status": by_status,
        "by_type": by_type,
        "by_processing": by_processing,
        "completion_rate": round(completion_rate, 2),
        "average_completion_time": round(average_completion_time, 2) if average_completion_time else None
    }


def export_user_tasks(db: Session, user_id: int, format: str = "json") -> str:
    """
    Export user tasks in various formats
    
    Args:
        db: Database session
        user_id: User ID
        format: Export format ('json' or 'csv')
    
    Returns:
        Exported data as string
    
    Raises:
        ValueError: If format is not supported
    """
    tasks = db.query(Task).filter(Task.owner_id == user_id).all()
    
    if format == "json":
        task_data = []
        for task in tasks:
            task_data.append({
                "id": task.id,
                "client_name": task.client_name,
                "task_type": task.task_type,
                "address": task.address,
                "processing": task.processing,
                "status": task.status,
                "description": task.description,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "updated_at": task.updated_at.isoformat() if task.updated_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None
            })
        
        return json.dumps(task_data, indent=2)
    
    elif format == "csv":
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "ID", "Client Name", "Task Type", "Address", "Processing", 
            "Status", "Description", "Created At", "Updated At", "Completed At"
        ])
        
        # Write task data
        for task in tasks:
            writer.writerow([
                task.id,
                task.client_name,
                task.task_type,
                task.address or "",
                task.processing,
                task.status,
                task.description or "",
                task.created_at.isoformat() if task.created_at else "",
                task.updated_at.isoformat() if task.updated_at else "",
                task.completed_at.isoformat() if task.completed_at else ""
            ])
        
        return output.getvalue()
    
    else:
        raise ValueError(f"Unsupported export format: {format}")


def validate_task_type(task_type: str) -> bool:
    """
    Validate if a task type is valid
    
    Args:
        task_type: Task type to validate
    
    Returns:
        True if valid, False otherwise
    """
    valid_types = ["BDL", "SDL", "nBDL", "nPO"]
    
    # Check for exact match with valid types
    if task_type in valid_types:
        return True
    
    # Check for Misc types (format: "Misc" or "Misc - CustomType")
    if task_type == "Misc" or task_type.startswith("Misc - "):
        return True
    
    return False


def get_next_priority_order(db: Session, user_id: int, status: str) -> int:
    """
    Get the next priority order for a task in a specific column
    
    Args:
        db: Database session
        user_id: User ID
        status: Column status
    
    Returns:
        Next priority order number
    """
    max_priority = db.query(Task).filter(
        Task.owner_id == user_id,
        Task.status == status
    ).count()
    
    return max_priority