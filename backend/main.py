"""
QuoteGen — FastAPI Backend
Run with:  uvicorn main:app --reload
"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()   # Load .env before anything else reads os.getenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from database.db import init_db
from database.seed_quotes import seed_db
from routers import admin, auth, contact, quotes, users


# ── Lifespan: initialise DB tables and seed data on startup ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_db()   # No-op if quotes table is already populated
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="QuoteGen API",
    description=(
        "Backend API for the QuoteGen bilingual quote generator. "
        "Provides quote fetching, favorites management, and contact form storage."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────
# SessionMiddleware is required by Authlib for Google OAuth (stores state/nonce).
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "change-me-32-chars-minimum-key!"),
    https_only=False,   # False is fine for localhost development
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── API Routers ───────────────────────────────────────────────────────────────
app.include_router(quotes.router,  prefix="/api/quotes",  tags=["Quotes"])
app.include_router(auth.router,    prefix="/api/auth",    tags=["Auth"])
app.include_router(users.router,   prefix="/api/users",   tags=["Users"])
app.include_router(contact.router, prefix="/api/contact", tags=["Contact"])
app.include_router(admin.router,   prefix="/api/admin",   tags=["Admin"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["Health"])
def health_check():
    """Returns 200 OK when the API is running."""
    return {"status": "ok", "message": "QuoteGen API is running"}


# ── Serve frontend static files ───────────────────────────────────────────────
# Clean URL page routes must be registered BEFORE the StaticFiles catch-all so
# that /login, /admin, etc. are handled by FastAPI and not treated as 404s.
_frontend_dir = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)

_PAGE_MAP = {
    "home":            "index.html",
    "login":           "login.html",
    "signup":          "signup.html",
    "admin":           "admin.html",
    "search":          "search.html",
    "profile":         "profile.html",
    "favorites":       "favorites.html",
    "contact":         "contact.html",
    "about":           "about.html",
    "forgot-password": "forgot-password.html",
    "reset-password":  "reset-password.html",
    "verify-email":    "verify-email.html",
}


def _page_handler(filename: str):
    """Return an async handler that serves the given HTML file."""
    async def handler():
        return FileResponse(os.path.join(_frontend_dir, filename))
    return handler


if os.path.isdir(_frontend_dir):
    for _slug, _html in _PAGE_MAP.items():
        app.add_api_route(
            f"/{_slug}",
            _page_handler(_html),
            methods=["GET"],
            include_in_schema=False,
        )
    app.mount(
        "/",
        StaticFiles(directory=_frontend_dir, html=True),
        name="frontend",
    )
