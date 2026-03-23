from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ChatMessageCreate(BaseModel):
    """Sent over WebSocket."""
    message: str


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    gadget_id: str
    sender_id: str
    receiver_id: str
    message: str
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]
