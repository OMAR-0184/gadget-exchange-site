from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from server.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    pass
    # async with engine.begin() as conn:
    #     # For production use Alembic migrations instead,
    #     # but for initial local development this is fine.
    #     await conn.run_sync(SQLModel.metadata.create_all)