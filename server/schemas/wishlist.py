from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from server.schemas.gadget import GadgetResponse

class WishlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: str
    gadget_id: str
    created_at: datetime
    gadget: Optional[GadgetResponse] = None
