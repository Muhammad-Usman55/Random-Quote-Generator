"""
backend/core/dependencies.py
FastAPI dependencies for JWT-protected endpoints.
"""
from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from core.security import decode_token, is_blacklisted
from database.db import UserModel, get_db

_bearer = HTTPBearer(auto_error=False)   # auto_error=False lets us return 401 ourselves


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> UserModel:
    """
    FastAPI dependency: extracts the Bearer token, validates it,
    checks the JTI blacklist, and returns the active UserModel.
    Raises HTTP 401 on any failure.
    """
    _401 = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials:
        raise _401

    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise _401

    if payload.get("type") != "access":
        raise _401

    jti = payload.get("jti")
    if jti and is_blacklisted(jti, db):
        raise _401

    user_id = payload.get("sub")
    if not user_id:
        raise _401

    user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()
    if not user or not user.is_active:
        raise _401

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[UserModel]:
    """
    Same as get_current_user but returns None instead of raising 401.
    Use on endpoints that behave differently for guests vs logged-in users.
    """
    if not credentials:
        return None
    try:
        return get_current_user(credentials=credentials, db=db)
    except HTTPException:
        return None
