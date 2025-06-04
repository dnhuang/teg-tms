"""
WebSocket connection manager for real-time updates
"""

import json
import logging
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from .auth import verify_token
from .database import get_db
from .models import User

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Store active connections with user information
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store WebSocket to user mapping for quick lookup
        self.websocket_users: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, token: str):
        """Accept WebSocket connection and authenticate user"""
        try:
            # Verify the token and get token data
            token_data = verify_token(token)
            if not token_data:
                await websocket.close(code=4001, reason="Invalid token")
                return None

            # Get database session and fetch user
            db = next(get_db())
            try:
                user = db.query(User).filter(User.id == token_data.user_id).first()
                if not user:
                    await websocket.close(code=4001, reason="User not found")
                    return None

                await websocket.accept()
                
                # Store connection
                username = user.username
                if username not in self.active_connections:
                    self.active_connections[username] = []
                
                self.active_connections[username].append(websocket)
                self.websocket_users[websocket] = username
                
                logger.info(f"WebSocket connected for user: {username}")
                
                # Send connection success message
                await self.send_personal_message({
                    "type": "connection_established",
                    "message": "WebSocket connection established",
                    "user": username
                }, websocket)
                
                return user
            finally:
                db.close()
            
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            await websocket.close(code=4002, reason="Connection failed")
            return None

    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        try:
            if websocket in self.websocket_users:
                username = self.websocket_users[websocket]
                
                # Remove from connections list
                if username in self.active_connections:
                    self.active_connections[username].remove(websocket)
                    
                    # Remove user entirely if no more connections
                    if not self.active_connections[username]:
                        del self.active_connections[username]
                
                # Remove from websocket mapping
                del self.websocket_users[websocket]
                
                logger.info(f"WebSocket disconnected for user: {username}")
                
        except Exception as e:
            logger.error(f"WebSocket disconnect error: {e}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send message to specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            # Remove broken connection
            self.disconnect(websocket)

    async def send_to_user(self, message: dict, username: str):
        """Send message to all connections of a specific user"""
        if username in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[username]:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to {username}: {e}")
                    disconnected.append(websocket)
            
            # Clean up disconnected websockets
            for websocket in disconnected:
                self.disconnect(websocket)

    async def broadcast(self, message: dict, exclude_user: str = None):
        """Broadcast message to all connected users except excluded user"""
        disconnected = []
        
        for username, websockets in self.active_connections.items():
            # Skip excluded user
            if exclude_user and username == exclude_user:
                continue
                
            for websocket in websockets:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error broadcasting to {username}: {e}")
                    disconnected.append(websocket)
        
        # Clean up disconnected websockets
        for websocket in disconnected:
            self.disconnect(websocket)

    async def broadcast_task_event(self, event_type: str, task_data: dict, user_id: int = None, exclude_user: str = None):
        """Broadcast task-related events to all users"""
        message = {
            "type": event_type,
            "data": task_data,
            "user_id": user_id,
            "timestamp": task_data.get("updated_at") or task_data.get("created_at")
        }
        
        # Send to ALL users - don't exclude anyone
        # The frontend will handle whether to apply optimistic updates or not
        await self.broadcast(message, exclude_user=None)
        
        logger.info(f"Broadcasted {event_type} for task {task_data.get('id')} to {len(self.get_connected_users())} users")
    
    def schedule_task_event(self, event_type: str, task_data: dict, user_id: int = None, exclude_user: str = None):
        """Schedule a task event broadcast from a synchronous context"""
        if not self.connections:
            # No active connections, skip broadcasting
            logger.info(f"No active WebSocket connections to broadcast {event_type} event")
            return
            
        try:
            # Create a new task in the default event loop
            import threading
            import concurrent.futures
            
            # Check if we're in the main thread and have active WebSocket connections
            if self.connections:
                # Use create_task if we can get the current loop
                try:
                    loop = asyncio.get_running_loop()
                    asyncio.create_task(
                        self.broadcast_task_event(event_type, task_data, user_id, exclude_user)
                    )
                    logger.info(f"Scheduled {event_type} event for broadcast to {len(self.connections)} connections")
                except RuntimeError:
                    # No running loop - this is the actual issue
                    # For now, we'll just log that we can't broadcast
                    logger.warning(f"Cannot broadcast {event_type} event - no active event loop")
        except Exception as e:
            logger.error(f"Failed to schedule {event_type} broadcast: {e}")

    def get_connected_users(self) -> List[str]:
        """Get list of currently connected users"""
        return list(self.active_connections.keys())

    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())


# Global connection manager instance
manager = ConnectionManager()