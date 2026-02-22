"""
Quote endpoints
  GET /api/quotes/random          — random English quote from multiple internet sources
  GET /api/quotes/urdu/random     — random quote from built-in Urdu list
  GET /api/quotes/filtered        — random quote filtered by mood/topic/language/author
  GET /api/quotes/authors         — distinct author names (optionally filtered by language)
  GET /api/quotes/search          — full-text + tag search across DB and Urdu list

External sources used by /random (no API keys required):
  • DummyJSON      — https://dummyjson.com/quotes/random
  • ZenQuotes      — https://zenquotes.io/api/random
  • Quotable.io    — https://api.quotable.io/random
  • Stoic Quotes   — https://stoicquotesapi.com/v1/api/quotes/random
  • QuoteGarden    — https://quote-garden.onrender.com/api/v3/quotes/random
  • Forismatic     — https://forismatic.com/api/1.0/?method=getQuote&lang=en&format=json
  • Type.fit       — https://type.fit/api/quotes  (picks a random quote from 1 600+ entries)
  • FavQs QOD      — https://favqs.com/api/qotd
  • Kanye.rest     — https://api.kanye.rest/
"""
import random
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database.db import QuoteModel, get_db
from models.quote import FilteredQuoteResponse, QuoteResponse, SearchResult

router = APIRouter()


# ── Built-in Urdu quotes ──────────────────────────────────────────────────────
URDU_QUOTES: list[dict] = [
    {"quote": "اپنے دشمنوں کو معاف کر دو مگر ان کے نام کبھی مت بھولو۔",             "author": "جان ایف کینیڈی"},
    {"quote": "ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے۔",                         "author": "مرزا غالب"},
    {"quote": "جو ہمت کرتا ہے وہی کامیابی پاتا ہے۔",                                  "author": "علامہ اقبال"},
    {"quote": "انسان وہی ہے جو انسانیت کے کام آئے۔",                                  "author": "عبدالستار ایدھی"},
    {"quote": "امید وہ روشنی ہے جو اندھیرے میں بھی راستہ دکھاتی ہے۔",                "author": "نامعلوم"},
    {"quote": "حاصلِ زندگی کیا ہے؟ ایک مسکراہٹ اور سکون۔",                           "author": "اشفاق احمد"},
    {"quote": "خواب وہ نہیں جو آنکھ بند کرنے سے آئیں، خواب وہ ہیں جو آنکھ کھلی رکھیں۔", "author": "اے پی جے عبدالکلام"},
    {"quote": "اگر آپ اچھے خیالات رکھتے ہیں تو آپ کے چہرے پر بھی اچھائی جھلکے گی۔", "author": "رولڈ ڈاہل"},
    {"quote": "کامیاب لوگ وہ ہیں جو ناکامی سے اٹھے ہوں۔",                            "author": "نامعلوم"},
    {"quote": "زندگی مختصر ہے، اسے اچھے کاموں میں گزارو۔",                          "author": "حضرت علیؓ"},
    {"quote": "جو دوسروں کے لیے جیتا ہے، وہی اصل میں جیتا ہے۔",                    "author": "علامہ اقبال"},
    {"quote": "علم حاصل کرو، خواہ چین جانا پڑے۔",                                    "author": "حضرت محمد ﷺ"},
]


# ── External quote source fetchers ────────────────────────────────────────────
# Each fetcher accepts an active httpx.AsyncClient and returns {"quote": str, "author": str}.
# Any exception (network error, bad JSON, missing key) propagates so the caller can skip it.

async def _from_dummyjson(client: httpx.AsyncClient) -> dict:
    """DummyJSON — https://dummyjson.com/quotes/random"""
    resp = await client.get("https://dummyjson.com/quotes/random")
    resp.raise_for_status()
    d = resp.json()
    return {"quote": d["quote"], "author": d.get("author") or "Unknown"}


async def _from_zenquotes(client: httpx.AsyncClient) -> dict:
    """ZenQuotes — https://zenquotes.io/api/random  →  [{q, a, h}]"""
    resp = await client.get("https://zenquotes.io/api/random")
    resp.raise_for_status()
    item = resp.json()[0]
    author = item.get("a") or "Unknown"
    # ZenQuotes uses "zenquotes.io" as author for anonymous quotes
    if author.lower() in ("", "unknown", "zenquotes.io"):
        author = "Unknown"
    return {"quote": item["q"], "author": author}


async def _from_quotable(client: httpx.AsyncClient) -> dict:
    """Quotable.io — https://api.quotable.io/random  →  {content, author, ...}"""
    resp = await client.get("https://api.quotable.io/random")
    resp.raise_for_status()
    d = resp.json()
    return {"quote": d["content"], "author": d.get("author") or "Unknown"}


async def _from_stoic(client: httpx.AsyncClient) -> dict:
    """Stoic Quotes — https://stoicquotesapi.com/v1/api/quotes/random  →  {body, author}"""
    resp = await client.get("https://stoicquotesapi.com/v1/api/quotes/random")
    resp.raise_for_status()
    d = resp.json()
    return {"quote": d["body"], "author": d.get("author") or "Unknown"}


async def _from_quotegarden(client: httpx.AsyncClient) -> dict:
    """QuoteGarden — https://quote-garden.onrender.com/api/v3/quotes/random
    Response: {data: [{quoteText, quoteAuthor, quoteGenre}]}
    """
    resp = await client.get("https://quote-garden.onrender.com/api/v3/quotes/random")
    resp.raise_for_status()
    item = resp.json()["data"][0]
    author = (item.get("quoteAuthor") or "").strip() or "Unknown"
    return {"quote": item["quoteText"].strip(), "author": author}


async def _from_forismatic(client: httpx.AsyncClient) -> dict:
    """Forismatic — https://forismatic.com/api/1.0/?method=getQuote&lang=en&format=json
    Response: {quoteText, quoteAuthor, ...}
    """
    resp = await client.get(
        "https://forismatic.com/api/1.0/",
        params={"method": "getQuote", "lang": "en", "format": "json"},
    )
    resp.raise_for_status()
    d = resp.json()
    quote = d.get("quoteText", "").strip().strip('"').strip()
    author = (d.get("quoteAuthor") or "").strip() or "Unknown"
    if not quote:
        raise ValueError("Empty quote from Forismatic")
    return {"quote": quote, "author": author}


async def _from_typefit(client: httpx.AsyncClient) -> dict:
    """Type.fit — https://type.fit/api/quotes
    Returns the full collection (~1 600 quotes) as a JSON array; we pick one at random.
    Response items: {text, author}
    """
    resp = await client.get("https://type.fit/api/quotes")
    resp.raise_for_status()
    quotes = resp.json()
    item = random.choice(quotes)
    quote = (item.get("text") or "").strip()
    # Authors sometimes carry a trailing ", " artifact from the data source
    author = (item.get("author") or "").strip().rstrip(",").strip() or "Unknown"
    if not quote:
        raise ValueError("Empty quote from Type.fit")
    return {"quote": quote, "author": author}


async def _from_favqs(client: httpx.AsyncClient) -> dict:
    """FavQs Quote of the Day — https://favqs.com/api/qotd
    Response: {quote: {body, author, ...}}
    """
    resp = await client.get("https://favqs.com/api/qotd")
    resp.raise_for_status()
    q = resp.json()["quote"]
    author = (q.get("author") or "").strip() or "Unknown"
    return {"quote": q["body"].strip(), "author": author}


async def _from_kanye(client: httpx.AsyncClient) -> dict:
    """Kanye.rest — https://api.kanye.rest/
    Response: {"quote": "..."}  — Kanye West quotes
    """
    resp = await client.get("https://api.kanye.rest/")
    resp.raise_for_status()
    return {"quote": resp.json()["quote"].strip(), "author": "Kanye West"}


# Ordered list of all sources — shuffled per request so load spreads evenly
_QUOTE_SOURCES = [
    _from_dummyjson,
    _from_zenquotes,
    _from_quotable,
    _from_stoic,
    _from_quotegarden,
    _from_forismatic,
    _from_typefit,
    _from_favqs,
    _from_kanye,
]


# ── English quote (multi-source) ──────────────────────────────────────────────
@router.get("/random", response_model=QuoteResponse, summary="Random English quote")
async def get_random_english_quote(
    exclude: Optional[str] = Query(None, description="Quote text to avoid repeating"),
) -> QuoteResponse:
    """
    Fetch a random English quote by trying multiple external APIs in random order.
    Falls back to the next source automatically if one is unreachable or returns an error.
    Returns the first quote that differs from `exclude`; if all quotes match `exclude`,
    returns the last successfully fetched one anyway.
    """
    sources = list(_QUOTE_SOURCES)
    random.shuffle(sources)

    async with httpx.AsyncClient(timeout=8.0) as client:
        last_good: dict | None = None

        for fetcher in sources:
            try:
                data = await fetcher(client)
                last_good = data
                if not exclude or data["quote"] != exclude:
                    return QuoteResponse(
                        quote=data["quote"],
                        author=data["author"],
                        language="en",
                    )
            except Exception:
                # This source is down or returned unexpected data — try the next one
                continue

        # Every reachable source returned the excluded quote; return it anyway
        if last_good:
            return QuoteResponse(
                quote=last_good["quote"],
                author=last_good["author"],
                language="en",
            )

        raise HTTPException(
            status_code=503,
            detail="All quote sources are currently unavailable. Please try again shortly.",
        )


# ── Urdu quote ────────────────────────────────────────────────────────────────
@router.get("/urdu/random", response_model=QuoteResponse, summary="Random Urdu quote")
def get_random_urdu_quote(
    exclude: Optional[str] = Query(None, description="Comma-separated quote texts to exclude"),
) -> QuoteResponse:
    """Return a random Urdu quote, skipping all excluded texts when alternatives exist."""
    exclude_set = {t.strip() for t in exclude.split(",")} if exclude else set()
    pool = [q for q in URDU_QUOTES if q["quote"] not in exclude_set] if exclude_set else URDU_QUOTES
    if not pool:
        pool = URDU_QUOTES  # Fallback: all quotes were excluded
    q = random.choice(pool)
    return QuoteResponse(quote=q["quote"], author=q["author"], language="ur")


# ── Filtered random quote (queries seeded DB) ─────────────────────────────────
@router.get("/filtered", response_model=FilteredQuoteResponse, summary="Filtered random quote")
def get_filtered_quote(
    language: Optional[str] = Query(None, description="'en' or 'ur'"),
    mood:     Optional[str] = Query(None, description="happy|sad|motivational|inspiring|peaceful|funny"),
    topic:    Optional[str] = Query(None, description="love|life|success|wisdom|friendship|education|faith|nature"),
    author:   Optional[str] = Query(None, description="Exact author name"),
    exclude:  Optional[str] = Query(None, description="Comma-separated quote texts to exclude"),
    db: Session = Depends(get_db),
) -> FilteredQuoteResponse:
    """Return a random quote from the seeded DB matching all provided filters (AND logic)."""
    q = db.query(QuoteModel)
    if language: q = q.filter(QuoteModel.language == language)
    if mood:     q = q.filter(QuoteModel.mood     == mood)
    if topic:    q = q.filter(QuoteModel.topic    == topic)
    if author:   q = q.filter(QuoteModel.author   == author)
    results = q.all()
    if not results:
        raise HTTPException(
            status_code=404,
            detail="No quotes found for the selected filters. Try a different combination.",
        )
    # Exclude all recently shown quotes; fallback to full pool only if all are excluded
    exclude_set = {t.strip() for t in exclude.split(",")} if exclude else set()
    pool = [r for r in results if r.quote not in exclude_set] if exclude_set else results
    if not pool:
        pool = results
    row = random.choice(pool)
    return FilteredQuoteResponse(
        quote=row.quote,
        author=row.author,
        language=row.language,
        mood=row.mood,
        topic=row.topic,
    )


# ── Author list ───────────────────────────────────────────────────────────────
@router.get("/authors", response_model=List[str], summary="Distinct author names")
def get_authors(
    language: Optional[str] = Query(None, description="Filter authors by language ('en' or 'ur')"),
    db: Session = Depends(get_db),
) -> List[str]:
    """Return sorted list of distinct author names from the seeded quotes collection."""
    q = db.query(QuoteModel.author).distinct()
    if language:
        q = q.filter(QuoteModel.language == language)
    return [row[0] for row in q.order_by(QuoteModel.author).all()]


# ── Search ────────────────────────────────────────────────────────────────────
@router.get("/search", response_model=List[SearchResult], summary="Search quotes")
def search_quotes(
    q:        str            = Query("",   description="Keyword or quote text to search"),
    language: Optional[str] = Query(None, description="'en' or 'ur'"),
    tag:      Optional[str] = Query(None, description="mood or topic tag (e.g. success, love)"),
    limit:    int           = Query(20,   ge=1, le=50, description="Max results to return"),
    db: Session = Depends(get_db),
) -> List[SearchResult]:
    """
    Full-text and tag-based quote search.

    - q: searches quote text AND author name (case-insensitive LIKE).
    - tag: matches mood OR topic field.
    - language: restricts to 'en' or 'ur'.
    - Returns up to `limit` results; exact/prefix quote matches appear first.
    - Also searches the in-memory Urdu list when language is 'ur' or unset.
    """
    q_stripped = q.strip()
    q_lower    = q_stripped.lower()

    # Require at least one filter to avoid returning the whole database
    if not q_lower and not tag:
        return []

    results: list[SearchResult] = []

    # ── DB search (English + any Urdu rows seeded in DB) ───────────────────────
    db_query = db.query(QuoteModel)

    if language:
        db_query = db_query.filter(QuoteModel.language == language)

    if tag:
        db_query = db_query.filter(
            or_(QuoteModel.mood == tag, QuoteModel.topic == tag)
        )

    if q_lower:
        db_query = db_query.filter(
            or_(
                func.lower(QuoteModel.quote).contains(q_lower),
                func.lower(QuoteModel.author).contains(q_lower),
            )
        )

    db_rows = db_query.limit(limit).all()

    # Exact quote-text matches first, then partial matches
    exact   = [r for r in db_rows if r.quote.lower() == q_lower]
    partial = [r for r in db_rows if r.quote.lower() != q_lower]

    for row in exact + partial:
        results.append(
            SearchResult(
                quote=row.quote,
                author=row.author,
                language=row.language,
                mood=row.mood,
                topic=row.topic,
            )
        )

    # ── In-memory Urdu list (only if searching Urdu or no language filter) ─────
    if language in (None, "ur") and not tag and q_lower:
        for uq in URDU_QUOTES:
            if (
                q_lower in uq["quote"].lower()
                or q_lower in uq["author"].lower()
            ):
                # Avoid duplicates already found in DB
                if not any(r.quote == uq["quote"] for r in results):
                    results.append(
                        SearchResult(
                            quote=uq["quote"],
                            author=uq["author"],
                            language="ur",
                        )
                    )

    return results[:limit]

