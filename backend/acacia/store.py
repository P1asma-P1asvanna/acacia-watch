"""Reading what the browser needs at start-up, and the small key/value store."""
import json

from . import live, profile
from .numbers import clampi, num


def kv_get(c, key):
    r = c.execute("SELECT v FROM kv WHERE k=?", (key,)).fetchone()
    return json.loads(r["v"]) if r else None


def kv_set(c, key, value):
    c.execute("INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (key, json.dumps(value)))


def clean_site(c, v):
    """The shared look: name, tagline, logo, cover. A picture must be one stored for the site (or an old inline picture)."""
    import re
    from . import images
    own = images.owned_ids(c, "site")
    out = {}
    for k, n in (("name", 80), ("tagline", 200)):
        if isinstance(v.get(k), str) and v[k].strip():
            out[k] = v[k].strip()[:n]
    for k in ("logo", "cover"):
        s = v.get(k)
        if not isinstance(s, str) or not s:
            continue
        m = images.URL_RE.match(s)
        if (m and m.group(1) in own) or (re.match(r"^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$", s) and len(s) < 1_500_000):
            out[k] = s
    return out


def clean_cat(c, v):
    """Condition icons must be pictures stored for the site; colours must be #rrggbb. Everything else is left as the admin sent it."""
    import re
    from . import conditions, feats, gear, images, spells
    own = images.owned_ids(c, "site")
    L = v.get("conditions")
    if isinstance(L, list):
        for x in L:
            if not isinstance(x, dict):
                continue
            ic = x.get("icon")
            m = images.URL_RE.match(ic) if isinstance(ic, str) else None
            x["icon"] = ic if (m and m.group(1) in own) else ""
            col = x.get("color")
            x["color"] = col if isinstance(col, str) and re.match(r"^#[0-9a-fA-F]{6}$", col) else ""
        ids = {x.get("id") for x in L if isinstance(x, dict) and isinstance(x.get("id"), str)}
        for x in L:
            if isinstance(x, dict):
                conditions.clean_condition(x, ids)
    v["abMax"] = feats.ab_max(v)
    feats.clean_cat_feats(v)
    spells.clean_cat_spells(v)
    gear.clean_cat_gear(v)
    return v


def user_pub(r):
    return {"id": r["id"], "name": r["name"], "disp": r["disp"], "role": r["role"]}


def public_fx(fx):
    """The conditions a player may see on a combatant: which condition, how long is left, its level. Nothing else."""
    out = []
    for f in (fx if isinstance(fx, list) else [])[:20]:
        if not isinstance(f, dict) or not isinstance(f.get("cid"), str):
            continue
        u = f.get("u") if f.get("u") in ("turn", "round", "minute", "hour") else ""
        left = f.get("left")
        out.append({"id": str(f.get("id"))[:40], "cid": f["cid"][:40], "u": u,
                    "left": clampi(left, 0, 999, 0) if left is not None and u else None, "lv": clampi(f.get("lv"), 1, 20, 1),
                    "hl": f.get("hl") if f.get("hl") in ("turn", "round", "x") else ""})
    return out


def feed_pub(feed):
    """Dice feed entries as the clients see them (no account ids)."""
    out = []
    for x in (feed if isinstance(feed, list) else [])[:40]:
        if isinstance(x, dict):
            out.append({k: x[k] for k in ("id", "t", "n", "sides", "mod", "mode", "sets", "fix", "drop", "keep", "raw", "total", "lo", "hi", "dc", "ok", "label", "why", "who") if k in x})
    return out


def player_rooms(c, me):
    """What a player may see of the adventure rooms: only rooms where one of their own characters sits,
    and only the turn order (names, rolled initiative, whose turn). No GM notes, hit points or stats of others."""
    mine = {r["id"] for r in c.execute("SELECT id FROM docs WHERE kind='pc' AND owner=?", (me["id"],))}
    if not mine:
        return []
    rooms = kv_get(c, "rooms") or []
    pc_name, npc_name, pic_of = {}, {}, {}
    for kind, dst in (("pc", pc_name), ("npc", npc_name)):
        for r in c.execute("SELECT id,data FROM docs WHERE kind=?", (kind,)):
            try:
                dj = json.loads(r["data"])
                dst[r["id"]] = str(dj.get("name") or "")[:80]
                pic_of[kind + ":" + r["id"]] = str(dj.get("pic") or "")[:80]
            except Exception:
                pass
    out = []
    for rm in rooms:
        if not isinstance(rm, dict):
            continue
        assign = [str(a) for a in (rm.get("assign") or []) if a]
        if not mine.intersection(assign):
            continue
        ini = rm.get("init") if isinstance(rm.get("init"), dict) else {}
        entries = []
        for e in ini.get("list") or []:
            if not isinstance(e, dict) or e.get("init") is None:
                continue  # not rolled yet: not in the order
            ref = str(e.get("ref") or "")
            is_pc = ref.startswith("pc:")
            cid = ref[3:] if is_pc else ""
            if is_pc:
                name = pc_name.get(cid, "")
            elif ref.startswith("npc:"):
                name = npc_name.get(ref[4:], "")
            else:
                name = str(e.get("name") or "")
            v = num(e.get("init"))
            entries.append({"id": str(e.get("id")), "name": (name or "—")[:80], "init": int(v) if v == int(v) else v,
                            "kind": "pc" if is_pc else "other", "mine": is_pc and cid in mine, "pc": cid if cid in mine else "",
                            "fx": public_fx(e.get("fx")), "pic": pic_of.get(ref, "") if ref[:3] == "pc:" or ref[:4] == "npc:" else ""})
        seen = {x["id"] for x in entries}
        evt = [{"k": x.get("k"), "eid": str(x.get("eid")), "cid": str(x.get("cid") or "")[:40], "r": clampi(x.get("r"), 1, 9999, 1)}
               for x in (ini.get("evt") if isinstance(ini.get("evt"), list) else [])[:60]
               if isinstance(x, dict) and x.get("k") in ("turn_start", "turn_end", "round_start", "round_end", "expire") and str(x.get("eid")) in seen]
        out.append({"id": str(rm.get("id")), "name": str(rm.get("name") or "")[:80], "round": clampi(ini.get("round"), 1, 9999, 1), "evt": evt,
                    "cur": str(ini.get("cur") or ""), "list": entries, "feed": feed_pub(kv_get(c, "feed:" + str(rm.get("id")))),
                    "party": [{"name": pc_name.get(a, "—"), "mine": a in mine} for a in assign]})
    return out


def members(c):
    """Every account with its public profile (display name, role, profile, pinned characters). No login names."""
    out = []
    for r in c.execute("SELECT * FROM users ORDER BY created"):
        pr = kv_get(c, "profile:" + r["id"]) or {}
        out.append({"id": r["id"], "disp": r["disp"], "role": r["role"], "created": r["created"] if "created" in r.keys() else 0,
                    "p": pr, "pins": profile.pin_cards(c, r["id"], pr.get("pins"))})
    return out


def boot_state(c, me):
    # the version is read BEFORE the data: if somebody saves in between, the next poll sees a newer version and refreshes
    out = {"v": live.current(), "me": None, "hasUsers": c.execute("SELECT 1 FROM users LIMIT 1").fetchone() is not None,
           "site": kv_get(c, "site") or {}}
    if not me:
        return out
    out["me"] = user_pub(me)
    out["cat"] = kv_get(c, "cat")
    out["prefs"] = kv_get(c, "prefs:" + me["id"]) or {}
    out["members"] = members(c)
    if me["role"] == "admin":
        out["users"] = [user_pub(r) for r in c.execute("SELECT * FROM users ORDER BY created")]
        out["pcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='pc'")]
        out["npcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='npc'")]
        out["rooms"] = kv_get(c, "rooms") or []
        out["feeds"] = {str(r.get("id")): feed_pub(kv_get(c, "feed:" + str(r.get("id")))) for r in out["rooms"] if isinstance(r, dict)}
    else:
        out["users"] = [user_pub(me)]
        out["pcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='pc' AND owner=?", (me["id"],))]
        out["npcs"] = []
        out["rooms"] = []
        out["prooms"] = player_rooms(c, me)
    return out
