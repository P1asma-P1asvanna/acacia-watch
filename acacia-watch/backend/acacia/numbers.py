"""Number helpers that behave like the browser code (so the server and the page agree)."""
import math


def num(v):
    if isinstance(v, bool):
        return int(v)
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return float(v) if math.isfinite(v) else 0
    if isinstance(v, str):
        s = v.strip()
        if s == "":
            return 0
        try:
            f = float(s)
            return f if math.isfinite(f) else 0
        except ValueError:
            return 0
    return 0


def jsround(x):
    return int(math.floor(x + 0.5))


def mod(v):
    return int(math.floor((num(v) - 10) / 2))


def clampi(v, lo, hi, default):
    n = num(v)
    n = jsround(n) if n == n else default
    return max(lo, min(hi, n))


def sgn_find(lst, name):
    for x in lst or []:
        if isinstance(x, dict) and x.get("name") == name:
            return x
    return None
