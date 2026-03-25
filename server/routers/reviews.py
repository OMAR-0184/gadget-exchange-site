from fastapi import APIRouter, Depends, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from server.core.dependencies import get_session, get_current_user
from server.models.user import User
from server.schemas.review import ReviewCreate, ReviewRead, ReviewList
from server.services import review_services

router = APIRouter(tags=["Reviews"])

@router.post("/", response_model=ReviewRead, status_code=201)
async def create_review(
    review_in: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """
    Create a new review for a gadget you have purchased.
    The order must be marked as 'delivered'.
    """
    review = await review_services.create_review(db=db, reviewer_id=current_user.id, review_in=review_in)
    
    # reviewer_name is manually injected for the response
    r_dict = review.model_dump()
    r_dict["reviewer_name"] = current_user.full_name
    return ReviewRead(**r_dict)

@router.get("/gadget/{gadget_id}", response_model=ReviewList)
async def get_gadget_reviews(
    gadget_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all reviews for a specific gadget.
    """
    reviews, total = await review_services.get_gadget_reviews(db=db, gadget_id=gadget_id, skip=skip, limit=limit)
    return {"items": reviews, "total_count": total}

@router.get("/seller/{seller_id}", response_model=ReviewList)
async def get_seller_reviews(
    seller_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_session)
):
    """
    Get all reviews for gadgets sold by a specific seller.
    """
    reviews, total = await review_services.get_seller_reviews(db=db, seller_id=seller_id, skip=skip, limit=limit)
    return {"items": reviews, "total_count": total}
