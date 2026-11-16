"""A rhythm game opened inside an adventure room. State lives in kv "mg:<room id>":
{run, status: open|closed, game: {..game.., mi: {type,url}}, order: [pc ids], cur, res: {pc id: {name, perfect, hit, miss, dmg, applied}}}
Players post only counts; the server rolls the damage, so it cannot be waved away."""
import secrets
import time

from .errors import Err
from .games import roll_dmg
from .numbers import clampi


def new_state(game, mi, order):
    g = dict(game)
    g["mi"] = mi
    return {"run": secrets.token_hex(6), "status": "open", "game": g, "order": order, "cur": 0, "res": {}, "at": int(time.time())}


def pub(st):
    if not isinstance(st, dict) or not isinstance(st.get("game"), dict):
        return None
    order = st.get("order") or []
    cur = int(st.get("cur") or 0)
    turn = ""
    if st["game"].get("play") == "one" and st.get("status") == "open":
        turn = next((p for p in order[cur:] if p not in (st.get("res") or {})), "")
    return {"run": st.get("run"), "status": st.get("status"), "game": st["game"], "turn": turn,
            "res": [dict(v, pc=k) for k, v in (st.get("res") or {}).items()], "auto": st["game"].get("dmgMode") == "auto"}


def submit(st, pc, name, b):
    if not isinstance(st, dict) or st.get("status") != "open":
        raise Err(409, "mg_closed")
    if str(b.get("run") or "") != st.get("run"):
        raise Err(409, "mg_old_run")
    if pc not in (st.get("order") or []):
        raise Err(403, "not_in_room")
    res = st.setdefault("res", {})
    if pc in res:
        raise Err(409, "mg_done")
    g = st["game"]
    if g.get("play") == "one":
        turn = next((p for p in st["order"][int(st.get("cur") or 0):] if p not in res), "")
        if turn != pc:
            raise Err(403, "not_your_turn")
    miss = clampi(b.get("miss"), 0, 500, 0)
    res[pc] = {"name": name[:80], "perfect": clampi(b.get("perfect"), 0, 500, 0), "hit": clampi(b.get("hit"), 0, 500, 0),
               "miss": miss, "dmg": roll_dmg(g.get("dmg"), miss), "applied": False, "at": int(time.time())}
