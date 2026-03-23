from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from server.models.chat import ChatMessage


class ChatService:
    @staticmethod
    async def save_message(
        gadget_id: str,
        sender_id: str,
        receiver_id: str,
        message: str,
        session: AsyncSession,
    ) -> ChatMessage:
        msg = ChatMessage(
            gadget_id=gadget_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
        )
        session.add(msg)
        await session.commit()
        await session.refresh(msg)
        return msg

    @staticmethod
    async def get_history(
        gadget_id: str,
        user_id: str,
        other_user_id: str,
        session: AsyncSession,
    ) -> list[ChatMessage]:
        result = await session.execute(
            select(ChatMessage)
            .where(
                ChatMessage.gadget_id == gadget_id,
                (
                    (ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == other_user_id)
                ) | (
                    (ChatMessage.sender_id == other_user_id) & (ChatMessage.receiver_id == user_id)
                ),
            )
            .order_by(ChatMessage.created_at.asc())
        )
        return list(result.scalars().all())
