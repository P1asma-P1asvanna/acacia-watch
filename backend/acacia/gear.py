"""Worn gear: body slots, armour pieces worn together, attunement limit.

An armour catalog entry has `slots` (ids of the body slots it fills), `att` (needs attunement) and `fx` (the same effects
a feat can give). A character wears several pieces at once, but two pieces never share a slot, and at most ATT_MAX
attuned pieces count. Rules are applied in item-list order, the same order the browser uses, so both agree.
"""
import re

from .numbers import clampi

ATT_MAX = 3
SLOT_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")


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


def is_base(a):
    """Light, medium and heavy armour set the base AC; everything else (shield, helm, boots...) adds to it."""
    return bool(re.search("light|medium|heavy", str(a.get("acat") or ""), re.I))


def slots_of(a):
    return {s for s in (a.get("slots") or []) if isinstance(s, str)}


def worn(d, cat):
    """[(item, armor entry)] the character really wears: no slot used twice, attuned pieces capped."""
    out, used, att = [], set(), 0
    for it in d.get("items") or []:
        if not isinstance(it, dict) or not it.get("eq"):
            continue
        a = armor_of(it, cat)
        if not a:
            continue
        sl = slots_of(a)
        if sl & used:
            continue
        if a.get("att") in (1, True, "1"):
            if att >= ATT_MAX:
                continue
            att += 1
        used |= sl
        out.append((it, a))
    return out


def clean_cat_gear(v):
    """Clean the slot list and the armour entries' slots / att / fx inside a catalog."""
    from . import feats
    S = v.get("slots")
    ids = set()
    if isinstance(S, list):
        out = []
        for x in S[:60]:
            if isinstance(x, dict) and isinstance(x.get("id"), str) and SLOT_RE.match(x["id"]) and x["id"] not in ids:
                ids.add(x["id"])
                out.append({"id": x["id"], "name": str(x.get("name") or "")[:40]})
        v["slots"] = out
    A = v.get("armor")
    if isinstance(A, list):
        for a in A:
            if not isinstance(a, dict):
                continue
            sl = a.get("slots")
            a["slots"] = [s for s in dict.fromkeys(sl) if isinstance(s, str) and s in ids][:20] if isinstance(sl, list) else []
            a["att"] = 1 if a.get("att") in (1, True, "1") else 0
            a["fx"] = feats.clean_fx(a.get("fx"))
    return v
