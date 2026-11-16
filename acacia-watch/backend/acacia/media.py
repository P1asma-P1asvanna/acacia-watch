"""Video / audio clips for the minigames, kept on Cloudflare R2 (S3 compatible) instead of the database.
The browser uploads straight to R2 with a short-lived signed URL; the server only signs, checks and deletes. Players watch
through the bucket's public address. Settings come from environment variables:
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (for example https://pub-xxxx.r2.dev)
The library (list of clips) lives in kv "media" and is only sent to the admin."""
import datetime
import hashlib
import hmac
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request

from .config import FRONTEND_DIR
from .errors import Err

TYPES = {"video/mp4": ".mp4", "video/webm": ".webm", "audio/mpeg": ".mp3", "audio/ogg": ".ogg", "audio/mp4": ".m4a"}
MAX_BYTES = 400 * 1024 * 1024
MAX_COUNT = 100


def env():
    g = lambda k: os.environ.get(k, "").strip()
    return {"acct": g("R2_ACCOUNT_ID"), "key": g("R2_ACCESS_KEY_ID"), "secret": g("R2_SECRET_ACCESS_KEY"),
            "bucket": g("R2_BUCKET"), "pub": g("R2_PUBLIC_URL").rstrip("/")}


def configured():
    e = env()
    return all(e.values())


def _sign(k, msg):
    return hmac.new(k, msg.encode(), hashlib.sha256).digest()


def presign(method, host, path, key_id, secret, region="auto", service="s3", expires=900, now=None, scheme="https"):
    """AWS Signature V4 query-string signing (UNSIGNED-PAYLOAD). `path` must already be URL-encoded."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    stamp, day = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    scope = f"{day}/{region}/{service}/aws4_request"
    q = {"X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": f"{key_id}/{scope}", "X-Amz-Date": stamp,
         "X-Amz-Expires": str(expires), "X-Amz-SignedHeaders": "host"}
    qs = "&".join(f"{urllib.parse.quote(k, safe='-_.~')}={urllib.parse.quote(v, safe='-_.~')}" for k, v in sorted(q.items()))
    canon = "\n".join([method, path, qs, f"host:{host}\n", "host", "UNSIGNED-PAYLOAD"])
    to_sign = "\n".join(["AWS4-HMAC-SHA256", stamp, scope, hashlib.sha256(canon.encode()).hexdigest()])
    k = _sign(_sign(_sign(_sign(("AWS4" + secret).encode(), day), region), service), "aws4_request")
    sig = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    return f"{scheme}://{host}{path}?{qs}&X-Amz-Signature={sig}"


def _url(method, objkey, expires=900):
    e = env()
    host, scheme = f"{e['acct']}.r2.cloudflarestorage.com", "https"
    test = os.environ.get("R2_ENDPOINT", "").strip()  # only for tests: a local stand-in server, for example http://127.0.0.1:9000
    if test:
        scheme, _, host = test.partition("://")
    path = "/" + urllib.parse.quote(f"{e['bucket']}/{objkey}", safe="/-_.~")
    return presign(method, host, path, e["key"], e["secret"], expires=expires, scheme=scheme)


def new_key(mime):
    return "media/" + secrets.token_hex(12) + TYPES[mime]


def sign_upload(mime, size, name):
    if not configured():
        raise Err(503, "media_not_configured")
    if mime not in TYPES:
        raise Err(400, "media_type")
    if not (0 < size <= MAX_BYTES):
        raise Err(413, "media_too_big")
    objkey = new_key(mime)
    return {"key": objkey, "upload": _url("PUT", objkey, 3600), "url": env()["pub"] + "/" + objkey}


def _request(method, objkey):
    req = urllib.request.Request(_url(method, objkey, 120), method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, dict(r.headers)
    except urllib.error.HTTPError as ex:
        return ex.code, {}
    except Exception:
        raise Err(502, "media_unreachable")


def head(objkey):
    """(exists, size) for an uploaded object."""
    code, h = _request("HEAD", objkey)
    return code == 200, int(h.get("Content-Length") or 0)


def delete(objkey):
    _request("DELETE", objkey)


def clean_list(v):
    out = []
    for x in (v if isinstance(v, list) else [])[:MAX_COUNT]:
        if isinstance(x, dict) and isinstance(x.get("key"), str) and x["key"].startswith("media/"):
            out.append({"id": str(x.get("id") or x["key"])[:40], "key": x["key"][:80], "name": str(x.get("name") or "")[:80],
                        "type": x.get("type") if x.get("type") in TYPES else "video/mp4", "size": int(x.get("size") or 0),
                        "url": str(x.get("url") or "")[:300]})
    return out


EXT_TYPES = {".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4"}


def local_files():
    """Clips that sit in frontend/media/ (they travel with the code: git push). Newest names first is not needed: sorted by name."""
    d = os.path.join(FRONTEND_DIR, "media")
    out = []
    try:
        names = sorted(os.listdir(d), key=str.lower)
    except OSError:
        return out
    for n in names[:300]:
        ext = os.path.splitext(n)[1].lower()
        full = os.path.join(d, n)
        if ext in EXT_TYPES and not n.startswith(".") and os.path.isfile(full):
            out.append({"id": "f:" + n, "name": n, "type": EXT_TYPES[ext], "size": os.path.getsize(full),
                        "url": "media/" + urllib.parse.quote(n), "src": "file"})
    return out


def all_items(lib):
    return local_files() + [dict(x, src="r2") for x in clean_list(lib)]
