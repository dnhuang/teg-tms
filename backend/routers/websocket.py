"""
WebSocket routes for real-time communication
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time updates
    Requires authentication token as query parameter
    """
    user = None
    try:
        # Connect and authenticate
        user = await manager.connect(websocket, token)
        if not user:
            return  # Connection was rejected
        
        logger.info(f"WebSocket connection established for user: {user.username}")
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client
                data = await websocket.receive_text()
                logger.debug(f"Received WebSocket message from {user.username}: {data}")
                
                # Handle ping/pong for connection health
                if data == "ping":
                    await manager.send_personal_message({"type": "pong"}, websocket)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for user: {user.username}")
                break
            except Exception as e:
                logger.error(f"WebSocket message error for {user.username}: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket connection closed for user: {user.username if user else 'unknown'}")
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        # Clean up connection
        manager.disconnect(websocket)


@router.get("/status")
async def websocket_status():
    """
    Get WebSocket connection status
    """
    return {
        "connected_users": manager.get_connected_users(),
        "total_connections": manager.get_connection_count(),
        "status": "operational"
    }