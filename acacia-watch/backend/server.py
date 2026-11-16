#!/usr/bin/env python3
"""Acacia Watch server. Python 3.8+.

Run:     python3 backend/server.py            (then open http://localhost:8080)
Options (environment variables):
  PORT=8080                 port to listen on
  HOST=0.0.0.0              address to listen on
  DD_DB=...                 SQLite database file (used when DATABASE_URL is not set)
  DATABASE_URL=postgresql://...  use PostgreSQL (for example Neon); needs: pip install -r requirements.txt
  DD_COOKIE_SECURE=1        set when the site is served over https
  DD_TRUST_PROXY=1          set when behind a reverse proxy (uses X-Forwarded-For for login throttling)
  DD_FRONTEND=...           folder with the web page (default: ../frontend)
  DD_LOG=1                  log every request
Commands: list-users | make-admin <username> | reset-password <username>
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from http.server import ThreadingHTTPServer

from acacia.cli import USAGE, cli
from acacia.config import DB_PATH, PG
from acacia.database import init_db
from acacia.handler import H


def main():
    if len(sys.argv) > 1:
        if sys.argv[1] in ("-h", "--help", "help"):
            print(__doc__)
            return
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
