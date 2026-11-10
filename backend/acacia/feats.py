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
                    "desc": str(x.get("desc") or "")[:6000]})
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
    for k, p in list(src.items())[:20]:
        if not (isinstance(k, str) and k.isdigit() and 1 <= int(k) <= 20 and isinstance(p, dict)):
            continue
        if p.get("t") == "feat":
            f = str(p.get("f") or "")[:80]
            if feats is not None and f and f not in feats:
                f = ""
            asi[k] = {"t": "feat", "f": f, "ab": p.get("ab") if p.get("ab") in ABS else ""}
        else:
            asi[k] = {"t": "asi", "a1": p.get("a1") if p.get("a1") in ABS else "", "a2": p.get("a2") if p.get("a2") in ABS else ""}
    d["asi"] = asi
    xf = []
    for p in (d.get("xf") if isinstance(d.get("xf"), list) else [])[:12]:
        if isinstance(p, dict):
            f = str(p.get("f") or "")[:80]
            if f and (feats is None or f in feats):
                xf.append({"f": f, "ab": p.get("ab") if p.get("ab") in ABS else ""})
    d["xf"] = xf


def totals(d, cat):
    """Ability scores including Ability Score Improvements and feat bonuses."""
    base = {k: clampi((d.get("abil") or {}).get(k), 1, 30, 10) for k in ABS}
    lv = clampi(d.get("level"), 1, 20, 1)
    classes = (cat or {}).get("classes", [])
    cls = next((c for c in classes if c.get("name") == d.get("cls")), None)
    slots = {str(x) for x in asi_levels(cls) if x <= lv}
    flist = {f.get("name"): f for f in (cat or {}).get("feats", []) if isinstance(f, dict)}
    bonus = {k: 0 for k in ABS}
    cap = {k: 20 for k in ABS}

    def feat_bonus(name, ab):
        f = flist.get(name)
        if f and ab in ABS and ab in abil_list(f.get("asi")):
            bonus[ab] += 1
            if f.get("cat") == "epic":
                cap[ab] = 30

    for k, p in (d.get("asi") or {}).items():
        if k not in slots or not isinstance(p, dict):
            continue
        if p.get("t") == "feat":
            feat_bonus(p.get("f"), p.get("ab"))
        else:
            for a in (p.get("a1"), p.get("a2")):
                if a in ABS:
                    bonus[a] += 1
    for p in d.get("xf") or []:
        feat_bonus(p.get("f"), p.get("ab"))
    return {k: base[k] if base[k] >= cap[k] else min(cap[k], base[k] + bonus[k]) for k in ABS}
