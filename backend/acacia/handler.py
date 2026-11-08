"""HTTP plumbing: sessions, JSON replies, static files, and dispatch to the API routes."""
import gzip
import hashlib
import json
import os
import secrets
import sys
import time
from http import cookies
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, unquote, urlparse

from . import live
from .config import COOKIE, FRONTEND_DIR, LOCK, MAX_BODY, POLL_SECONDS, SESSION_DAYS
from .database import run
from .errors import Err
from .routes import Routes
from .store import boot_state

MIME = {".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".json": "application/json",
        ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
        ".gif": "image/gif", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain"}
QUIET = ("/api/login", "/api/logout", "/api/me/password")  # these change nothing others can see
STATIC = {}  # full path -> ((mtime, size), bytes, gzipped bytes or None, etag)


class H(Routes, BaseHTTPRequestHandler):
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

    def send(self, code, body, ctype="application/json", extra=None, cache="no-store"):
        if not isinstance(body, (bytes, bytearray)):
            body = json.dumps(body).encode()
        try:
            self._reply(code, body, ctype, extra, cache)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser went away (closed the tab, reloaded); nothing to do

    def _reply(self, code, body, ctype, extra, cache):
        self.send_response(code)
        self.send_header("Content-Type", ctype + ("; charset=utf-8" if ctype.startswith("text") or ctype in ("application/json", "application/javascript") else ""))
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
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
            if path == "/healthz":
                return self.send(200, {"ok": True})
            if path == "/api/boot":
                with LOCK:
                    res = run(lambda c: boot_state(c, self.session_user(c)))
                return self.send(200, res)
            if path == "/api/poll":
                return self.poll()
            if path.startswith("/api/"):
                return self.send(404, {"error": "not_found"})
            return self.static(path)
        except Err as e:
            return self.send(e.code, {"error": e.msg})

    def poll(self):
        """Live updates: answer when the data version differs from ?v=, or after POLL_SECONDS (see live.py)."""
        if COOKIE not in cookies.SimpleCookie(self.headers.get("Cookie") or ""):
            raise Err(401, "unauthorized")
        try:
            since = int(parse_qs(urlparse(self.path).query).get("v", [""])[0])
        except ValueError:
            since = None
        cur = live.wait(since, POLL_SECONDS)
        if cur is None:
            raise Err(503, "busy")
        return self.send(200, {"v": cur})

    def static(self, path):
        """Serve a file from frontend/. index.html gets the marker that tells the page it has a server."""
        rel = "index.html" if path in ("/", "") else unquote(path).lstrip("/")
        full = os.path.realpath(os.path.join(FRONTEND_DIR, rel))
        root = os.path.realpath(FRONTEND_DIR)
        if (full != root and not full.startswith(root + os.sep)) or not os.path.isfile(full):
            return self.send(404, {"error": "not_found"})
        ext = os.path.splitext(full)[1].lower()
        ctype = MIME.get(ext)
        if not ctype:
            return self.send(404, {"error": "not_found"})
        st = os.stat(full)
        key = (st.st_mtime_ns, st.st_size)
        hit = STATIC.get(full)
        if not hit or hit[0] != key:
            with open(full, "rb") as f:
                raw = f.read()
            if rel == "index.html":
                raw = raw.replace(b"</head>", b'<meta name="dd-server" content="1"></head>', 1)
            etag = '"%s"' % hashlib.sha1(raw).hexdigest()[:16]
            gz = gzip.compress(raw, 6) if ctype.startswith(("text/", "application/javascript")) and len(raw) > 600 else None
            hit = STATIC[full] = (key, raw, gz, etag)
        _, raw, gz, etag = hit
        # pages are always re-checked (so edits show up at once); the browser keeps a copy and only asks "changed?" (304)
        extra = [("ETag", etag), ("Vary", "Accept-Encoding")]
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            return
        body = raw
        if gz is not None and "gzip" in (self.headers.get("Accept-Encoding") or ""):
            body = gz
            extra.append(("Content-Encoding", "gzip"))
        self.send(200, body, ctype, extra=extra, cache="no-cache")

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
            if path not in QUIET:
                live.bump()  # tell everybody who is waiting that something changed
            self.send(200, res, extra=extra)
        except Err as e:
            self.send(e.code, {"error": e.msg})
        except Exception as e:  # keep the server alive, tell the client
            sys.stderr.write("error: %r\n" % (e,))
            self.send(500, {"error": "server_error"})
