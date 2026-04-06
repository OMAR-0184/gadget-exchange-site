from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException

from server.models.user import User
from server.models.gadget import Gadget
from server.schemas.order import AddressUpdate, UserProfile
from server.schemas.gadget import GadgetResponse


class UserService:

    @staticmethod
    async def get_profile(user: User) -> UserProfile:
        return UserProfile.model_validate(user)

    @staticmethod
    async def update_address(
        address_in: AddressUpdate, user: User, session: AsyncSession
    ) -> UserProfile:
        user.address = address_in.address
        user.phone = address_in.phone
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return UserProfile.model_validate(user)

    @staticmethod
    async def get_my_gadgets(user: User, session: AsyncSession) -> list[GadgetResponse]:
        result = await session.execute(
            select(Gadget)
            .where(Gadget.seller_id == user.id)
            .order_by(Gadget.created_at.desc())
        )
        gadgets = result.scalars().all()

        responses = []
        for gadget in gadgets:
            payload = gadget.model_dump()
            payload["personal_price"] = None
            responses.append(GadgetResponse(**payload))
        return responses
