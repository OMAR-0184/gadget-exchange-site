from contextlib import asynccontextmanager
from fastapi import FastAPI
from server.db.session import init_db
from server.routers.auth import router as auth_router
from server.routers.gadgets import router as gadgets_router
import logging
from redis import asyncio as aioredis
from fastapi_limiter import FastAPILimiter
from server.core.config import settings

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Starting up and initializing DB, Redis and Rate Limiter...")
    await init_db()
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis)
    yield
    logging.info("Shutting down...")

app = FastAPI(
    title="Gadget-Exchange-App", 
    description="App Used for exchanging and buy/sell gadgets",
    lifespan=lifespan
)

app.include_router(auth_router, prefix="/v1/auth")
app.include_router(gadgets_router, prefix="/v1/gadgets")
