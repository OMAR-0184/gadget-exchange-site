from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from fastapi import HTTPException
from datetime import datetime
from server.models.bargain import BargainSession
from server.models.gadget import Gadget


class BargainService:
    @staticmethod
    async def get_or_create_session(
        gadget_id: str, buyer_id: str, session: AsyncSession
    ) -> BargainSession:
        """Get existing pending bargain session, or create a new one."""
        result = await session.execute(
            select(BargainSession).where(
                BargainSession.gadget_id == gadget_id,
                BargainSession.buyer_id == buyer_id,
                BargainSession.status.in_(["pending", "countered"]),
            )
        )
        bargain = result.scalar_one_or_none()
        if bargain:
            return bargain

        # Fetch gadget to get original price & seller
        gadget_result = await session.execute(
            select(Gadget).where(Gadget.id == gadget_id, Gadget.is_active == True)
        )
        gadget = gadget_result.scalar_one_or_none()
        if not gadget:
            raise HTTPException(status_code=404, detail="Gadget not found")
        if gadget.seller_id == buyer_id:
            raise HTTPException(status_code=400, detail="You cannot bargain on your own gadget")

        bargain = BargainSession(
            gadget_id=gadget_id,
            buyer_id=buyer_id,
            seller_id=gadget.seller_id,
            original_price=gadget.price,
            current_offer=gadget.price,
            offered_by="seller",
            status="pending",
        )
        session.add(bargain)
        await session.commit()
        await session.refresh(bargain)
        return bargain

    @staticmethod
    async def make_offer(
        bargain_id: str, price: float, user_id: str, session: AsyncSession
    ) -> BargainSession:
        result = await session.execute(
            select(BargainSession).where(BargainSession.id == bargain_id)
        )
        bargain = result.scalar_one_or_none()
        if not bargain:
            raise HTTPException(status_code=404, detail="Bargain session not found")
        if bargain.status not in ("pending", "countered"):
            raise HTTPException(status_code=400, detail=f"Bargain already {bargain.status}")
        if price <= 0:
            raise HTTPException(status_code=400, detail="Offer must be greater than 0")

        if user_id == bargain.buyer_id:
            bargain.offered_by = "buyer"
        elif user_id == bargain.seller_id:
            bargain.offered_by = "seller"
        else:
            raise HTTPException(status_code=403, detail="You are not part of this bargain")

        bargain.current_offer = price
        bargain.status = "countered"
        bargain.updated_at = datetime.utcnow()
        session.add(bargain)
        await session.commit()
        await session.refresh(bargain)
        return bargain

    @staticmethod
    async def accept_offer(
        bargain_id: str, user_id: str, session: AsyncSession
    ) -> BargainSession:
        result = await session.execute(
            select(BargainSession).where(BargainSession.id == bargain_id)
        )
        bargain = result.scalar_one_or_none()
        if not bargain:
            raise HTTPException(status_code=404, detail="Bargain session not found")
        if bargain.status not in ("pending", "countered"):
            raise HTTPException(status_code=400, detail=f"Bargain already {bargain.status}")
        if user_id not in (bargain.buyer_id, bargain.seller_id):
            raise HTTPException(status_code=403, detail="You are not part of this bargain")

        bargain.status = "accepted"
        bargain.updated_at = datetime.utcnow()

        session.add(bargain)
        await session.commit()
        await session.refresh(bargain)
        return bargain

    @staticmethod
    async def reject_offer(
        bargain_id: str, user_id: str, session: AsyncSession
    ) -> BargainSession:
        result = await session.execute(
            select(BargainSession).where(BargainSession.id == bargain_id)
        )
        bargain = result.scalar_one_or_none()
        if not bargain:
            raise HTTPException(status_code=404, detail="Bargain session not found")
        if user_id not in (bargain.buyer_id, bargain.seller_id):
            raise HTTPException(status_code=403, detail="You are not part of this bargain")

        bargain.status = "rejected"
        bargain.updated_at = datetime.utcnow()
        session.add(bargain)
        await session.commit()
        await session.refresh(bargain)
        return bargain

    @staticmethod
    async def get_sessions_for_gadget(
        gadget_id: str, session: AsyncSession
    ) -> list[BargainSession]:
        result = await session.execute(
            select(BargainSession)
            .where(BargainSession.gadget_id == gadget_id)
            .order_by(BargainSession.updated_at.desc())
        )
        return list(result.scalars().all())
