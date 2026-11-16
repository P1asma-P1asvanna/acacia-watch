"""Multiclass.

Character fields:
  cls, sub, level : the primary class, its subclass, and the TOTAL character level (1-20)
  mc : [{"id": "a1b2", "cls": "Wizard", "sub": "", "level": 2}]   extra classes, each with its own level
The primary class's level is the total level minus the levels of the extra classes, so it never drops below 1.
The page does the same (clsRows in 08-views.js).
"""
import re
import secrets

from .numbers import clampi

MAX_EXTRA = 5
ID_RE = re.compile(r"^[A-Za-z0-9]{1,8}$")


def total_level(d):
    return clampi(d.get("level"), 1, 20, 1)


def rows(d):
    """[{id, cls, sub, level, primary}] primary first. Extra rows are cut back so the primary class keeps at least level 1."""
    total = total_level(d)
    rest = total
    extra = []
    for r in d.get("mc") if isinstance(d.get("mc"), list) else []:
        if not isinstance(r, dict) or not r.get("cls"):
            continue
        use = min(clampi(r.get("level"), 1, 19, 1), rest - 1)
        if use >= 1:
            extra.append({"id": str(r.get("id") or ""), "cls": r["cls"], "sub": str(r.get("sub") or ""), "level": use, "primary": False})
            rest -= use
    return [{"id": "", "cls": d.get("cls"), "sub": d.get("sub") or "", "level": rest, "primary": True}] + extra


def clean_mc(d):
    """Normalise the extra classes of a character record."""
    out, seen = [], set()
    for r in (d.get("mc") if isinstance(d.get("mc"), list) else [])[:MAX_EXTRA]:
        if not isinstance(r, dict):
            continue
        cls = str(r.get("cls") or "").strip()[:80]
        if not cls:
            continue
        i = str(r.get("id") or "")
        if not ID_RE.match(i) or i in seen:
            i = secrets.token_hex(3)
        seen.add(i)
        out.append({"id": i, "cls": cls, "sub": str(r.get("sub") or "")[:80], "level": clampi(r.get("level"), 1, 19, 1)})
    d["mc"] = out
    # the ones that do not fit in the total level are dropped, last first
    while out and sum(x["level"] for x in out) > total_level(d) - 1:
        out.pop()
