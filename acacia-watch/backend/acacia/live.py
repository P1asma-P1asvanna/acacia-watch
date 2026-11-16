"""Live updates by long polling.

The server keeps one number that goes up every time somebody saves something. A browser asks
"has it changed since N?" and the server holds that question open (without touching the database)
until the number changes or ~25 seconds pass, then answers. The browser then loads the new data.
The number lives in memory; after a restart it is different, which just makes every browser reload once.
"""
import secrets
import threading

MAX_WAITERS = 200  # open questions at once; beyond this the server says "busy" and the browser retries later

_cv = threading.Condition()
_version = secrets.randbits(30)
_waiting = 0


def current():
    return _version


def bump():
    global _version
    with _cv:
        _version += 1
        _cv.notify_all()


def wait(since, seconds):
    """Return the current version. If `since` equals it, hold the call until it changes or time runs out.
    Returns None when too many callers are already waiting."""
    global _waiting
    with _cv:
        if since is None or since != _version:
            return _version
        if _waiting >= MAX_WAITERS:
            return None
        _waiting += 1
        try:
            _cv.wait_for(lambda: _version != since, timeout=seconds)
        finally:
            _waiting -= 1
        return _version
