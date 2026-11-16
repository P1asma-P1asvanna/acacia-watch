"""Command line helpers: python backend/server.py list-users | make-admin NAME | reset-password NAME"""
import getpass
import secrets
import sys

from .database import db, init_db
from .security import hash_pw

USAGE = """Commands:
  python3 backend/server.py reset-password <username>     set a new password (asks for it)
  python3 backend/server.py make-admin <username>         turn an account into an admin
  python3 backend/server.py list-users"""


def cli(args):
    init_db()
    c = db()
    cmd = args[0]
    if cmd == "list-users":
        for r in c.execute("SELECT name,disp,role FROM users ORDER BY created"):
            print("%-24s %-8s %s" % (r["name"], r["role"], r["disp"]))
        return
    if len(args) < 2:
        print(USAGE)
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
        print(USAGE)
        sys.exit(2)
