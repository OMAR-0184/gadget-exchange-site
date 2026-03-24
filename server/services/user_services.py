from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException

from server.models.user import User
from server.schemas.order import AddressUpdate, UserProfile


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
