"""Turn actions: what each combatant has used this turn (Action, Bonus Action, Reaction, Interaction), whether the turn was ended by
its player, and a short shared log ("Tessa: Action - Dagger attack 19 vs Goblin 1").
Stored in kv "turn:<room id>" = {cur, r, e:{entry id: {s:{act,bon,rea,int}, end}}, log:[{t,r,eid,who,k,x}]}.
Threats ("th"): when the GM's attack / spell lands on a player character, the GM's page opens a threat; the target and the allies that
have a reaction see it, answer with a defensive spell / feature (op "react") or pass (op "pass"), and the GM's card shows the new outcome.
The marker (initiative) belongs to the GM; this state follows it: when the current combatant or the round changes, that combatant's
slots are cleared the first time anybody looks (view()), so nothing needs to be reset by hand."""
import time

from .errors import Err
from .numbers import clampi

SLOTS = ("act", "bon", "rea", "int")
LOG_MAX = 60
TH_MAX = 12
TH_LIFE = 900  # seconds an old threat stays on screen
FX_KINDS = ("ac", "res", "red", "half", "neg", "note", "take", "sub", "dis", "reroll")
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
    out["th"] = _clean_th(st.get("th"))
    old = st.get("e") if isinstance(st.get("e"), dict) else {}
    for k, v in old.items():
        if isinstance(v, dict) and isinstance(v.get("s"), dict):
            out["e"][str(k)] = {"s": {s: str(v["s"].get(s) or "")[:80] for s in SLOTS}, "end": 1 if v.get("end") else 0}
    if str(st.get("cur") or "") != cur or clampi(st.get("r"), 1, 9999, 1) != rnd or clampi(st.get("tn"), 0, 10 ** 9, 0) != tn:
        if cur:
            out["e"][cur] = _blank()  # the new turn starts: everything is available again (Reaction too)
    return out


def _fx(x):
    if not isinstance(x, dict) or x.get("k") not in FX_KINDS:
        return None
    out = {"k": x["k"], "v": clampi(x.get("v"), -60, 60, 0)}
    if x.get("to"):
        out["to"] = str(x.get("to"))[:40]
    return out


def _clean_th(lst):
    now = int(time.time())
    out = []
    for t in (lst if isinstance(lst, list) else []):
        if not isinstance(t, dict) or not t.get("id") or now - clampi(t.get("ts"), 0, 10 ** 11, 0) > TH_LIFE:
            continue
        ans = []
        for a in (t.get("ans") if isinstance(t.get("ans"), list) else [])[:12]:
            if isinstance(a, dict) and a.get("eid"):
                ans.append({"eid": str(a["eid"])[:40], "n": str(a.get("n") or "")[:60], "name": str(a.get("name") or "")[:80],
                            "fx": _fx(a.get("fx")), "txt": str(a.get("txt") or "")[:120]})
        out.append({"id": str(t["id"])[:40], "from": str(t.get("from") or "")[:40], "to": str(t.get("to") or "")[:40],
                    "fn": str(t.get("fn") or "")[:60], "tn": str(t.get("tn") or "")[:60], "lb": str(t.get("lb") or "")[:60],
                    "kind": t.get("kind") if t.get("kind") in ("atk", "save", "dmg") else "dmg",
                    "tot": clampi(t.get("tot"), -50, 999, 0), "nat": clampi(t.get("nat"), 0, 20, 0),
                    "ac": None if t.get("ac") is None else clampi(t.get("ac"), 0, 60, 0),
                    "amt": clampi(t.get("amt"), 0, 9999, 0), "dt": str(t.get("dt") or "")[:20], "sp": 1 if t.get("sp") else 0,
                    "sv": str(t.get("sv") or "")[:40],
                    "need": [str(x)[:40] for x in (t.get("need") if isinstance(t.get("need"), list) else [])[:12]],
                    "ts": clampi(t.get("ts"), 0, 10 ** 11, 0), "st": "done" if t.get("st") == "done" else "open", "ans": ans})
    return out[:TH_MAX]


def pub(st, seen):
    """What the clients get: only combatants that are in the order."""
    return {"cur": st["cur"], "r": st["r"],
            "e": {k: v for k, v in st["e"].items() if k in seen},
            "log": [{"t": x.get("t"), "r": x.get("r"), "eid": x.get("eid"), "who": x.get("who"), "k": x.get("k"), "x": x.get("x")}
                    for x in st["log"] if x.get("eid") in seen][:40],
            "th": [x for x in st.get("th", []) if x["to"] in seen]}


def apply(st, ini, entry, who, admin, mine, b):
    """One change. `entry` is the combatant (a dict of the initiative list); `mine` = the player's own character ids."""
    eid = str(entry.get("id"))
    ref = str(entry.get("ref") or "")
    if not admin and not (ref.startswith("pc:") and ref[3:] in mine):
        raise Err(403, "not_yours")
    op = str(b.get("op") or "")
    if op in ("threat", "react", "pass", "close"):
        return _threat_op(st, ini, entry, who, admin, op, b)
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


def _threat_op(st, ini, entry, who, admin, op, b):
    """threat: the GM opens one (entry = the attacker). react / pass: a player's character answers (entry = the one answering).
    close: the GM stops waiting. The threat is closed by itself when everybody it waits for has answered."""
    th = st.setdefault("th", [])
    ids = {str(e.get("id")): e for e in (ini.get("list") or []) if isinstance(e, dict) and e.get("init") is not None}
    if op == "threat":
        src = b.get("th") if isinstance(b.get("th"), dict) else {}
        to = str(src.get("to") or "")
        if to not in ids or to == str(entry.get("id")):
            raise Err(400, "bad_target")
        to_pc = str(ids[to].get("ref") or "").startswith("pc:")
        if admin and to_pc:  # the GM's attack on a player's character: those players (and allies) are asked
            need = [x for x in (src.get("need") if isinstance(src.get("need"), list) else []) if str(x) in ids and str(ids[str(x)].get("ref") or "").startswith("pc:")]
        elif not to_pc:  # an attack on something the GM runs: the GM's characters are asked (the GM's page answers for those that cannot react)
            need = [k for k, e in ids.items() if str(e.get("ref") or "").startswith("npc:") and k != str(entry.get("id"))]
        else:
            return st
        if not need:
            return st
        row = {"id": str(src.get("id") or "")[:40] or str(int(time.time() * 1000)), "from": str(entry.get("id")), "to": to, "need": need,
               "ts": int(time.time()), "st": "open", "ans": []}
        for k in ("fn", "tn", "lb", "kind", "tot", "nat", "ac", "amt", "dt", "sp", "sv"):
            row[k] = src.get(k)
        row = _clean_th([row])
        if row:
            th.insert(0, row[0])
            del th[TH_MAX:]
        return st
    tid = str(b.get("tid") or "")
    t = next((x for x in th if x.get("id") == tid), None)
    if not t:
        raise Err(404, "no_threat")
    if op == "close":
        if not admin:
            raise Err(403, "not_yours")
        t["st"] = "done"
        return st
    if t.get("st") != "open":
        raise Err(409, "closed")
    eid = str(entry.get("id"))
    if any(a.get("eid") == eid for a in t.get("ans", [])):
        raise Err(409, "answered")
    e = st["e"].setdefault(eid, _blank())
    text = " ".join(str(b.get("text") or "").split())[:120]
    name = str(b.get("name") or "")[:60]
    if op == "react":
        if e["s"]["rea"]:
            raise Err(409, "reaction_used")
        fx = _fx(b.get("fx"))
        if not fx:
            raise Err(400, "bad_fx")
        e["s"]["rea"] = (name + (" — " + text if text else ""))[:80] or "✓"
        t["ans"].append({"eid": eid, "n": name, "name": who, "fx": fx, "txt": text})
        _log(st, eid, who, "rea", ("%s → %s: %s" % (name, t.get("tn") or "", text)).strip(": ")[:160])
    else:
        t["ans"].append({"eid": eid, "n": "", "name": who, "fx": None, "txt": ""})
    if all(any(a.get("eid") == x for a in t["ans"]) for x in t.get("need", [])):
        t["st"] = "done"
    return st
