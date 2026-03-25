from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
from fastapi import HTTPException, status
from server.models.review import Review
from server.models.order import Order
from server.schemas.review import ReviewCreate, ReviewRead
from server.models.user import User

async def create_review(db: AsyncSession, reviewer_id: str, review_in: ReviewCreate) -> Review:
    # Check if order exists and belongs to user
    order = await db.get(Order, review_in.order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.buyer_id != reviewer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only review your own orders")
    if order.status != "delivered":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can only review delivered orders")

    # Check if a review already exists for this order+gadget
    query = select(Review).where(Review.order_id == review_in.order_id, Review.gadget_id == review_in.gadget_id)
    result = await db.execute(query)
    existing_review = result.scalars().first()
    if existing_review:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review already exists for this gadget from this order")
        
    review = Review(
        reviewer_id=reviewer_id,
        gadget_id=review_in.gadget_id,
        order_id=review_in.order_id,
        rating=review_in.rating,
        comment=review_in.comment
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review

async def get_gadget_reviews(db: AsyncSession, gadget_id: str, skip: int = 0, limit: int = 20) -> tuple[list[ReviewRead], int]:
    query = select(Review, User.full_name.label("reviewer_name")).join(User, Review.reviewer_id == User.id).where(Review.gadget_id == gadget_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    
    rows = result.all()
    reviews = []
    for review, reviewer_name in rows:
        r_dict = review.model_dump()
        r_dict["reviewer_name"] = reviewer_name
        reviews.append(ReviewRead(**r_dict))
        
    count_query = select(func.count(Review.id)).where(Review.gadget_id == gadget_id)
    total_result = await db.execute(count_query)
    total_count = total_result.scalar_one()
    
    return reviews, total_count

async def get_seller_reviews(db: AsyncSession, seller_id: str, skip: int = 0, limit: int = 20) -> tuple[list[ReviewRead], int]:
    from server.models.gadget import Gadget
    
    query = (
        select(Review, User.full_name.label("reviewer_name"))
        .join(User, Review.reviewer_id == User.id)
        .join(Gadget, Review.gadget_id == Gadget.id)
        .where(Gadget.seller_id == seller_id)
    )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    
    rows = result.all()
    reviews = []
    for review, reviewer_name in rows:
        r_dict = review.model_dump()
        r_dict["reviewer_name"] = reviewer_name
        reviews.append(ReviewRead(**r_dict))
        
    count_query = (
        select(func.count(Review.id))
        .join(Gadget, Review.gadget_id == Gadget.id)
        .where(Gadget.seller_id == seller_id)
    )
    total_result = await db.execute(count_query)
    total_count = total_result.scalar_one()
    
    return reviews, total_count
