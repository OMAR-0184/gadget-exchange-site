from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
from server.schemas.user import UserRegister, UserLogin
from server.models.user import User
from server.core.security import get_password_hash, verify_password, create_access_token

class AuthService:
    @staticmethod
    async def register(user_in: UserRegister, session: AsyncSession) -> tuple[User, str]:
        query = select(User).where(User.email == user_in.email)
        result = await session.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

        new_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        access_token = create_access_token(data={"sub": new_user.id, "is_admin": new_user.is_admin})
        return new_user, access_token

    @staticmethod
    async def login(user_in: UserLogin, session: AsyncSession) -> str:
        query = select(User).where(User.email == user_in.email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user or not verify_password(user_in.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        if user.is_banned:
            raise HTTPException(status_code=403, detail="Your account has been suspended")
            
        return create_access_token(data={"sub": user.id, "is_admin": user.is_admin})

