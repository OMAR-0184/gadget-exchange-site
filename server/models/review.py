from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid

class Review(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:8]}", primary_key=True)
    reviewer_id: str = Field(foreign_key="user.id", index=True)
    gadget_id: str = Field(foreign_key="gadget.id", index=True)
    order_id: str = Field(foreign_key="order.id", index=True)
    
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
