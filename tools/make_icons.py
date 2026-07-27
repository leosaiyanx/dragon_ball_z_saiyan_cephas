#!/usr/bin/env python3
"""Draw the app icons — a four-star Dragon Ball wrapped in ki. No source art.

    python3 tools/make_icons.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

BG_TOP = (16, 22, 48)
BG_BOT = (4, 6, 16)
BALL_HI = (255, 248, 214)
BALL_MID = (255, 178, 58)
BALL_LO = (196, 92, 8)
STAR = (208, 46, 18)
AURA = (255, 176, 60)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def star_points(cx, cy, r, rot=-math.pi / 2):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.42
        a = rot + i * math.pi / 5
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return pts


def draw_icon(size, maskable=False):
    S = size * 4                       # supersample, then downscale
    img = Image.new("RGB", (S, S), BG_BOT)
    d = ImageDraw.Draw(img, "RGBA")

    for y in range(S):
        d.line([(0, y), (S, y)], fill=lerp(BG_TOP, BG_BOT, (y / S) ** 0.8))

    cx, cy = S * 0.5, S * 0.5
    R = S * (0.30 if maskable else 0.355)

    # ki aura: soft flames licking upward, drawn on their own layer and blurred
    glow = Image.new("RGB", (S, S), (0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    for i in range(26):
        a = -math.pi / 2 + (i / 25 - 0.5) * math.pi * 1.75
        length = R * (1.30 + 0.55 * abs(math.cos(i * 1.7)))
        w = R * 0.16
        tipx, tipy = cx + math.cos(a) * length, cy + math.sin(a) * length * 1.12
        basex, basey = cx + math.cos(a) * R * 0.86, cy + math.sin(a) * R * 0.86
        nx, ny = -math.sin(a) * w, math.cos(a) * w
        gd.polygon([(basex - nx, basey - ny), (basex + nx, basey + ny), (tipx, tipy)],
                   fill=AURA + (150,))
    for rr in range(int(R * 1.5), 0, -max(1, S // 200)):
        t = rr / (R * 1.5)
        gd.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                   fill=(255, 150, 40, int(30 * (1 - t) ** 2)))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.022))
    img = Image.blend(img, Image.blend(img, glow, 1.0), 0.62)
    d = ImageDraw.Draw(img, "RGBA")

    # the ball
    for rr in range(int(R), 0, -1):
        t = rr / R
        if t > 0.86:
            col = lerp(BALL_LO, BALL_MID, (1 - t) / 0.14)
        else:
            col = lerp(BALL_MID, BALL_HI, (0.86 - t) / 0.86 * 0.75)
        ox, oy = -R * 0.16 * (1 - t), -R * 0.20 * (1 - t)
        d.ellipse([cx - rr + ox, cy - rr + oy, cx + rr + ox, cy + rr + oy], fill=col)

    # four stars
    sr = R * 0.155
    for dx, dy in ((-0.30, -0.30), (0.30, -0.30), (-0.30, 0.30), (0.30, 0.30)):
        d.polygon(star_points(cx + R * dx, cy + R * dy, sr), fill=STAR)

    # specular highlight and rim
    d.ellipse([cx - R * 0.62, cy - R * 0.72, cx - R * 0.10, cy - R * 0.26],
              fill=(255, 255, 255, 92))
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=(255, 224, 150, 170),
              width=max(2, S // 190))

    return img.resize((size, size), Image.LANCZOS)


def main():
    jobs = [(32, "favicon-32.png", False), (180, "icon-180.png", False),
            (192, "icon-192.png", False), (512, "icon-512.png", False),
            (512, "icon-maskable-512.png", True), (1024, "icon-1024.png", False)]
    for size, name, maskable in jobs:
        p = os.path.join(OUT, name)
        draw_icon(size, maskable).save(p)
        print("wrote", p)


if __name__ == "__main__":
    main()
