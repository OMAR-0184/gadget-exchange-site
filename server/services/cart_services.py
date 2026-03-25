from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
from datetime import datetime

from server.models.cart import Cart, CartItem
from server.models.gadget import Gadget
from server.models.user import User
from server.schemas.cart import CartItemCreate, CartItemUpdate, CartResponse, CartItemResponse
from server.schemas.order import PlaceOrderRequest, OrderItemCreate
from server.services.order_services import OrderService

class CartService:

    @staticmethod
    async def get_or_create_cart(user_id: str, session: AsyncSession) -> Cart:
        result = await session.execute(select(Cart).where(Cart.user_id == user_id))
        cart = result.scalar_one_or_none()
        if not cart:
            cart = Cart(user_id=user_id)
            session.add(cart)
            await session.commit()
            await session.refresh(cart)
        return cart

    @staticmethod
    async def _format_cart_response(cart: Cart, session: AsyncSession) -> CartResponse:
        items_result = await session.execute(select(CartItem).where(CartItem.cart_id == cart.id))
        items = items_result.scalars().all()
        
        total_amount = 0.0
        item_responses = []
        
        for item in items:
            gadget_res = await session.execute(select(Gadget).where(Gadget.id == item.gadget_id))
            gadget = gadget_res.scalar_one_or_none()
            
            resp = CartItemResponse.model_validate(item)
            if gadget:
                resp.title = gadget.title
                resp.unit_price = gadget.price
                total_amount += gadget.price * item.quantity
            item_responses.append(resp)
            
        cart_resp = CartResponse.model_validate(cart)
        cart_resp.items = item_responses
        cart_resp.total_amount = total_amount
        return cart_resp

    @staticmethod
    async def get_cart(user_id: str, session: AsyncSession) -> CartResponse:
        cart = await CartService.get_or_create_cart(user_id, session)
        return await CartService._format_cart_response(cart, session)

    @staticmethod
    async def add_item_to_cart(user_id: str, item_in: CartItemCreate, session: AsyncSession) -> CartResponse:
        cart = await CartService.get_or_create_cart(user_id, session)
        
        # Verify gadget
        gadget_res = await session.execute(select(Gadget).where(Gadget.id == item_in.gadget_id))
        gadget = gadget_res.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found.")
        if not gadget.is_active or gadget.stock < item_in.quantity:
            raise HTTPException(status_code=400, detail="Not enough stock available.")
        if gadget.seller_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot add your own gadget to cart.")

        # Check if item exists in cart
        existing_res = await session.execute(
            select(CartItem).where(CartItem.cart_id == cart.id, CartItem.gadget_id == item_in.gadget_id)
        )
        existing = existing_res.scalar_one_or_none()
        
        if existing:
            new_quantity = existing.quantity + item_in.quantity
            if gadget.stock < new_quantity:
                raise HTTPException(status_code=400, detail="Not enough stock available for this accumulation.")
            existing.quantity = new_quantity
            existing.updated_at = datetime.utcnow()
            session.add(existing)
        else:
            new_item = CartItem(cart_id=cart.id, gadget_id=item_in.gadget_id, quantity=item_in.quantity)
            session.add(new_item)
            
        cart.updated_at = datetime.utcnow()
        session.add(cart)
        await session.commit()
        await session.refresh(cart)
        
        return await CartService._format_cart_response(cart, session)

    @staticmethod
    async def update_cart_item(user_id: str, gadget_id: str, update_in: CartItemUpdate, session: AsyncSession) -> CartResponse:
        cart = await CartService.get_or_create_cart(user_id, session)
        
        existing_res = await session.execute(
            select(CartItem).where(CartItem.cart_id == cart.id, CartItem.gadget_id == gadget_id)
        )
        existing = existing_res.scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found in cart.")
            
        if update_in.quantity <= 0:
            await session.delete(existing)
        else:
            # Verify gadget stock
            gadget_res = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
            gadget = gadget_res.scalar_one_or_none()
            if gadget and gadget.stock < update_in.quantity:
                raise HTTPException(status_code=400, detail="Not enough stock available.")
            
            existing.quantity = update_in.quantity
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            
        cart.updated_at = datetime.utcnow()
        session.add(cart)
        await session.commit()
        return await CartService._format_cart_response(cart, session)

    @staticmethod
    async def remove_item_from_cart(user_id: str, gadget_id: str, session: AsyncSession) -> CartResponse:
        cart = await CartService.get_or_create_cart(user_id, session)
        
        existing_res = await session.execute(
            select(CartItem).where(CartItem.cart_id == cart.id, CartItem.gadget_id == gadget_id)
        )
        existing = existing_res.scalar_one_or_none()
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found in cart.")
            
        await session.delete(existing)
        cart.updated_at = datetime.utcnow()
        session.add(cart)
        await session.commit()
        return await CartService._format_cart_response(cart, session)

    @staticmethod
    async def checkout_cart(buyer: User, shipping_address: str | None, phone: str | None, session: AsyncSession):
        cart = await CartService.get_or_create_cart(buyer.id, session)
        items_result = await session.execute(select(CartItem).where(CartItem.cart_id == cart.id))
        items = items_result.scalars().all()
        
        if not items:
            raise HTTPException(status_code=400, detail="Cart is empty.")
            
        order_items = [OrderItemCreate(gadget_id=item.gadget_id, quantity=item.quantity) for item in items]
        order_request = PlaceOrderRequest(
            items=order_items,
            shipping_address=shipping_address,
            phone=phone
        )
        
        # Place the order using order_services logic
        order, _ = await OrderService.place_order(order_request, buyer, session)
        
        # Then clear the cart
        for item in items:
            await session.delete(item)
            
        cart.updated_at = datetime.utcnow()
        session.add(cart)
        await session.commit()
        
        # OrderService.get_order_detail returns OrderResponse safely formatted
        return await OrderService.get_order_detail(order.id, buyer, session)
