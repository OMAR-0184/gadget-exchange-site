from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException

from server.models.wishlist import Wishlist
from server.models.gadget import Gadget
from server.schemas.wishlist import WishlistResponse
from server.schemas.gadget import GadgetResponse

class WishlistService:

    @staticmethod
    async def add_to_wishlist(user_id: str, gadget_id: str, session: AsyncSession) -> WishlistResponse:
        # Check if gadget exists
        gadget_result = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
        gadget = gadget_result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found.")

        # Check if already in wishlist
        existing_result = await session.execute(
            select(Wishlist).where(Wishlist.user_id == user_id, Wishlist.gadget_id == gadget_id)
        )
        if existing_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Gadget is already in your wishlist.")

        wishlist_item = Wishlist(user_id=user_id, gadget_id=gadget_id)
        session.add(wishlist_item)
        await session.commit()
        await session.refresh(wishlist_item)
        
        resp = WishlistResponse.model_validate(wishlist_item)
        resp.gadget = GadgetResponse.model_validate(gadget)
        return resp

    @staticmethod
    async def remove_from_wishlist(user_id: str, gadget_id: str, session: AsyncSession):
        result = await session.execute(
            select(Wishlist).where(Wishlist.user_id == user_id, Wishlist.gadget_id == gadget_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in wishlist.")
            
        await session.delete(item)
        await session.commit()
        return {"detail": "Removed from wishlist successfully"}

    @staticmethod
    async def get_user_wishlist(user_id: str, session: AsyncSession) -> list[WishlistResponse]:
        result = await session.execute(
            select(Wishlist).where(Wishlist.user_id == user_id).order_by(Wishlist.created_at.desc())
        )
        wishlist_items = result.scalars().all()
        
        responses = []
        for item in wishlist_items:
            gadget_res = await session.execute(select(Gadget).where(Gadget.id == item.gadget_id))
            gadget = gadget_res.scalar_one_or_none()
            
            resp = WishlistResponse.model_validate(item)
            if gadget:
                resp.gadget = GadgetResponse.model_validate(gadget)
            responses.append(resp)
            
        return responses
