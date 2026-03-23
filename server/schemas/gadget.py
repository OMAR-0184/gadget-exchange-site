from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

VALID_CONDITIONS = {"new", "like_new", "good", "fair"}
VALID_CATEGORIES = {"smartphones", "laptops", "tablets", "wearables", "audio", "gaming", "accessories", "other"}

class GadgetCreate(BaseModel):
    title: str
    description: str
    category: str
    price: float
    condition: str = "good"
    image_urls: list[str] = []

class GadgetUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    condition: Optional[str] = None
    image_urls: Optional[list[str]] = None
    is_active: Optional[bool] = None

class GadgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    seller_id: str
    title: str
    description: str
    category: str
    price: float
    personal_price: Optional[float] = None
    condition: str
    image_urls: list[str]
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

class GadgetListResponse(BaseModel):
    items: list[GadgetResponse]
    next_cursor: Optional[str] = None
    total_count: int
