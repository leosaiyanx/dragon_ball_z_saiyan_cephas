#!/usr/bin/env python3
"""Build dist/SaiyanCephas-standalone.html — the entire game in ONE file.

    python3 tools/bundle.py

Double-click the result and it plays. No internet, no server, no install.
"""
import base64
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "dist")
os.makedirs(OUT, exist_ok=True)

html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

# inline the stylesheet
css = open(os.path.join(ROOT, "css", "style.css"), encoding="utf-8").read()
html = re.sub(r'<link rel="stylesheet"[^>]*>', "<style>\n" + css + "\n</style>", html)

# a lone file needs no manifest; keep the favicon as a data URI
fav = os.path.join(ROOT, "icons", "favicon-32.png")
fav_uri = ""
if os.path.exists(fav):
    fav_uri = "data:image/png;base64," + base64.b64encode(open(fav, "rb").read()).decode()
html = re.sub(r'<link rel="manifest"[^>]*>\s*', "", html)
html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\s*', "", html)
html = re.sub(r'<link rel="icon"[^>]*>',
              ('<link rel="icon" href="%s">' % fav_uri) if fav_uri else "", html)


def inline_js(m):
    src = m.group(1)
    path = os.path.join(ROOT, src)
    js = open(path, encoding="utf-8").read()
    js = js.replace("</script", "<\\/script")     # keep the HTML parser happy
    return "<script>\n" + js + "\n</script>"


html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

# a lone file can't register a service worker from file:// — strip that path
html = html.replace("'serviceWorker' in navigator", "false && 'serviceWorker' in navigator")

out = os.path.join(OUT, "SaiyanCephas-standalone.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote %s (%.1f MB)" % (out, os.path.getsize(out) / 1048576.0))
