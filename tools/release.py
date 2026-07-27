#!/usr/bin/env python3
"""Prepare a release: bump the service-worker cache, rebuild everything.

    python3 tools/release.py

Run this before every `git push`. The cache bump is the important part — the
service worker serves the cached copy first, so without a new cache name every
returning player keeps the old build no matter what you deploy.
"""
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def bump_sw():
    p = os.path.join(ROOT, "sw.js")
    s = open(p, encoding="utf-8").read()
    m = re.search(r"var CACHE = 'saiyan-cephas-v(\d+)';", s)
    if not m:
        print("!! could not find the CACHE line in sw.js")
        return None
    n = int(m.group(1)) + 1
    s = s[:m.start()] + "var CACHE = 'saiyan-cephas-v%d';" % n + s[m.end():]
    open(p, "w", encoding="utf-8").write(s)
    print("sw.js cache -> saiyan-cephas-v%d" % n)
    return n


def check_asset_list():
    """Every js/ file the page loads must be in the service worker's list."""
    idx = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    used = re.findall(r'<script src="(js/[^"]+)"></script>', idx)
    sw = open(os.path.join(ROOT, "sw.js"), encoding="utf-8").read()
    missing = [u for u in used if ("./" + u) not in sw]
    if missing:
        print("!! not cached by the service worker:", ", ".join(missing))
        return False
    print("service worker caches all %d scripts" % len(used))
    return True


def run(*args):
    print("$", " ".join(args))
    subprocess.check_call([sys.executable] + list(args), cwd=ROOT)


if __name__ == "__main__":
    ok = check_asset_list()
    bump_sw()
    run("tools/bundle.py")
    run("tools/make_poster.py")
    print("\nready to commit and push." if ok else "\nfix the warnings above first.")
