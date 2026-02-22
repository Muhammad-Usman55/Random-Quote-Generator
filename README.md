# QuoteGen — Random Quote Generator

<div align="center">

![QuoteGen Banner](https://img.shields.io/badge/QuoteGen-Inspire%20Your%20Day-667eea?style=for-the-badge&logo=quote&logoColor=white)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A beautiful, full-stack bilingual quote generator with 9 live sources, user authentication, favorites management, and an admin dashboard.**

[Live Demo](#) • [Features](#-features) • [Installation](#-installation) • [API Docs](#-api-documentation)

</div>

---

## 📖 Overview

QuoteGen is a modern web application that delivers inspiring quotes from multiple sources. Users can discover, save, and share quotes in both **English** and **Urdu**. The app features a sleek UI with dark/light theme support, user authentication (including Google OAuth), and a comprehensive admin panel for content management.

---

## ✨ Features

### 🎯 Core Features
- **Multi-Source Quotes** — Aggregates quotes from 9 live APIs including ZenQuotes, Quotable, Stoic Quotes, and more
- **Bilingual Support** — English and Urdu quotes with RTL support
- **Smart Filtering** — Filter quotes by mood, topic, author, and language
- **Full-Text Search** — Search across all quotes with tag and keyword support
- **Text-to-Speech** — Listen to quotes with built-in TTS functionality

### 👤 User Features
- **User Authentication** — Register, login, email verification, and password reset
- **Google OAuth** — Sign in with Google for seamless authentication
- **Favorites** — Save your favorite quotes to your personal collection
- **User Profiles** — Manage your account and view saved quotes

### 🛠️ Admin Features
- **Dashboard** — Overview statistics and analytics
- **User Management** — View and manage registered users
- **Quote Management** — Add, edit, and delete quotes from the database
- **Contact Messages** — View and respond to user contact submissions
- **Charts & Analytics** — Registration trends, popular authors, mood distribution

### 🎨 UI/UX
- **Dark/Light Theme** — System-aware theme with manual toggle
- **Responsive Design** — Beautiful on desktop, tablet, and mobile
- **Smooth Animations** — Modern CSS animations and transitions
- **Clean URLs** — SEO-friendly routes (e.g., `/login`, `/favorites`)

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance Python web framework |
| **SQLAlchemy** | ORM for database operations |
| **SQLite/PostgreSQL** | Database (SQLite default, PostgreSQL optional) |
| **Pydantic** | Data validation and serialization |
| **python-jose** | JWT token handling |
| **Authlib** | OAuth 2.0 / Google Sign-In |
| **Passlib + bcrypt** | Secure password hashing |
| **httpx** | Async HTTP client for external APIs |

### Frontend
| Technology | Purpose |
|------------|---------|
| **HTML5/CSS3** | Semantic markup and styling |
| **Tailwind CSS** | Utility-first CSS framework |
| **Vanilla JavaScript** | Interactive functionality |
| **Font Awesome** | Icon library |
| **Web Speech API** | Text-to-speech functionality |

---

## 📁 Project Structure

```
QuoteGen/
├── README.md                 # This file
├── backend/
│   ├── main.py               # FastAPI application entry point
│   ├── requirements.txt      # Python dependencies
│   │
│   ├── core/
│   │   ├── config.py         # Environment configuration
│   │   ├── security.py       # JWT & password utilities
│   │   └── dependencies.py   # FastAPI dependencies
│   │
│   ├── database/
│   │   ├── db.py             # SQLAlchemy models & engine
│   │   └── seed_quotes.py    # Database seeding script
│   │
│   ├── models/
│   │   ├── user.py           # User Pydantic schemas
│   │   ├── quote.py          # Quote Pydantic schemas
│   │   ├── contact.py        # Contact form schemas
│   │   └── saved_quote.py    # Saved quote schemas
│   │
│   └── routers/
│       ├── auth.py           # Authentication endpoints
│       ├── quotes.py         # Quote endpoints
│       ├── users.py          # User profile endpoints
│       ├── contact.py        # Contact form endpoint
│       └── admin.py          # Admin dashboard endpoints
│
└── frontend/
    ├── index.html            # Home page
    ├── login.html            # Login page
    ├── signup.html           # Registration page
    ├── search.html           # Quote search page
    ├── favorites.html        # User's saved quotes
    ├── profile.html          # User profile page
    ├── contact.html          # Contact form
    ├── about.html            # About page
    ├── admin.html            # Admin dashboard
    ├── forgot-password.html  # Password reset request
    ├── reset-password.html   # Password reset form
    ├── verify-email.html     # Email verification
    │
    ├── style.css             # Main styles
    ├── shared.css            # Shared component styles
    ├── home.css              # Home page styles
    ├── search.css            # Search page styles
    ├── admin.css             # Admin dashboard styles
    │
    ├── script.js             # Main JavaScript
    ├── shared.js             # Shared utilities
    ├── auth.js               # Authentication logic
    ├── home.js               # Home page logic
    ├── search.js             # Search functionality
    ├── favorites.js          # Favorites management
    ├── profile.js            # Profile page logic
    ├── contact.js            # Contact form logic
    └── admin.js              # Admin dashboard logic
```

---

## 🚀 Installation

### Prerequisites
- **Python 3.10+**
- **pip** (Python package manager)
- **Git**

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/quotegen.git
   cd quotegen
   ```

2. **Set up the backend**
   ```bash
   cd backend

   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # Windows:
   venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate

   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example .env file
   copy .env.example .env   # Windows
   cp .env.example .env     # macOS/Linux

   # Edit .env with your settings
   ```

4. **Start the server**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

5. **Open in browser**
   - **App:** http://localhost:8000
   - **API Docs:** http://localhost:8000/docs

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Security
SECRET_KEY=your-super-secret-key-minimum-32-characters
ALGORITHM=HS256

# Token Expiry
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ADMIN_TOKEN_EXPIRE_HOURS=4

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///./quotegen.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/quotegen

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

---

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/logout` | Logout (invalidate tokens) |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/verify-email` | Verify email address |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/auth/google/login` | Initiate Google OAuth |
| `GET` | `/api/auth/google/callback` | Google OAuth callback |

### Quote Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/quotes/random` | Get a random English quote |
| `GET` | `/api/quotes/urdu/random` | Get a random Urdu quote |
| `GET` | `/api/quotes/filtered` | Filter quotes by mood/topic/author |
| `GET` | `/api/quotes/authors` | List all authors |
| `GET` | `/api/quotes/search` | Full-text search quotes |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/me` | Get current user profile |
| `PUT` | `/api/users/me` | Update user profile |
| `GET` | `/api/users/saved` | Get user's saved quotes |
| `POST` | `/api/users/saved` | Save a quote |
| `DELETE` | `/api/users/saved/{id}` | Remove a saved quote |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Admin login |
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET` | `/api/admin/users` | List all users |
| `GET` | `/api/admin/quotes` | List all quotes |
| `POST` | `/api/admin/quotes` | Add a new quote |
| `DELETE` | `/api/admin/quotes/{id}` | Delete a quote |
| `GET` | `/api/admin/contact` | List contact messages |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/contact` | Submit contact form |

> **Interactive API documentation is available at** `http://localhost:8000/docs`

---

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### Home Page
*Beautiful hero section with animated quote marks and quick access to features*

### Search Page
*Filter and search quotes by mood, topic, author, and language*

### Admin Dashboard
*Comprehensive analytics and content management*

### Dark Theme
*Eye-friendly dark mode with smooth transitions*

</details>

---

## 🔌 External Quote Sources

QuoteGen aggregates quotes from these free APIs (no API keys required):

| Source | URL | Description |
|--------|-----|-------------|
| DummyJSON | dummyjson.com | General quotes |
| ZenQuotes | zenquotes.io | Inspirational quotes |
| Quotable | quotable.io | Famous quotes |
| Stoic Quotes | stoicquotesapi.com | Stoic philosophy |
| QuoteGarden | quote-garden.onrender.com | Curated collection |
| Forismatic | forismatic.com | Inspirational quotes |
| Type.fit | type.fit | 1,600+ quotes |
| FavQs | favqs.com | Quote of the day |
| Kanye.rest | kanye.rest | Kanye West quotes |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines
- Follow PEP 8 for Python code
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- All the free quote API providers
- The FastAPI and SQLAlchemy communities
- Font Awesome for the icons
- Tailwind CSS for the styling utilities

---

<div align="center">

**Made with ❤️ by [Your Name]**

⭐ Star this repo if you find it helpful!

</div>
