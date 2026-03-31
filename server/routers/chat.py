from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from server.core.dependencies import get_session
from server.services.chat_service import ChatService
from server.schemas.chat import ChatMessageResponse, ChatHistoryResponse
from server.models.gadget import Gadget
from server.models.user import User
from server.core.config import settings
from sqlmodel import select
import jwt
import logging

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)

# In-memory map: chat_room_key -> {user_id: WebSocket}
# chat_room_key = "{gadget_id}:{sorted_user_ids}"
active_connections: dict[str, dict[str, WebSocket]] = {}


def make_room_key(gadget_id: str, user_a: str, user_b: str) -> str:
    users = sorted([user_a, user_b])
    return f"{gadget_id}:{users[0]}:{users[1]}"


async def authenticate_ws(websocket: WebSocket, token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


@router.get("/{gadget_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    gadget_id: str,
    other_user_id: str = Query(..., description="The other user's ID"),
    token: str = Query(..., description="Your JWT token"),
    session: AsyncSession = Depends(get_session),
):
    """Get chat history between current user and another user for a gadget."""
    user_id = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
    except jwt.PyJWTError:
        pass

    if not user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid token")

    messages = await ChatService.get_history(gadget_id, user_id, other_user_id, session)
    return ChatHistoryResponse(messages=messages)


@router.websocket("/ws/{gadget_id}")
async def chat_websocket(
    websocket: WebSocket,
    gadget_id: str,
):
    await websocket.accept()

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4000, reason="token is required")
        return

    receiver_id = websocket.query_params.get("receiver_id")
    if not receiver_id:
        await websocket.close(code=4000, reason="receiver_id is required")
        return
    """
    WebSocket for real-time chat between buyer and seller.

    Connect: ws://host/v1/chat/ws/{gadget_id}?token=JWT&receiver_id=USR_ID

    Send JSON messages:
      - {"message": "Hello, is the price negotiable?"}
    
    Receive JSON messages:
      - {"type": "message", "sender_id": "...", "message": "...", "created_at": "..."}
      - {"type": "history", "messages": [...]}
    """
    user_id = await authenticate_ws(websocket, token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    from server.db.session import async_session_maker

    # Verify gadget & receiver exist
    async with async_session_maker() as session:
        gadget_result = await session.execute(
            select(Gadget).where(Gadget.id == gadget_id, Gadget.is_active == True)
        )
        gadget = gadget_result.scalar_one_or_none()
        if not gadget:
            await websocket.send_json({"error": "Gadget not found"})
            await websocket.close()
            return

        receiver_result = await session.execute(
            select(User).where(User.id == receiver_id)
        )
        receiver = receiver_result.scalar_one_or_none()
        if not receiver:
            await websocket.send_json({"error": "Receiver not found"})
            await websocket.close()
            return

        # Send existing chat history
        history = await ChatService.get_history(gadget_id, user_id, receiver_id, session)
        await websocket.send_json({
            "type": "history",
            "messages": [
                {
                    "id": m.id,
                    "sender_id": m.sender_id,
                    "receiver_id": m.receiver_id,
                    "message": m.message,
                    "created_at": m.created_at.isoformat(),
                }
                for m in history
            ],
        })

    # Register in room
    room_key = make_room_key(gadget_id, user_id, receiver_id)
    if room_key not in active_connections:
        active_connections[room_key] = {}
    active_connections[room_key][user_id] = websocket

    try:
        while True:
            data = await websocket.receive_json()
            message_text = data.get("message", "").strip()
            if not message_text:
                await websocket.send_json({"error": "Message cannot be empty"})
                continue

            # Persist message
            async with async_session_maker() as session:
                msg = await ChatService.save_message(
                    gadget_id, user_id, receiver_id, message_text, session
                )

            response = {
                "type": "message",
                "id": msg.id,
                "sender_id": msg.sender_id,
                "receiver_id": msg.receiver_id,
                "message": msg.message,
                "created_at": msg.created_at.isoformat(),
            }

            # Broadcast to both parties in the room
            if room_key in active_connections:
                for uid, ws in active_connections[room_key].items():
                    try:
                        await ws.send_json(response)
                    except Exception:
                        pass

    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from chat on gadget {gadget_id}")
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
    finally:
        if room_key in active_connections:
            active_connections[room_key].pop(user_id, None)
            if not active_connections[room_key]:
                del active_connections[room_key]
