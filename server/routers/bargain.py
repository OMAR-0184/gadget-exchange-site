from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from server.core.dependencies import get_session
from server.services.bargain_service import BargainService
from server.schemas.bargain import BargainResponse
from server.models.gadget import Gadget
from server.models.user import User
from server.core.config import settings
from sqlmodel import select
import jwt
import json
import logging

router = APIRouter(tags=["bargain"])
logger = logging.getLogger(__name__)

# In-memory map: bargain_session_id -> {user_id: WebSocket}
active_connections: dict[str, dict[str, WebSocket]] = {}


async def authenticate_ws(websocket: WebSocket, token: str) -> str | None:
    """Validate JWT from query param and return user_id, or None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        return user_id
    except jwt.PyJWTError:
        return None


@router.get("/{gadget_id}", response_model=list[BargainResponse])
async def get_bargain_sessions(
    gadget_id: str,
    session: AsyncSession = Depends(get_session),
):
    """Get all bargain sessions for a gadget."""
    sessions = await BargainService.get_sessions_for_gadget(gadget_id, session)
    return sessions


@router.websocket("/ws/{gadget_id}")
async def bargain_websocket(
    websocket: WebSocket,
    gadget_id: str,
    token: str = Query(...),
):
    """
    WebSocket for real-time price bargaining.

    Connect: ws://host/v1/bargain/ws/{gadget_id}?token=JWT

    Send JSON messages:
      - {"action": "offer", "price": 500}   → buyer sends price offer
      - {"action": "counter", "price": 600}  → seller counters with their price
      - {"action": "accept"}                 → accept the current offer
      - {"action": "reject"}                 → reject and close bargain
    """
    await websocket.accept()

    user_id = await authenticate_ws(websocket, token)
    if not user_id:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    from server.db.session import async_session_maker

    async with async_session_maker() as session:
        # Verify gadget exists
        gadget_result = await session.execute(
            select(Gadget).where(Gadget.id == gadget_id, Gadget.is_active == True)
        )
        gadget = gadget_result.scalar_one_or_none()
        if not gadget:
            await websocket.send_json({"error": "Gadget not found"})
            await websocket.close()
            return

        # Get or create bargain session
        # Determine if this user is buyer or seller
        if user_id == gadget.seller_id:
            # Seller connecting — we need a buyer_id to look up the session
            # Seller can only respond; send them the list of active sessions
            all_sessions = await BargainService.get_sessions_for_gadget(gadget_id, session)
            pending = [s for s in all_sessions if s.status in ("pending", "countered")]
            await websocket.send_json({
                "type": "sessions_list",
                "sessions": [
                    {
                        "bargain_id": s.id,
                        "buyer_id": s.buyer_id,
                        "current_offer": s.current_offer,
                        "offered_by": s.offered_by,
                        "status": s.status,
                    }
                    for s in pending
                ],
            })
            bargain_session = None
        else:
            # Buyer connecting — create or resume bargain session
            bargain_session = await BargainService.get_or_create_session(
                gadget_id, user_id, session
            )
            await websocket.send_json({
                "type": "bargain_state",
                "bargain_id": bargain_session.id,
                "original_price": bargain_session.original_price,
                "current_offer": bargain_session.current_offer,
                "offered_by": bargain_session.offered_by,
                "status": bargain_session.status,
            })

    # Register connection
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            bargain_id = data.get("bargain_id") or (
                bargain_session.id if bargain_session else None
            )

            if not bargain_id:
                await websocket.send_json({"error": "bargain_id is required for seller"})
                continue

            # Register in active connections
            if bargain_id not in active_connections:
                active_connections[bargain_id] = {}
            active_connections[bargain_id][user_id] = websocket

            async with async_session_maker() as session:
                if action in ("offer", "counter"):
                    price = data.get("price")
                    if not price:
                        await websocket.send_json({"error": "price is required"})
                        continue
                    bargain = await BargainService.make_offer(
                        bargain_id, float(price), user_id, session
                    )
                    response = {
                        "type": "offer_update",
                        "bargain_id": bargain.id,
                        "current_offer": bargain.current_offer,
                        "offered_by": bargain.offered_by,
                        "status": bargain.status,
                    }

                elif action == "accept":
                    bargain = await BargainService.accept_offer(
                        bargain_id, user_id, session
                    )
                    response = {
                        "type": "bargain_accepted",
                        "bargain_id": bargain.id,
                        "final_price": bargain.current_offer,
                        "status": "accepted",
                    }

                elif action == "reject":
                    bargain = await BargainService.reject_offer(
                        bargain_id, user_id, session
                    )
                    response = {
                        "type": "bargain_rejected",
                        "bargain_id": bargain.id,
                        "status": "rejected",
                    }

                else:
                    await websocket.send_json({"error": f"Unknown action: {action}"})
                    continue

            # Broadcast to both parties in the bargain session
            if bargain_id in active_connections:
                for uid, ws in active_connections[bargain_id].items():
                    try:
                        await ws.send_json(response)
                    except Exception:
                        pass

    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected from bargain on gadget {gadget_id}")
    except Exception as e:
        logger.error(f"Bargain WebSocket error: {e}")
        await websocket.send_json({"error": str(e)})
    finally:
        # Cleanup connections
        if bargain_session and bargain_session.id in active_connections:
            active_connections[bargain_session.id].pop(user_id, None)
            if not active_connections[bargain_session.id]:
                del active_connections[bargain_session.id]
