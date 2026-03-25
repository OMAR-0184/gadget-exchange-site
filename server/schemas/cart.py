from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CartItemCreate(BaseModel):
    gadget_id: str
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    cart_id: str
    gadget_id: str
    quantity: int
    
    # These fields can be manually populated when joining the gadget
    title: Optional[str] = None
    unit_price: Optional[float] = None
    
    created_at: datetime
    updated_at: datetime

class CartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    items: list[CartItemResponse] = []
    total_amount: float = 0.0
    created_at: datetime
    updated_at: datetime
