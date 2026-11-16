#!/usr/bin/env python3
"""Inline frontend/ (css + js) into ONE html file, for demos, artifacts or offline use.
Usage: python tools/build_single.py [output.html]   (default: dist/acacia-watch.html)"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FE = os.path.join(ROOT, "frontend")
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "acacia-watch.html")
html = open(os.path.join(FE, "index.html"), encoding="utf-8").read()

def rd(rel):
    return open(os.path.join(FE, rel), encoding="utf-8").read()

css = "".join(rd(m) for m in re.findall(r'<link rel="stylesheet" href="(css/[^"]+)">', html))
js = "".join(rd(m) for m in re.findall(r'<script src="(js/[^"]+)"></script>', html))
html = re.sub(r'[ \t]*<link rel="stylesheet" href="css/[^"]+">\n', "", html)
html = re.sub(r'[ \t]*<script src="js/[^"]+"></script>\n', "", html)
html = html.replace("</head>", "<style>" + css + "</style>\n</head>", 1)
html = html.replace("</body>", "<script>" + js + "</script>\n</body>", 1)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, "w", encoding="utf-8").write(html)
print("wrote", out, len(html), "chars")
