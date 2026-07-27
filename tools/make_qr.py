#!/usr/bin/env python3
"""Make the QR code people scan to play.

    python3 tools/make_qr.py <url> <outfile.png> [scale]

Needs `segno` (pip install segno).
"""
import sys

import segno

url = sys.argv[1]
out = sys.argv[2]
scale = int(sys.argv[3]) if len(sys.argv) > 3 else 14

qr = segno.make(url, error="q")
qr.save(out, scale=scale, border=3, dark="#0b1224", light="#ffffff")
print("wrote", out, "->", url)
