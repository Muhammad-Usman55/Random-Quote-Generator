"""
backend/routers/auth.py
Authentication endpoints:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/logout
  POST /api/auth/refresh
  GET  /api/auth/verify-email?token=
  POST /api/auth/forgot-password
  POST /api/auth/reset-password
  GET  /api/auth/google/login
  GET  /api/auth/google/callback
"""
import os
import traceback

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from jose import JWTError
from sqlalchemy.orm import Session
from starlette.config import Config

import core.config as cfg
from core.security import (
    blacklist_jti,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    is_blacklisted,
    verify_password,
)
from database.db import UserModel, get_db
from models.user import (
    ForgotPasswordIn,
    LoginIn,
    RefreshIn,
    RegisterIn,
    ResetPasswordIn,
    TokenResponse,
)

router = APIRouter()

# ── itsdangerous: signed time-limited tokens ──────────────────────────────────
_ts             = URLSafeTimedSerializer(cfg.SECRET_KEY)
_EMAIL_SALT     = "email-verification"
_RESET_SALT     = "password-reset"
_EMAIL_MAX_AGE  = 86400   # 24 hours
_RESET_MAX_AGE  = 900     # 15 minutes

# ── Google OAuth (Authlib) ────────────────────────────────────────────────────
_oauth_config = Config(
    environ={
        "GOOGLE_CLIENT_ID":     cfg.GOOGLE_CLIENT_ID or "",
        "GOOGLE_CLIENT_SECRET": cfg.GOOGLE_CLIENT_SECRET or "",
    }
)
oauth = OAuth(_oauth_config)
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


# ── Utilities ─────────────────────────────────────────────────────────────────

def _unique_username(base: str, db: Session) -> str:
    """Append an integer suffix until the username is unique in the DB."""
    username = base
    i = 1
    while db.query(UserModel).filter(UserModel.username == username).first():
        username = f"{base}{i}"
        i += 1
    return username


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Register a new account")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """
    Create a new local account.
    Prints the email-verification link to the server console (no real SMTP).
    """
    try:
        if db.query(UserModel).filter(UserModel.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email already registered.")

        username = _unique_username(payload.email.split("@")[0], db)
        user = UserModel(
            username=username,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            provider="local",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Simulate email verification — print link to console
        token = _ts.dumps(user.email, salt=_EMAIL_SALT)
        verify_url = f"http://localhost:8000/verify-email?token={token}"
        print(f"\n[EMAIL VERIFY]  To: {user.email}\n  Link: {verify_url}\n")

        return {
            "message": (
                "Registration successful. "
                "Check the server console for your verification link."
            )
        }
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Registration error: {exc}")


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse, summary="Log in")
def login(payload: LoginIn, db: Session = Depends(get_db)) -> TokenResponse:
    """Verify credentials and return an access + refresh token pair."""
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if (
        not user
        or not user.hashed_password
        or not verify_password(payload.password, user.hashed_password)
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


# ── Logout ────────────────────────────────────────────────────────────────────

@router.post("/logout", summary="Log out (blacklist token)")
def logout(request: Request, db: Session = Depends(get_db)):
    """
    Blacklists the JTI of the supplied Bearer token so it cannot be reused.
    Always returns 200 — even if the token is already expired or missing.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = decode_token(token)
            jti = payload.get("jti")
            if jti and not is_blacklisted(jti, db):
                blacklist_jti(jti, db)
        except JWTError:
            pass  # expired token — nothing useful to blacklist
    return {"message": "Logged out."}


# ── Refresh ───────────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse, summary="Refresh tokens")
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenResponse:
    """
    Exchange a valid refresh token for a new access + refresh token pair.
    The old refresh token is blacklisted (token rotation).
    """
    _401 = HTTPException(status_code=401, detail="Invalid or expired refresh token.")
    try:
        data = decode_token(payload.refresh_token)
    except JWTError:
        raise _401

    if data.get("type") != "refresh":
        raise _401

    jti = data.get("jti")
    if jti and is_blacklisted(jti, db):
        raise _401

    user = db.query(UserModel).filter(UserModel.id == int(data["sub"])).first()
    if not user or not user.is_active:
        raise _401

    # Token rotation: invalidate the old refresh token
    if jti:
        blacklist_jti(jti, db)

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


# ── Email Verification ────────────────────────────────────────────────────────

@router.get("/verify-email", summary="Verify email address")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Mark the user's email as verified using the signed token from the console link."""
    try:
        email = _ts.loads(token, salt=_EMAIL_SALT, max_age=_EMAIL_MAX_AGE)
    except SignatureExpired:
        raise HTTPException(status_code=400, detail="Verification link has expired.")
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid verification token.")

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.is_verified = True
    db.commit()
    return {"message": "Email verified successfully. You can now log in."}


# ── Forgot Password ───────────────────────────────────────────────────────────

@router.post("/forgot-password", summary="Request password reset")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    """
    If the email is registered (local account), prints a reset link to the console.
    Always returns 200 — never reveals whether the email exists.
    """
    user = db.query(UserModel).filter(UserModel.email == payload.email).first()
    if user and user.provider == "local":
        token = _ts.dumps(user.email, salt=_RESET_SALT)
        reset_url = f"http://localhost:8000/reset-password?token={token}"
        print(f"\n[PASSWORD RESET]  To: {user.email}\n  Link: {reset_url}\n")

    return {
        "message": (
            "If this email is registered, a reset link has been printed "
            "to the server console."
        )
    }


# ── Reset Password ────────────────────────────────────────────────────────────

@router.post("/reset-password", summary="Set a new password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    """Accept a signed reset token and update the user's password."""
    try:
        email = _ts.loads(payload.token, salt=_RESET_SALT, max_age=_RESET_MAX_AGE)
    except SignatureExpired:
        raise HTTPException(status_code=400, detail="Reset link has expired.")
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now log in."}


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google/login", summary="Redirect to Google sign-in")
async def google_login(request: Request):
    """Redirect the browser to the Google OAuth consent screen."""
    return await oauth.google.authorize_redirect(request, cfg.GOOGLE_REDIRECT_URI)


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """
    Handle Google's redirect after user consents.
    Upserts the user record, issues JWT tokens, and redirects to profile.html
    passing the tokens in the URL fragment (not visible to the server).
    """
    try:
        token_data = await oauth.google.authorize_access_token(request)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth authorisation failed.",
        )

    user_info = token_data.get("userinfo")
    if not user_info or not user_info.get("email"):
        raise HTTPException(
            status_code=400,
            detail="Could not retrieve user info from Google.",
        )

    email   = user_info["email"]
    picture = user_info.get("picture")

    user = db.query(UserModel).filter(UserModel.email == email).first()

    if not user:
        # First-time Google sign-in — create a new account
        username = _unique_username(email.split("@")[0], db)
        user = UserModel(
            username=username,
            email=email,
            provider="google",
            profile_picture=picture,
            is_verified=True,   # Google already verified this email
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Returning Google user — update picture, ensure verified
        user.provider = "google"
        user.profile_picture = user.profile_picture or picture
        user.is_verified = True
        db.commit()

    access  = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    # Pass tokens in URL fragment — fragment is never sent to the server,
    # so auth.js can read and store them safely client-side.
    redirect_url = (
        f"http://localhost:8000/profile"
        f"#access={access}&refresh={refresh}"
    )
    return RedirectResponse(url=redirect_url)
