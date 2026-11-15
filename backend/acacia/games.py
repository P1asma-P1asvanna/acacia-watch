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
        "key": str(g.get("key") or "").strip()[:40],
        "lanes": clampi(g.get("lanes"), 2, 8, 4),
        "fall": clampi(g.get("fall"), 400, 4000, 1500),
        "sub": clampi(g.get("sub"), 1, 4, 1),
        "pat": re.sub(r"[^0-9 ]", "", str(g.get("pat") or ""))[:80].strip(),
        "dur": clampi(g.get("dur"), 3, 60, 10),
        "goal": clampi(g.get("goal"), 1, 500, 30),
        "tmo": clampi(g.get("tmo"), 1000, 10000, 4000),
        "start": clampi(g.get("start"), 1, 8, 2),
        "dir": "up" if g.get("dir") == "up" else "down",
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


def roll_dmg(s, n):
    """Damage for n misses from a string like 3, 1d6 or 2d4+1 (each miss rolled on its own)."""
    import secrets
    m = re.match(r"^(\d+)(?:d(\d+))?([+-]\d+)?$", s or "")
    if not m or n <= 0:
        return 0
    tot = 0
    for _ in range(n):
        v = int(m.group(3) or 0)
        if m.group(2):
            v += sum(secrets.randbelow(max(1, int(m.group(2)))) + 1 for _ in range(int(m.group(1))))
        else:
            v += int(m.group(1))
        tot += max(0, v)
    return tot
