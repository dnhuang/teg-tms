"""
Task management API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import Task, User, TaskHistory
from ..schemas import TaskCreate, TaskResponse, TaskUpdate
from ..auth import get_current_user
from ..websocket_manager import manager
from ..utils import generate_unique_custom_id

router = APIRouter()


@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all tasks (visible to all users)
    """
    query = db.query(Task).options(joinedload(Task.owner))
    
    if status:
        query = query.filter(Task.status == status)
    
    # Order by expedited first, then by priority_order, then by creation time
    tasks = query.order_by(
        Task.processing == "expedited", 
        Task.priority_order.asc(),
        Task.created_at.asc()
    ).limit(limit).offset(offset).all()
    
    return tasks


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new task (only for active users)
    """
    # Check if user is active
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot create tasks"
        )
    
    # Generate unique custom ID
    custom_id = generate_unique_custom_id(db)
    
    # Get task data and ensure defaults are set
    task_data = task.dict()
    
    # Count existing tasks in the same column for priority ordering
    task_count = db.query(Task).filter(
        Task.status == task_data.get('status', 'todo')
    ).count()
    
    # Create new task with explicit field assignment to avoid dict unpacking issues
    db_task = Task(
        custom_id=custom_id,
        client_name=task_data['client_name'],
        task_type=task_data['task_type'],
        address=task_data.get('address'),
        processing=task_data.get('processing', 'normal'),
        status=task_data.get('status', 'todo'),
        description=task_data.get('description'),
        owner_id=current_user.id,
        priority_order=task_count
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Load the task with owner relationship
    db_task = db.query(Task).options(joinedload(Task.owner)).filter(Task.id == db_task.id).first()
    
    # Log task creation
    log_task_action(
        db=db,
        task_id=db_task.id,
        user_id=current_user.id,
        action="created",
        new_values={
            "client_name": db_task.client_name,
            "task_type": db_task.task_type,
            "status": db_task.status,
            "processing": db_task.processing
        }
    )
    
    # Broadcast task creation to all connected users
    task_data = {
        "id": db_task.id,
        "custom_id": db_task.custom_id,
        "client_name": db_task.client_name,
        "task_type": db_task.task_type,
        "address": db_task.address,
        "processing": db_task.processing,
        "status": db_task.status,
        "description": db_task.description,
        "owner_id": db_task.owner_id,
        "created_at": db_task.created_at.isoformat() if db_task.created_at else None,
        "updated_at": db_task.updated_at.isoformat() if db_task.updated_at else None,
        "priority_order": db_task.priority_order,
        "owner": {
            "id": db_task.owner.id,
            "username": db_task.owner.username,
            "full_name": db_task.owner.full_name
        } if db_task.owner else None
    }
    
    await manager.broadcast_task_event(
        "task_created",
        task_data,
        user_id=current_user.id,
        exclude_user=current_user.username
    )
    
    return db_task


@router.delete("/clear-done")
async def clear_done_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete all tasks with status 'done' (only for active users)
    """
    # Check if user is active
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot clear tasks"
        )
    
    # Get all done tasks
    done_tasks = db.query(Task).filter(Task.status == "done").all()
    
    if not done_tasks:
        return {"message": "No completed tasks to clear", "deleted_count": 0, "type": "warning"}
    
    # Log each task deletion for history
    for task in done_tasks:
        task_info = {
            "client_name": task.client_name,
            "task_type": task.task_type,
            "status": task.status,
            "processing": task.processing
        }
        
        log_task_action(
            db=db,
            task_id=task.id,
            user_id=current_user.id,
            action="deleted_via_clear",
            old_values=task_info
        )
    
    # Delete all done tasks
    deleted_count = len(done_tasks)
    deleted_task_ids = [task.id for task in done_tasks]
    db.query(Task).filter(Task.status == "done").delete()
    db.commit()
    
    # Broadcast task clearing to all connected users
    await manager.broadcast_task_event(
        "tasks_cleared",
        {"deleted_task_ids": deleted_task_ids, "count": deleted_count},
        user_id=current_user.id,
        exclude_user=current_user.username
    )
    
    return {"message": f"Successfully cleared {deleted_count} completed task(s)", "deleted_count": deleted_count}


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific task by ID (visible to all users)
    """
    task = db.query(Task).options(joinedload(Task.owner)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a task (only for active users)
    """
    # Check if user is active
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot modify tasks"
        )
    
    task = db.query(Task).options(joinedload(Task.owner)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Store old values for history
    old_values = {
        "client_name": task.client_name,
        "task_type": task.task_type,
        "address": task.address,
        "processing": task.processing,
        "status": task.status,
        "description": task.description
    }
    
    # Update task with provided fields
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.utcnow()
    
    # If status changed and task is completed, set completion time
    if "status" in update_data and update_data["status"] == "done":
        task.completed_at = datetime.utcnow()
    elif "status" in update_data and update_data["status"] != "done":
        task.completed_at = None
    
    db.commit()
    db.refresh(task)
    
    # Log task update
    new_values = {k: v for k, v in update_data.items()}
    log_task_action(
        db=db,
        task_id=task.id,
        user_id=current_user.id,
        action="updated",
        old_values=old_values,
        new_values=new_values
    )
    
    # Broadcast task update to all connected users
    task_data = {
        "id": task.id,
        "custom_id": task.custom_id,
        "client_name": task.client_name,
        "task_type": task.task_type,
        "address": task.address,
        "processing": task.processing,
        "status": task.status,
        "description": task.description,
        "owner_id": task.owner_id,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "priority_order": task.priority_order,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "owner": {
            "id": task.owner.id,
            "username": task.owner.username,
            "full_name": task.owner.full_name
        } if task.owner else None
    }
    
    await manager.broadcast_task_event(
        "task_updated",
        task_data,
        user_id=current_user.id,
        exclude_user=current_user.username
    )
    
    return task


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a task (only for active users)
    """
    # Check if user is active
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot delete tasks"
        )
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Store task info for history before deletion
    task_info = {
        "client_name": task.client_name,
        "task_type": task.task_type,
        "status": task.status,
        "processing": task.processing
    }
    
    # Log task deletion
    log_task_action(
        db=db,
        task_id=task.id,
        user_id=current_user.id,
        action="deleted",
        old_values=task_info
    )
    
    db.delete(task)
    db.commit()
    
    # Broadcast task deletion to all connected users
    task_data = {
        "id": task_id,
        "client_name": task_info["client_name"],
        "task_type": task_info["task_type"],
        "status": task_info["status"],
        "processing": task_info["processing"]
    }
    
    await manager.broadcast_task_event(
        "task_deleted",
        task_data,
        user_id=current_user.id,
        exclude_user=current_user.username
    )
    
    return {"message": "Task deleted successfully"}


@router.post("/{task_id}/move")
async def move_task(
    task_id: int,
    new_status: str,
    new_priority: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Move a task to a different column/status (only for active users)
    """
    # Check if user is active
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive users cannot move tasks"
        )
    
    task = db.query(Task).options(joinedload(Task.owner)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    old_status = task.status
    old_priority = task.priority_order
    
    # Update task status
    task.status = new_status
    task.updated_at = datetime.utcnow()
    
    # Set completion time if moved to done
    if new_status == "done":
        task.completed_at = datetime.utcnow()
    elif old_status == "done" and new_status != "done":
        task.completed_at = None
    
    # Update priority if provided
    if new_priority is not None:
        task.priority_order = new_priority
    else:
        # Auto-assign priority based on column
        max_priority = db.query(Task).filter(
            Task.status == new_status,
            Task.id != task_id
        ).count()
        task.priority_order = max_priority
    
    db.commit()
    db.refresh(task)
    
    # Log task move
    log_task_action(
        db=db,
        task_id=task.id,
        user_id=current_user.id,
        action="moved",
        old_values={"status": old_status, "priority_order": old_priority},
        new_values={"status": new_status, "priority_order": task.priority_order}
    )
    
    # Broadcast task move to all connected users
    task_data = {
        "id": task.id,
        "custom_id": task.custom_id,
        "client_name": task.client_name,
        "task_type": task.task_type,
        "address": task.address,
        "processing": task.processing,
        "status": task.status,
        "description": task.description,
        "owner_id": task.owner_id,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "priority_order": task.priority_order,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "owner": {
            "id": task.owner.id,
            "username": task.owner.username,
            "full_name": task.owner.full_name
        } if task.owner else None
    }
    
    await manager.broadcast_task_event(
        "task_moved",
        task_data,
        user_id=current_user.id,
        exclude_user=current_user.username
    )
    
    return {"message": "Task moved successfully", "task": task}


def log_task_action(
    db: Session,
    task_id: int,
    user_id: int,
    action: str,
    old_values: dict = None,
    new_values: dict = None
):
    """
    Log a task action to the history table
    """
    import json
    
    history_entry = TaskHistory(
        task_id=task_id,
        user_id=user_id,
        action=action,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None
    )
    
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    return history_entry