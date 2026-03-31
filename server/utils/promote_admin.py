import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import server modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from server.db.session import async_session_maker
from server.models.user import User


async def promote_user(email: str):
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User with email {email} not found.")
            return
            
        user.is_admin = True
        session.add(user)
        await session.commit()
        print(f"Successfully promoted {email} to admin.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m server.utils.promote_admin <email>")
        sys.exit(1)
        
    email = sys.argv[1]
    asyncio.run(promote_user(email))
