from contextlib import asynccontextmanager
from fastapi import FastAPI
from server.db.session import init_db
from server.routers.auth import router as auth_router
from server.routers.gadgets import router as gadgets_router
from server.routers.bargain import router as bargain_router
from server.routers.chat import router as chat_router
from server.routers.orders import router as orders_router
from server.routers.users import router as users_router
import logging
from redis import asyncio as aioredis
from fastapi_limiter import FastAPILimiter
from server.core.config import settings

# Import models so Alembic/SQLModel can see them
import server.models.bargain  # noqa: F401
import server.models.chat  # noqa: F401
import server.models.order  # noqa: F401

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Starting up and initializing DB, Redis and Rate Limiter...")
    await init_db()
    redis = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis)
    yield
    logging.info("Shutting down...")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Gadget-Exchange-App", 
    description="App Used for exchanging and buy/sell gadgets",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production to specific frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/v1/auth")
app.include_router(gadgets_router, prefix="/v1/gadgets")
app.include_router(bargain_router, prefix="/v1/bargain")
app.include_router(chat_router, prefix="/v1/chat")
app.include_router(orders_router, prefix="/v1/orders")
app.include_router(users_router, prefix="/v1/users")

from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, description=app.description, routes=app.routes)
    body_schema = schema.get("components", {}).get("schemas", {}).get("Body_create_gadget_v1_gadgets__post", {})
    props = body_schema.get("properties", {})
    if "images" in props:
        props["images"] = {
            "type": "array",
            "items": {"type": "string", "format": "binary"},
            "title": "Images",
            "description": "Product images (max 5MB each)"
        }
    app.openapi_schema = schema
    return schema

app.openapi = custom_openapi

