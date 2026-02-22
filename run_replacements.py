import os

FRONTEND_DIR = r"d:\Wrb_technalogies\Random Quote Generator\code\frontend"

FILES = [
    "index.html",
    "login.html",
    "signup.html",
    "about.html",
    "contact.html",
    "search.html",
    "favorites.html",
    "profile.html",
    "forgot-password.html",
    "reset-password.html",
    "verify-email.html",
    "admin.html",
]

# Global replacements applied to ALL files.
# search.html?tag= MUST come before bare search.html to avoid clobbering it.
GLOBAL_REPLACEMENTS = [
    ('href="search.html?tag=',  'href="/search?tag='),
    ('href="index.html"',       'href="/home"'),
    ('href="search.html"',      'href="/search"'),
    ('href="about.html"',       'href="/about"'),
    ('href="favorites.html"',   'href="/favorites"'),
    ('href="contact.html"',     'href="/contact"'),
]

# Per-file replacements applied after the global ones.
PER_FILE_REPLACEMENTS = {
    "login.html": [
        ("window.location.replace('profile.html')",            "window.location.replace('/profile')"),
        ("|| 'index.html'",                                    "|| '/home'"),
        ('href="signup.html"',                                 'href="/signup"'),
        ('href="forgot-password.html"',                        'href="/forgot-password"'),
    ],
    "signup.html": [
        ("window.location.replace('profile.html')",            "window.location.replace('/profile')"),
        ('href="login.html"',                                  'href="/login"'),
    ],
    "favorites.html": [
        ("window.location.replace('login.html?next=favorites.html')",
         "window.location.replace('/login?next=/favorites')"),
    ],
    "profile.html": [
        ("window.location.replace('login.html?next=profile.html')",
         "window.location.replace('/login?next=/profile')"),
    ],
    "forgot-password.html": [
        ('href="login.html"',   'href="/login"'),
    ],
    "reset-password.html": [
        ('href="login.html"',           'href="/login"'),
        ('href="forgot-password.html"', 'href="/forgot-password"'),
    ],
    "verify-email.html": [
        ('href="login.html"',   'href="/login"'),
        ('href="signup.html"',  'href="/signup"'),
    ],
}

modified_files = []

for filename in FILES:
    filepath = os.path.join(FRONTEND_DIR, filename)

    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()

    content = original

    # 1. Apply global replacements
    for old, new in GLOBAL_REPLACEMENTS:
        content = content.replace(old, new)

    # 2. Apply per-file replacements
    for old, new in PER_FILE_REPLACEMENTS.get(filename, []):
        content = content.replace(old, new)

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        modified_files.append(filename)
        print(f"  MODIFIED : {filename}")
    else:
        print(f"  UNCHANGED: {filename}")

print(f"\nDone. {len(modified_files)} of {len(FILES)} files modified.")
if modified_files:
    print("Modified files:", ", ".join(modified_files))
