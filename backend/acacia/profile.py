"""Member profiles: a small public page each person can decorate. Everyone who is logged in can look at every profile.

Stored in kv "profile:<user id>":
  tag, bio        short texts
  accent          colour of the name and the card border highlight
  avatar, bg      own pictures (img/<id>) : avatar, and the page background (a still picture or a GIF)
  dim             0-90, how dark the background picture is made so text stays readable
  frame           {mode: none|preset|image, preset, w, c1, c2, shape, img}  the ring around the avatar
  card            {style none|preset|image, w, c, iw, img}  the border of the whole card: a preset, or a square picture cut in nine pieces (iw = drawn thickness)
  pins            up to 3 ids of the person's own characters shown on the profile
"""
import re

from .images import URL_RE
from .numbers import clampi

COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")
PRESETS = ("solid", "double", "dashed", "dotted", "ridge", "glow", "gradient")
SHAPES = ("circle", "rounded", "square")
MAX_PINS = 3


def _color(v, default):
    return v.lower() if isinstance(v, str) and COLOR.match(v) else default


def _img(v, own):
    m = isinstance(v, str) and URL_RE.match(v)
    return v if m and m.group(1) in own else ""


def clean_profile(v, own_imgs=(), own_pcs=()):
    """Return a safe profile. Pictures must belong to the person, pinned characters too."""
    v = v if isinstance(v, dict) else {}
    fr = v.get("frame") if isinstance(v.get("frame"), dict) else {}
    cd = v.get("card") if isinstance(v.get("card"), dict) else {}
    pins = []
    for x in (v.get("pins") if isinstance(v.get("pins"), list) else [])[:10]:
        if isinstance(x, str) and x in own_pcs and x not in pins:
            pins.append(x)
    out = {
        "tag": str(v.get("tag") or "").strip()[:40],
        "bio": str(v.get("bio") or "").strip()[:500],
        "accent": _color(v.get("accent"), ""),
        "avatar": _img(v.get("avatar"), own_imgs),
        "bg": _img(v.get("bg"), own_imgs),
        "dim": clampi(v.get("dim"), 0, 90, 55),
        "frame": {
            "mode": fr.get("mode") if fr.get("mode") in ("none", "preset", "image") else "none",
            "preset": fr.get("preset") if fr.get("preset") in PRESETS else "solid",
            "w": clampi(fr.get("w"), 0, 16, 4),
            "c1": _color(fr.get("c1"), "#c9a227"),
            "c2": _color(fr.get("c2"), "#7a5c00"),
            "shape": fr.get("shape") if fr.get("shape") in SHAPES else "circle",
            "img": _img(fr.get("img"), own_imgs),
        },
        "card": {
            "style": cd.get("style") if cd.get("style") in ("none", "image") + PRESETS else "none",
            "w": clampi(cd.get("w"), 0, 12, 2),
            "iw": clampi(cd.get("iw"), 8, 48, 24),
            "img": _img(cd.get("img"), own_imgs),
            "c": _color(cd.get("c"), "#c9a227"),
        },
        "pins": pins[:MAX_PINS],
    }
    if out["card"]["style"] == "image" and not out["card"]["img"]:
        out["card"]["style"] = "none"
    if out["frame"]["mode"] == "image" and not out["frame"]["img"]:
        out["frame"]["mode"] = "none"
    return out


def class_label(d):
    from . import multiclass
    rows = multiclass.rows(d)
    return " / ".join("%s %d" % (r["cls"], r["level"]) for r in rows) if len(rows) > 1 else "%s %d" % (d.get("cls") or "", multiclass.total_level(d))


def pin_cards(c, uid, pins):
    """What others may see of a pinned character: name, race, class and level. Nothing else."""
    import json
    out = []
    for pid in pins or []:
        row = c.execute("SELECT data FROM docs WHERE kind='pc' AND id=? AND owner=?", (pid, uid)).fetchone()
        if row:
            d = json.loads(row["data"])
            out.append({"id": pid, "name": str(d.get("name") or "")[:60], "race": str(d.get("race") or "")[:60], "cls": class_label(d)[:120], "pic": d.get("pic") or ""})
    return out
