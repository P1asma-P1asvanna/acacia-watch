"""Feedback written by players (and the GM) inside the site. The GM exports it as one file and gives it to Claude.
Stored in kv "fb": a list of entries, newest last. Players only ever see their own; the admin sees all."""
import re
import secrets
import time

from .errors import Err
from .images import URL_RE
from .numbers import clampi

KINDS = ("bug", "idea", "confusing", "other")
AREAS = ("general", "players", "adventure", "initiative", "minigames", "dice", "data", "profile", "site", "other")
STATUS = ("new", "read", "done", "skip")
MAX_ENTRIES = 500
MAX_OPEN_PER_USER = 25


def _s(v, n):
    return str(v or "").strip()[:n]


def _ctx(v):
    v = v if isinstance(v, dict) else {}
    return {k: _s(v.get(k), n) for k, n in (("view", 30), ("scr", 24), ("vp", 24), ("dpr", 8), ("ua", 200), ("lang", 8), ("touch", 4), ("net", 8))}


def clean_list(v):
    out = []
    for e in (v if isinstance(v, list) else [])[:MAX_ENTRIES]:
        if isinstance(e, dict) and re.match(r"^f[0-9a-f]{8}$", str(e.get("id") or "")):
            out.append(e)
    return out


def view(lst, me, admin):
    return [e for e in clean_list(lst) if admin or e.get("uid") == me["id"]]


def shot_ids(lst):
    return [str(e.get("shot")) for e in clean_list(lst) if e.get("shot")]


def apply(lst, me, admin, b, owned):
    """One operation from the page. `owned` = picture ids the sender uploaded to the feedback folder. Returns the new list."""
    lst = clean_list(lst)
    op = str(b.get("op") or "")
    if op == "add":
        what = _s(b.get("what"), 1500)
        title = _s(b.get("title"), 80)
        if not what and not title:
            raise Err(400, "fb_empty")
        if sum(1 for e in lst if e.get("uid") == me["id"] and e.get("status") == "new") >= MAX_OPEN_PER_USER:
            raise Err(429, "fb_too_many")
        shot = _s(b.get("shot"), 80)
        m = URL_RE.match(shot) if shot else None
        shot = shot if m and m.group(1) in owned else ""
        e = {"id": "f" + secrets.token_hex(4), "uid": me["id"], "name": _s(me["disp"] or me["name"] or "?", 40),
             "role": "admin" if admin else "player", "at": int(time.time()),
             "kind": b.get("kind") if b.get("kind") in KINDS else "other",
             "area": b.get("area") if b.get("area") in AREAS else "general",
             "sev": clampi(b.get("sev"), 1, 3, 2), "title": title or what[:60],
             "what": what, "expect": _s(b.get("expect"), 1000), "steps": _s(b.get("steps"), 1000),
             "shot": shot, "ctx": _ctx(b.get("ctx")), "status": "new", "note": ""}
        lst.append(e)
        if len(lst) > MAX_ENTRIES:  # drop the oldest finished ones first
            done = [x for x in lst if x.get("status") in ("done", "skip")]
            lst.remove(done[0] if done else lst[0])
        return lst
    eid = str(b.get("id") or "")
    e = next((x for x in lst if x.get("id") == eid), None)
    if not e or (not admin and e.get("uid") != me["id"]):
        raise Err(404, "not_found")
    if op == "del":
        if not admin and e.get("status") != "new":
            raise Err(403, "forbidden")
        return [x for x in lst if x is not e]
    if not admin:
        raise Err(403, "admin_only")
    if op == "status":
        ids = b.get("ids") if isinstance(b.get("ids"), list) else [eid]
        st = b.get("status") if b.get("status") in STATUS else "read"
        for x in lst:
            if x.get("id") in [str(i) for i in ids[:MAX_ENTRIES]]:
                x["status"] = st
    elif op == "note":
        e["note"] = _s(b.get("note"), 1000)
    else:
        raise Err(400, "bad_op")
    return lst
