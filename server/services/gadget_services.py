from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func, col, or_
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
        sort_by: str = "newest",
        current_user: User | None = None,
    ) -> tuple[list[Gadget], str | None, int]:
        query = select(Gadget).where(Gadget.is_active == True)
        count_query = select(func.count()).select_from(Gadget).where(Gadget.is_active == True)

        if search:
            search_term = f"%{search}%"
            search_condition = or_(
                col(Gadget.title).ilike(search_term),
                col(Gadget.description).ilike(search_term),
                col(Gadget.category).ilike(search_term),
                col(Gadget.condition).ilike(search_term)
            )
            query = query.where(search_condition)
            count_query = count_query.where(search_condition)
            
            if sort_by == "relevance":
                search_vector = func.to_tsvector('english', col(Gadget.title) + ' ' + col(Gadget.description))
                search_query = func.plainto_tsquery('english', search)
                rank = func.ts_rank_cd(search_vector, search_query)
                query = query.order_by(rank.desc(), Gadget.created_at.desc())

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

        if sort_by == "price_asc":
            query = query.order_by(Gadget.price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Gadget.price.desc())
        elif sort_by == "newest" or (sort_by == "relevance" and not search):
            query = query.order_by(Gadget.created_at.desc())

        offset = int(cursor) if cursor and cursor.isdigit() else 0
        query = query.offset(offset).limit(limit + 1)

        result = await session.execute(query)
        gadgets = list(result.scalars().all())

        count_result = await session.execute(count_query)
        total_count = count_result.scalar()

        next_cursor = None
        if len(gadgets) > limit:
            gadgets = gadgets[:limit]
            next_cursor = str(offset + limit)

        # Inject personal_price and convert to dict
        result_items = []
        if current_user and gadgets:
            from server.models.bargain import BargainSession
            gadget_ids = [g.id for g in gadgets]
            b_result = await session.execute(
                select(BargainSession).where(
                    BargainSession.gadget_id.in_(gadget_ids),
                    BargainSession.buyer_id == current_user.id,
                    BargainSession.status == "accepted"
                )
            )
            bargains = b_result.scalars().all()
            bargain_map = {b.gadget_id: b.current_offer for b in bargains}
            for g in gadgets:
                g_dict = g.model_dump()
                g_dict["personal_price"] = bargain_map.get(g.id)
                result_items.append(g_dict)
        else:
            for g in gadgets:
                g_dict = g.model_dump()
                g_dict["personal_price"] = None
                result_items.append(g_dict)

        return result_items, next_cursor, total_count

    @staticmethod
    async def get_gadget_by_id(gadget_id: str, session: AsyncSession, current_user: User | None = None) -> dict:
        result = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
        gadget = result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found")
            
        g_dict = gadget.model_dump()
        g_dict["personal_price"] = None
        
        if current_user:
            from server.models.bargain import BargainSession
            b_result = await session.execute(
                select(BargainSession).where(
                    BargainSession.gadget_id == gadget_id,
                    BargainSession.buyer_id == current_user.id,
                    BargainSession.status == "accepted"
                )
            )
            bargain = b_result.scalar_one_or_none()
            if bargain:
                g_dict["personal_price"] = bargain.current_offer
                
        return g_dict

    @staticmethod
    async def delete_gadget(gadget_id: str, seller: User, session: AsyncSession) -> dict:
        result = await session.execute(select(Gadget).where(Gadget.id == gadget_id))
        gadget = result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found")
        if gadget.seller_id != seller.id:
            raise HTTPException(status_code=403, detail="You can only delete your own listings")

        gadget.is_active = False
        gadget.updated_at = datetime.utcnow()
        session.add(gadget)
        await session.commit()
        return {"message": "Gadget deleted successfully", "gadget_id": gadget_id}
