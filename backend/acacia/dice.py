"""Shared table dice: the server rolls, so nobody can fake a result. Rolls live in kv "feed:<room id>" (newest first).

Options: any die size 2..1000, number of dice, modifier, advantage/disadvantage, plus optional rules:
  dmin   every die below this counts as this (e.g. Reliable Talent: 10)
  rr     reroll dice that show this or lower, once (e.g. Halfling Lucky: 1)
  kh     keep only the highest N dice (4d6 drop lowest = kh 3)
  lo/hi  the final total is raised to lo / lowered to hi
  dc     a target number; the entry says whether the total reached it
"""
import secrets
import time

from .errors import Err
from .numbers import clampi, num

KEEP = 40
MAX_SIDES = 1000


def _opt(v, lo, hi):
    """An optional whole number: None when the field is empty."""
    if v is None or str(v).strip() == "":
        return None
    n = num(v)
    if n != n:
        return None
    return max(lo, min(hi, int(round(n))))


def roll(b):
    n = clampi(b.get("n"), 1, 20, 1)
    sides = clampi(b.get("sides"), 2, MAX_SIDES, 20)
    mod = clampi(b.get("mod"), -100, 100, 0)
    mode = b.get("mode") if b.get("mode") in ("adv", "dis") else "normal"
    dmin = _opt(b.get("dmin"), 0, sides) or 0
    rr = _opt(b.get("rr"), 0, sides - 1) or 0
    kh = _opt(b.get("kh"), 0, n) or 0
    if kh >= n:
        kh = 0
    lo, hi, dc = _opt(b.get("lo"), -200, 2000), _opt(b.get("hi"), -200, 2000), _opt(b.get("dc"), -50, 2000)
    if lo is not None and hi is not None and lo > hi:
        lo, hi = hi, lo

    def batch():
        vals = [secrets.randbelow(sides) + 1 for _ in range(n)]
        fix = [0] * n          # the number a die showed before a rule changed it (0 = unchanged)
        for i, v in enumerate(vals):
            if rr and v <= rr:
                fix[i] = v
                vals[i] = secrets.randbelow(sides) + 1
            if dmin and vals[i] < dmin:
                fix[i] = fix[i] or vals[i]
                vals[i] = dmin
        drop = []
        if kh:
            order = sorted(range(n), key=lambda i: (vals[i], i))
            drop = sorted(order[: n - kh])
        total = sum(v for i, v in enumerate(vals) if i not in drop)
        return {"v": vals, "fix": fix, "drop": drop, "sum": total}

    sets = [batch()]
    keep = 0
    if mode != "normal":
        c = batch()
        sets.append(c)
        keep = 1 if (c["sum"] > sets[0]["sum"] if mode == "adv" else c["sum"] < sets[0]["sum"]) else 0
    raw = sets[keep]["sum"] + mod
    total = raw
    if lo is not None:
        total = max(total, lo)
    if hi is not None:
        total = min(total, hi)
    bits = ["%dd%d" % (n, sides)]
    if kh:
        bits.append("kh%d" % kh)
    if mod:
        bits.append("%+d" % mod)
    if mode != "normal":
        bits.append(mode)
    if dmin:
        bits.append("min%d/die" % dmin)
    if rr:
        bits.append("rr<=%d" % rr)
    if lo is not None:
        bits.append("min%d" % lo)
    if hi is not None:
        bits.append("max%d" % hi)
    out = {"id": secrets.token_hex(6), "t": int(time.time()), "n": n, "sides": sides, "mod": mod, "mode": mode,
           "sets": [s["v"] for s in sets], "fix": [s["fix"] for s in sets], "drop": [s["drop"] for s in sets],
           "keep": keep, "raw": raw, "total": total, "label": " ".join(bits),
           "why": str(b.get("why") or "").strip()[:40]}
    if lo is not None:
        out["lo"] = lo
    if hi is not None:
        out["hi"] = hi
    if dc is not None:
        out["dc"] = dc
        out["ok"] = 1 if total >= dc else 0
    return out


def push(feed, entry):
    out = [entry] + [x for x in (feed if isinstance(feed, list) else []) if isinstance(x, dict)]
    return out[:KEEP]
