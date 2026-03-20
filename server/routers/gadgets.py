from fastapi import APIRouter, Depends, Query, Form, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from server.schemas.gadget import GadgetCreate, GadgetUpdate, GadgetResponse, GadgetListResponse
from server.core.dependencies import get_session, get_current_user
from server.services.gadget_services import GadgetService
from server.services.cloudinary_service import CloudinaryService
from server.models.user import User
from typing import Optional

router = APIRouter(tags=["gadgets"])

@router.post("/", response_model=GadgetResponse, status_code=status.HTTP_201_CREATED)
async def create_gadget(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price: float = Form(...),
    condition: str = Form("good"),
    images: list[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Upload images to Cloudinary if provided
    image_urls = []
    if images and images[0].filename:  # FastAPI sends empty UploadFile when no files
        image_urls = await CloudinaryService.upload_images(images)

    gadget_in = GadgetCreate(
        title=title,
        description=description,
        category=category,
        price=price,
        condition=condition,
        image_urls=image_urls
    )
    gadget = await GadgetService.create_gadget(gadget_in, current_user, session)
    return gadget

@router.patch("/{gadget_id}", response_model=GadgetResponse)
async def update_gadget(
    gadget_id: str,
    gadget_in: GadgetUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    gadget = await GadgetService.update_gadget(gadget_id, gadget_in, current_user, session)
    return gadget

@router.get("/", response_model=GadgetListResponse)
async def list_gadgets(
    cursor: Optional[str] = Query(None, description="ISO timestamp cursor for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by title"),
    category: Optional[str] = Query(None, description="Filter by category"),
    min_price: Optional[float] = Query(None, description="Minimum price"),
    max_price: Optional[float] = Query(None, description="Maximum price"),
    condition: Optional[str] = Query(None, description="Filter by condition"),
    session: AsyncSession = Depends(get_session)
):
    items, next_cursor, total_count = await GadgetService.get_gadgets(
        session, cursor=cursor, limit=limit, search=search,
        category=category, min_price=min_price, max_price=max_price, condition=condition
    )
    return GadgetListResponse(items=items, next_cursor=next_cursor, total_count=total_count)

@router.get("/{gadget_id}", response_model=GadgetResponse)
async def get_gadget(gadget_id: str, session: AsyncSession = Depends(get_session)):
    return await GadgetService.get_gadget_by_id(gadget_id, session)
