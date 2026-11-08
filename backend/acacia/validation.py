"""Cleaning of character records sent by the browser (clamping, ownership, admin-only fields)."""
import re

from .numbers import clampi, num
from .rules import ac_calc, eff_ac, eff_max, hp_calc


ID_RE = re.compile(r"^[A-Za-z0-9_-]{3,40}$")
PREF_COLORS = ("bg", "surface", "ink", "accent", "side", "fxc", "tnow", "tnext", "tdone", "navb")


def clean_prefs(v):
    """Personal look-and-feel settings (colors, effects, shape, rows per page). Unknown keys are dropped."""
    out = {}
    if not isinstance(v, dict):
        return out
    for k in PREF_COLORS:
        s = v.get(k)
        if isinstance(s, str) and re.match(r"^#[0-9a-fA-F]{6}$", s):
            out[k] = s.lower()
    if v.get("fx") in ("lift", "glow", "shine", "bounce", "none"):
        out["fx"] = v["fx"]
    if v.get("font") in ("Alegreya", "Cinzel", "Sarabun", "Plex"):
        out["font"] = v["font"]
    for k, lo, hi in (("fxms", 60, 500), ("fxamt", 0, 10), ("radius", 0, 20), ("pg", 3, 100)):
        if v.get(k) not in (None, ""):
            out[k] = clampi(v[k], lo, hi, lo)
    return out


ADMIN_ONLY = ("hpMode", "hpManual", "acMode", "acManual")


def clean_record(rec, kind, existing, actor_is_admin, actor_id, user_ids, cat):
    """Return a record that is safe to store, or None to reject."""
    if not isinstance(rec, dict) or not ID_RE.match(str(rec.get("id", ""))):
        return None
    d = dict(rec)
    d["kind"] = kind
    ab = d.get("abil") if isinstance(d.get("abil"), dict) else {}
    d["abil"] = {k: clampi(ab.get(k), 1, 30, 10) for k in ("str", "dex", "con", "int", "wis", "cha")}
    d["level"] = clampi(d.get("level"), 1, 20, 1)
    d["xp"] = clampi(d.get("xp"), 0, 10_000_000, 0)
    d["name"] = str(d.get("name") or "")[:120]
    if kind == "pc":
        if actor_is_admin:
            owner = str(d.get("owner") or "")
            d["owner"] = owner if owner in user_ids else ""
        else:
            d["owner"] = actor_id
    else:
        d["owner"] = ""
    if not actor_is_admin:
        # players cannot choose how max HP and AC are set; keep what the admin stored
        for k in ADMIN_ONLY:
            if existing is not None and k in existing:
                d[k] = existing[k]
            else:
                d[k] = "auto" if k.endswith("Mode") else ""
    d["hpTemp"] = clampi(d.get("hpTemp"), 0, 999, 0)
    d["hdUsed"] = clampi(d.get("hdUsed"), 0, 20, 0)
    if cat is None:  # catalog not uploaded yet (should not happen): trust the sizes the page computed
        d["hp"] = clampi(d.get("hp"), 1, 100000, 10)
    else:
        d["hp"] = eff_max(d, cat)
    if d.get("hpCur") is not None:
        d["hpCur"] = max(0, min(clampi(d.get("hpCur"), 0, 100000, 0), d["hp"]))
    d["ac"] = clampi(d.get("ac"), 0, 100, 10) if cat is None else eff_ac(d, cat)
    return d
