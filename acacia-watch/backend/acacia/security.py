"""Password hashing."""
import hashlib
import hmac
import secrets
import time

from .config import PBKDF2_ITER


def hash_pw(pw, salt, algo="pbkdf2"):
    if algo == "legacy":  # sha256(salt:pw), what the browser-only version used
        return hashlib.sha256((salt + ":" + pw).encode()).hexdigest()
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), PBKDF2_ITER).hex()


def new_user_row(name, disp, pw, role):
    salt = secrets.token_hex(16)
    return (secrets.token_hex(8), name, disp, role, "pbkdf2", salt, hash_pw(pw, salt), time.time())


def check_pw(row, pw):
    return hmac.compare_digest(hash_pw(pw, row["salt"], row["algo"]), row["hash"])
