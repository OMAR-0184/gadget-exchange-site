from fastapi import APIRouter, Depends, Query, Body
from typing import Optional
from sqlmodel.ext.asyncio.session import AsyncSession

from server.core.dependencies import get_session, get_current_user
from server.models.user import User
from server.schemas.cart import CartResponse, CartItemCreate, CartItemUpdate
from server.schemas.order import OrderResponse
from server.services.cart_services import CartService

router = APIRouter(tags=["Cart"])

@router.get("/", response_model=CartResponse)
async def get_my_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Get your current shopping cart."""
    return await CartService.get_cart(user_id=current_user.id, session=db)

@router.post("/items", response_model=CartResponse)
async def add_item_to_cart(
    item_in: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Add a new gadget item to your cart or increase quantity."""
    return await CartService.add_item_to_cart(user_id=current_user.id, item_in=item_in, session=db)

@router.patch("/items/{gadget_id}", response_model=CartResponse)
async def update_cart_item(
    gadget_id: str,
    update_in: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Update quantity of an existing item in the cart. Setting to 0 removes it."""
    return await CartService.update_cart_item(
        user_id=current_user.id, gadget_id=gadget_id, update_in=update_in, session=db
    )

@router.delete("/items/{gadget_id}", response_model=CartResponse)
async def remove_item_from_cart(
    gadget_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Remove a gadget completely from your cart."""
    return await CartService.remove_item_from_cart(
        user_id=current_user.id, gadget_id=gadget_id, session=db
    )

@router.post("/checkout", response_model=OrderResponse, status_code=201)
async def checkout_cart(
    shipping_address: Optional[str] = Body(None),
    phone: Optional[str] = Body(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Instantly convert all items in the cart into a real pending order (Cash on Delivery)."""
    return await CartService.checkout_cart(
        buyer=current_user, shipping_address=shipping_address, phone=phone, session=db
    )
