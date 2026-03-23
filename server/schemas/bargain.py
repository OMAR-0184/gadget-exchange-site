from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class BargainOffer(BaseModel):
    """Sent over WebSocket by buyer or seller."""
    action: str  # "offer", "counter", "accept", "reject"
    price: Optional[float] = None  # required for offer/counter


class BargainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    gadget_id: str
    buyer_id: str
    seller_id: str
    original_price: float
    current_offer: float
    offered_by: str
    status: str
    created_at: datetime
    updated_at: datetime
