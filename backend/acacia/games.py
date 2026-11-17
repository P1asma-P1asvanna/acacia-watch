"""Minigame definitions (rhythm / timing games). Stored in kv "games" as a list; only the admin edits them.
Every field is clamped here so a game can never carry odd values to the players' browsers."""
import re

from .images import URL_RE as IMG_URL

from .numbers import clampi

TYPES = ("timing", "lane", "tap", "mix")  # "simon" was removed: old Simon games become note lanes
EVENTS = ("shake", "hide", "show", "flip", "pulse", "sway", "flash", "spin", "tilt", "fog", "m_lane", "m_timing", "m_tap")  # m_*: a mix game changes how it is played
SHAPES = ("bar", "arrow", "circle", "diamond", "star", "img")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
DMG = re.compile(r"^\d{1,3}(d\d{1,3})?([+-]\d{1,3})?$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{3,40}$")
MAX_GAMES = 50
COLORS = {"bar": "#2a2a30", "zone": "#3b82f6", "perfect": "#facc15", "marker": "#ffffff"}


def clean_seg(s):
    """One stretch of the timeline: a play part (may override BPM, direction, zone, colours ...; 0 / empty = use the game's value)
    or a cutscene (no notes, the clip just plays)."""
    if not isinstance(s, dict):
        return None
    try:
        ln = round(float(s.get("len")), 1)
    except (TypeError, ValueError):
        ln = 10.0
    ln = max(0.5, min(600.0, ln if ln == ln else 10.0))
    hexv = lambda v: str(v) if HEX.match(str(v or "")) else ""
    zero_or = lambda v, lo, hi: 0 if not v or clampi(v, 0, 10 ** 6, 0) == 0 else clampi(v, lo, hi, 0)
    return {"kind": "cut" if s.get("kind") == "cut" else "play", "len": ln,
            "bpm": zero_or(s.get("bpm"), 30, 300), "beats": zero_or(s.get("beats"), 1, 8), "sub": zero_or(s.get("sub"), 1, 4),
            "fall": zero_or(s.get("fall"), 400, 4000), "zone": zero_or(s.get("zone"), 10, 95), "zw": zero_or(s.get("zw"), 4, 50),
            "dir": s.get("dir") if s.get("dir") in ("up", "down") else "", "key": str(s.get("key") or "").strip()[:12],
            "cz": hexv(s.get("cz")), "cp": hexv(s.get("cp"))}


def clean_chart(v, lanes):
    """Hand-placed notes of a lane game: [{t: ms from the game's zero, l: lane index}], sorted, no duplicates."""
    seen, out = set(), []
    for n in (v if isinstance(v, list) else [])[:800]:
        if not isinstance(n, dict):
            continue
        t, l = clampi(n.get("t"), 0, 3600000, 0), clampi(n.get("l"), 0, lanes - 1, 0)
        ln = clampi(n.get("len"), 0, 120000, 0)
        if (t, l) not in seen:
            seen.add((t, l))
            out.append({"t": t, "l": l, "len": ln if ln >= 40 else 0})
    return sorted(out, key=lambda x: (x["t"], x["l"]))


def clean_events(v, lanes):
    """Stage effects of a lane game: [{t, type, len ms, c: event column 0-2, l: lane (hide/show), v: strength 1-5}]."""
    seen, out = set(), []
    for e in (v if isinstance(v, list) else [])[:800]:
        if not isinstance(e, dict) or e.get("type") not in EVENTS:
            continue
        t, c = clampi(e.get("t"), 0, 3600000, 0), clampi(e.get("c"), 0, 5, 0)
        if (t, c) in seen:
            continue
        seen.add((t, c))
        out.append({"t": t, "type": e["type"], "len": clampi(e.get("len"), 0, 120000, 2000),
                    "c": c, "l": clampi(e.get("l"), 0, lanes - 1, 0), "v": clampi(e.get("v"), 1, 5, 3)})
    return sorted(out, key=lambda x: (x["t"], x["c"]))


def clean_game(g):
    if not isinstance(g, dict) or not ID_RE.match(str(g.get("id") or "")):
        return None
    nl = clampi(g.get("lanes"), 2, 8, 4)
    col = g.get("col") if isinstance(g.get("col"), dict) else {}
    dmg = str(g.get("dmg") or "").strip()[:12]
    return {
        "id": str(g["id"]),
        "name": str(g.get("name") or "")[:60].strip() or "Game",
        "type": "lane" if g.get("type") == "simon" else (g.get("type") if g.get("type") in TYPES else "timing"),
        "media": str(g.get("media") or "")[:300],
        "bpm": clampi(g.get("bpm"), 30, 300, 100),
        "offset": clampi(g.get("offset"), -5000, 60000, 0),
        "rounds": clampi(g.get("rounds"), 1, 64, 8),
        "beats": clampi(g.get("beats"), 1, 8, 2),
        "zone": clampi(g.get("zone"), 10, 95, 75),
        "zw": clampi(g.get("zw"), 4, 50, 16),
        "key": str(g.get("key") or "").strip()[:40],
        "lanes": nl,
        "chart": clean_chart(g.get("chart"), nl),
        "events": clean_events(g.get("events"), nl),
        "fall": clampi(g.get("fall"), 400, 4000, 1500),
        "sub": clampi(g.get("sub"), 1, 4, 1),
        "pat": re.sub(r"[^0-9 ]", "", str(g.get("pat") or ""))[:80].strip(),
        "ns": g.get("ns") if g.get("ns") in SHAPES else "bar",
        "nimgs": [(str(u) if isinstance(u, str) and IMG_URL.match(u) else "") for u in (g.get("nimgs") if isinstance(g.get("nimgs"), list) else [])[:10]],
        "cd": clampi(g.get("cd"), 0, 10, 3),
        "rn": clampi(g.get("rn"), 2, 8, 4),
        "brk": clampi(g.get("brk"), 0, 120, 8),
        "dur": clampi(g.get("dur"), 3, 60, 10),
        "goal": clampi(g.get("goal"), 1, 500, 30),
        "tmo": clampi(g.get("tmo"), 1000, 10000, 4000),
        "start": clampi(g.get("start"), 1, 8, 2),
        "segs": [x for x in (clean_seg(s) for s in (g.get("segs") if isinstance(g.get("segs"), list) else [])[:40]) if x],
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
