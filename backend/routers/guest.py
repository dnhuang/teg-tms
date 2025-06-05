"""
Guest router for public task status lookups
No authentication required for these endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Task
from typing import Dict

router = APIRouter(
    tags=["guest"]
)


@router.get("/task-status/{custom_id}")
async def get_task_status(custom_id: str, db: Session = Depends(get_db)) -> Dict[str, str]:
    """
    Get task status for guest users by custom_id
    No authentication required
    """
    
    print(f"DEBUG: Received custom_id: '{custom_id}' (length: {len(custom_id)})")
    
    # Handle both "RE-XXXXXX" and "XXXXXX" formats
    original_custom_id = custom_id
    if custom_id.upper().startswith('RE-'):
        custom_id = custom_id[3:]  # Remove "RE-" prefix
        print(f"DEBUG: Removed RE- prefix. New custom_id: '{custom_id}'")
    
    # Validate custom_id format (should be 6 characters alphanumeric after prefix removal)
    if not custom_id or len(custom_id) != 6:
        print(f"DEBUG: Invalid format - original: '{original_custom_id}', processed: '{custom_id}', length: {len(custom_id) if custom_id else 0}")
        raise HTTPException(
            status_code=400,
            detail="Invalid task ID format. Please enter a 6-character ID or RE-XXXXXX format."
        )
    
    # Convert to uppercase for consistency
    custom_id = custom_id.upper()
    print(f"DEBUG: Final uppercase custom_id: '{custom_id}'")
    
    # Look up task by custom_id
    task = db.query(Task).filter(Task.custom_id == custom_id).first()
    print(f"DEBUG: Task found: {task is not None}")
    if task:
        print(f"DEBUG: Task details - ID: {task.id}, Custom ID: {task.custom_id}, Status: {task.status}")
    
    # Let's also check what tasks exist in the database for debugging
    all_tasks = db.query(Task).all()
    print(f"DEBUG: Total tasks in database: {len(all_tasks)}")
    for t in all_tasks[:5]:  # Show first 5 tasks
        print(f"DEBUG: Task {t.id}: custom_id='{t.custom_id}', status='{t.status}'")
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail="Request not found, please check and enter again"
        )
    
    # Map internal status to client-friendly messages
    status_messages = {
        "todo": "Your request has been received and is currently queued for processing. We will begin working on it shortly.",
        "in-review": "Your request is currently under review by our team. Please allow additional time for processing and await further communication.",
        "awaiting-documents": "Your request requires additional documentation or information. Please check your email for our correspondence or contact our office for details.",
        "done": "Your request has been completed successfully. No further action is required on your part. Thank you for choosing our services."
    }
    
    # Get the appropriate message
    message = status_messages.get(task.status, "Your request status is being updated. Please contact our office for details.")
    
    return {
        "task_id": f"RE-{task.custom_id}",
        "status": task.status,
        "message": message
    }