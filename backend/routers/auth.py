"""
Authentication API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from ..database import get_db
from ..models import User, UserSession
from ..schemas import (
    UserCreate, UserResponse, UserLogin, Token, LoginResponse,
    UserSessionCreate, UserSessionResponse
)
from ..auth import (
    authenticate_user, create_access_token, get_password_hash,
    get_current_user
)
from ..config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user (admin only functionality)
    """
    # Check if user already exists
    db_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_admin=user.is_admin,
        is_active=user.is_active
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user


@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, returns access token
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Allow both active and inactive users to login
    # Inactive users will be restricted at the endpoint level
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Create session record
    session_token = access_token
    expires_at = datetime.utcnow() + access_token_expires
    
    # Get client info from request
    user_agent = request.headers.get("User-Agent") if request else None
    client_host = request.client.host if request and request.client else None
    
    # Deactivate any existing sessions for this user
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    
    # Create new session
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=client_host,
        is_active=True
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=LoginResponse)
def login_json(
    login_data: UserLogin,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    JSON-based login endpoint that returns user info along with token
    """
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Allow both active and inactive users to login
    # Inactive users will be restricted at the endpoint level
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Create session record
    session_token = access_token
    expires_at = datetime.utcnow() + access_token_expires
    
    # Get client info from request
    user_agent = request.headers.get("User-Agent") if request else None
    client_host = request.client.host if request and request.client else None
    
    # Deactivate any existing sessions for this user
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    
    # Create new session
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=client_host,
        is_active=True
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout the current user by deactivating their sessions
    """
    # Deactivate all active sessions for this user
    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    
    db.commit()
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    """
    return current_user


@router.get("/sessions", response_model=list[UserSessionResponse])
def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's active sessions
    """
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).all()
    
    return sessions


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific session
    """
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.is_active = False
    db.commit()
    
    return {"message": "Session deleted successfully"}


@router.post("/refresh", response_model=Token)
def refresh_token(
    current_user: User = Depends(get_current_user),
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Refresh the access token
    """
    # Allow both active and inactive users to refresh their tokens
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": current_user.username, "user_id": current_user.id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}