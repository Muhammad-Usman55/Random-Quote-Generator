import os

FRONTEND_DIR = r"d:\Wrb_technalogies\Random Quote Generator\code\frontend"

# Remaining replacements missed in the first pass
EXTRA = [
    ('href="login.html"',   'href="/login"'),
    ('href="signup.html"',  'href="/signup"'),
]

for filename in os.listdir(FRONTEND_DIR):
    if not filename.endswith(".html"):
        continue
    filepath = os.path.join(FRONTEND_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        original = f.read()
    content = original
    for old, new in EXTRA:
        content = content.replace(old, new)
    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print("FIXED:", filename)

print("Done.")
