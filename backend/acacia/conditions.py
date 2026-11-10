"""Condition rules: what a condition does (duration, and rules of the form "when ... [save] -> do ...").

The rules are plain data that the admin builds on the Game data page. Only known words are kept, so what is stored is
always a safe, bounded structure (the page may later run it in the Initiative tracker).
"""
import re
import secrets

ABS = ("STR", "DEX", "CON", "INT", "WIS", "CHA")
WHEN = ("always", "apply", "start", "end", "damaged")
UNITS = ("turn", "round")
DUR_UNITS = ("", "turn", "round", "minute", "hour")
DTYPES = ("acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic",
          "radiant", "slashing", "thunder")
ADV_ON = ("attack", "attacked", "check", "save")
SPEED = ("zero", "half", "add")
DICE = re.compile(r"^\d{1,2}d\d{1,3}(?:[+-]\d{1,3})?$|^\d{1,4}$")
MAX_RULES, MAX_ACTS = 12, 6


def _int(v, lo, hi, d=0):
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return d
    return max(lo, min(hi, n))


def _id(v):
    return v if isinstance(v, str) and re.match(r"^[A-Za-z0-9_-]{1,40}$", v) else secrets.token_hex(6)


def clean_act(a, cond_ids):
    if not isinstance(a, dict):
        return None
    t = a.get("t")
    if t in ("dmg", "heal"):
        dice = str(a.get("dice") or "").replace(" ", "")
        out = {"t": t, "dice": dice if DICE.match(dice) else "1d4"}
        if t == "dmg":
            out["dtype"] = a.get("dtype") if a.get("dtype") in DTYPES else "fire"
        return out
    if t in ("add", "rem"):
        cid = a.get("cid")
        return {"t": t, "cid": cid if cid == "self" and t == "rem" or cid in cond_ids else ("self" if t == "rem" else "")}
    if t == "adv":
        return {"t": t, "mode": "dis" if a.get("mode") == "dis" else "adv",
                "on": a.get("on") if a.get("on") in ADV_ON else "attack",
                "ab": a.get("ab") if a.get("ab") in ABS else ""}
    if t == "speed":
        m = a.get("m") if a.get("m") in SPEED else "zero"
        return {"t": t, "m": m, "n": _int(a.get("n"), -200, 200, 0)}
    if t == "ac":
        return {"t": t, "n": _int(a.get("n"), -20, 20, 0)}
    if t == "noact":
        return {"t": t}
    if t == "text":
        return {"t": t, "text": str(a.get("text") or "")[:200]}
    return None


def clean_rule(r, cond_ids):
    if not isinstance(r, dict):
        return None
    when = r.get("when") if r.get("when") in WHEN else "always"
    out = {"id": _id(r.get("id")), "when": when, "unit": r.get("unit") if r.get("unit") in UNITS else "turn"}
    sv = r.get("save")
    out["save"] = ({"ab": sv.get("ab") if sv.get("ab") in ABS else "CON", "dc": _int(sv.get("dc"), 1, 40, 10),
                    "on": "pass" if sv.get("on") == "pass" else "fail"}
                   if isinstance(sv, dict) and when != "always" else None)
    acts = [clean_act(a, cond_ids) for a in (r.get("acts") if isinstance(r.get("acts"), list) else [])[:MAX_ACTS]]
    out["acts"] = [a for a in acts if a]
    return out


def clean_condition(x, cond_ids):
    """Clean the duration and rules of one condition (in place)."""
    d = x.get("dur") if isinstance(x.get("dur"), dict) else {}
    u = d.get("u") if d.get("u") in DUR_UNITS else ""
    x["dur"] = {"u": u, "n": _int(d.get("n"), 1, 999, 1) if u else 0}
    rules = [clean_rule(r, cond_ids) for r in (x.get("rules") if isinstance(x.get("rules"), list) else [])[:MAX_RULES]]
    x["rules"] = [r for r in rules if r]
    x.pop("th", None)
