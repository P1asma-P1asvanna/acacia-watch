"""Uploaded pictures: checking, storing, quotas and clean-up.

Pictures live in the database (base64 text, so SQLite and PostgreSQL behave the same) and are served at
/img/<id> with a long cache time. Each picture belongs to one owner: a user id, or "site" for the shared logo/cover.
The id is random (unguessable) and never changes, so the browser downloads a picture once.
"""
import base64
import re
import struct
import time

from .config import (IMG_GRACE, IMG_SITE_MAX_BYTES, IMG_SITE_MAX_COUNT, IMG_SLOTS, IMG_USER_MAX_BYTES,
                     IMG_USER_MAX_COUNT)
from .errors import Err

URL_RE = re.compile(r"^img/([0-9a-f]{24})(?:\.(?:gif|png|jpg|webp))?$")
EXT = {"image/gif": ".gif", "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}
CACHE = {}  # id -> (mime, bytes); small in-memory copy so a picture is read from the database once
CACHE_MAX = 48


def info(raw):
    """(mime, width, height) from the file header, or None if it is not a JPEG / PNG / GIF / WebP picture."""
    try:
        if raw[:8] == b"\x89PNG\r\n\x1a\n" and raw[12:16] == b"IHDR":
            w, h = struct.unpack(">II", raw[16:24])
            return "image/png", w, h
        if raw[:6] in (b"GIF87a", b"GIF89a"):
            w, h = struct.unpack("<HH", raw[6:10])
            return "image/gif", w, h
        if raw[:2] == b"\xff\xd8":
            i = 2
            while i + 9 < len(raw):
                if raw[i] != 0xFF:
                    i += 1
                    continue
                mk = raw[i + 1]
                if mk == 0xFF:
                    i += 1
                    continue
                if mk in (0xD8, 0x01) or 0xD0 <= mk <= 0xD7:
                    i += 2
                    continue
                n = struct.unpack(">H", raw[i + 2:i + 4])[0]
                if 0xC0 <= mk <= 0xCF and mk not in (0xC4, 0xC8, 0xCC):
                    h, w = struct.unpack(">HH", raw[i + 5:i + 9])
                    return "image/jpeg", w, h
                i += 2 + n
            return None
        if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
            kind = raw[12:16]
            if kind == b"VP8 ":
                w, h = struct.unpack("<HH", raw[26:30])
                return "image/webp", w & 0x3FFF, h & 0x3FFF
            if kind == b"VP8L":
                b = raw[21:25]
                return "image/webp", 1 + (b[0] | ((b[1] & 0x3F) << 8)), 1 + ((b[1] >> 6) | (b[2] << 2) | ((b[3] & 0x0F) << 10))
            if kind == b"VP8X":
                return "image/webp", 1 + int.from_bytes(raw[24:27], "little"), 1 + int.from_bytes(raw[27:30], "little")
    except (struct.error, IndexError):
        pass
    return None


def check(slot, raw):
    """Raise Err with a short code if the picture breaks the rules of its slot. Returns (mime, w, h)."""
    sp = IMG_SLOTS[slot]
    got = info(raw)
    if not got:
        raise Err(400, "img_type")
    mime, w, h = got
    gif = mime == "image/gif"
    if len(raw) < 100:
        raise Err(400, "img_small_file")
    if len(raw) > (sp["gif_bytes"] if gif else sp["out_bytes"]):
        raise Err(400, "img_big_file")
    short, long_ = min(w, h), max(w, h)
    if sp.get("square") and w != h:
        raise Err(400, "img_square")
    if short < sp["min_short"] or long_ < sp["min_long"]:
        raise Err(400, "img_small_px")
    if long_ > (sp["gif_side"] if gif else sp["out"]):
        raise Err(400, "img_big_px")
    return mime, w, h


def referenced(c, owner):
    """Picture ids the owner currently uses (so they are never purged)."""
    from .store import kv_get
    if owner == "site":
        vals = [(kv_get(c, "site") or {}).get(k) for k in ("logo", "cover")]
        vals += [x.get("icon") for x in ((kv_get(c, "cat") or {}).get("conditions") or []) if isinstance(x, dict)]
    else:
        p = kv_get(c, "prefs:" + owner) or {}
        vals = [p.get(k) for k in ("imgBg", "imgPanel", "imgDeco")]
        pr = kv_get(c, "profile:" + owner) or {}
        vals += [pr.get("avatar"), pr.get("bg"), (pr.get("frame") or {}).get("img")]
    return {m.group(1) for v in vals if isinstance(v, str) for m in [URL_RE.match(v)] if m}


def purge(c, owner):
    """Delete the owner's pictures that are not in use and were uploaded a while ago."""
    keep = referenced(c, owner)
    for r in c.execute("SELECT id FROM images WHERE owner=? AND created<?", (owner, time.time() - IMG_GRACE)).fetchall():
        if r["id"] not in keep:
            c.execute("DELETE FROM images WHERE id=?", (r["id"],))
            CACHE.pop(r["id"], None)


def owned_ids(c, owner):
    return {r["id"] for r in c.execute("SELECT id FROM images WHERE owner=?", (owner,)).fetchall()}


def store(c, slot, owner, b64):
    try:
        raw = base64.b64decode(str(b64 or ""), validate=True)
    except Exception:
        raise Err(400, "img_type")
    mime, w, h = check(slot, raw)
    purge(c, owner)
    mx_n, mx_b = (IMG_SITE_MAX_COUNT, IMG_SITE_MAX_BYTES) if owner == "site" else (IMG_USER_MAX_COUNT, IMG_USER_MAX_BYTES)
    row = c.execute("SELECT COUNT(*) AS n, COALESCE(SUM(size),0) AS s FROM images WHERE owner=?", (owner,)).fetchone()
    if row["n"] + 1 > mx_n or row["s"] + len(raw) > mx_b:
        raise Err(409, "img_quota")
    import secrets
    iid = secrets.token_hex(12)
    c.execute("INSERT INTO images(id,owner,mime,w,h,size,data,created) VALUES(?,?,?,?,?,?,?,?)",
              (iid, owner, mime, w, h, len(raw), base64.b64encode(raw).decode(), time.time()))
    return {"ok": True, "url": "img/" + iid + EXT[mime], "w": w, "h": h, "size": len(raw)}


def fetch(c, iid):
    hit = CACHE.get(iid)
    if hit:
        return hit
    r = c.execute("SELECT mime,data FROM images WHERE id=?", (iid,)).fetchone()
    if not r:
        return None
    hit = (r["mime"], base64.b64decode(r["data"]))
    if len(CACHE) >= CACHE_MAX:
        CACHE.pop(next(iter(CACHE)))
    CACHE[iid] = hit
    return hit


def delete_owner(c, owner):
    for r in c.execute("SELECT id FROM images WHERE owner=?", (owner,)).fetchall():
        CACHE.pop(r["id"], None)
    c.execute("DELETE FROM images WHERE owner=?", (owner,))
