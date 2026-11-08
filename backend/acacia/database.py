"""Database access. SQL is written once with "?" placeholders and works on SQLite and PostgreSQL."""
import sqlite3
import sys

from .config import DATABASE_URL, DB_PATH, PG

if PG:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError:
        sys.exit("DATABASE_URL is set but the 'psycopg' package is missing. Run: pip install -r requirements.txt")


class PGConn:
    def __init__(self):
        self.raw = psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=20, prepare_threshold=None)

    def execute(self, sql, params=()):
        cur = self.raw.cursor()
        cur.execute(sql.replace("?", "%s"), tuple(params))
        return cur

    def commit(self):
        self.raw.commit()

    def rollback(self):
        self.raw.rollback()

    def close(self):
        try:
            self.raw.close()
        except Exception:
            pass


_PG = None  # one shared PostgreSQL connection (all work happens under LOCK)


def db():
    global _PG
    if PG:
        if _PG is None:
            _PG = PGConn()
        return _PG
    c = sqlite3.connect(DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    return c


def drop_pg():
    global _PG
    if _PG is not None:
        _PG.close()
        _PG = None


def is_conn_error(e):
    return PG and isinstance(e, (psycopg.OperationalError, psycopg.InterfaceError))


def run(fn):
    """Run fn(connection) as one transaction. Reconnects once if the database dropped the connection
    (Neon closes idle connections when it suspends)."""
    for attempt in (0, 1):
        c = db()
        try:
            res = fn(c)
            c.commit()
            return res
        except Exception as e:
            try:
                c.rollback()
            except Exception:
                pass
            if attempt == 0 and is_conn_error(e):
                drop_pg()
                continue
            raise
        finally:
            if not PG:
                c.close()


SCHEMA = [
    """CREATE TABLE IF NOT EXISTS users(
        id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, disp TEXT NOT NULL,
        role TEXT NOT NULL, algo TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created DOUBLE PRECISION NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS sessions(
        tok TEXT PRIMARY KEY, uid TEXT NOT NULL, exp DOUBLE PRECISION NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS docs(
        kind TEXT NOT NULL, id TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', data TEXT NOT NULL,
        PRIMARY KEY(kind, id))""",
    "CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT NOT NULL)",
]


def init_db():
    if not PG:
        c = db()
        c.execute("PRAGMA journal_mode=WAL")
        c.close()

    def work(c):
        for stmt in SCHEMA:
            c.execute(stmt)

    run(work)
