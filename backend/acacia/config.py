"""Settings (from environment variables) and the few values shared by every module."""
import os
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # project folder
FRONTEND_DIR = os.environ.get("DD_FRONTEND", os.path.join(ROOT, "frontend"))
DB_PATH = os.environ.get("DD_DB", os.path.join(ROOT, "backend", "acacia_watch.sqlite3"))
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
PG = bool(DATABASE_URL)  # PostgreSQL (for example Neon) when DATABASE_URL is set, SQLite otherwise

COOKIE = "dd_session"
SESSION_DAYS = 30
PBKDF2_ITER = 200 * 1024
MAX_BODY = 12 * 1024 * 1024

LOCK = threading.Lock()  # all database work happens under this lock
FAILS = {}  # (ip, name) -> [timestamps of failed logins]

POLL_SECONDS = float(os.environ.get("DD_POLL_SECONDS", "25"))  # how long a live-update question is held open

# ---- uploaded pictures (the browser shows the same numbers on the Site settings page) ----
# scope "site" = shared by everyone (admin only); "user" = personal.
# min_short/min_long: smallest allowed short/long side in px. out: longest side of a stored still picture.
# in_bytes: biggest file the person may pick. out_bytes: biggest stored still picture. gif_bytes/gif_side: limits for animated GIFs.
IMG_SLOTS = {
    "logo":  {"scope": "site", "min_short": 64,  "min_long": 64,  "out": 512,  "in_bytes": 1 << 20, "out_bytes": 200 * 1024, "gif_bytes": 1 << 20, "gif_side": 512},
    "cover": {"scope": "site", "min_short": 480, "min_long": 800, "out": 1920, "in_bytes": 5 << 20, "out_bytes": 450 * 1024, "gif_bytes": 2 << 20, "gif_side": 1280},
    "bg":    {"scope": "user", "min_short": 480, "min_long": 800, "out": 1920, "in_bytes": 5 << 20, "out_bytes": 450 * 1024, "gif_bytes": 2 << 20, "gif_side": 1280},
    "panel": {"scope": "user", "min_short": 256, "min_long": 256, "out": 1024, "in_bytes": 3 << 20, "out_bytes": 300 * 1024, "gif_bytes": 1 << 20, "gif_side": 800},
    "cond":  {"scope": "site", "min_short": 128, "min_long": 128, "out": 512,  "in_bytes": 2 << 20, "out_bytes": 150 * 1024, "gif_bytes": 1 << 20, "gif_side": 512},
    "deco":  {"scope": "user", "min_short": 64,  "min_long": 64,  "out": 512,  "in_bytes": 1 << 20, "out_bytes": 200 * 1024, "gif_bytes": 1 << 20, "gif_side": 512},
    # profile page: avatar, background and avatar frame (the frame must be square: it is drawn over the avatar, 160 px on screen, 320 px is ideal)
    "pavatar": {"scope": "user", "min_short": 96,  "min_long": 96,  "out": 512,  "in_bytes": 2 << 20, "out_bytes": 200 * 1024, "gif_bytes": 1 << 20, "gif_side": 512},
    "pbg":     {"scope": "user", "min_short": 200, "min_long": 600, "out": 1600, "in_bytes": 5 << 20, "out_bytes": 400 * 1024, "gif_bytes": 2 << 20, "gif_side": 1280},
    "pframe":  {"scope": "user", "min_short": 160, "min_long": 160, "out": 640,  "in_bytes": 2 << 20, "out_bytes": 250 * 1024, "gif_bytes": 1536 * 1024, "gif_side": 640, "square": True},
}
IMG_USER_MAX_COUNT = 10         # pictures one person can keep
IMG_USER_MAX_BYTES = 8 * 1024 * 1024  # total size one person can keep
IMG_SITE_MAX_COUNT = 60         # logo + cover + condition icons
IMG_SITE_MAX_BYTES = 10 * 1024 * 1024
IMG_GRACE = 600                 # seconds an uploaded but not yet saved picture is kept
