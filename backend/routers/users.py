"""
backend/routers/users.py
User-specific endpoints (all require JWT auth):
  GET    /api/users/me
  GET    /api/users/saved-quotes
  POST   /api/users/saved-quotes
  DELETE /api/users/saved-quotes/{id}
  GET    /api/users/liked-quotes
  POST   /api/users/liked-quotes
  DELETE /api/users/liked-quotes/{id}
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from database.db import LikedQuoteModel, SavedQuoteModel, UserModel, get_db
from models.saved_quote import QuoteIn, QuoteOut
from models.user import UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut, summary="Current user profile")
def get_me(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """Return the currently authenticated user's profile."""
    return current_user


# ── Saved Quotes ──────────────────────────────────────────────────────────────

@router.get("/saved-quotes", response_model=List[QuoteOut], summary="List saved quotes")
def list_saved(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[QuoteOut]:
    """Return all of the authenticated user's saved quotes (newest first)."""
    return (
        db.query(SavedQuoteModel)
        .filter(SavedQuoteModel.user_id == current_user.id)
        .order_by(SavedQuoteModel.created_at.desc())
        .all()
    )


@router.post(
    "/saved-quotes",
    response_model=QuoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save a quote",
)
def add_saved(
    payload: QuoteIn,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuoteOut:
    """
    Save a quote to the authenticated user's collection.
    Returns the existing record if the same quote+author combination already exists.
    """
    existing = (
        db.query(SavedQuoteModel)
        .filter(
            SavedQuoteModel.user_id == current_user.id,
            SavedQuoteModel.quote   == payload.quote,
            SavedQuoteModel.author  == payload.author,
        )
        .first()
    )
    if existing:
        return existing

    sq = SavedQuoteModel(user_id=current_user.id, **payload.model_dump())
    db.add(sq)
    db.commit()
    db.refresh(sq)
    return sq


@router.delete(
    "/saved-quotes/{sq_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a saved quote",
)
def remove_saved(
    sq_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a saved quote (must belong to the authenticated user)."""
    sq = (
        db.query(SavedQuoteModel)
        .filter(SavedQuoteModel.id == sq_id, SavedQuoteModel.user_id == current_user.id)
        .first()
    )
    if not sq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Saved quote with id={sq_id} not found.",
        )
    db.delete(sq)
    db.commit()


# ── Liked Quotes ──────────────────────────────────────────────────────────────

@router.get("/liked-quotes", response_model=List[QuoteOut], summary="List liked quotes")
def list_liked(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[QuoteOut]:
    """Return all of the authenticated user's liked quotes (newest first)."""
    return (
        db.query(LikedQuoteModel)
        .filter(LikedQuoteModel.user_id == current_user.id)
        .order_by(LikedQuoteModel.created_at.desc())
        .all()
    )


@router.post(
    "/liked-quotes",
    response_model=QuoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Like a quote",
)
def add_liked(
    payload: QuoteIn,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> QuoteOut:
    """
    Like a quote. Returns the existing record if already liked.
    """
    existing = (
        db.query(LikedQuoteModel)
        .filter(
            LikedQuoteModel.user_id == current_user.id,
            LikedQuoteModel.quote   == payload.quote,
            LikedQuoteModel.author  == payload.author,
        )
        .first()
    )
    if existing:
        return existing

    lq = LikedQuoteModel(user_id=current_user.id, **payload.model_dump())
    db.add(lq)
    db.commit()
    db.refresh(lq)
    return lq


@router.delete(
    "/liked-quotes/{lq_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlike a quote",
)
def remove_liked(
    lq_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Remove a liked quote (must belong to the authenticated user)."""
    lq = (
        db.query(LikedQuoteModel)
        .filter(LikedQuoteModel.id == lq_id, LikedQuoteModel.user_id == current_user.id)
        .first()
    )
    if not lq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Liked quote with id={lq_id} not found.",
        )
    db.delete(lq)
    db.commit()
