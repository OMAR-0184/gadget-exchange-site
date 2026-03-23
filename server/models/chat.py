from sqlmodel import SQLModel, Field
from datetime import datetime
import uuid


class ChatMessage(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:8]}", primary_key=True)
    gadget_id: str = Field(foreign_key="gadget.id", index=True)
    sender_id: str = Field(foreign_key="user.id", index=True)
    receiver_id: str = Field(foreign_key="user.id", index=True)
    message: str

    created_at: datetime = Field(default_factory=datetime.utcnow)
