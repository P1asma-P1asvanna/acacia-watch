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
PBKDF2_ITER = 200_000
MAX_BODY = 12 * 1024 * 1024

LOCK = threading.Lock()  # all database work happens under this lock
FAILS = {}  # (ip, name) -> [timestamps of failed logins]
