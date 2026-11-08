"""Reading what the browser needs at start-up, and the small key/value store."""
import json


def kv_get(c, key):
    r = c.execute("SELECT v FROM kv WHERE k=?", (key,)).fetchone()
    return json.loads(r["v"]) if r else None


def kv_set(c, key, value):
    c.execute("INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (key, json.dumps(value)))


def user_pub(r):
    return {"id": r["id"], "name": r["name"], "disp": r["disp"], "role": r["role"]}


def boot_state(c, me):
    out = {"me": None, "hasUsers": c.execute("SELECT 1 FROM users LIMIT 1").fetchone() is not None,
           "site": kv_get(c, "site") or {}}
    if not me:
        return out
    out["me"] = user_pub(me)
    out["cat"] = kv_get(c, "cat")
    if me["role"] == "admin":
        out["users"] = [user_pub(r) for r in c.execute("SELECT * FROM users ORDER BY created")]
        out["pcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='pc'")]
        out["npcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='npc'")]
        out["rooms"] = kv_get(c, "rooms") or []
    else:
        out["users"] = [user_pub(me)]
        out["pcs"] = [json.loads(r["data"]) for r in c.execute("SELECT data FROM docs WHERE kind='pc' AND owner=?", (me["id"],))]
        out["npcs"] = []
        out["rooms"] = []
    return out
