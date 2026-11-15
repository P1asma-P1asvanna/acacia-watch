"""Minigame definitions (rhythm / timing games). Stored in kv "games" as a list; only the admin edits them.
Every field is clamped here so a game can never carry odd values to the players' browsers."""
import re

from .numbers import clampi

TYPES = ("timing", "lane", "simon", "tap")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
DMG = re.compile(r"^\d{1,3}(d\d{1,3})?([+-]\d{1,3})?$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{3,40}$")
MAX_GAMES = 50
COLORS = {"bar": "#2a2a30", "zone": "#3b82f6", "perfect": "#facc15", "marker": "#ffffff"}


def clean_game(g):
    if not isinstance(g, dict) or not ID_RE.match(str(g.get("id") or "")):
        return None
    col = g.get("col") if isinstance(g.get("col"), dict) else {}
    dmg = str(g.get("dmg") or "").strip()[:12]
    return {
        "id": str(g["id"]),
        "name": str(g.get("name") or "")[:60].strip() or "Game",
        "type": g.get("type") if g.get("type") in TYPES else "timing",
        "media": str(g.get("media") or "")[:300],
        "bpm": clampi(g.get("bpm"), 30, 300, 100),
        "offset": clampi(g.get("offset"), -5000, 60000, 0),
        "rounds": clampi(g.get("rounds"), 1, 64, 8),
        "beats": clampi(g.get("beats"), 1, 8, 2),
        "zone": clampi(g.get("zone"), 10, 95, 75),
        "zw": clampi(g.get("zw"), 4, 50, 16),
        "key": str(g.get("key") or "").strip()[:12],
        "col": {k: (str(col.get(k)) if HEX.match(str(col.get(k) or "")) else d) for k, d in COLORS.items()},
        "dmg": dmg if DMG.match(dmg) else "",
        "dmgMode": "auto" if g.get("dmgMode") == "auto" else "confirm",
        "play": "one" if g.get("play") == "one" else "all",
    }


def clean_list(v):
    out, seen = [], set()
    for g in (v if isinstance(v, list) else [])[:MAX_GAMES]:
        c = clean_game(g)
        if c and c["id"] not in seen:
            seen.add(c["id"])
            out.append(c)
    return out
