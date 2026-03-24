from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
import uuid
import random
import string


class Order(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:8]}", primary_key=True)
    buyer_id: str = Field(foreign_key="user.id", index=True)

    status: str = Field(default="pending")  # pending, confirmed, shipped, delivered, cancelled
    payment_method: str = Field(default="cash_on_delivery")

    shipping_address: str
    phone: str

    total_amount: float

    delivery_verification_code: str = Field(
        default_factory=lambda: "".join(random.choices(string.digits, k=6))
    )
    verified_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrderItem(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"oit_{uuid.uuid4().hex[:8]}", primary_key=True)
    order_id: str = Field(foreign_key="order.id", index=True)
    gadget_id: str = Field(foreign_key="gadget.id", index=True)
    seller_id: str = Field(foreign_key="user.id", index=True)

    quantity: int = Field(default=1)
    unit_price: float
    title: str  # snapshot of gadget title at purchase time
