"""Live view of a rhythm game for the other people in the room. Memory only, nothing is written to the database.

The player's browser posts a small snapshot about twice a second (song position + the results so far); the others
hold a long-poll open and get every new snapshot at once, then replay the same game locally in a small window.
Snapshots that stop coming for TTL seconds count as "stopped playing"."""
import re
import threading
import time

from .numbers import clampi

TTL = 6.0
MAX_WAITERS = 150
_cv = threading.Condition()
_v = 0
_waiting = 0
_rooms = {}    # room id -> {pc id: {uid, name, run, snap, ts}}
_known = {}    # (uid, room, pc, run) -> (name, valid until)
RES = re.compile(r"^[phm.]{0,900}$")


def clean(b):
    ph = str(b.get("ph") or "")
    if ph not in ("count", "run", "done", "x"):
        return None
    out = {"ph": ph, "T": clampi(b.get("T"), -20000, 3600000, 0), "tp": clampi(b.get("tp"), 0, 500, 0)}
    for k in ("r", "rr", "rt"):
        s = str(b.get(k) or "")
        out[k] = s if RES.match(s) else ""
    return out


def known(key):
    hit = _known.get(key)
    return hit[0] if hit and hit[1] > time.time() else None


def remember(key, name):
    if len(_known) > 500:
        _known.clear()
    _known[key] = (name, time.time() + 60)


def post(room, pc, uid, name, run, snap):
    global _v
    with _cv:
        d = _rooms.setdefault(room, {})
        if snap["ph"] == "x":
            d.pop(pc, None)
        else:
            d[pc] = {"uid": uid, "name": name, "run": run, "snap": snap, "ts": time.time()}
        _v += 1
        _cv.notify_all()


def view(room):
    now = time.time()
    d = _rooms.get(room) or {}
    for pc in [k for k, s in d.items() if now - s["ts"] > TTL]:
        d.pop(pc, None)
    return [{"pc": pc, "uid": s["uid"], "name": s["name"], "run": s["run"], "age": int((now - s["ts"]) * 1000), "snap": s["snap"]}
            for pc, s in d.items()]


def wait(room, since, seconds):
    """The current version; if it equals `since`, hold the call until a snapshot arrives or time runs out. None = too busy."""
    global _waiting
    with _cv:
        if since is None or since != _v:
            return _v
        if _waiting >= MAX_WAITERS:
            return None
        _waiting += 1
        try:
            _cv.wait_for(lambda: _v != since, timeout=seconds)
        finally:
            _waiting -= 1
        return _v
