"""Class resources a character tracks by hand (Rage, Ki, Bardic Inspiration, ...).

  res : [{id, name, max 1..30, mab "" or an ability (the maximum follows that modifier, at least 1), used 0..30, rest short|long|none}], at most 12
"""
import re

from .numbers import clampi

ABS = ("str", "dex", "con", "int", "wis", "cha")
RESTS = ("short", "long", "none")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,16}$")


def clean_res(d):
    out, seen = [], set()
    for r in (d.get("res") if isinstance(d.get("res"), list) else [])[:12]:
        if not isinstance(r, dict):
            continue
        rid = str(r.get("id") or "")
        name = str(r.get("name") or "").strip()[:40]
        if not ID_RE.match(rid) or rid in seen or not name:
            continue
        seen.add(rid)
        out.append({"id": rid, "name": name, "max": clampi(r.get("max"), 1, 30, 1),
                    "mab": r.get("mab") if r.get("mab") in ABS else "",
                    "used": clampi(r.get("used"), 0, 30, 0),
                    "rest": r.get("rest") if r.get("rest") in RESTS else "long"})
    d["res"] = out
