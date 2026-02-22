from typing import Optional

from pydantic import BaseModel


class QuoteResponse(BaseModel):
    quote: str
    author: str
    language: str = "en"


class FilteredQuoteResponse(BaseModel):
    quote: str
    author: str
    language: str = "en"
    mood: Optional[str] = None
    topic: Optional[str] = None


class SearchResult(BaseModel):
    quote: str
    author: str
    language: str = "en"
    mood: Optional[str] = None
    topic: Optional[str] = None
