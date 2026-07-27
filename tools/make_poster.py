#!/usr/bin/env python3
"""Build PRINT_ME.html — a one-page card with the QR code and the controls.

    python3 tools/make_poster.py

Everything is inlined so the file prints correctly with no network.
"""
import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

URL = "https://leosaiyanx.github.io/dragon_ball_z_saiyan_cephas/"


def data_uri(path):
    if not os.path.exists(path):
        return ""
    ext = "png"
    return "data:image/%s;base64,%s" % (
        ext, base64.b64encode(open(path, "rb").read()).decode())


qr = data_uri(os.path.join(ROOT, "qr", "qr-play.png"))
icon = data_uri(os.path.join(ROOT, "icons", "icon-512.png"))

KEYS = [
    ("W A S D", "Move around"),
    ("Space / C", "Fly up / fly down"),
    ("Shift", "Boost dash"),
    ("J", "Punch &amp; kick — hold it for combos"),
    ("U", "Heavy smash (launches them)"),
    ("K", "Ki blast"),
    ("L", "Charge ki — hold it"),
    ("I", "Guard. Tap as you get hit to vanish"),
    ("1 2 3 4", "Special moves"),
    ("5 or E", "Ultimate (orange bar must be full)"),
    ("O / P", "Transform / power down"),
    ("M or Esc", "Pause"),
]

TIPS = [
    "Press attack from far away and you <b>fly at them automatically</b>. "
    "You never have to walk into range.",
    "<b>Hold</b> the punch button — punch, punch, kick, punch, spin kick, "
    "then press SMASH to launch them into the sky.",
    "Hold <b>CHARGE</b> until the blue bar fills. Specials and transformations "
    "both cost ki.",
    "Fire a beam into an incoming beam and they <b>lock together</b>. "
    "Mash attack to shove the ball of light into them.",
    "Tap <b>GUARD</b> at the exact moment a hit lands and you teleport behind "
    "your attacker.",
]

rows = "\n".join(
    '<tr><td class="k">%s</td><td>%s</td></tr>' % (k, v) for k, v in KEYS)
tips = "\n".join('<li>%s</li>' % t for t in TIPS)

html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Dragon Ball Z: Saiyan Cephas — print me</title>
<style>
  @page {{ size: A4 portrait; margin: 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
    color: #14161f; background: #fff;
  }}
  .sheet {{ max-width: 190mm; margin: 0 auto; padding: 6mm; }}
  header {{ display: flex; align-items: center; gap: 6mm; border-bottom: 3px solid #f2761b;
            padding-bottom: 4mm; }}
  header img {{ width: 26mm; height: 26mm; border-radius: 6mm; }}
  h1 {{ margin: 0; font-size: 26pt; line-height: 1;
        background: linear-gradient(180deg,#f7a824,#e0530a);
        -webkit-background-clip: text; background-clip: text; color: transparent; }}
  h1 small {{ display: block; font-size: 11pt; letter-spacing: .28em; color: #6b7280;
              -webkit-text-fill-color: #6b7280; margin-bottom: 2mm; }}
  .for {{ font-size: 12pt; color: #b4530a; font-weight: bold; letter-spacing: .1em; }}
  .cols {{ display: flex; gap: 8mm; margin-top: 6mm; }}
  .qrbox {{ text-align: center; flex: 0 0 62mm; }}
  .qrbox img {{ width: 58mm; height: 58mm; border: 1.5mm solid #14161f; border-radius: 3mm; }}
  .qrbox .cap {{ font-size: 10pt; margin-top: 2mm; font-weight: bold; }}
  .url {{ font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 8.5pt;
          word-break: break-all; color: #374151; margin-top: 1.5mm; }}
  h2 {{ font-size: 12pt; margin: 0 0 2mm; color: #b4530a; text-transform: uppercase;
        letter-spacing: .12em; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 9.5pt; }}
  td {{ padding: 1.1mm 2mm; border-bottom: .3mm solid #e5e7eb; vertical-align: top; }}
  td.k {{ font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: bold;
          white-space: nowrap; width: 26mm; background: #f3f4f6; border-radius: 1.5mm; }}
  ul {{ margin: 2mm 0 0; padding-left: 5mm; font-size: 9.5pt; line-height: 1.5; }}
  li {{ margin-bottom: 1.6mm; }}
  .ways {{ margin-top: 5mm; border-top: .5mm solid #e5e7eb; padding-top: 3mm;
           font-size: 9.5pt; line-height: 1.55; }}
  .ways b {{ color: #b4530a; }}
  footer {{ margin-top: 5mm; font-size: 8.5pt; color: #6b7280; text-align: center;
            border-top: .5mm solid #e5e7eb; padding-top: 2.5mm; }}
  @media screen {{
    body {{ background: #eef1f6; padding: 8mm 0; }}
    .sheet {{ background: #fff; box-shadow: 0 8px 40px rgba(0,0,0,.18); border-radius: 3mm; }}
  }}
</style>
</head>
<body>
<div class="sheet">
  <header>
    {iconimg}
    <div>
      <h1><small>DRAGON BALL Z</small>SAIYAN CEPHAS</h1>
      <div class="for">Built for Cephas Emokpae</div>
    </div>
  </header>

  <div class="cols">
    <div class="qrbox">
      {qrimg}
      <div class="cap">Scan to play</div>
      <div class="url">{url}</div>
    </div>
    <div style="flex:1 1 auto">
      <h2>Controls (keyboard)</h2>
      <table>{rows}</table>
    </div>
  </div>

  <div style="margin-top:5mm">
    <h2>Five things worth knowing</h2>
    <ul>{tips}</ul>
  </div>

  <div class="ways">
    <b>On a phone or tablet:</b> scan the code, then use Share &rarr; Add to Home
    Screen (iPhone) or &#8942; &rarr; Install app (Android) to get it as a real
    app icon that works with no internet.<br>
    <b>Gamepad:</b> plug one in and it works &mdash; A punch, B ki blast, X guard,
    Y charge, D-pad specials.<br>
    <b>Two players:</b> pick 2 Players for split screen on one keyboard.<br>
    <b>No internet at all:</b> use the single file
    <code>dist/SaiyanCephas-standalone.html</code> from the repository.
  </div>

  <footer>79 fighters &middot; 152 forms &middot; 12 arenas &middot; 50 story fights
  &middot; Dragon Ball Z, GT, Super and the movies</footer>
</div>
</body>
</html>
""".format(
    iconimg=('<img src="%s" alt="">' % icon) if icon else "",
    qrimg=('<img src="%s" alt="QR code">' % qr) if qr
          else '<div style="width:58mm;height:58mm;border:1.5mm dashed #999"></div>',
    url=URL, rows=rows, tips=tips)

out = os.path.join(ROOT, "PRINT_ME.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print("wrote", out)
