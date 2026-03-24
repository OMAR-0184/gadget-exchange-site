from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlmodel import select, func
from fastapi import HTTPException
from datetime import datetime

from server.models.order import Order, OrderItem
from server.models.gadget import Gadget
from server.models.user import User
from server.models.bargain import BargainSession
from server.schemas.order import (
    PlaceOrderRequest,
    UpdateOrderStatusRequest,
    OrderResponse,
    OrderItemResponse,
    BillResponse,
    BillItemResponse,
)

VALID_STATUS_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"shipped", "cancelled"},
    "shipped": {"delivered"},
}


class OrderService:

    @staticmethod
    async def place_order(
        order_in: PlaceOrderRequest, buyer: User, session: AsyncSession
    ) -> Order:
        # Resolve shipping address
        address = order_in.shipping_address or buyer.address
        phone = order_in.phone or buyer.phone
        if not address:
            raise HTTPException(
                status_code=400,
                detail="Shipping address is required. Set it via /users/me/address or provide it in the order.",
            )
        if not phone:
            raise HTTPException(
                status_code=400,
                detail="Phone number is required. Set it via /users/me/address or provide it in the order.",
            )

        if not order_in.items:
            raise HTTPException(status_code=400, detail="Order must contain at least one item.")

        # ── Lock gadgets & validate stock ──
        gadget_ids = [item.gadget_id for item in order_in.items]
        qty_map = {item.gadget_id: item.quantity for item in order_in.items}

        # Pessimistic lock: SELECT … FOR UPDATE (sorted to avoid deadlocks)
        lock_query = (
            select(Gadget)
            .where(Gadget.id.in_(sorted(gadget_ids)))
            .with_for_update()
        )
        result = await session.execute(lock_query)
        gadgets = {g.id: g for g in result.scalars().all()}

        # Validate all gadgets exist and are active
        for gid in gadget_ids:
            if gid not in gadgets:
                raise HTTPException(status_code=404, detail=f"Gadget {gid} not found.")
            g = gadgets[gid]
            if not g.is_active:
                raise HTTPException(status_code=400, detail=f"Gadget '{g.title}' is no longer available.")
            if g.seller_id == buyer.id:
                raise HTTPException(status_code=400, detail="You cannot buy your own listing.")
            if g.stock < qty_map[gid]:
                raise HTTPException(
                    status_code=409,
                    detail=f"Insufficient stock for '{g.title}'. Available: {g.stock}, requested: {qty_map[gid]}.",
                )

        # ── Resolve prices (use personal bargain price if available) ──
        bargain_result = await session.execute(
            select(BargainSession).where(
                BargainSession.buyer_id == buyer.id,
                BargainSession.gadget_id.in_(gadget_ids),
                BargainSession.status == "accepted",
            )
        )
        bargain_map = {b.gadget_id: b.current_offer for b in bargain_result.scalars().all()}

        # ── Create order + items ──
        total = 0.0
        order = Order(
            buyer_id=buyer.id,
            shipping_address=address,
            phone=phone,
            total_amount=0,  # will update below
        )
        session.add(order)
        await session.flush()  # get order.id

        order_items = []
        for gid in gadget_ids:
            g = gadgets[gid]
            qty = qty_map[gid]
            unit_price = bargain_map.get(gid, g.price)
            item = OrderItem(
                order_id=order.id,
                gadget_id=gid,
                seller_id=g.seller_id,
                quantity=qty,
                unit_price=unit_price,
                title=g.title,
            )
            session.add(item)
            order_items.append(item)
            total += unit_price * qty

            # Decrement stock
            g.stock -= qty
            if g.stock <= 0:
                g.is_active = False
            g.updated_at = datetime.utcnow()
            session.add(g)

        order.total_amount = total
        session.add(order)
        await session.commit()
        await session.refresh(order)

        return order, order_items

    @staticmethod
    async def get_user_orders(
        buyer: User,
        session: AsyncSession,
        cursor: str | None = None,
        limit: int = 20,
    ):
        query = select(Order).where(Order.buyer_id == buyer.id)
        count_query = select(func.count()).select_from(Order).where(Order.buyer_id == buyer.id)

        if cursor:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(Order.created_at < cursor_dt)

        query = query.order_by(Order.created_at.desc()).limit(limit + 1)

        result = await session.execute(query)
        orders = list(result.scalars().all())

        count_result = await session.execute(count_query)
        total_count = count_result.scalar()

        next_cursor = None
        if len(orders) > limit:
            orders = orders[:limit]
            next_cursor = orders[-1].created_at.isoformat()

        # Attach items to each order
        order_responses = []
        for order in orders:
            items_result = await session.execute(
                select(OrderItem).where(OrderItem.order_id == order.id)
            )
            items = list(items_result.scalars().all())
            resp = OrderResponse.model_validate(order)
            resp.items = [OrderItemResponse.model_validate(i) for i in items]
            # Hide verification code in list view
            resp.delivery_verification_code = None
            order_responses.append(resp)

        return order_responses, next_cursor, total_count

    @staticmethod
    async def get_order_detail(order_id: str, user: User, session: AsyncSession) -> OrderResponse:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        # Only buyer or sellers of the items can view
        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = list(items_result.scalars().all())
        seller_ids = {i.seller_id for i in items}

        if order.buyer_id != user.id and user.id not in seller_ids:
            raise HTTPException(status_code=403, detail="You are not authorized to view this order.")

        resp = OrderResponse.model_validate(order)
        resp.items = [OrderItemResponse.model_validate(i) for i in items]

        # Only show verification code to the buyer
        if order.buyer_id != user.id:
            resp.delivery_verification_code = None

        return resp

    @staticmethod
    async def cancel_order(order_id: str, buyer: User, session: AsyncSession) -> OrderResponse:
        result = await session.execute(
            select(Order).where(Order.id == order_id).with_for_update()
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")
        if order.buyer_id != buyer.id:
            raise HTTPException(status_code=403, detail="You can only cancel your own orders.")
        if order.status not in ("pending", "confirmed"):
            raise HTTPException(status_code=400, detail=f"Cannot cancel order with status '{order.status}'.")

        # Restore stock
        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = list(items_result.scalars().all())
        for item in items:
            gadget_result = await session.execute(
                select(Gadget).where(Gadget.id == item.gadget_id).with_for_update()
            )
            gadget = gadget_result.scalar_one_or_none()
            if gadget:
                gadget.stock += item.quantity
                if gadget.stock > 0:
                    gadget.is_active = True
                gadget.updated_at = datetime.utcnow()
                session.add(gadget)

        order.status = "cancelled"
        order.updated_at = datetime.utcnow()
        session.add(order)
        await session.commit()
        await session.refresh(order)

        resp = OrderResponse.model_validate(order)
        resp.items = [OrderItemResponse.model_validate(i) for i in items]
        return resp

    @staticmethod
    async def update_order_status(
        order_id: str,
        status_in: UpdateOrderStatusRequest,
        seller: User,
        session: AsyncSession,
    ) -> OrderResponse:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        # Verify the seller owns at least one item in this order
        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = list(items_result.scalars().all())
        seller_ids = {i.seller_id for i in items}
        if seller.id not in seller_ids:
            raise HTTPException(status_code=403, detail="You are not a seller in this order.")

        new_status = status_in.status.lower()
        allowed = VALID_STATUS_TRANSITIONS.get(order.status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition from '{order.status}' to '{new_status}'. Allowed: {allowed}.",
            )

        order.status = new_status
        order.updated_at = datetime.utcnow()
        session.add(order)
        await session.commit()
        await session.refresh(order)

        resp = OrderResponse.model_validate(order)
        resp.items = [OrderItemResponse.model_validate(i) for i in items]
        resp.delivery_verification_code = None  # don't reveal to seller
        return resp

    @staticmethod
    async def verify_delivery(
        order_id: str, code: str, user: User, session: AsyncSession
    ) -> OrderResponse:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = list(items_result.scalars().all())
        seller_ids = {i.seller_id for i in items}

        if order.buyer_id != user.id and user.id not in seller_ids:
            raise HTTPException(status_code=403, detail="Not authorized.")

        if order.verified_at:
            raise HTTPException(status_code=400, detail="Delivery already verified.")
        if order.status == "cancelled":
            raise HTTPException(status_code=400, detail="Cannot verify a cancelled order.")

        if code != order.delivery_verification_code:
            raise HTTPException(status_code=400, detail="Invalid verification code.")

        order.verified_at = datetime.utcnow()
        order.status = "delivered"
        order.updated_at = datetime.utcnow()
        session.add(order)
        await session.commit()
        await session.refresh(order)

        resp = OrderResponse.model_validate(order)
        resp.items = [OrderItemResponse.model_validate(i) for i in items]
        return resp

    @staticmethod
    async def generate_bill(
        order_id: str, user: User, session: AsyncSession
    ) -> BillResponse:
        result = await session.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found.")

        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = list(items_result.scalars().all())
        seller_ids = {i.seller_id for i in items}

        if order.buyer_id != user.id and user.id not in seller_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this bill.")

        if order.status in ("pending", "cancelled"):
            raise HTTPException(
                status_code=400,
                detail=f"Bill is not available for orders with status '{order.status}'.",
            )

        # Get buyer name
        buyer_result = await session.execute(select(User).where(User.id == order.buyer_id))
        buyer = buyer_result.scalar_one_or_none()

        bill_items = [
            BillItemResponse(
                title=item.title,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.unit_price * item.quantity,
            )
            for item in items
        ]

        return BillResponse(
            order_id=order.id,
            buyer_name=buyer.full_name if buyer else "Unknown",
            shipping_address=order.shipping_address,
            phone=order.phone,
            payment_method=order.payment_method,
            items=bill_items,
            total_amount=order.total_amount,
            order_date=order.created_at,
            delivery_verified=order.verified_at is not None,
            verified_at=order.verified_at,
        )
