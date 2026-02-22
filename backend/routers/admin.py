"""
backend/routers/admin.py
Admin-only API endpoints protected by a separate admin JWT.

POST /api/admin/login                     — authenticate with ADMIN_PASSWORD → admin JWT
GET  /api/admin/stats                     — overview stat cards
GET  /api/admin/charts/registrations      — user sign-ups per day (last N days)
GET  /api/admin/charts/saved-activity     — saved quotes per day (last N days)
GET  /api/admin/charts/top-authors        — top N most-saved authors
GET  /api/admin/charts/moods              — mood distribution in quotes DB
GET  /api/admin/charts/topics             — topic distribution in quotes DB
GET  /api/admin/users                     — paginated user list
GET  /api/admin/quotes                    — paginated DB quotes
POST /api/admin/quotes                    — add quote to DB
DELETE /api/admin/quotes/{id}             — delete quote from DB
GET  /api/admin/contact                   — paginated contact messages
PATCH /api/admin/contact/{id}/read        — mark message as read
DELETE /api/admin/contact/{id}            — delete contact message
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import core.config as cfg
from core.security import decode_token, hash_password
from database.db import (
    ContactMessageModel,
    LikedQuoteModel,
    QuoteModel,
    SavedQuoteModel,
    UserModel,
    get_db,
)

router = APIRouter()
_bearer = HTTPBearer(auto_error=True)


# ── Admin JWT helpers ──────────────────────────────────────────────────────────

def _create_admin_token() -> str:
    from jose import jwt as jose_jwt
    payload = {
        "type": "admin",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(hours=cfg.ADMIN_TOKEN_EXPIRE_HOURS),
    }
    return jose_jwt.encode(payload, cfg.SECRET_KEY, algorithm=cfg.ALGORITHM)


def require_admin(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> None:
    """FastAPI dependency — raises 403 if the Bearer token is not a valid admin token."""
    try:
        payload = decode_token(creds.credentials)
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid or expired admin token.")
    if payload.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Not an admin token.")


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StatsOut(BaseModel):
    total_users: int
    verified_users: int
    google_users: int
    local_users: int
    new_users_today: int
    new_users_week: int
    total_quotes_db: int
    total_saved_quotes: int
    total_liked_quotes: int
    total_contact_messages: int
    unread_contact_messages: int


class QuoteIn(BaseModel):
    quote: str
    author: str = "Unknown"
    language: str = "en"
    mood: Optional[str] = None
    topic: Optional[str] = None


class QuoteOut(BaseModel):
    id: int
    quote: str
    author: str
    language: str
    mood: Optional[str]
    topic: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class UserAdminOut(BaseModel):
    id: int
    username: str
    email: str
    provider: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    saved_count: int
    liked_count: int


class ContactOut(BaseModel):
    id: int
    name: str
    email: str
    subject: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserResetPasswordIn(BaseModel):
    new_password: str


class AdminChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


# ── .env updater ───────────────────────────────────────────────────────────────

def _update_env_password(new_password: str) -> None:
    """Best-effort: write the new ADMIN_PASSWORD back into the .env file."""
    import os, re
    env_path = os.path.realpath(
        os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    )
    if not os.path.isfile(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
        if re.search(r"^ADMIN_PASSWORD=", content, re.MULTILINE):
            content = re.sub(
                r"^ADMIN_PASSWORD=.*$",
                f"ADMIN_PASSWORD={new_password}",
                content,
                flags=re.MULTILINE,
            )
        else:
            content += f"\nADMIN_PASSWORD={new_password}\n"
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(content)
    except Exception:
        pass  # Memory update is authoritative; .env persistence is best-effort


# ── Auth ───────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AdminTokenOut, summary="Admin login")
def admin_login(body: AdminLoginIn):
    """Validate ADMIN_USERNAME + ADMIN_PASSWORD and return a short-lived admin JWT."""
    if body.username != cfg.ADMIN_USERNAME or body.password != cfg.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return AdminTokenOut(access_token=_create_admin_token())


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=StatsOut, summary="Admin overview stats",
            dependencies=[Depends(require_admin)])
def admin_stats(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=7)

    total_users    = db.query(func.count(UserModel.id)).scalar() or 0
    verified_users = db.query(func.count(UserModel.id)).filter(UserModel.is_verified == True).scalar() or 0
    google_users   = db.query(func.count(UserModel.id)).filter(UserModel.provider == "google").scalar() or 0
    local_users    = db.query(func.count(UserModel.id)).filter(UserModel.provider == "local").scalar() or 0
    new_today      = db.query(func.count(UserModel.id)).filter(UserModel.created_at >= today_start).scalar() or 0
    new_week       = db.query(func.count(UserModel.id)).filter(UserModel.created_at >= week_start).scalar() or 0

    total_quotes_db     = db.query(func.count(QuoteModel.id)).scalar() or 0
    total_saved_quotes  = db.query(func.count(SavedQuoteModel.id)).scalar() or 0
    total_liked_quotes  = db.query(func.count(LikedQuoteModel.id)).scalar() or 0

    total_contact   = db.query(func.count(ContactMessageModel.id)).scalar() or 0
    unread_contact  = db.query(func.count(ContactMessageModel.id)).filter(ContactMessageModel.is_read == False).scalar() or 0

    return StatsOut(
        total_users=total_users,
        verified_users=verified_users,
        google_users=google_users,
        local_users=local_users,
        new_users_today=new_today,
        new_users_week=new_week,
        total_quotes_db=total_quotes_db,
        total_saved_quotes=total_saved_quotes,
        total_liked_quotes=total_liked_quotes,
        total_contact_messages=total_contact,
        unread_contact_messages=unread_contact,
    )


# ── Charts ─────────────────────────────────────────────────────────────────────

def _date_series(days: int):
    """Return a dict { 'YYYY-MM-DD': 0 } for the last `days` days."""
    today = datetime.now(timezone.utc).date()
    return {str(today - timedelta(days=i)): 0 for i in range(days - 1, -1, -1)}


@router.get("/charts/registrations", summary="User registrations per day",
            dependencies=[Depends(require_admin)])
def chart_registrations(days: int = Query(30, ge=7, le=90), db: Session = Depends(get_db)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(UserModel.created_at).filter(UserModel.created_at >= cutoff).all()
    series = _date_series(days)
    for (dt,) in rows:
        key = str(dt.date()) if hasattr(dt, "date") else dt[:10]
        if key in series:
            series[key] += 1
    return [{"date": d, "count": c} for d, c in series.items()]


@router.get("/charts/saved-activity", summary="Saved quotes per day",
            dependencies=[Depends(require_admin)])
def chart_saved_activity(days: int = Query(30, ge=7, le=90), db: Session = Depends(get_db)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.query(SavedQuoteModel.created_at).filter(SavedQuoteModel.created_at >= cutoff).all()
    series = _date_series(days)
    for (dt,) in rows:
        key = str(dt.date()) if hasattr(dt, "date") else dt[:10]
        if key in series:
            series[key] += 1
    return [{"date": d, "count": c} for d, c in series.items()]


@router.get("/charts/top-authors", summary="Top saved authors",
            dependencies=[Depends(require_admin)])
def chart_top_authors(limit: int = Query(10, ge=3, le=25), db: Session = Depends(get_db)):
    rows = (
        db.query(SavedQuoteModel.author, func.count(SavedQuoteModel.id).label("cnt"))
        .group_by(SavedQuoteModel.author)
        .order_by(func.count(SavedQuoteModel.id).desc())
        .limit(limit)
        .all()
    )
    return [{"author": r.author, "count": r.cnt} for r in rows]


@router.get("/charts/moods", summary="Mood distribution in quotes DB",
            dependencies=[Depends(require_admin)])
def chart_moods(db: Session = Depends(get_db)):
    rows = (
        db.query(QuoteModel.mood, func.count(QuoteModel.id).label("cnt"))
        .filter(QuoteModel.mood.isnot(None))
        .group_by(QuoteModel.mood)
        .order_by(func.count(QuoteModel.id).desc())
        .all()
    )
    return [{"mood": r.mood, "count": r.cnt} for r in rows]


@router.get("/charts/topics", summary="Topic distribution in quotes DB",
            dependencies=[Depends(require_admin)])
def chart_topics(db: Session = Depends(get_db)):
    rows = (
        db.query(QuoteModel.topic, func.count(QuoteModel.id).label("cnt"))
        .filter(QuoteModel.topic.isnot(None))
        .group_by(QuoteModel.topic)
        .order_by(func.count(QuoteModel.id).desc())
        .all()
    )
    return [{"topic": r.topic, "count": r.cnt} for r in rows]


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users", summary="Paginated user list",
            dependencies=[Depends(require_admin)])
def admin_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(UserModel)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(UserModel.username.ilike(term), UserModel.email.ilike(term)))
    total = q.count()
    users = q.order_by(UserModel.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for u in users:
        saved_count = db.query(func.count(SavedQuoteModel.id)).filter(SavedQuoteModel.user_id == u.id).scalar() or 0
        liked_count = db.query(func.count(LikedQuoteModel.id)).filter(LikedQuoteModel.user_id == u.id).scalar() or 0
        result.append(UserAdminOut(
            id=u.id, username=u.username, email=u.email,
            provider=u.provider, is_verified=u.is_verified, is_active=u.is_active,
            created_at=u.created_at, saved_count=saved_count, liked_count=liked_count,
        ))

    return {"users": result, "total": total, "page": page, "pages": max(1, -(-total // limit))}


@router.post("/users/{user_id}/reset-password", summary="Reset a user's password",
             dependencies=[Depends(require_admin)])
def admin_reset_user_password(
    user_id: int, body: UserResetPasswordIn, db: Session = Depends(get_db)
):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.provider != "local":
        raise HTTPException(
            status_code=400,
            detail="Cannot set a password for Google (OAuth) accounts.",
        )
    if len(body.new_password) < 6:
        raise HTTPException(
            status_code=400, detail="Password must be at least 6 characters."
        )
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"ok": True, "message": "Password reset successfully."}


@router.patch("/users/{user_id}/toggle-active", summary="Toggle user active status",
              dependencies=[Depends(require_admin)])
def admin_toggle_user_active(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = not user.is_active
    db.commit()
    return {"ok": True, "is_active": user.is_active}


# ── Admin settings ─────────────────────────────────────────────────────────────

@router.post("/change-password", summary="Change admin panel password",
             dependencies=[Depends(require_admin)])
def admin_change_password(body: AdminChangePasswordIn):
    if body.current_password != cfg.ADMIN_PASSWORD:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="New password must be at least 8 characters."
        )
    cfg.ADMIN_PASSWORD = body.new_password
    _update_env_password(body.new_password)
    return {"ok": True, "message": "Admin password updated successfully."}


# ── Quotes DB ──────────────────────────────────────────────────────────────────

@router.get("/quotes", summary="Paginated DB quotes",
            dependencies=[Depends(require_admin)])
def admin_quotes(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(QuoteModel)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(QuoteModel.quote.ilike(term), QuoteModel.author.ilike(term)))
    if language:
        q = q.filter(QuoteModel.language == language)
    if mood:
        q = q.filter(QuoteModel.mood == mood)
    if topic:
        q = q.filter(QuoteModel.topic == topic)
    total = q.count()
    quotes = q.order_by(QuoteModel.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"quotes": [QuoteOut.model_validate(qt) for qt in quotes], "total": total, "page": page, "pages": max(1, -(-total // limit))}


@router.post("/quotes", response_model=QuoteOut, status_code=201,
             summary="Add quote to DB", dependencies=[Depends(require_admin)])
def admin_add_quote(body: QuoteIn, db: Session = Depends(get_db)):
    qt = QuoteModel(**body.model_dump())
    db.add(qt)
    db.commit()
    db.refresh(qt)
    return QuoteOut.model_validate(qt)


@router.delete("/quotes/{quote_id}", summary="Delete quote from DB",
               dependencies=[Depends(require_admin)])
def admin_delete_quote(quote_id: int, db: Session = Depends(get_db)):
    qt = db.query(QuoteModel).filter(QuoteModel.id == quote_id).first()
    if not qt:
        raise HTTPException(status_code=404, detail="Quote not found.")
    db.delete(qt)
    db.commit()
    return {"ok": True}


# ── Contact Messages ───────────────────────────────────────────────────────────

@router.get("/contact", summary="Paginated contact messages",
            dependencies=[Depends(require_admin)])
def admin_contact(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
):
    q = db.query(ContactMessageModel)
    if unread_only:
        q = q.filter(ContactMessageModel.is_read == False)
    total = q.count()
    unread_count = db.query(func.count(ContactMessageModel.id)).filter(ContactMessageModel.is_read == False).scalar() or 0
    msgs = q.order_by(ContactMessageModel.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "messages": [ContactOut.model_validate(m) for m in msgs],
        "total": total,
        "unread_count": unread_count,
        "page": page,
        "pages": max(1, -(-total // limit)),
    }


@router.patch("/contact/{msg_id}/read", response_model=ContactOut,
              summary="Mark contact message as read", dependencies=[Depends(require_admin)])
def admin_mark_read(msg_id: int, db: Session = Depends(get_db)):
    msg = db.query(ContactMessageModel).filter(ContactMessageModel.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    msg.is_read = True
    db.commit()
    db.refresh(msg)
    return ContactOut.model_validate(msg)


@router.delete("/contact/{msg_id}", summary="Delete contact message",
               dependencies=[Depends(require_admin)])
def admin_delete_contact(msg_id: int, db: Session = Depends(get_db)):
    msg = db.query(ContactMessageModel).filter(ContactMessageModel.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    db.delete(msg)
    db.commit()
    return {"ok": True}
