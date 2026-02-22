"""
Database setup — SQLAlchemy + SQLite (default).
Switch to PostgreSQL by setting DATABASE_URL in .env.
"""
import os
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, create_engine,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# ── Engine ────────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./quotegen.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Base ──────────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Utilities ─────────────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Models ────────────────────────────────────────────────────────────────────

class UserModel(Base):
    __tablename__ = "users"

    id              = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    username        = Column(String(100), unique=True, nullable=False, index=True)
    email           = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String(300), nullable=True)         # NULL for OAuth-only accounts
    provider        = Column(String(20),  nullable=False, default="local")  # "local" | "google"
    profile_picture = Column(String(500), nullable=True)
    is_verified     = Column(Boolean,     nullable=False, default=False)
    is_active       = Column(Boolean,     nullable=False, default=True)
    created_at      = Column(DateTime,    default=_now)
    updated_at      = Column(DateTime,    default=_now, onupdate=_now)


class TokenBlacklistModel(Base):
    """Stores JTIs of logged-out/revoked tokens so they cannot be reused before expiry."""
    __tablename__ = "token_blacklist"

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    jti        = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime,    default=_now)


class SavedQuoteModel(Base):
    """User's personally saved quotes (replaces the old global FavoriteModel)."""
    __tablename__ = "saved_quotes"

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    user_id    = Column(Integer,     ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    quote      = Column(Text,        nullable=False)
    author     = Column(String(200), nullable=False, default="Unknown")
    language   = Column(String(10),  nullable=False, default="en")
    created_at = Column(DateTime,    default=_now)


class LikedQuoteModel(Base):
    """User's liked quotes — separate list from saved quotes."""
    __tablename__ = "liked_quotes"

    id         = Column(Integer,     primary_key=True, autoincrement=True)
    user_id    = Column(Integer,     ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    quote      = Column(Text,        nullable=False)
    author     = Column(String(200), nullable=False, default="Unknown")
    language   = Column(String(10),  nullable=False, default="en")
    created_at = Column(DateTime,    default=_now)


class ContactMessageModel(Base):
    __tablename__ = "contact_messages"

    id         = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    name       = Column(String(100), nullable=False)
    email      = Column(String(200), nullable=False)
    subject    = Column(String(300), nullable=False)
    message    = Column(Text,        nullable=False)
    is_read    = Column(Boolean,     nullable=False, default=False)
    created_at = Column(DateTime,    default=_now)


class QuoteModel(Base):
    __tablename__ = "quotes"

    id         = Column(Integer,     primary_key=True, index=True, autoincrement=True)
    quote      = Column(Text,        nullable=False)
    author     = Column(String(200), nullable=False, default="Unknown")
    language   = Column(String(10),  nullable=False, default="en")
    mood       = Column(String(50),  nullable=True)   # happy|sad|motivational|inspiring|peaceful|funny
    topic      = Column(String(50),  nullable=True)   # love|life|success|wisdom|friendship|education|faith|nature
    created_at = Column(DateTime,    default=_now)


# ── Helpers ───────────────────────────────────────────────────────────────────
def init_db() -> None:
    """Create all tables if they don't exist yet."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
