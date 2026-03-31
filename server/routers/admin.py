from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from server.core.dependencies import get_session, get_admin_user
from server.models.user import User
from server.services.admin_services import AdminService
from server.schemas.admin import (
    AdminStatsResponse,
    AdminUserListResponse,
    AdminUserResponse,
    AdminGadgetListResponse,
    AdminGadgetResponse,
    AdminOrderListResponse,
    AdminOrderResponse,
    AdminReviewListResponse,
)

router = APIRouter(tags=["admin"])


# ── Platform Stats ──

@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.get_stats(session)


# ── User Management ──

@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    users, total = await AdminService.get_users(session, search=search, skip=skip, limit=limit)
    return AdminUserListResponse(users=users, total_count=total)


@router.patch("/users/{user_id}/toggle-admin", response_model=AdminUserResponse)
async def toggle_admin(
    user_id: str,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.toggle_admin(user_id, admin, session)


@router.patch("/users/{user_id}/ban", response_model=AdminUserResponse)
async def toggle_ban(
    user_id: str,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.toggle_ban(user_id, admin, session)


# ── Gadget Management ──

@router.get("/gadgets", response_model=AdminGadgetListResponse)
async def list_gadgets(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    include_inactive: bool = Query(True),
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    gadgets, total = await AdminService.get_gadgets(
        session, search=search, skip=skip, limit=limit, include_inactive=include_inactive
    )
    return AdminGadgetListResponse(gadgets=gadgets, total_count=total)


@router.delete("/gadgets/{gadget_id}")
async def delete_gadget(
    gadget_id: str,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.delete_gadget(gadget_id, session)


@router.patch("/gadgets/{gadget_id}/verify", response_model=AdminGadgetResponse)
async def toggle_verify(
    gadget_id: str,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.toggle_verify(gadget_id, session)


# ── Order Management ──

@router.get("/orders", response_model=AdminOrderListResponse)
async def list_orders(
    status: Optional[str] = Query(None, description="Filter by order status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    orders, total = await AdminService.get_orders(session, status_filter=status, skip=skip, limit=limit)
    return AdminOrderListResponse(orders=orders, total_count=total)


@router.patch("/orders/{order_id}/status", response_model=AdminOrderResponse)
async def update_order_status(
    order_id: str,
    status_in: dict,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.update_order_status(order_id, status_in.get("status", ""), session)


# ── Review Management ──

@router.get("/reviews", response_model=AdminReviewListResponse)
async def list_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    reviews, total = await AdminService.get_reviews(session, skip=skip, limit=limit)
    return AdminReviewListResponse(reviews=reviews, total_count=total)


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: str,
    admin: User = Depends(get_admin_user),
    session: AsyncSession = Depends(get_session),
):
    return await AdminService.delete_review(review_id, session)
