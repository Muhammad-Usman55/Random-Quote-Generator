# QuoteGen — Backend (FastAPI)

## Quick Start

```bash
cd backend

# 1. Create a virtual environment
python -m venv venv

# 2. Activate it
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. (Optional) copy env file
copy .env.example .env

# 5. Start the server
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000** — FastAPI serves the frontend automatically.
Open **http://localhost:8000/docs** — Interactive Swagger API docs.

---

## Project Structure

```
backend/
├── main.py               # FastAPI app entry point
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variable template
│
├── database/
│   └── db.py             # SQLAlchemy engine, models, session helper
│
├── models/
│   ├── quote.py          # QuoteResponse Pydantic schema
│   ├── favorite.py       # FavoriteIn / FavoriteOut schemas
│   └── contact.py        # ContactMessage / ContactResponse schemas
│
└── routers/
    ├── quotes.py         # GET /api/quotes/random, GET /api/quotes/urdu/random
    ├── favorites.py      # GET/POST /api/favorites, DELETE /api/favorites/{id}
    └── contact.py        # POST /api/contact
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/quotes/random` | Random English quote (proxies DummyJSON) |
| GET | `/api/quotes/urdu/random` | Random Urdu quote (built-in list) |
| GET | `/api/favorites/` | List all saved favorites |
| POST | `/api/favorites/` | Save a quote to favorites |
| DELETE | `/api/favorites/{id}` | Remove a favorite by ID |
| POST | `/api/contact/` | Submit a contact form message |

Full interactive docs: **http://localhost:8000/docs**

---

## Database

SQLite is used by default (`quotegen.db` created automatically in `backend/`).
To switch to PostgreSQL, set `DATABASE_URL` in your `.env` file and install `psycopg2-binary`.
