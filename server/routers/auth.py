from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from server.schemas.user import UserRegister, UserLogin, Token, RegisterResponse
from server.core.dependencies import get_session
from server.services.auth_services import AuthService
from fastapi_limiter.depends import RateLimiter

router = APIRouter(tags=["auth"])

@router.post(
    "/register", 
    response_model=RegisterResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RateLimiter(times=5, seconds=60))]
)
async def register_user(user_in: UserRegister, session: AsyncSession = Depends(get_session)):
    new_user, access_token = await AuthService.register(user_in, session)
    return RegisterResponse(user_id=new_user.id, access_token=access_token)

@router.post(
    "/login", 
    response_model=Token,
    dependencies=[Depends(RateLimiter(times=5, seconds=60))]
)
async def login_user(user_in: UserLogin, session: AsyncSession = Depends(get_session)):
    access_token = await AuthService.login(user_in, session)
    return Token(access_token=access_token)
