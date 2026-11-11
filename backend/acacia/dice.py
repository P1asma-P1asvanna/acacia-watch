"""Shared table dice: the server rolls, so nobody can fake a result. Rolls live in kv "feed:<room id>" (newest first)."""
import secrets
import time

from .errors import Err
from .numbers import clampi

SIDES = (4, 6, 8, 10, 12, 20, 100)
KEEP = 40


def roll(b):
    n = clampi(b.get("n"), 1, 20, 1)
    sides = clampi(b.get("sides"), 2, 100, 20)
    if sides not in SIDES:
        raise Err(400, "bad_dice")
    mod = clampi(b.get("mod"), -30, 30, 0)
    mode = b.get("mode") if b.get("mode") in ("adv", "dis") else "normal"

    def batch():
        vals = [secrets.randbelow(sides) + 1 for _ in range(n)]
        return vals, sum(vals)

    a = batch()
    sets = [a]
    keep = 0
    if mode != "normal":
        c = batch()
        sets.append(c)
        keep = 1 if (c[1] > a[1] if mode == "adv" else c[1] < a[1]) else 0
    label = "%dd%d%s%s" % (n, sides, ("%+d" % mod) if mod else "", {"adv": " adv", "dis": " dis"}.get(mode, ""))
    return {"id": secrets.token_hex(6), "t": int(time.time()), "n": n, "sides": sides, "mod": mod, "mode": mode,
            "sets": [s[0] for s in sets], "keep": keep, "total": sets[keep][1] + mod, "label": label,
            "why": str(b.get("why") or "").strip()[:40]}


def push(feed, entry):
    out = [entry] + [x for x in (feed if isinstance(feed, list) else []) if isinstance(x, dict)]
    return out[:KEEP]
