from datetime import datetime

from pydantic import BaseModel


class QuoteIn(BaseModel):
    quote: str
    author: str = "Unknown"
    language: str = "en"


class QuoteOut(BaseModel):
    id: int
    quote: str
    author: str
    language: str
    created_at: datetime

    model_config = {"from_attributes": True}
