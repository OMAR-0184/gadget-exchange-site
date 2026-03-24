from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from server.core.dependencies import get_session, get_current_user
from server.models.user import User
from server.services.order_services import OrderService
from server.schemas.order import (
    PlaceOrderRequest,
    UpdateOrderStatusRequest,
    VerifyDeliveryRequest,
    OrderResponse,
    OrderListResponse,
    BillResponse,
)

router = APIRouter(tags=["orders"])


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_in: PlaceOrderRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    order, items = await OrderService.place_order(order_in, current_user, session)
    resp = OrderResponse.model_validate(order)
    from server.schemas.order import OrderItemResponse
    resp.items = [OrderItemResponse.model_validate(i) for i in items]
    return resp


@router.get("/", response_model=OrderListResponse)
async def list_orders(
    cursor: Optional[str] = Query(None, description="ISO timestamp cursor for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    orders, next_cursor, total_count = await OrderService.get_user_orders(
        current_user, session, cursor=cursor, limit=limit
    )
    return OrderListResponse(orders=orders, next_cursor=next_cursor, total_count=total_count)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await OrderService.get_order_detail(order_id, current_user, session)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await OrderService.cancel_order(order_id, current_user, session)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    status_in: UpdateOrderStatusRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await OrderService.update_order_status(order_id, status_in, current_user, session)


@router.post("/{order_id}/verify-delivery", response_model=OrderResponse)
async def verify_delivery(
    order_id: str,
    body: VerifyDeliveryRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await OrderService.verify_delivery(order_id, body.verification_code, current_user, session)


@router.get("/{order_id}/bill", response_model=BillResponse)
async def get_bill(
    order_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await OrderService.generate_bill(order_id, current_user, session)
