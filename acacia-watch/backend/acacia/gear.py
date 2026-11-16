"""Worn gear: body slots, armour pieces worn together, attunement limit.

Every armour catalog entry belongs to one body category (`slot`: head, rings, back...), has a `kind` (Helmet, Cape...), a point
cost `pts`, `att` (needs attunement) and `fx` (the same effects a feat can give). A category holds at most `max` pieces, all
worn pieces together may cost at most CAT.eqMax points (12), and at most ATT_MAX attuned pieces count.
"""
import re

from .numbers import clampi

ATT_MAX = 3
LEGACY = {"torso": "armor", "armL": "armor", "armR": "armor", "head": "hat", "face": "face", "neck": "neck",
          "back": "back", "waist": "waist", "hands": "hands", "feet": "feet"}
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


def slot_map(cat):
    return {s.get("id"): s for s in (cat or {}).get("slots", []) if isinstance(s, dict)}


def eq_max(cat):
    return clampi((cat or {}).get("eqMax"), 1, 99, 12)


def item_cost(a, slot):
    """Points a piece costs: its own cost, +1 when the category counts special abilities and the piece has effects."""
    return clampi(a.get("pts"), 0, 20, 0) + (1 if slot and slot.get("sp") and a.get("fx") else 0)


def check(d, cat):
    """Walk the equipped pieces in list order. Returns (worn, skipped, points, attuned).
    A piece is skipped when its category is full, the points would pass the limit, a second base armour
    would be worn, or attunement is full. The browser applies the very same rules."""
    slots, limit = slot_map(cat), eq_max(cat)
    worn_, skipped, count, total, att, base = [], [], {}, 0, 0, False
    for it in d.get("items") or []:
        if not isinstance(it, dict) or not it.get("eq"):
            continue
        a = armor_of(it, cat)
        if not a:
            continue
        s = slots.get(a.get("slot"))
        c = item_cost(a, s)
        why = None
        if s and count.get(s["id"], 0) >= clampi(s.get("max"), 1, 10, 1):
            why = "slot"
        elif total + c > limit:
            why = "pts"
        elif is_base(a) and base:
            why = "base"
        elif a.get("att") in (1, True, "1") and att >= ATT_MAX:
            why = "att"
        if why:
            skipped.append((it, a, why))
            continue
        if s:
            count[s["id"]] = count.get(s["id"], 0) + 1
        total += c
        base = base or is_base(a)
        if a.get("att") in (1, True, "1"):
            att += 1
        worn_.append((it, a))
    return worn_, skipped, total, att


def worn(d, cat):
    """[(item, armor entry)] the character really wears."""
    return check(d, cat)[0]


def clean_cat_gear(v):
    """Clean body-slot categories (max pieces, special-ability cost, item types with point ranges), the point limit,
    and every armour entry's slot / kind / pts / att / fx inside a catalog."""
    from . import feats
    S = v.get("slots")
    ids = {}
    if isinstance(S, list):
        out = []
        for x in S[:60]:
            if not (isinstance(x, dict) and isinstance(x.get("id"), str) and SLOT_RE.match(x["id"]) and x["id"] not in ids):
                continue
            types = []
            for t in (x.get("types") if isinstance(x.get("types"), list) else [])[:30]:
                if isinstance(t, dict) and str(t.get("name") or "").strip():
                    lo = clampi(t.get("min"), 0, 20, 0)
                    types.append({"name": str(t["name"]).strip()[:40], "min": lo, "max": max(lo, clampi(t.get("max"), 0, 20, lo))})
            ids[x["id"]] = types
            out.append({"id": x["id"], "name": str(x.get("name") or "")[:40], "max": clampi(x.get("max"), 1, 10, 1),
                        "sp": 1 if x.get("sp") in (1, True, "1") else 0, "types": types})
        v["slots"] = out
    if "eqMax" in v:
        v["eqMax"] = clampi(v.get("eqMax"), 1, 99, 12)
    A = v.get("armor")
    if isinstance(A, list):
        for a in A:
            if not isinstance(a, dict):
                continue
            old = a.pop("slots", None)
            sl = a.get("slot")
            if "slot" not in a and isinstance(old, list) and old and isinstance(old[0], str):
                sl = LEGACY.get(old[0]) or ("rings" if old[0].startswith("ring") else None)   # catalogs saved by the first slot-list version
            a["slot"] = sl if isinstance(sl, str) and sl in ids else ""
            a["kind"] = str(a.get("kind") or "")[:40]
            a["pts"] = clampi(a.get("pts"), 0, 20, 0)
            a["att"] = 1 if a.get("att") in (1, True, "1") else 0
            a["fx"] = feats.clean_fx(a.get("fx"))
    return v
