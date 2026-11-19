"""Condition rules: what a condition does.

A condition has a duration, how it stacks, what ends it, and any number of rules. A rule is
    WHEN something happens  ->  (optionally CHECK something: a save, an ability check, a flat d20 or a dice roll)
    ->  do the effects in `ok` (the check passed, or there was no check) and the effects in `no` (the check failed).
It is plain data the admin builds on the Game data page. Only known words are kept, so what is stored is always a safe,
bounded structure that the Initiative tracker can run later. Old rules ({"save":..., "acts":[...]}) are converted.
"""
import re
import secrets

ABS = ("STR", "DEX", "CON", "INT", "WIS", "CHA")
WHEN = ("always", "apply", "remove", "start", "end", "lastturn", "damaged", "healed", "attack", "hit", "move", "action", "rest")
UNITS = ("turn", "round")
RESTS = ("any", "short", "long")
DUR_UNITS = ("", "turn", "round", "minute", "hour")
STACK = ("no", "refresh", "stack", "level")
ENDS = ("short", "long", "damage", "heal", "save")
CHK = ("save", "check", "flat", "dice")
DTYPES = ("acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic",
          "radiant", "slashing", "thunder")
ADV_ON = ("attack", "attacked", "check", "save")
ROLL_ON = ("attack", "attacked", "check", "save", "damage", "init")
SPEED = ("zero", "half", "add")
SPEED_KIND = ("all", "walk", "fly", "swim", "climb")
FLAGS = ("noact", "nomove", "nospeak", "nosee", "nohear", "nocast", "failsave", "crit5", "prone", "hidden")
RES = ("resist", "immune", "vuln")
DICE = re.compile(r"^[+-]?\d{1,2}d\d{1,3}(?:[+-]\d{1,3})?$|^[+-]?\d{1,4}$")
SKILL = re.compile(r"^[a-z]{3,20}$")
MAX_RULES, MAX_ACTS = 20, 8


def _int(v, lo, hi, d=0):
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        return d
    return max(lo, min(hi, n))


def _id(v):
    return v if isinstance(v, str) and re.match(r"^[A-Za-z0-9_-]{1,40}$", v) else secrets.token_hex(6)


def _dice(v, d="1d4", signed=False):
    s = str(v or "").replace(" ", "")
    if not signed:
        s = s.lstrip("+-")
    return s if DICE.match(s) else d


def clean_dur(d):
    d = d if isinstance(d, dict) else {}
    u = d.get("u") if d.get("u") in DUR_UNITS else ""
    return {"u": u, "n": _int(d.get("n"), 1, 999, 1) if u else 0}


def clean_act(a, cond_ids):
    if not isinstance(a, dict):
        return None
    t = a.get("t")
    if t == "noact":  # old name
        return {"t": "flag", "f": "noact", "ab": ""}
    if t in ("dmg", "heal", "temp"):
        out = {"t": t, "dice": _dice(a.get("dice"))}
        if t == "dmg":
            out["dtype"] = a.get("dtype") if a.get("dtype") in DTYPES else "fire"
        return out
    if t == "add":
        cid = a.get("cid")
        return {"t": t, "cid": cid if cid in cond_ids else "", "dur": clean_dur(a.get("dur"))}
    if t == "rem":
        cid = a.get("cid")
        return {"t": t, "cid": cid if cid in ("self", "all") or cid in cond_ids else "self"}
    if t == "adv":
        return {"t": t, "mode": "dis" if a.get("mode") == "dis" else "adv",
                "on": a.get("on") if a.get("on") in ADV_ON else "attack",
                "ab": a.get("ab") if a.get("ab") in ABS else ""}
    if t == "roll":  # add a number or dice to rolls (e.g. -1d4 to attacks, +2 to saves)
        return {"t": t, "on": a.get("on") if a.get("on") in ROLL_ON else "attack", "dice": _dice(a.get("dice"), "-1d4", True),
                "ab": a.get("ab") if a.get("ab") in ABS else ""}
    if t == "stat":
        return {"t": t, "ab": a.get("ab") if a.get("ab") in ABS else "STR", "n": _int(a.get("n"), -30, 30, -2)}
    if t == "speed":
        return {"t": t, "m": a.get("m") if a.get("m") in SPEED else "zero", "n": _int(a.get("n"), -200, 200, 0),
                "kind": a.get("kind") if a.get("kind") in SPEED_KIND else "all"}
    if t == "ac":
        return {"t": t, "m": "set" if a.get("m") == "set" else "add", "n": _int(a.get("n"), -20, 40, 0)}
    if t == "res":
        dt = a.get("dtype")
        return {"t": t, "m": a.get("m") if a.get("m") in RES else "resist", "dtype": dt if dt in DTYPES or dt == "all" else "all"}
    if t == "hpmax":
        return {"t": t, "m": "half" if a.get("m") == "half" else "add", "n": _int(a.get("n"), -999, 999, -5)}
    if t == "flag":
        f = a.get("f") if a.get("f") in FLAGS else "noact"
        return {"t": t, "f": f, "ab": a.get("ab") if a.get("ab") in ABS else ""}
    if t == "dur":
        return {"t": t, "m": a.get("m") if a.get("m") in ("add", "sub", "end") else "add", "n": _int(a.get("n"), 1, 99, 1)}
    if t == "lvl":
        return {"t": t, "n": _int(a.get("n"), -20, 20, 1)}
    if t == "text":
        return {"t": t, "text": str(a.get("text") or "")[:200]}
    return None


def _acts(v, cond_ids):
    out = [clean_act(a, cond_ids) for a in (v if isinstance(v, list) else [])[:MAX_ACTS]]
    return [a for a in out if a]


def clean_chk(c):
    if not isinstance(c, dict) or c.get("k") not in CHK:
        return None
    k = c["k"]
    out = {"k": k, "ab": c.get("ab") if c.get("ab") in ABS else "CON", "dc": _int(c.get("dc"), 1, 99, 10),
           "skill": c.get("skill") if isinstance(c.get("skill"), str) and SKILL.match(c.get("skill", "")) and k == "check" else "",
           "dice": _dice(c.get("dice"), "1d20") if k == "dice" else ""}
    return out


def clean_rule(r, cond_ids):
    if not isinstance(r, dict):
        return None
    if "save" in r or "acts" in r:  # old shape -> new shape
        sv = r.get("save") if isinstance(r.get("save"), dict) else None
        acts = _acts(r.get("acts"), cond_ids)
        r = dict(r)
        r["chk"] = {"k": "save", "ab": sv.get("ab"), "dc": sv.get("dc")} if sv else None
        r["ok"], r["no"] = ([], acts) if sv and sv.get("on") != "pass" else (acts, [])
        r.pop("save", None)
        r.pop("acts", None)
    when = r.get("when") if r.get("when") in WHEN else "always"
    chk = clean_chk(r.get("chk")) if when != "always" else None
    return {"id": _id(r.get("id")), "when": when, "unit": r.get("unit") if r.get("unit") in UNITS else "turn",
            "every": _int(r.get("every"), 1, 20, 1), "rest": r.get("rest") if r.get("rest") in RESTS else "any",
            "chk": chk, "ok": _acts(r.get("ok"), cond_ids), "no": _acts(r.get("no"), cond_ids) if chk else []}


def clean_condition(x, cond_ids):
    """Clean the duration, stacking, end-conditions and rules of one condition (in place)."""
    x["dur"] = clean_dur(x.get("dur"))
    x["stack"] = x.get("stack") if x.get("stack") in STACK else "no"
    x["maxLv"] = _int(x.get("maxLv"), 1, 20, 6) if x["stack"] == "level" else 0
    ends = x.get("ends") if isinstance(x.get("ends"), list) else []
    x["ends"] = [e for e in ENDS if e in ends]
    rules = [clean_rule(r, cond_ids) for r in (x.get("rules") if isinstance(x.get("rules"), list) else [])[:MAX_RULES]]
    x["rules"] = [r for r in rules if r]
    x.pop("th", None)


# ---- spell effects: the same acts as a condition, run when the spell is cast ----
SP_WHO = ("target", "self")
SP_CHK = ("atk", "save")
SP_ACTS = ("dmg", "heal", "temp", "hpmax", "add", "rem", "text")
RX_KINDS = ("ac", "res", "red", "half", "neg", "note", "take", "sub", "dis", "reroll")
MAX_SP_RULES = 10


def _spell_act(a, cond_ids):
    """One effect of a spell. dmg / heal / temp may add dice per slot level above the spell's level (`up`) and grow with the character (`cant`)."""
    if not isinstance(a, dict) or a.get("t") not in SP_ACTS:
        return None
    out = clean_act(a, cond_ids)
    if not out:
        return None
    if out["t"] in ("dmg", "heal", "temp"):
        up = str(a.get("up") or "").replace(" ", "").lstrip("+-")
        out["up"] = up if re.match(r"^\d{1,2}d\d{1,3}$", up) else ""
        out["cant"] = 1 if a.get("cant") in (1, True, "1") else 0
    return out


def clean_spell_rules(rules, cond_ids):
    """rule = {id, who: target|self, chk: null | {k: atk} | {k: save, ab, dc (0 = the caster's spell DC)}, half: 0|1 (half of the `no` damage on a passed save),
    ok: [acts], no: [acts]}. ok = hit / save passed / no check; no = miss / save failed."""
    out = []
    for r in (rules if isinstance(rules, list) else [])[:MAX_SP_RULES]:
        if not isinstance(r, dict):
            continue
        who = r.get("who") if r.get("who") in SP_WHO else "target"
        c = r.get("chk") if isinstance(r.get("chk"), dict) and r["chk"].get("k") in SP_CHK and who == "target" else None
        chk = None
        if c:
            chk = {"k": c["k"]}
            if c["k"] == "save":
                chk["ab"] = c.get("ab") if c.get("ab") in ABS else "DEX"
                chk["dc"] = _int(c.get("dc"), 0, 99, 0)
        acts = lambda v: [x for x in (_spell_act(a, cond_ids) for a in (v if isinstance(v, list) else [])[:MAX_ACTS]) if x]
        out.append({"id": _id(r.get("id")), "who": who, "chk": chk, "half": 1 if chk and chk["k"] == "save" and r.get("half") in (1, True, "1") else 0,
                    "ok": acts(r.get("ok")), "no": acts(r.get("no")) if chk else []})
    return out


def clean_rx(x):
    """What the spell does when it is used as a Reaction against an attack (kept as typed by the GM; empty = guess from the text)."""
    if not isinstance(x, dict) or x.get("k") not in RX_KINDS:
        return None
    out = {"k": x["k"], "v": _int(x.get("v"), -60, 60, 0), "ally": 1 if x.get("ally") in (1, True, "1") else 0,
           "dice": _dice(x.get("dice"), "") if x.get("dice") else ""}
    if out["dice"] and not re.match(r"^\d{1,2}d\d{1,3}(?:[+-]\d{1,3})?$", out["dice"]):
        out["dice"] = ""
    return out
