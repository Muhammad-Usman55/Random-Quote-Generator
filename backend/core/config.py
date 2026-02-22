"""
backend/core/config.py
Centralised settings loaded from .env (or OS environment).
"""
import os

SECRET_KEY: str                   = os.getenv("SECRET_KEY", "change-me-32-chars-minimum-key!")
ALGORITHM: str                    = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int  = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int    = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
ADMIN_TOKEN_EXPIRE_HOURS: int     = int(os.getenv("ADMIN_TOKEN_EXPIRE_HOURS", "4"))

ADMIN_USERNAME: str               = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD: str               = os.getenv("ADMIN_PASSWORD", "changeme-admin-password")

GOOGLE_CLIENT_ID: str | None     = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI: str         = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback",
)
