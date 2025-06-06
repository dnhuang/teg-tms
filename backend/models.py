"""
SQLAlchemy models for the Kanban board application
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class User(Base):
    """User model for authentication and authorization"""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tasks = relationship("Task", back_populates="owner")
    

class Task(Base):
    """Task model representing Kanban cards"""
    
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    custom_id = Column(String(6), unique=True, nullable=False, index=True)  # 6-char alphanumeric ID
    client_name = Column(String(100), nullable=False, index=True)
    task_type = Column(String(50), nullable=False)  # BDL, SDL, nBDL, nPO, Misc, etc.
    address = Column(Text, nullable=True)
    processing = Column(String(20), nullable=False, default="normal", server_default="normal")  # normal, expedited
    status = Column(String(30), nullable=False, default="todo", server_default="todo")  # todo, in-review, awaiting-documents, done
    description = Column(Text, nullable=True)
    
    # Ownership and audit
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional fields for real estate processing
    priority_order = Column(Integer, default=0)  # For ordering within columns
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="tasks")
    # Add relationship to task history with cascade delete
    history = relationship("TaskHistory", back_populates="task", cascade="all, delete-orphan")


class TaskHistory(Base):
    """Track task changes for audit and undo functionality"""
    
    __tablename__ = "task_history"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # created, updated, deleted, moved
    old_values = Column(Text, nullable=True)  # JSON string of old values
    new_values = Column(Text, nullable=True)  # JSON string of new values
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    task = relationship("Task", back_populates="history")
    user = relationship("User")


class UserSession(Base):
    """Track active user sessions for enhanced security"""
    
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user = relationship("User")