from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from server.core.dependencies import get_session, get_current_user
from server.models.user import User
from server.schemas.wishlist import WishlistResponse
from server.services.wishlist_services import WishlistService

router = APIRouter(tags=["Wishlist"])

@router.post("/{gadget_id}", response_model=WishlistResponse, status_code=201)
async def add_to_wishlist(
    gadget_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Add a gadget to your wishlist."""
    return await WishlistService.add_to_wishlist(
        user_id=current_user.id, gadget_id=gadget_id, session=db
    )

@router.delete("/{gadget_id}")
async def remove_from_wishlist(
    gadget_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Remove a gadget from your wishlist."""
    return await WishlistService.remove_from_wishlist(
        user_id=current_user.id, gadget_id=gadget_id, session=db
    )

@router.get("/", response_model=list[WishlistResponse])
async def get_my_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Get all gadgets in your wishlist."""
    return await WishlistService.get_user_wishlist(user_id=current_user.id, session=db)
