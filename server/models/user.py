from sqlmodel import SQLModel, Field
from typing import Optional
import uuid

class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: f"usr_{uuid.uuid4().hex[:8]}", primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    address: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    is_admin: bool = Field(default=False)
    is_banned: bool = Field(default=False)
