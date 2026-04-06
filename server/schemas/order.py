from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# ── User Profile ──

class AddressUpdate(BaseModel):
    address: str
    phone: str


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False
    is_banned: bool = False


# ── Order Requests ──

class OrderItemCreate(BaseModel):
    gadget_id: str
    quantity: int = 1


class PlaceOrderRequest(BaseModel):
    items: list[OrderItemCreate]
    shipping_address: Optional[str] = None  # override user's saved address
    phone: Optional[str] = None


class UpdateOrderStatusRequest(BaseModel):
    status: str  # confirmed, shipped


class VerifyDeliveryRequest(BaseModel):
    verification_code: str


# ── Order Responses ──

class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    gadget_id: str
    seller_id: str
    quantity: int
    unit_price: float
    title: str


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    buyer_id: str
    status: str
    payment_method: str
    shipping_address: str
    phone: str
    total_amount: float
    delivery_verification_code: Optional[str] = None  # only shown to buyer
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    next_cursor: Optional[str] = None
    total_count: int


# ── Bill ──

class BillItemResponse(BaseModel):
    title: str
    quantity: int
    unit_price: float
    subtotal: float


class BillResponse(BaseModel):
    order_id: str
    buyer_name: str
    shipping_address: str
    phone: str
    payment_method: str
    items: list[BillItemResponse]
    total_amount: float
    order_date: datetime
    delivery_verified: bool
    verified_at: Optional[datetime] = None
