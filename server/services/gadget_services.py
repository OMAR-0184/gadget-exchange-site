from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col
from fastapi import HTTPException
from datetime import datetime
from server.models.gadget import Gadget
from server.models.user import User
from server.schemas.gadget import GadgetCreate, GadgetUpdate, VALID_CONDITIONS, VALID_CATEGORIES

class GadgetService:
    @staticmethod
    async def create_gadget(gadget_in: GadgetCreate, seller: User, session: AsyncSession) -> Gadget:
        if gadget_in.condition not in VALID_CONDITIONS:
            raise HTTPException(status_code=400, detail=f"Invalid condition. Must be one of: {VALID_CONDITIONS}")
        if gadget_in.category.lower() not in VALID_CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {VALID_CATEGORIES}")
        if gadget_in.price <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0")

        # Auto-verify if all key fields are filled
        is_verified = bool(
            gadget_in.title and gadget_in.description and 
            gadget_in.image_urls and len(gadget_in.image_urls) > 0 and 
            gadget_in.price > 0
        )

        new_gadget = Gadget(
            seller_id=seller.id,
            title=gadget_in.title,
            description=gadget_in.description,
            category=gadget_in.category.lower(),
            price=gadget_in.price,
            condition=gadget_in.condition,
            image_urls=gadget_in.image_urls,
            is_verified=is_verified
        )
        session.add(new_gadget)
        await session.commit()
        await session.refresh(new_gadget)
        return new_gadget

    @staticmethod
    async def update_gadget(gadget_id: str, gadget_in: GadgetUpdate, seller: User, session: AsyncSession) -> Gadget:
        result = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
        gadget = result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found")
        if gadget.seller_id != seller.id:
            raise HTTPException(status_code=403, detail="You can only edit your own listings")

        update_data = gadget_in.model_dump(exclude_unset=True)
        
        if "condition" in update_data and update_data["condition"] not in VALID_CONDITIONS:
            raise HTTPException(status_code=400, detail=f"Invalid condition. Must be one of: {VALID_CONDITIONS}")
        if "category" in update_data:
            if update_data["category"].lower() not in VALID_CATEGORIES:
                raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {VALID_CATEGORIES}")
            update_data["category"] = update_data["category"].lower()
        if "price" in update_data and update_data["price"] <= 0:
            raise HTTPException(status_code=400, detail="Price must be greater than 0")

        for key, value in update_data.items():
            setattr(gadget, key, value)
        gadget.updated_at = datetime.utcnow()

        # Re-evaluate verification after edit
        gadget.is_verified = bool(
            gadget.title and gadget.description and 
            gadget.image_urls and len(gadget.image_urls) > 0 and 
            gadget.price > 0
        )

        session.add(gadget)
        await session.commit()
        await session.refresh(gadget)
        return gadget

    @staticmethod
    async def get_gadgets(
        session: AsyncSession,
        cursor: str | None = None,
        limit: int = 20,
        search: str | None = None,
        category: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        condition: str | None = None,
    ) -> tuple[list[Gadget], str | None, int]:
        # Base query: only active gadgets
        query = select(Gadget).where(Gadget.is_active == True)
        count_query = select(func.count()).select_from(Gadget).where(Gadget.is_active == True)

        # Apply filters
        if search:
            query = query.where(col(Gadget.title).ilike(f"%{search}%"))
            count_query = count_query.where(col(Gadget.title).ilike(f"%{search}%"))
        if category:
            query = query.where(Gadget.category == category.lower())
            count_query = count_query.where(Gadget.category == category.lower())
        if min_price is not None:
            query = query.where(Gadget.price >= min_price)
            count_query = count_query.where(Gadget.price >= min_price)
        if max_price is not None:
            query = query.where(Gadget.price <= max_price)
            count_query = count_query.where(Gadget.price <= max_price)
        if condition:
            query = query.where(Gadget.condition == condition)
            count_query = count_query.where(Gadget.condition == condition)

        # Cursor-based pagination (cursor = ISO timestamp of last item's created_at)
        if cursor:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(Gadget.created_at < cursor_dt)

        # Order by newest first, fetch limit+1 to detect if there's a next page
        query = query.order_by(Gadget.created_at.desc()).limit(limit + 1)

        result = await session.execute(query)
        gadgets = list(result.scalars().all())

        count_result = await session.execute(count_query)
        total_count = count_result.scalar()

        # Determine next cursor
        next_cursor = None
        if len(gadgets) > limit:
            gadgets = gadgets[:limit]
            next_cursor = gadgets[-1].created_at.isoformat()

        return gadgets, next_cursor, total_count

    @staticmethod
    async def get_gadget_by_id(gadget_id: str, session: AsyncSession) -> Gadget:
        result = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
        gadget = result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found")
        return gadget
