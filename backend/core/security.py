"""
backend/core/security.py
JWT creation/verification, bcrypt hashing, JTI blacklist helpers.
"""
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from jose import jwt
from sqlalchemy.orm import Session

import core.config as cfg


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── Token helpers ─────────────────────────────────────────────────────────────

def _make_token(data: dict, expires: timedelta) -> str:
    payload = {
        **data,
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + expires,
    }
    return jwt.encode(payload, cfg.SECRET_KEY, algorithm=cfg.ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _make_token(
        {"sub": str(user_id), "type": "access"},
        timedelta(minutes=cfg.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(user_id: int) -> str:
    return _make_token(
        {"sub": str(user_id), "type": "refresh"},
        timedelta(days=cfg.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict:
    """
    Decodes and validates a JWT.
    Raises jose.JWTError on any failure (expired, bad signature, etc.).
    """
    return jwt.decode(token, cfg.SECRET_KEY, algorithms=[cfg.ALGORITHM])


# ── JTI Blacklist helpers ─────────────────────────────────────────────────────

def is_blacklisted(jti: str, db: Session) -> bool:
    from database.db import TokenBlacklistModel  # lazy import avoids circular deps
    return (
        db.query(TokenBlacklistModel)
        .filter(TokenBlacklistModel.jti == jti)
        .first()
    ) is not None


def blacklist_jti(jti: str, db: Session) -> None:
    from database.db import TokenBlacklistModel  # lazy import
    db.add(TokenBlacklistModel(jti=jti))
    db.commit()
