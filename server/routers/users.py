from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from server.core.dependencies import get_session, get_current_user
from server.models.user import User
from server.services.user_services import UserService
from server.schemas.order import AddressUpdate, UserProfile
from server.schemas.gadget import GadgetResponse

router = APIRouter(tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    return await UserService.get_profile(current_user)


@router.patch("/me/address", response_model=UserProfile)
async def update_address(
    address_in: AddressUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await UserService.update_address(address_in, current_user, session)


@router.get("/me/gadgets", response_model=list[GadgetResponse])
async def get_my_gadgets(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    return await UserService.get_my_gadgets(current_user, session)
