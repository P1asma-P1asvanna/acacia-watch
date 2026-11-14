"""All /api/... endpoints (mixed into the request handler)."""
import hashlib
import json
import re
import secrets
import time
from http import cookies

from .config import COOKIE, FAILS
from .errors import Err
from .security import check_pw, hash_pw, new_user_row
from .store import boot_state, clean_cat, clean_site, kv_get, kv_set, user_pub
from . import dice, images, profile, turns
from .config import IMG_SLOTS
from .validation import ID_RE, clean_prefs, clean_record, ADMIN_ONLY


class Routes:
    def throttle(self, name):
        key = (self.ip(), name)
        now = time.time()
        L = [t for t in FAILS.get(key, []) if now - t < 600]
        FAILS[key] = L
        if len(L) >= 10:
            raise Err(429, "too_many_attempts")

    def fail(self, name):
        FAILS.setdefault((self.ip(), name), []).append(time.time())

    def route(self, c, path, b, extra):
        me = self.session_user(c)
        admin = bool(me and me["role"] == "admin")

        if path == "/api/register":
            name = str(b.get("name") or "").strip().lower()
            disp = str(b.get("disp") or "").strip()[:60] or name
            pw = str(b.get("pass") or "")
            if not re.match(r"^[a-z0-9_]{3,32}$", name):
                raise Err(400, "bad_name")
            if len(pw) < 6 or len(pw) > 200:
                raise Err(400, "bad_pass")
            if c.execute("SELECT 1 FROM users WHERE name=?", (name,)).fetchone():
                raise Err(409, "name_taken")
            first = c.execute("SELECT 1 FROM users LIMIT 1").fetchone() is None
            row = new_user_row(name, disp, pw, "admin" if first else "player")
            c.execute("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)", row)
            extra.append(self.start_session(c, row[0]))
            u = c.execute("SELECT * FROM users WHERE id=?", (row[0],)).fetchone()
            return boot_state(c, u)

        if path == "/api/login":
            name = str(b.get("name") or "").strip().lower()
            self.throttle(name)
            u = c.execute("SELECT * FROM users WHERE name=?", (name,)).fetchone()
            pw = str(b.get("pass") or "")
            if not u or not check_pw(u, pw):
                self.fail(name)
                c.commit()
                raise Err(401, "bad_login")
            if u["algo"] != "pbkdf2":  # upgrade old hashes on first login
                salt = secrets.token_hex(16)
                c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), u["id"]))
            extra.append(self.start_session(c, u["id"]))
            return boot_state(c, u)

        if path == "/api/logout":
            jar = cookies.SimpleCookie(self.headers.get("Cookie") or "")
            if COOKIE in jar:
                c.execute("DELETE FROM sessions WHERE tok=?", (hashlib.sha256(jar[COOKIE].value.encode()).hexdigest(),))
            extra.append(self.cookie_hdr("", 0))
            return {"ok": True}

        if not me:
            raise Err(401, "login_required")
        cat = kv_get(c, "cat")

        if path == "/api/me/password":
            if not check_pw(me, str(b.get("old") or "")):
                raise Err(403, "bad_login")
            pw = str(b.get("new") or "")
            if len(pw) < 6 or len(pw) > 200:
                raise Err(400, "bad_pass")
            salt = secrets.token_hex(16)
            c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), me["id"]))
            return {"ok": True}

        if path == "/api/prefs":  # every user keeps their own look; nobody else's screen changes
            val = clean_prefs(b.get("value"), images.owned_ids(c, me["id"]))
            kv_set(c, "prefs:" + me["id"], val)
            images.purge(c, me["id"])
            return {"ok": True, "value": val}

        if path == "/api/profile":  # my own public profile; nobody can edit someone else's
            own_pcs = {r["id"] for r in c.execute("SELECT id FROM docs WHERE kind='pc' AND owner=?", (me["id"],))}
            val = profile.clean_profile(b.get("value"), images.owned_ids(c, me["id"]), own_pcs)
            kv_set(c, "profile:" + me["id"], val)
            images.purge(c, me["id"])
            return {"ok": True, "value": val}

        if path == "/api/img":  # upload one picture for a slot (see IMG_SLOTS in config.py for the rules)
            slot = str(b.get("slot") or "")
            if slot not in IMG_SLOTS:
                raise Err(400, "bad_slot")
            if IMG_SLOTS[slot]["scope"] == "site" and not admin:
                raise Err(403, "forbidden")
            owner = "site" if IMG_SLOTS[slot]["scope"] == "site" else me["id"]
            return images.store(c, slot, owner, b.get("data"))

        if path == "/api/sync":
            kind = b.get("kind")
            if kind not in ("pc", "npc"):
                raise Err(400, "bad_kind")
            if kind == "npc" and not admin:
                raise Err(403, "admin_only")
            user_ids = {r["id"] for r in c.execute("SELECT id FROM users")}
            saved, rejected = [], []
            own_imgs = images.owned_ids(c, me["id"])
            for rec in (b.get("upsert") or [])[:500]:
                rid = str(rec.get("id", "")) if isinstance(rec, dict) else ""
                row = c.execute("SELECT owner,data FROM docs WHERE kind=? AND id=?", (kind, rid)).fetchone()
                existing = json.loads(row["data"]) if row else None
                if row and not admin and row["owner"] != me["id"]:
                    rejected.append(rid)
                    continue
                d = clean_record(rec, kind, existing, admin, me["id"], user_ids, cat, own_imgs)
                if d is None:
                    rejected.append(rid)
                    continue
                c.execute("INSERT INTO docs(kind,id,owner,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner, data=excluded.data",
                          (kind, d["id"], d["owner"], json.dumps(d)))
                saved.append(d)
            for rid in (b.get("del") or [])[:500]:
                row = c.execute("SELECT owner FROM docs WHERE kind=? AND id=?", (kind, str(rid))).fetchone()
                if row and (admin or row["owner"] == me["id"]):
                    c.execute("DELETE FROM docs WHERE kind=? AND id=?", (kind, str(rid)))
                elif row:
                    rejected.append(str(rid))
            return {"ok": True, "records": saved, "rejected": rejected}

        if path.startswith("/api/kv/") and admin:
            key = path.rsplit("/", 1)[1]
            if key not in ("cat", "site", "rooms"):
                raise Err(404, "not_found")
            v = b.get("value")
            if key == "cat" and (not isinstance(v, dict) or not isinstance(v.get("classes"), list)):
                raise Err(400, "bad_catalog")
            if key == "site" and not isinstance(v, dict):
                raise Err(400, "bad_site")
            if key == "rooms" and not isinstance(v, list):
                raise Err(400, "bad_rooms")
            if key == "site":
                v = clean_site(c, v)
            if key == "cat":
                v = clean_cat(c, v)
            kv_set(c, key, v)
            if key in ("site", "cat"):
                images.purge(c, "site")
            return {"ok": True}

        m = re.match(r"^/api/users/([A-Za-z0-9]+)/(role|password|delete)$", path)
        if m and admin:
            uid, what = m.groups()
            u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
            if not u:
                raise Err(404, "no_user")
            admins = c.execute("SELECT COUNT(*) n FROM users WHERE role='admin'").fetchone()["n"]
            if what == "role":
                role = b.get("role")
                if role not in ("admin", "player"):
                    raise Err(400, "bad_role")
                if u["role"] == "admin" and role == "player" and admins < 2:
                    raise Err(409, "last_admin")
                c.execute("UPDATE users SET role=? WHERE id=?", (role, uid))
            elif what == "password":
                pw = str(b.get("pass") or "")
                if len(pw) < 6 or len(pw) > 200:
                    raise Err(400, "bad_pass")
                salt = secrets.token_hex(16)
                c.execute("UPDATE users SET algo='pbkdf2', salt=?, hash=? WHERE id=?", (salt, hash_pw(pw, salt), uid))
                c.execute("DELETE FROM sessions WHERE uid=?", (uid,))
                for k in [k for k in FAILS if k[1] == u["name"]]:
                    del FAILS[k]
            else:
                if u["role"] == "admin" and admins < 2:
                    raise Err(409, "last_admin")
                c.execute("DELETE FROM users WHERE id=?", (uid,))
                c.execute("DELETE FROM kv WHERE k=?", ("prefs:" + uid,))
                c.execute("DELETE FROM kv WHERE k=?", ("profile:" + uid,))
                images.delete_owner(c, uid)
                c.execute("DELETE FROM sessions WHERE uid=?", (uid,))
                for r in c.execute("SELECT id,data FROM docs WHERE kind='pc' AND owner=?", (uid,)).fetchall():
                    d = json.loads(r["data"])
                    d["owner"] = ""
                    c.execute("UPDATE docs SET owner='', data=? WHERE kind='pc' AND id=?", (json.dumps(d), r["id"]))
            return {"ok": True}

        if path == "/api/import" and admin:
            for key in ("cat", "site", "rooms"):
                if key in b and b[key] is not None:
                    kv_set(c, key, b[key])
            cat = kv_get(c, "cat")
            name_to_id = {}
            for r in c.execute("SELECT id,name FROM users"):
                name_to_id[r["name"]] = r["id"]
            id_map = {}
            for u in b.get("users") or []:  # accounts from the browser-only version keep their passwords
                if not isinstance(u, dict) or not re.match(r"^[a-z0-9_]{3,32}$", str(u.get("name", ""))):
                    continue
                if u["name"] in name_to_id:
                    id_map[u.get("id")] = name_to_id[u["name"]]
                    continue
                if not u.get("salt") or not u.get("hash"):
                    continue
                nid = secrets.token_hex(8)
                c.execute("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)",
                          (nid, u["name"], str(u.get("disp") or u["name"])[:60], "admin" if u.get("role") == "admin" else "player",
                           "legacy", str(u["salt"]), str(u["hash"]), time.time()))
                id_map[u.get("id")] = nid
                name_to_id[u["name"]] = nid
            user_ids = set(name_to_id.values())
            counts = {}
            for kind, key in (("pc", "pcs"), ("npc", "npcs")):
                c.execute("DELETE FROM docs WHERE kind=?", (kind,))
                n = 0
                for rec in b.get(key) or []:
                    if isinstance(rec, dict):
                        rec = dict(rec)
                        rec["owner"] = id_map.get(rec.get("owner"), rec.get("owner") if rec.get("owner") in user_ids else "")
                        d = clean_record(rec, kind, None, True, me["id"], user_ids, cat)
                        if d is not None:
                            c.execute("INSERT INTO docs(kind,id,owner,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner, data=excluded.data",
                                      (kind, d["id"], d["owner"], json.dumps(d)))
                            n += 1
                counts[key] = n
            return {"ok": True, "counts": counts}

        if path == "/api/roll" and me:
            rid = str(b.get("room") or "")
            if not ID_RE.match(rid):
                raise Err(400, "bad_room")
            room = next((r for r in (kv_get(c, "rooms") or []) if isinstance(r, dict) and str(r.get("id")) == rid), None)
            if not room:
                raise Err(404, "no_room")
            who = me["disp"]
            if not admin:
                mine = {r["id"]: r["data"] for r in c.execute("SELECT id,data FROM docs WHERE kind='pc' AND owner=?", (me["id"],))}
                seated = [a for a in (room.get("assign") or []) if a in mine]
                if not seated:
                    raise Err(403, "not_seated")
                if len(seated) == 1:
                    try:
                        who = str(json.loads(mine[seated[0]]).get("name") or who)[:60]
                    except Exception:
                        pass
            # "roll as": a seated character of the player, or (GM) any character / NPC
            asref = str(b.get("as") or "")
            if asref[:3] == "pc:" or asref[:4] == "npc:":
                kind, _, cid = asref.partition(":")
                if kind == "npc" and not admin:
                    raise Err(403, "forbidden")
                if kind == "pc" and not admin and cid not in [a for a in (room.get("assign") or []) if a in mine]:
                    raise Err(403, "not_seated")
                row = c.execute("SELECT data FROM docs WHERE kind=? AND id=?", (kind, cid)).fetchone()
                if not row:
                    raise Err(404, "no_character")
                try:
                    who = str(json.loads(row["data"]).get("name") or who)[:60]
                except Exception:
                    pass
            entry = dice.roll(b)
            entry["who"] = who
            entry["mine"] = me["id"]
            kv_set(c, "feed:" + rid, dice.push(kv_get(c, "feed:" + rid), entry))
            return {"ok": True, "entry": entry}

        if path == "/api/turn" and me:
            rid = str(b.get("room") or "")
            eid = str(b.get("eid") or "")
            if not ID_RE.match(rid) or not ID_RE.match(eid):
                raise Err(400, "bad_room")
            room = next((r for r in (kv_get(c, "rooms") or []) if isinstance(r, dict) and str(r.get("id")) == rid), None)
            if not room:
                raise Err(404, "no_room")
            ini = room.get("init") if isinstance(room.get("init"), dict) else {}
            entry = next((e for e in (ini.get("list") or []) if isinstance(e, dict) and str(e.get("id")) == eid and e.get("init") is not None), None)
            if not entry:
                raise Err(404, "no_entry")
            mine = set()
            if not admin:
                mine = {r["id"] for r in c.execute("SELECT id FROM docs WHERE kind='pc' AND owner=?", (me["id"],))}
            ref = str(entry.get("ref") or "")
            name = str(entry.get("name") or "")
            if ref[:3] == "pc:" or ref[:4] == "npc:":
                kind, _, cid = ref.partition(":")
                row = c.execute("SELECT data FROM docs WHERE kind=? AND id=?", (kind, cid)).fetchone()
                if row:
                    try:
                        name = str(json.loads(row["data"]).get("name") or "")
                    except Exception:
                        pass
            st = turns.view(kv_get(c, "turn:" + rid), ini)
            turns.apply(st, ini, entry, name or "—", admin, mine, b)
            kv_set(c, "turn:" + rid, st)
            return {"ok": True}

        raise Err(403 if path.startswith("/api/") else 404, "forbidden")
