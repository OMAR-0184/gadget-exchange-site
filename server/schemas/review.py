from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    gadget_id: str
    order_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class ReviewRead(BaseModel):
    id: str
    reviewer_id: str
    reviewer_name: str
    gadget_id: str
    order_id: str
    rating: int
    comment: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReviewList(BaseModel):
    items: list[ReviewRead]
    total_count: int
