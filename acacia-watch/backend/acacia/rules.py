"""Game rules the server recomputes itself: hit points and armor class (players cannot fake them)."""
import re

from . import feats, gear, multiclass
from .gear import armor_base, armor_of, item_ench  # noqa: F401
from .numbers import clampi, jsround, mod, num, sgn_find


def hp_calc(d, cat):
    lvl = max(1, min(20, jsround(num(d.get("level"))) or 1))
    con = mod(feats.totals(d, cat)["con"])
    classes = (cat or {}).get("classes", [])
    race = sgn_find((cat or {}).get("races", []), d.get("race"))
    total = 0
    for i, r in enumerate(multiclass.rows(d)):
        co = sgn_find(classes, r["cls"])
        m = re.search(r"(\d+)", str((co or {}).get("hd", "")))
        die = int(m.group(1)) if m else 0
        avg = die // 2 + 1
        n = r["level"]
        if i == 0:   # the very first level takes the full die
            total += max(1, die + con)
            n -= 1
        total += max(1, avg + con) * n
        so = sgn_find((co or {}).get("subs", []), r["sub"]) if co else None
        for src in (co, so):
            b = jsround(num((src or {}).get("bhp")))
            if b:
                total += b * r["level"]
    b = jsround(num((race or {}).get("bhp")))
    if b:
        total += b * lvl
    total += feats.fx_totals(d, cat)["hp"]
    return max(1, total)


def eff_max(d, cat):
    if d.get("hpMode") == "manual" and num(d.get("hpManual")) >= 1:
        return jsround(num(d.get("hpManual")))
    return hp_calc(d, cat)


def ac_calc(d, cat):
    dx = mod(feats.totals(d, cat)["dex"])
    pieces = gear.worn(d, cat)
    body = next(((it, a) for it, a in pieces if gear.is_base(a)), None)
    if body:
        it, a = body
        armor = 10 + jsround(num(a.get("ac"))) + item_ench(it) + jsround(num(a.get("ench")))
        heavy = bool(re.search("heavy", str(a.get("acat") or ""), re.I))
        md = None if str(a.get("maxdex", "")).strip() == "" else jsround(num(a.get("maxdex")))
        dp = 0 if heavy else (dx if md is None else min(dx, md))
        total = armor + dp
    else:
        total = 10 + dx
    total += feats.fx_totals(d, cat, armor=bool(body))["ac"]
    for it, a in pieces:
        if not gear.is_base(a):
            total += jsround(num(a.get("ac"))) + item_ench(it) + jsround(num(a.get("ench")))
    return total


def eff_ac(d, cat):
    if d.get("acMode") == "manual" and str(d.get("acManual", "")).strip() != "" and num(d.get("acManual")) >= 0:
        return jsround(num(d.get("acManual")))
    return ac_calc(d, cat)
