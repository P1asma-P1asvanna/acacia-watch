"""Spells: the catalog list (the GM fills it in) and what a character stores about casting.

Character fields:
  sl    : {"u": [used slots for levels 1..9], "p": used pact slots}
  spells: [{"n": name, "p": 0|1 prepared}]
  conc  : name of the spell being concentrated on, or ""
The slot tables themselves live in the page (11c-spells.js); the server only keeps the numbers sane.
"""
from .numbers import clampi


TIME_K = ("action", "bonus", "reaction", "minute", "hour", "special")
DUR_K = ("instant", "round", "minute", "hour", "day", "until", "special")


def _k(v, allowed, default):
    return v if v in allowed else default


def _n(v):
    n = clampi(v, 0, 999, 0)
    return n if n else ""


def clean_cat_spells(v):
    out, seen = [], set()
    for x in (v.get("spells") if isinstance(v.get("spells"), list) else [])[:800]:
        if not isinstance(x, dict):
            continue
        name = str(x.get("name") or "").strip()[:80]
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        out.append({"id": str(x.get("id") or name)[:40], "name": name, "lvl": clampi(x.get("lvl"), 0, 9, 0),
                    "school": str(x.get("school") or "")[:40], "time": str(x.get("time") or "")[:80],
                    "range": str(x.get("range") or "")[:80], "comp": str(x.get("comp") or "")[:120],
                    "dur": str(x.get("dur") or "")[:80], "conc": 1 if x.get("conc") in (1, True, "1") else 0,
                    "rit": 1 if x.get("rit") in (1, True, "1") else 0, "classes": str(x.get("classes") or "")[:160],
                    "timeK": _k(x.get("timeK"), TIME_K, "special"), "timeN": _n(x.get("timeN")), "timeX": str(x.get("timeX") or "")[:80],
                    "durK": _k(x.get("durK"), DUR_K, "special"), "durN": _n(x.get("durN")), "durX": str(x.get("durX") or "")[:80],
                    "desc": str(x.get("desc") or "")[:8000]})
    v["spells"] = out


def clean_casting(d):
    sl = d.get("sl") if isinstance(d.get("sl"), dict) else {}
    u = sl.get("u") if isinstance(sl.get("u"), list) else []
    d["sl"] = {"u": [clampi(u[i] if i < len(u) else 0, 0, 9, 0) for i in range(9)], "p": clampi(sl.get("p"), 0, 9, 0)}
    L = []
    for s in (d.get("spells") if isinstance(d.get("spells"), list) else [])[:300]:
        if isinstance(s, dict) and str(s.get("n") or "").strip():
            L.append({"n": str(s["n"]).strip()[:80], "p": 1 if s.get("p") in (1, True, "1") else 0})
    d["spells"] = L
    d["conc"] = str(d.get("conc") or "")[:80]
