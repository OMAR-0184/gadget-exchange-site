from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col
from fastapi import HTTPException
from datetime import datetime

from server.models.user import User
from server.models.gadget import Gadget
from server.models.order import Order, OrderItem
from server.models.review import Review
from server.schemas.admin import (
    AdminStatsResponse,
    AdminUserResponse,
    AdminGadgetResponse,
    AdminOrderResponse,
    AdminOrderItemResponse,
    AdminReviewResponse,
)


class AdminService:

    # ── Platform Stats ──

    @staticmethod
    async def get_stats(session: AsyncSession) -> AdminStatsResponse:
        user_count = (await session.execute(select(func.count()).select_from(User))).scalar()
        gadget_count = (await session.execute(select(func.count()).select_from(Gadget))).scalar()
        active_count = (await session.execute(
            select(func.count()).select_from(Gadget).where(Gadget.is_active == True)
        )).scalar()
        order_count = (await session.execute(select(func.count()).select_from(Order))).scalar()
        revenue = (await session.execute(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.status != "cancelled")
        )).scalar()
        banned_count = (await session.execute(
            select(func.count()).select_from(User).where(User.is_banned == True)
        )).scalar()

        return AdminStatsResponse(
            total_users=user_count,
            total_gadgets=gadget_count,
            total_orders=order_count,
            total_revenue=float(revenue),
            active_listings=active_count,
            banned_users=banned_count,
        )

    # ── User Management ──

    @staticmethod
    async def get_users(
        session: AsyncSession,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[AdminUserResponse], int]:
        query = select(User)
        count_query = select(func.count()).select_from(User)

        if search:
            term = f"%{search}%"
            condition = col(User.email).ilike(term) | col(User.full_name).ilike(term)
            query = query.where(condition)
            count_query = count_query.where(condition)

        total = (await session.execute(count_query)).scalar()
        result = await session.execute(query.offset(skip).limit(limit).order_by(User.email))
        users = result.scalars().all()
        return [AdminUserResponse.model_validate(u) for u in users], total

    @staticmethod
    async def toggle_admin(user_id: str, admin_user: User, session: AsyncSession) -> AdminUserResponse:
        if user_id == admin_user.id:
            raise HTTPException(status_code=400, detail="You cannot change your own admin status")

        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.is_admin = not user.is_admin
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return AdminUserResponse.model_validate(user)

    @staticmethod
    async def toggle_ban(user_id: str, admin_user: User, session: AsyncSession) -> AdminUserResponse:
        if user_id == admin_user.id:
            raise HTTPException(status_code=400, detail="You cannot ban yourself")

        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.is_admin:
            raise HTTPException(status_code=400, detail="Cannot ban another admin")

        user.is_banned = not user.is_banned

        # If banning, deactivate all their listings
        if user.is_banned:
            gadgets_result = await session.execute(
                select(Gadget).where(Gadget.seller_id == user_id, Gadget.is_active == True)
            )
            for gadget in gadgets_result.scalars().all():
                gadget.is_active = False
                gadget.updated_at = datetime.utcnow()
                session.add(gadget)

        session.add(user)
        await session.commit()
        await session.refresh(user)
        return AdminUserResponse.model_validate(user)

    # ── Gadget Management ──

    @staticmethod
    async def get_gadgets(
        session: AsyncSession,
        search: str | None = None,
        skip: int = 0,
        limit: int = 50,
        include_inactive: bool = True,
    ) -> tuple[list[AdminGadgetResponse], int]:
        query = select(Gadget, User.email.label("seller_email")).outerjoin(User, Gadget.seller_id == User.id)
        count_query = select(func.count()).select_from(Gadget)

        if not include_inactive:
            query = query.where(Gadget.is_active == True)
            count_query = count_query.where(Gadget.is_active == True)

        if search:
            term = f"%{search}%"
            condition = col(Gadget.title).ilike(term) | col(Gadget.category).ilike(term)
            query = query.where(condition)
            count_query = count_query.where(condition)

        total = (await session.execute(count_query)).scalar()
        result = await session.execute(query.offset(skip).limit(limit).order_by(Gadget.created_at.desc()))
        rows = result.all()

        gadgets = []
        for gadget, seller_email in rows:
            g_dict = gadget.model_dump()
            g_dict["seller_email"] = seller_email
            gadgets.append(AdminGadgetResponse(**g_dict))
        return gadgets, total

    @staticmethod
    async def delete_gadget(gadget_id: str, session: AsyncSession) -> dict:
        result = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
        gadget = result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found")

        gadget.is_active = False
        gadget.updated_at = datetime.utcnow()
        session.add(gadget)
        await session.commit()
        return {"message": "Gadget deactivated by admin", "gadget_id": gadget_id}

    @staticmethod
    async def toggle_verify(gadget_id: str, session: AsyncSession) -> AdminGadgetResponse:
        result = await session.execute(
            select(Gadget, User.email.label("seller_email"))
            .outerjoin(User, Gadget.seller_id == User.id)
            .where(Gadget.id == gadget_id)
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Gadget not found")

        gadget, seller_email = row
        gadget.is_verified = not gadget.is_verified
        gadget.updated_at = datetime.utcnow()
        session.add(gadget)
        await session.commit()
        await session.refresh(gadget)

        g_dict = gadget.model_dump()
        g_dict["seller_email"] = seller_email
        return AdminGadgetResponse(**g_dict)

    # ── Order Management ──

    @staticmethod
    async def get_orders(
        session: AsyncSession,
        status_filter: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[AdminOrderResponse], int]:
        query = select(Order, User.email.label("buyer_email")).outerjoin(User, Order.buyer_id == User.id)
        count_query = select(func.count()).select_from(Order)

        if status_filter:
            query = query.where(Order.status == status_filter)
            count_query = count_query.where(Order.status == status_filter)

        total = (await session.execute(count_query)).scalar()
        result = await session.execute(query.offset(skip).limit(limit).order_by(Order.created_at.desc()))
        rows = result.all()

        orders = []
        for order, buyer_email in rows:
            # Fetch items for this order
            items_result = await session.execute(
                select(OrderItem).where(OrderItem.order_id == order.id)
            )
            items = [AdminOrderItemResponse.model_validate(i) for i in items_result.scalars().all()]

            o_dict = order.model_dump()
            o_dict["buyer_email"] = buyer_email
            o_dict["items"] = items
            orders.append(AdminOrderResponse(**o_dict))

        return orders, total

    @staticmethod
    async def update_order_status(order_id: str, new_status: str, session: AsyncSession) -> AdminOrderResponse:
        valid_statuses = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

        result = await session.execute(
            select(Order, User.email.label("buyer_email"))
            .outerjoin(User, Order.buyer_id == User.id)
            .where(Order.id == order_id)
        )
        row = result.one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")

        order, buyer_email = row
        order.status = new_status
        order.updated_at = datetime.utcnow()
        session.add(order)
        await session.commit()
        await session.refresh(order)

        items_result = await session.execute(select(OrderItem).where(OrderItem.order_id == order.id))
        items = [AdminOrderItemResponse.model_validate(i) for i in items_result.scalars().all()]

        o_dict = order.model_dump()
        o_dict["buyer_email"] = buyer_email
        o_dict["items"] = items
        return AdminOrderResponse(**o_dict)

    # ── Review Management ──

    @staticmethod
    async def get_reviews(
        session: AsyncSession,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[AdminReviewResponse], int]:
        total = (await session.execute(select(func.count()).select_from(Review))).scalar()

        query = (
            select(Review, User.full_name.label("reviewer_name"), User.email.label("reviewer_email"), Gadget.title.label("gadget_title"))
            .outerjoin(User, Review.reviewer_id == User.id)
            .outerjoin(Gadget, Review.gadget_id == Gadget.id)
            .offset(skip).limit(limit)
            .order_by(Review.created_at.desc())
        )
        result = await session.execute(query)
        rows = result.all()

        reviews = []
        for review, reviewer_name, reviewer_email, gadget_title in rows:
            r_dict = review.model_dump()
            r_dict["reviewer_name"] = reviewer_name
            r_dict["reviewer_email"] = reviewer_email
            r_dict["gadget_title"] = gadget_title
            reviews.append(AdminReviewResponse(**r_dict))

        return reviews, total

    @staticmethod
    async def delete_review(review_id: str, session: AsyncSession) -> dict:
        result = await session.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        await session.delete(review)
        await session.commit()
        return {"message": "Review deleted by admin", "review_id": review_id}
