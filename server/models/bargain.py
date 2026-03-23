from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid


class BargainSession(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"brg_{uuid.uuid4().hex[:8]}", primary_key=True)
    gadget_id: str = Field(foreign_key="gadget.id", index=True)
    buyer_id: str = Field(foreign_key="user.id", index=True)
    seller_id: str = Field(foreign_key="user.id")

    original_price: float
    current_offer: float
    offered_by: str  # "buyer" or "seller"
    status: str = Field(default="pending")  # pending, accepted, rejected, countered

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
