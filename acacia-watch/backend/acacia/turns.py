"""Turn actions: what each combatant has used this turn (Action, Bonus Action, Reaction, Interaction), whether the turn was ended by
its player, and a short shared log ("Tessa: Action - Dagger attack 19 vs Goblin 1").
Stored in kv "turn:<room id>" = {cur, r, e:{entry id: {s:{act,bon,rea,int}, end}}, log:[{t,r,eid,who,k,x}]}.
The marker (initiative) belongs to the GM; this state follows it: when the current combatant or the round changes, that combatant's
slots are cleared the first time anybody looks (view()), so nothing needs to be reset by hand."""
import time

from .errors import Err
from .numbers import clampi

SLOTS = ("act", "bon", "rea", "int")
LOG_MAX = 60
ACTION_SLOTS = ("act", "bon", "int")  # these can only be used on the combatant's own turn (a Reaction can happen any time)


def _blank():
    return {"s": {k: "" for k in SLOTS}, "end": 0}


def view(state, ini):
    """The state lined up with the GM's marker. Returns a fresh dict (never written back by a read)."""
    st = state if isinstance(state, dict) else {}
    cur = str(ini.get("cur") or "")
    rnd = clampi(ini.get("round"), 1, 9999, 1)
    tn = clampi(ini.get("tn"), 0, 10 ** 9, 0)  # the GM's marker counts every move, so coming back to the same combatant is a new turn too
    out = {"cur": cur, "r": rnd, "tn": tn, "e": {}, "log": [x for x in (st.get("log") if isinstance(st.get("log"), list) else []) if isinstance(x, dict)][:LOG_MAX]}
    old = st.get("e") if isinstance(st.get("e"), dict) else {}
    for k, v in old.items():
        if isinstance(v, dict) and isinstance(v.get("s"), dict):
            out["e"][str(k)] = {"s": {s: str(v["s"].get(s) or "")[:80] for s in SLOTS}, "end": 1 if v.get("end") else 0}
    if str(st.get("cur") or "") != cur or clampi(st.get("r"), 1, 9999, 1) != rnd or clampi(st.get("tn"), 0, 10 ** 9, 0) != tn:
        if cur:
            out["e"][cur] = _blank()  # the new turn starts: everything is available again (Reaction too)
    return out


def pub(st, seen):
    """What the clients get: only combatants that are in the order."""
    return {"cur": st["cur"], "r": st["r"],
            "e": {k: v for k, v in st["e"].items() if k in seen},
            "log": [{"t": x.get("t"), "r": x.get("r"), "eid": x.get("eid"), "who": x.get("who"), "k": x.get("k"), "x": x.get("x")}
                    for x in st["log"] if x.get("eid") in seen][:40]}


def apply(st, ini, entry, who, admin, mine, b):
    """One change. `entry` is the combatant (a dict of the initiative list); `mine` = the player's own character ids."""
    eid = str(entry.get("id"))
    ref = str(entry.get("ref") or "")
    if not admin and not (ref.startswith("pc:") and ref[3:] in mine):
        raise Err(403, "not_yours")
    op = str(b.get("op") or "")
    slot = str(b.get("slot") or "")
    text = " ".join(str(b.get("text") or "").split())[:160]
    is_cur = eid == str(ini.get("cur") or "")
    e = st["e"].setdefault(eid, _blank())
    if op in ("use", "undo") and slot not in SLOTS and not (op == "use" and slot == "note"):
        raise Err(400, "bad_slot")
    if op == "use":
        if not admin and slot in ACTION_SLOTS and not is_cur:
            raise Err(403, "not_your_turn")
        if slot != "note" and b.get("mark", 1):
            e["s"][slot] = text or "✓"
        _log(st, eid, who, slot, text)
    elif op == "undo":
        e["s"][slot] = ""
    elif op == "end":
        if not admin and not is_cur:
            raise Err(403, "not_your_turn")
        e["end"] = 1
        _log(st, eid, who, "end", text)
    else:
        raise Err(400, "bad_op")
    return st


def _log(st, eid, who, k, text):
    st["log"].insert(0, {"t": int(time.time()), "r": st["r"], "eid": eid, "who": who[:60], "k": k, "x": text})
    del st["log"][LOG_MAX:]
