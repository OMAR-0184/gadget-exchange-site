import uuid
from sqlmodel import SQLModel, Field
from datetime import datetime

class Wishlist(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"wsh_{uuid.uuid4().hex[:8]}", primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    gadget_id: str = Field(foreign_key="gadget.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
