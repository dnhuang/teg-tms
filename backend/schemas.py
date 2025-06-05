"""
Pydantic schemas for API request/response models
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ===== USER SCHEMAS =====

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False
    is_active: Optional[bool] = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class UserInDB(UserResponse):
    hashed_password: str


# ===== TASK SCHEMAS =====

class TaskType(str, Enum):
    BDL = "BDL"
    SDL = "SDL"
    nBDL = "nBDL"
    nPO = "nPO"
    MISC = "Misc"


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_REVIEW = "in-review"
    AWAITING_DOCUMENTS = "awaiting-documents"
    DONE = "done"


class ProcessingType(str, Enum):
    NORMAL = "normal"
    EXPEDITED = "expedited"


class TaskBase(BaseModel):
    client_name: str
    task_type: str
    address: Optional[str] = None
    processing: ProcessingType = ProcessingType.NORMAL
    status: TaskStatus = TaskStatus.TODO
    description: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    client_name: Optional[str] = None
    task_type: Optional[str] = None
    address: Optional[str] = None
    processing: Optional[ProcessingType] = None
    status: Optional[TaskStatus] = None
    description: Optional[str] = None
    priority_order: Optional[int] = None


class TaskOwner(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class TaskResponse(TaskBase):
    id: int
    custom_id: str
    owner_id: int
    owner: Optional[TaskOwner] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    priority_order: int = 0
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ===== AUTH SCHEMAS =====

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ===== TASK HISTORY SCHEMAS =====

class TaskHistoryBase(BaseModel):
    task_id: int
    user_id: int
    action: str
    old_values: Optional[str] = None
    new_values: Optional[str] = None


class TaskHistoryCreate(TaskHistoryBase):
    pass


class TaskHistoryResponse(TaskHistoryBase):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


# ===== SESSION SCHEMAS =====

class UserSessionBase(BaseModel):
    user_id: int
    session_token: str
    expires_at: datetime
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    is_active: bool = True


class UserSessionCreate(UserSessionBase):
    pass


class UserSessionResponse(UserSessionBase):
    id: int
    created_at: datetime
    last_activity: datetime
    
    class Config:
        from_attributes = True


# ===== API RESPONSE SCHEMAS =====

class APIResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    per_page: int
    pages: int