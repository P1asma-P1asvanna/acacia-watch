"""Game rules the server recomputes itself: hit points and armor class (players cannot fake them)."""
import re

from . import feats
from .numbers import clampi, jsround, mod, num, sgn_find


def hp_calc(d, cat):
    lvl = max(1, min(20, jsround(num(d.get("level"))) or 1))
    con = mod(feats.totals(d, cat)["con"])
    classes = (cat or {}).get("classes", [])
    co = sgn_find(classes, d.get("cls"))
    m = re.search(r"(\d+)", str((co or {}).get("hd", "")))
    die = int(m.group(1)) if m else 0
    avg = die // 2 + 1
    total = max(1, die + con) + max(1, avg + con) * (lvl - 1)
    race = sgn_find((cat or {}).get("races", []), d.get("race"))
    so = sgn_find((co or {}).get("subs", []), d.get("sub")) if co else None
    for src in (race, co, so):
        b = jsround(num((src or {}).get("bhp")))
        if b:
            total += b * lvl
    return max(1, total)


def eff_max(d, cat):
    if d.get("hpMode") == "manual" and num(d.get("hpManual")) >= 1:
        return jsround(num(d.get("hpManual")))
    return hp_calc(d, cat)


def armor_base(n):
    return re.sub(r"\s*\+\d+\s*$", "", str(n or "").strip()).lower()


def armor_of(it, cat):
    b = armor_base(it.get("name"))
    if not b:
        return None
    for a in (cat or {}).get("armor", []):
        if str(a.get("name", "")).lower() == b:
            return a
    return None


def item_ench(it):
    m = re.search(r"\+(\d+)\s*$", str(it.get("name") or ""))
    return int(m.group(1)) if m else 0


def ac_calc(d, cat):
    dx = mod(feats.totals(d, cat)["dex"])
    body = shield = None
    for it in d.get("items") or []:
        if not isinstance(it, dict) or not it.get("eq"):
            continue
        a = armor_of(it, cat)
        if not a:
            continue
        if re.search("shield", str(a.get("acat") or ""), re.I):
            shield = shield or (it, a)
        else:
            body = body or (it, a)
    if body:
        it, a = body
        armor = 10 + jsround(num(a.get("ac"))) + item_ench(it) + jsround(num(a.get("ench")))
        heavy = bool(re.search("heavy", str(a.get("acat") or ""), re.I))
        md = None if str(a.get("maxdex", "")).strip() == "" else jsround(num(a.get("maxdex")))
        dp = 0 if heavy else (dx if md is None else min(dx, md))
        total = armor + dp
    else:
        total = 10 + dx
    if shield:
        it, a = shield
        total += jsround(num(a.get("ac"))) + item_ench(it) + jsround(num(a.get("ench")))
    return total


def eff_ac(d, cat):
    if d.get("acMode") == "manual" and str(d.get("acManual", "")).strip() != "" and num(d.get("acManual")) >= 0:
        return jsround(num(d.get("acManual")))
    return ac_calc(d, cat)
