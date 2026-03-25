import uuid
from sqlmodel import SQLModel, Field
from datetime import datetime

# Represents a user's cart (1 per user)
class Cart(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"crt_{uuid.uuid4().hex[:8]}", primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Represents items within a cart
class CartItem(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"cit_{uuid.uuid4().hex[:8]}", primary_key=True)
    cart_id: str = Field(foreign_key="cart.id", index=True, ondelete="CASCADE")
    gadget_id: str = Field(foreign_key="gadget.id", index=True)
    quantity: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
