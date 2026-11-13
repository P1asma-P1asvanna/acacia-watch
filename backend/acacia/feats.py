"""Feats (D&D 2024): catalog cleaning, the picks a character made at Ability Score Improvement levels, and the resulting ability scores.

Character fields:
  asi: {"4": {"t": "asi", "a1": "str", "a2": "dex"}  |  {"t": "feat", "f": "Name", "ab": "str"}}   keyed by class level
  xf : [{"f": "Name", "ab": "str"}]   extra feats (Fighting Style, a repeated feat, a feat the GM granted ...)
The base scores in `abil` are never changed; totals are computed from them. The page has the same logic (abT in 11-features.js).
"""
import re

from .numbers import clampi

ABS = ("str", "dex", "con", "int", "wis", "cha")
CATS = ("origin", "general", "fighting", "epic")
DEFAULT_ASI = (4, 8, 12, 16, 19)
SLOT_KEY = re.compile(r"^\d{1,2}(@[A-Za-z0-9]{1,8})?$")   # "4" = primary class level 4, "4@a1b2" = level 4 of the extra class with id a1b2


def asi_levels(cls):
    """Levels at which a class grants an Ability Score Improvement / Feat, from the class's `asiLv` text such as "4,8,12,16,19"."""
    s = (cls or {}).get("asiLv")
    if not isinstance(s, str) or not s.strip():
        return list(DEFAULT_ASI)
    out = sorted({int(x) for x in re.findall(r"\d+", s) if 1 <= int(x) <= 20})
    return out[:12]


def clean_asi_text(s):
    if not isinstance(s, str):
        return ""
    return ",".join(str(x) for x in sorted({int(x) for x in re.findall(r"\d+", s) if 1 <= int(x) <= 20})[:12])


def abil_list(v):
    """"str, DEX" / ["str"] -> ["str", "dex"] in the usual order."""
    found = [a.lower() for a in re.findall(r"[A-Za-z]{3}", v)] if isinstance(v, str) else [str(a).lower() for a in v] if isinstance(v, list) else []
    return [a for a in ABS if a in found]


FX_KINDS = ("init", "hp", "ac", "pass", "speed")


def clean_fx(L):
    """Effects a feat gives: init (flat and/or + Proficiency Bonus), hp (flat or per level), ac (optionally only in armor), pass (passive Perception), speed (feet)."""
    out = []
    for e in (L if isinstance(L, list) else [])[:10]:
        if not isinstance(e, dict) or e.get("k") not in FX_KINDS:
            continue
        k = e["k"]
        r = {"k": k, "v": clampi(e.get("v"), -50, 200, 0)}
        if k == "init":
            r["pb"] = 1 if e.get("pb") in (1, True, "1") else 0
        elif k == "hp":
            r["per"] = "flat" if e.get("per") == "flat" else "level"
        elif k == "ac":
            r["req"] = "armor" if e.get("req") == "armor" else ""
        out.append(r)
    return out


def clean_cat_feats(v):
    """Clean the feat list, the class `asiLv` and the background `originFeat` inside a catalog."""
    L = v.get("feats")
    out = []
    seen = set()
    for x in (L if isinstance(L, list) else [])[:300]:
        if not isinstance(x, dict):
            continue
        name = str(x.get("name") or "").strip()[:80]
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        out.append({"id": str(x.get("id") or name)[:40], "name": name, "cat": x.get("cat") if x.get("cat") in CATS else "general",
                    "minLv": clampi(x.get("minLv"), 0, 20, 0), "prereq": str(x.get("prereq") or "")[:200],
                    "asi": ",".join(abil_list(x.get("asi"))), "rep": 1 if x.get("rep") in (1, True, "1") else 0,
                    "pts": 2 if clampi(x.get("pts"), 1, 2, 1) == 2 else 1,
                    "cap": clampi(x.get("cap"), 20, 30, 30 if x.get("cat") == "epic" else 20),
                    "fx": clean_fx(x.get("fx")), "seed": 1 if x.get("seed") in (1, True, "1") else 0, "desc": str(x.get("desc") or "")[:6000]})
    v["feats"] = out
    for c in v.get("classes") or []:
        if isinstance(c, dict):
            c["asiLv"] = clean_asi_text(c.get("asiLv"))
    for b in v.get("backgrounds") or []:
        if isinstance(b, dict):
            b["originFeat"] = str(b.get("originFeat") or "")[:80]
    return v


def clean_picks(d, cat):
    """Keep only well-formed picks."""
    feats = {f.get("name") for f in cat["feats"] if isinstance(f, dict)} if cat and isinstance(cat.get("feats"), list) else None
    asi = {}
    src = d.get("asi") if isinstance(d.get("asi"), dict) else {}
    for k, p in list(src.items())[:40]:
        if not (isinstance(k, str) and SLOT_KEY.match(k) and 1 <= int(k.split("@")[0]) <= 20 and isinstance(p, dict)):
            continue
        if "@" in k and k.split("@")[1] not in {r.get("id") for r in d.get("mc") or []}:
            continue
        if p.get("t") == "feat":
            f = str(p.get("f") or "")[:80]
            if feats is not None and f and f not in feats:
                f = ""
            asi[k] = {"t": "feat", "f": f, "ab": p.get("ab") if p.get("ab") in ABS else "", "ab2": p.get("ab2") if p.get("ab2") in ABS else ""}
        else:
            asi[k] = {"t": "asi", "m": "11" if p.get("m") == "11" else "2" if p.get("m") == "2" else "", "a1": p.get("a1") if p.get("a1") in ABS else "", "a2": p.get("a2") if p.get("a2") in ABS else ""}
    d["asi"] = asi
    xf = []
    for p in (d.get("xf") if isinstance(d.get("xf"), list) else [])[:12]:
        if isinstance(p, dict):
            f = str(p.get("f") or "")[:80]
            if f and (feats is None or f in feats):
                xf.append({"f": f, "ab": p.get("ab") if p.get("ab") in ABS else "", "ab2": p.get("ab2") if p.get("ab2") in ABS else ""})
    d["xf"] = xf


def _slots(d, cat):
    """Keys of the unlocked ASI/Feat slots: "4" for the primary class, "4@id" for an extra class."""
    from . import multiclass
    out = set()
    for r in multiclass.rows(d):
        cls = next((c for c in (cat or {}).get("classes", []) if c.get("name") == r["cls"]), None)
        out |= {str(x) + ("@" + r["id"] if r["id"] else "") for x in asi_levels(cls) if x <= r["level"]}
    return out


def active(d, cat):
    """Every feat the character has, as (feat, pick) pairs: background origin feat, feats taken at ASI levels, extra feats."""
    flist = {f.get("name"): f for f in (cat or {}).get("feats", []) if isinstance(f, dict)}
    out = []
    bg = next((b for b in (cat or {}).get("backgrounds", []) if b.get("name") == d.get("bg")), None)
    if bg and flist.get(bg.get("originFeat")):
        out.append((flist[bg["originFeat"]], {}))
    slots = _slots(d, cat)
    for k, p in (d.get("asi") or {}).items():
        if k in slots and isinstance(p, dict) and p.get("t") == "feat" and flist.get(p.get("f")):
            out.append((flist[p["f"]], p))
    for p in d.get("xf") or []:
        if isinstance(p, dict) and flist.get(p.get("f")):
            out.append((flist[p["f"]], p))
    return out


def ab_max(cat):
    """Highest score normal means can reach (admin setting, stored in the catalogue as abMax; default 20)."""
    n = clampi((cat or {}).get("abMax"), 0, 30, 20)
    return n if n >= 10 else 20


def totals(d, cat):
    """Ability scores including Ability Score Improvements and feat bonuses."""
    lim = ab_max(cat)
    base = {k: clampi((d.get("abil") or {}).get(k), 1, lim, 10) for k in ABS}
    slots = _slots(d, cat)
    bonus = {k: 0 for k in ABS}
    cap = {k: lim for k in ABS}
    for k, p in (d.get("asi") or {}).items():
        if k not in slots or not isinstance(p, dict) or p.get("t") == "feat":
            continue
        if p.get("m") == "2":
            if p.get("a1") in ABS:
                bonus[p["a1"]] += 2
        else:
            for a in (p.get("a1"), p.get("a2")):
                if a in ABS:
                    bonus[a] += 1
    for f, p in active(d, cat):
        L = abil_list(f.get("asi"))
        picks = [p.get("ab")] + ([p.get("ab2")] if clampi(f.get("pts"), 1, 2, 1) == 2 else [])
        for a in picks:
            if a in ABS and a in L:
                bonus[a] += 1
                c = clampi(f.get("cap"), 20, 30, 30 if f.get("cat") == "epic" else 20)
                cap[a] = max(cap[a], c if c > 20 else 0)
    return {k: base[k] if base[k] >= cap[k] else min(cap[k], base[k] + bonus[k]) for k in ABS}


def fx_totals(d, cat, armor=False):
    """Bonuses from feat effects: initiative, max HP, armor class, passive Perception."""
    lv = clampi(d.get("level"), 1, 20, 1)
    pb = 2 + (lv - 1) // 4
    r = {"init": 0, "hp": 0, "ac": 0, "pass": 0}
    from . import gear
    effects = [e for f, _ in active(d, cat) for e in (f.get("fx") or [])]
    effects += [e for _, a in gear.worn(d, cat) for e in (a.get("fx") or [])]
    for e in effects:
        k, v = e.get("k"), clampi(e.get("v"), -50, 200, 0)
        if k == "init":
            r["init"] += v + (pb if e.get("pb") else 0)
        elif k == "hp":
            r["hp"] += v * lv if e.get("per") != "flat" else v
        elif k == "ac":
            if e.get("req") != "armor" or armor:
                r["ac"] += v
        elif k == "pass":
            r["pass"] += v
    return r
