"""
Contact endpoint
  POST /api/contact — submit a contact form message
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import ContactMessageModel, get_db
from models.contact import ContactMessage, ContactResponse

router = APIRouter()


@router.post(
    "/",
    response_model=ContactResponse,
    status_code=201,
    summary="Submit contact form",
)
def submit_contact(payload: ContactMessage, db: Session = Depends(get_db)) -> ContactResponse:
    """
    Validate and persist a contact form submission.
    Pydantic validators ensure minimum field lengths before we hit the DB.
    """
    record = ContactMessageModel(**payload.model_dump())
    db.add(record)
    db.commit()
    return ContactResponse(
        success=True,
        message="Your message has been received. We'll be in touch soon!",
    )
