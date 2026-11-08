#!/usr/bin/env python3
"""Acacia Watch server: one file, Python 3.8+ standard library only.

Run:     python3 server.py
Options (environment variables):
  PORT=8080                 port to listen on
  HOST=0.0.0.0              address to listen on
  DD_DB=./acacia_watch.sqlite3   SQLite database file (used when DATABASE_URL is not set)
  DATABASE_URL=postgresql://... use PostgreSQL (for example Neon) instead of SQLite; needs: pip install -r requirements.txt
  DD_COOKIE_SECURE=1        set when the site is served over https
  DD_TRUST_PROXY=1          set when behind a reverse proxy (uses X-Forwarded-For for login throttling)
Commands:
  python3 server.py reset-password <username>     set a new password (asks for it)
  python3 server.py make-admin <username>         turn an account into an admin
  python3 server.py list-users
"""
import hashlib, hmac, json, math, os, re, secrets, sqlite3, sys, threading, time, getpass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from http import cookies
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("DD_DB", os.path.join(HERE, "acacia_watch.sqlite3"))
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
PG = bool(DATABASE_URL)
if PG:
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError:
        sys.exit("DATABASE_URL is set but the 'psycopg' package is missing. Run: pip install -r requirements.txt")
COOKIE = "dd_session"
SESSION_DAYS = 30
PBKDF2_ITER = 200_000
MAX_BODY = 12 * 1024 * 1024
LOCK = threading.Lock()
FAILS = {}  # (ip, name) -> [timestamps]


# ------------------------------------------------------------------ database
# SQL is written once with "?" placeholders and works on both SQLite and PostgreSQL.
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


# ------------------------------------------------------------------ passwords
def hash_pw(pw, salt, algo="pbkdf2"):
    if algo == "legacy":  # sha256(salt:pw), what the browser-only version used
        return hashlib.sha256((salt + ":" + pw).encode()).hexdigest()
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), PBKDF2_ITER).hex()


def new_user_row(name, disp, pw, role):
    salt = secrets.token_hex(16)
    return (secrets.token_hex(8), name, disp, role, "pbkdf2", salt, hash_pw(pw, salt), time.time())


def check_pw(row, pw):
    return hmac.compare_digest(hash_pw(pw, row["salt"], row["algo"]), row["hash"])


# ------------------------------------------------------------------ number helpers (mirror the browser code)
def num(v):
    if isinstance(v, bool):
        return int(v)
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return float(v) if math.isfinite(v) else 0
    if isinstance(v, str):
        s = v.strip()
        if s == "":
            return 0
        try:
            f = float(s)
            return f if math.isfinite(f) else 0
        except ValueError:
            return 0
    return 0


def jsround(x):
    return int(math.floor(x + 0.5))


def mod(v):
    return int(math.floor((num(v) - 10) / 2))


def clampi(v, lo, hi, default):
    n = num(v)
    n = jsround(n) if n == n else default
    return max(lo, min(hi, n))


def sgn_find(lst, name):
    for x in lst or []:
        if isinstance(x, dict) and x.get("name") == name:
            return x
    return None


# ------------------------------------------------------------------ HP and AC (same rules as the page)
def hp_calc(d, cat):
    lvl = max(1, min(20, jsround(num(d.get("level"))) or 1))
    con = mod((d.get("abil") or {}).get("con"))
    classes = (cat or {}).get("classes", [])
    co = sgn_find(classes, d.get("cls"))
    m = re.search(r"(\d+)", str((co or {}).get("hd", "")))
    die = int(m.group(1)) if m else 0
    avg = die // 2 + 1
    total = max(1, die + con) + max(1, avg + con) * (lvl - 1)
    race = sgn_find((cat or {}).get("races", []), d.get("race"))
    so = sgn_find((co or {}).get("subs", []), d.get("sub")) if co else None
    for src in (race, co, so):
        b = jsround(num((src or {}).get("bhp")))
        if b:
            total += b * lvl
    return max(1, total)


def eff_max(d, cat):
    if d.get("hpMode") == "manual" and num(d.get("hpManual")) >= 1:
        return jsround(num(d.get("hpManual")))
    return hp_calc(d, cat)


def armor_base(n):
    return re.sub(r"\s*\+\d+\s*$", "", str(n or "").strip()).lower()


def armor_of(it, cat):
    b = armor_base(it.get("name"))
    if not b:
        return None
    for a in (cat or {}).get("armor", []):
        if str(a.get("name", "")).lower() == b:
            return a
    return None


def item_ench(it):
    m = re.search(r"\+(\d+)\s*$", str(it.get("name") or ""))
    return int(m.group(1)) if m else 0


def ac_calc(d, cat):
    dx = mod((d.get("abil") or {}).get("dex"))
    body = shield = None
    for it in d.get("items") or []:
        if not isinstance(it, dict) or not it.get("eq"):
            continue
        a = armor_of(it, cat)
        if not a:
            continue
        if re.search("shield", str(a.get("acat") or ""), re.I):
            shield = shield or (it, a)
        else:
            body = body or (it, a)
    if body:
        it, a = body
        armor = 10 + jsround(num(a.get("ac"))) + item_ench(it) + jsround(num(a.get("ench")))
        heavy = bool(re.search("heavy", str(a.get("acat") or ""), re.I))
        md = None if str(a.get("maxdex", "")).strip() == "" else jsround(num(a.get("maxdex")))
        dp = 0 if heavy else (dx if md is None else min(dx, md))
        total = armor + dp
    else:
        total = 10 + dx
    if shield:
        it, a = shield
        total += jsround(num(a.get("ac"))) + item_ench(it) + jsround(num(a.get("ench")))
    return total


def eff_ac(d, cat):
    if d.get("acMode") == "manual" and str(d.get("acManual", "")).strip() != "" and num(d.get("acManual")) >= 0:
        return jsround(num(d.get("acManual")))
    return ac_calc(d, cat)


# ------------------------------------------------------------------ validation of character records
ID_RE = re.compile(r"^[A-Za-z0-9_-]{3,40}$")
ADMIN_ONLY = ("hpMode", "hpManual", "acMode", "acManual")


def clean_record(rec, kind, existing, actor_is_admin, actor_id, user_ids, cat):
    """Return a record that is safe to store, or None to reject."""
    if not isinstance(rec, dict) or not ID_RE.match(str(rec.get("id", ""))):
        return None
    d = dict(rec)
    d["kind"] = kind
    ab = d.get("abil") if isinstance(d.get("abil"), dict) else {}
    d["abil"] = {k: clampi(ab.get(k), 1, 30, 10) for k in ("str", "dex", "con", "int", "wis", "cha")}
    d["level"] = clampi(d.get("level"), 1, 20, 1)
    d["xp"] = clampi(d.get("xp"), 0, 10_000_000, 0)
    d["name"] = str(d.get("name") or "")[:120]
    if kind == "pc":
        if actor_is_admin:
            owner = str(d.get("owner") or "")
            d["owner"] = owner if owner in user_ids else ""
        else:
            d["owner"] = actor_id
    else:
        d["owner"] = ""
    if not actor_is_admin:
        # players cannot choose how max HP and AC are set; keep what the admin stored
        for k in ADMIN_ONLY:
            if existing is not None and k in existing:
                d[k] = existing[k]
            else:
                d[k] = "auto" if k.endswith("Mode") else ""
    d["hpTemp"] = clampi(d.get("hpTemp"), 0, 999, 0)
    d["hdUsed"] = clampi(d.get("hdUsed"), 0, 20, 0)
    if cat is None:  # catalog not uploaded yet (should not happen): trust the sizes the page computed
        d["hp"] = clampi(d.get("hp"), 1, 100000, 10)
    else:
        d["hp"] = eff_max(d, cat)
    if d.get("hpCur") is not None:
        d["hpCur"] = max(0, min(clampi(d.get("hpCur"), 0, 100000, 0), d["hp"]))
    d["ac"] = clampi(d.get("ac"), 0, 100, 10) if cat is None else eff_ac(d, cat)
    return d


# ------------------------------------------------------------------ state for the browser
def kv_get(c, key):
    r = c.execute("SELECT v FROM kv WHERE k=?", (key,)).fetchone()
    return json.loads(r["v"]) if r else None


def kv_set(c, key, value):
    c.execute("INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (key, json.dumps(value)))


def user_pub(r):
    return {"id": r["id"], "name": r["name"], "disp": r["disp"], "role": r["role"]}


def boot_state(c, me):
    out = {"me": None, "hasUsers": c.execute("SELECT 1 FROM users LIMIT 1").fetchone() is not None,
           "site": kv_get(c, "site") or {}}
    if not me:
        return out
    out["me"] = user_pub(me)
    out["cat"] = kv_get(c, "cat")
    if me["role"] == "admin":
        out["users"] = [user_pub(r) for r in c.execute("SELECT * FROM users ORDER BY created")]
        out["pcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='pc'")]
        out["npcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='npc'")]
        out["rooms"] = kv_get(c, "rooms") or []
    else:
        out["users"] = [user_pub(me)]
        out["pcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='pc' AND owner=?", (me["id"],))]
        out["npcs"] = []
        out["rooms"] = []
    return out


# ------------------------------------------------------------------ HTTP handler
class Err(Exception):
    def __init__(self, code, msg):
        self.code, self.msg = code, msg


class H(BaseHTTPRequestHandler):
    server_version = "AcaciaWatch/1"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *a):
        if os.environ.get("DD_LOG"):
            sys.stderr.write("%s %s\n" % (self.address_string(), fmt % a))

    # --- plumbing
    def ip(self):
        if os.environ.get("DD_TRUST_PROXY") == "1":  # only behind a reverse proxy you control
            return self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()
        return self.client_address[0]

    def send(self, code, body, ctype="application/json", extra=None):
        if not isinstance(body, (bytes, bytearray)):
            body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype + ("; charset=utf-8" if ctype.startswith("text") or ctype == "application/json" else ""))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or []):
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def cookie_hdr(self, token, max_age):
        parts = ["%s=%s" % (COOKIE, token), "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=%d" % max_age]
        if os.environ.get("DD_COOKIE_SECURE") == "1":
            parts.append("Secure")
        return ("Set-Cookie", "; ".join(parts))

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise Err(413, "too_large")
        raw = self.rfile.read(n) if n else b""
        try:
            v = json.loads(raw.decode() or "{}")
        except Exception:
            raise Err(400, "bad_json")
        if not isinstance(v, dict):
            raise Err(400, "bad_json")
        return v

    def session_user(self, c):
        jar = cookies.SimpleCookie(self.headers.get("Cookie") or "")
        if COOKIE not in jar:
            return None
        tok = hashlib.sha256(jar[COOKIE].value.encode()).hexdigest()
        r = c.execute("SELECT u.* FROM sessions s JOIN users u ON u.id=s.uid WHERE s.tok=? AND s.exp>?", (tok, time.time())).fetchone()
        return r

    def start_session(self, c, uid):
        token = secrets.token_urlsafe(32)
        c.execute("DELETE FROM sessions WHERE exp<?", (time.time(),))
        c.execute("INSERT INTO sessions(tok,uid,exp) VALUES(?,?,?)",
                  (hashlib.sha256(token.encode()).hexdigest(), uid, time.time() + SESSION_DAYS * 86400))
        return self.cookie_hdr(token, SESSION_DAYS * 86400)

    # --- routing
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlparse(self.path).path
        try:
            if path in ("/", "/index.html"):
                with open(os.path.join(HERE, "index.html"), "rb") as f:
                    html = f.read().replace(b"</head>", b'<meta name="dd-server" content="1"></head>', 1)
                    return self.send(200, html, "text/html")
            if path == "/healthz":
                return self.send(200, {"ok": True})
            if path == "/api/boot":
                with LOCK:
                    res = run(lambda c: boot_state(c, self.session_user(c)))
                return self.send(200, res)
            return self.send(404, {"error": "not_found"})
        except FileNotFoundError:
            return self.send(500, {"error": "index.html missing next to server.py"})
        except Err as e:
            return self.send(e.code, {"error": e.msg})

    def do_POST(self):
        self.mutate()

    def do_PUT(self):
        self.mutate()

    def do_DELETE(self):
        self.mutate()

    def mutate(self):
        path = urlparse(self.path).path
        try:
            if not path.startswith("/api/"):
                raise Err(404, "not_found")
            if self.headers.get("X-Requested-With") != "dd":
                raise Err(403, "forbidden")
            body = self.body()
            extra = []

            def work(c):
                del extra[:]
                return self.route(c, path, body, extra)

            with LOCK:
                res = run(work)
            self.send(200, res, extra=extra)
        except Err as e:
            self.send(e.code, {"error": e.msg})
        except Exception as e:  # keep the server alive, tell the client
            sys.stderr.write("error: %r\n" % (e,))
            self.send(500, {"error": "server_error"})

    def throttle(self, name):
        key = (self.ip(), name)
        now = time.time()
        L = [t for t in FAILS.get(key, []) if now - t < 600]
        FAILS[key] = L
        if len(L) >= 10:
            raise Err(429, "too_many_attempts")

    def fail(self, name):
        FAILS.setdefault((self.ip(), name), []).append(time.time())

    def route(self, c, path, b, extra):
        me = self.session_user(c)
        admin = bool(me and me["role"] == "admin")

        if path == "/api/register":
            name = str(b.get("name") or "").strip().lower()
            disp = str(b.get("disp") or "").strip()[:60] or name
            pw = str(b.get("pass") or "")
            if not re.match(r"^[a-z0-9_]{3,32}$", name):
                raise Err(400, "bad_name")
            if len(pw) < 6 or len(pw) > 200:
                raise Err(400, "bad_pass")
            if c.execute("SELECT 1 FROM users WHERE name=?", (name,)).fetchone():
                raise Err(409, "name_taken")
            first = c.execute("SELECT 1 FROM users LIMIT 1").fetchone() is None
            row = new_user_row(name, disp, pw, "admin" if first else "player")
            c.execute("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)", row)
            extra.append(self.start_session(c, row[0]))
            u = c.execute("SELECT * FROM users WHERE id=?", (row[0],)).fetchone()
            return boot_state(c, u)

        if path == "/api/login":
            name = str(b.get("name") or "").strip().lower()
            self.throttle(name)
            u = c.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
            pw = str(b.get("pass") or "")
            if not u or not check_pw(u, pw):
                self.fail(name)
                c.commit()
                raise Err(401, "bad_login")
            if u["algo"] != "pbkdf2":  # upgrade old hashes on first login
                salt = secrets.token_hex(16)
                c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), u["id"]))
            extra.append(self.start_session(c, u["id"]))
            return boot_state(c, u)

        if path == "/api/logout":
            jar = cookies.SimpleCookie(self.headers.get("Cookie") or "")
            if COOKIE in jar:
                c.execute("DELETE FROM sessions WHERE tok=?", (hashlib.sha256(jar[COOKIE].value.encode()).hexdigest(),))
            extra.append(self.cookie_hdr("", 0))
            return {"ok": True}

        if not me:
            raise Err(401, "login_required")
        cat = kv_get(c, "cat")

        if path == "/api/me/password":
            if not check_pw(me, str(b.get("old") or "")):
                raise Err(403, "bad_login")
            pw = str(b.get("new") or "")
            if len(pw) < 6 or len(pw) > 200:
                raise Err(400, "bad_pass")
            salt = secrets.token_hex(16)
            c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), me["id"]))
            return {"ok": True}

        if path == "/api/sync":
            kind = b.get("kind")
            if kind not in ("pc", "npc"):
                raise Err(400, "bad_kind")
            if kind == "npc" and not admin:
                raise Err(403, "admin_only")
            user_ids = {r["id"] for r in c.execute("SELECT id FROM users")}
            saved, rejected = [], []
            for rec in (b.get("upsert") or [])[:500]:
                rid = str(rec.get("id", "")) if isinstance(rec, dict) else ""
                row = c.execute("SELECT owner,data FROM docs WHERE kind=? AND id=?", (kind, rid)).fetchone()
                existing = json.loads(row["data"]) if row else None
                if row and not admin and row["owner"] != me["id"]:
                    rejected.append(rid)
                    continue
                d = clean_record(rec, kind, existing, admin, me["id"], user_ids, cat)
                if d is None:
                    rejected.append(rid)
                    continue
                c.execute("INSERT INTO docs(kind,id,owner,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner, data=excluded.data",
                          (kind, d["id"], d["owner"], json.dumps(d)))
                saved.append(d)
            for rid in (b.get("del") or [])[:500]:
                row = c.execute("SELECT owner FROM docs WHERE kind=? AND id=?", (kind, str(rid))).fetchone()
                if row and (admin or row["owner"] == me["id"]):
                    c.execute("DELETE FROM docs WHERE kind=? AND id=?", (kind, str(rid)))
                elif row:
                    rejected.append(str(rid))
            return {"ok": True, "records": saved, "rejected": rejected}

        if path.startswith("/api/kv/") and admin:
            key = path.rsplit("/", 1)[1]
            if key not in ("cat", "site", "rooms"):
                raise Err(404, "not_found")
            v = b.get("value")
            if key == "cat" and (not isinstance(v, dict) or not isinstance(v.get("classes"), list)):
                raise Err(400, "bad_catalog")
            if key == "site" and not isinstance(v, dict):
                raise Err(400, "bad_site")
            if key == "rooms" and not isinstance(v, list):
                raise Err(400, "bad_rooms")
            kv_set(c, key, v)
            return {"ok": True}

        m = re.match(r"^/api/users/([A-Za-z0-9]+)/(role|password|delete)$", path)
        if m and admin:
            uid, what = m.groups()
            u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
            if not u:
                raise Err(404, "no_user")
            admins = c.execute("SELECT COUNT(*) n FROM users WHERE role='admin'").fetchone()["n"]
            if what == "role":
                role = b.get("role")
                if role not in ("admin", "player"):
                    raise Err(400, "bad_role")
                if u["role"] == "admin" and role == "player" and admins < 2:
                    raise Err(409, "last_admin")
                c.execute("UPDATE users SET role=? WHERE id=?", (role, uid))
            elif what == "password":
                pw = str(b.get("pass") or "")
                if len(pw) < 6 or len(pw) > 200:
                    raise Err(400, "bad_pass")
                salt = secrets.token_hex(16)
                c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), uid))
                c.execute("DELETE FROM sessions WHERE uid=?", (uid,))
                for k in [k for k in FAILS if k[1] == u["name"]]:
                    del FAILS[k]
            else:
                if u["role"] == "admin" and admins < 2:
                    raise Err(409, "last_admin")
                c.execute("DELETE FROM users WHERE id=?", (uid,))
                c.execute("DELETE FROM sessions WHERE uid=?", (uid,))
                for r in c.execute("SELECT id,data FROM docs WHERE kind='pc' AND owner=?", (uid,)).fetchall():
                    d = json.loads(r["data"])
                    d["owner"] = ""
                    c.execute("UPDATE docs SET owner='', data=? WHERE kind='pc' AND id=?", (json.dumps(d), r["id"]))
            return {"ok": True}

        if path == "/api/import" and admin:
            for key in ("cat", "site", "rooms"):
                if key in b and b[key] is not None:
                    kv_set(c, key, b[key])
            cat = kv_get(c, "cat")
            name_to_id = {}
            for r in c.execute("SELECT id,name FROM users"):
                name_to_id[r["name"]] = r["id"]
            id_map = {}
            for u in b.get("users") or []:  # accounts from the browser-only version keep their passwords
                if not isinstance(u, dict) or not re.match(r"^[a-z0-9_]{3,32}$", str(u.get("name", ""))):
                    continue
                if u["name"] in name_to_id:
                    id_map[u.get("id")] = name_to_id[u["name"]]
                    continue
                if not u.get("salt") or not u.get("hash"):
                    continue
                nid = secrets.token_hex(8)
                c.execute("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)",
                          (nid, u["name"], str(u.get("disp") or u["name"])[:60], "admin" if u.get("role") == "admin" else "player",
                           "legacy", str(u["salt"]), str(u["hash"]), time.time()))
                id_map[u.get("id")] = nid
                name_to_id[u["name"]] = nid
            user_ids = set(name_to_id.values())
            counts = {}
            for kind, key in (("pc", "pcs"), ("npc", "npcs")):
                c.execute("DELETE FROM docs WHERE kind=?", (kind,))
                n = 0
                for rec in b.get(key) or []:
                    if isinstance(rec, dict):
                        rec = dict(rec)
                        rec["owner"] = id_map.get(rec.get("owner"), rec.get("owner") if rec.get("owner") in user_ids else "")
                        d = clean_record(rec, kind, None, True, me["id"], user_ids, cat)
                        if d is not None:
                            c.execute("INSERT INTO docs(kind,id,owner,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner, data=excluded.data",
                                      (kind, d["id"], d["owner"], json.dumps(d)))
                            n += 1
                counts[key] = n
            return {"ok": True, "counts": counts}

        raise Err(403 if path.startswith("/api/") else 404, "forbidden")


# ------------------------------------------------------------------ command line helpers
def cli(args):
    init_db()
    c = db()
    cmd = args[0]
    if cmd == "list-users":
        for r in c.execute("SELECT name,disp,role FROM users ORDER BY created"):
            print("%-24s %-8s %s" % (r["name"], r["role"], r["disp"]))
        return
    if len(args) < 2:
        print(__doc__)
        sys.exit(2)
    name = args[1].strip().lower()
    u = c.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
    if not u:
        print("No user named %r. Existing users:" % name)
        for r in c.execute("SELECT name FROM users"):
            print("  " + r["name"])
        sys.exit(1)
    if cmd == "make-admin":
        c.execute("UPDATE users SET role='admin' WHERE id=?", (u["id"],))
        c.commit()
        print("%s is now an admin." % name)
    elif cmd == "reset-password":
        pw = args[2] if len(args) > 2 else getpass.getpass("New password for %s: " % name)
        if len(pw) < 6:
            print("Password must be at least 6 characters.")
            sys.exit(1)
        salt = secrets.token_hex(16)
        c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), u["id"]))
        c.execute("DELETE FROM sessions WHERE uid=?", (u["id"],))
        c.commit()
        print("Password for %s changed." % name)
    else:
        print(__doc__)
        sys.exit(2)


def main():
    if len(sys.argv) > 1:
        return cli(sys.argv[1:])
    init_db()
    port = int(os.environ.get("PORT", "8080"))
    host = os.environ.get("HOST", "0.0.0.0")
    srv = ThreadingHTTPServer((host, port), H)
    srv.daemon_threads = True
    print("Acacia Watch is running on http://%s:%d  (database: %s)" % (host if host != "0.0.0.0" else "localhost", port, "PostgreSQL" if PG else DB_PATH))
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
