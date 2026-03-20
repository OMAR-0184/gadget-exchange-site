from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional
from datetime import datetime
import uuid

class Gadget(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"gdt_{uuid.uuid4().hex[:8]}", primary_key=True)
    seller_id: str = Field(foreign_key="user.id", index=True)
    
    title: str = Field(index=True)
    description: str
    category: str = Field(index=True)
    price: float
    condition: str = Field(default="good")  # new, like_new, good, fair
    
    image_urls: list[str] = Field(default=[], sa_column=Column(JSON))
    
    is_verified: bool = Field(default=False)
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
