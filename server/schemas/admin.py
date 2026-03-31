from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# ── Stats ──

class AdminStatsResponse(BaseModel):
    total_users: int
    total_gadgets: int
    total_orders: int
    total_revenue: float
    active_listings: int
    banned_users: int


# ── User Management ──

class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool
    is_banned: bool


class AdminUserListResponse(BaseModel):
    users: list[AdminUserResponse]
    total_count: int


# ── Gadget Management ──

class AdminGadgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    seller_id: str
    seller_email: Optional[str] = None
    title: str
    description: str
    category: str
    price: float
    condition: str
    image_urls: list[str]
    stock: int
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AdminGadgetListResponse(BaseModel):
    gadgets: list[AdminGadgetResponse]
    total_count: int


# ── Order Management ──

class AdminOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    gadget_id: str
    seller_id: str
    quantity: int
    unit_price: float
    title: str


class AdminOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    buyer_id: str
    buyer_email: Optional[str] = None
    status: str
    payment_method: str
    shipping_address: str
    phone: str
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: list[AdminOrderItemResponse] = []


class AdminOrderListResponse(BaseModel):
    orders: list[AdminOrderResponse]
    total_count: int


# ── Review Management ──

class AdminReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reviewer_id: str
    reviewer_name: Optional[str] = None
    reviewer_email: Optional[str] = None
    gadget_id: str
    gadget_title: Optional[str] = None
    order_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime


class AdminReviewListResponse(BaseModel):
    reviews: list[AdminReviewResponse]
    total_count: int
