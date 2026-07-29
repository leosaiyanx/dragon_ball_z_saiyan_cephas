# Dragon Ball Z: Saiyan Cephas

A 3D Dragon Ball Z fighting game built for **Cephas Emokpae**.

**▶ Play it now: https://leosaiyanx.github.io/dragon_ball_z_saiyan_cephas/**

Nothing to install. It runs in any modern browser — phone, tablet, laptop or
desktop — and once it has loaded once it works with no internet at all.

<table align="center">
<tr>
  <td align="center"><img src="qr/qr-play.png" width="200" alt="QR code to play online"><br><b>Scan to play</b></td>
  <td align="center"><img src="qr/qr-download.png" width="200" alt="QR code to download the offline copy"><br><b>Scan to download<br>the offline copy</b></td>
</tr>
</table>

---

## Five ways to play

| | How | Best for |
|---|---|---|
| **1. Scan the QR code** | Point a phone camera at the code above (or at `qr/qr-play.png`). Tap the link. | Handing a phone to a kid |
| **2. Open the link** | <https://leosaiyanx.github.io/dragon_ball_z_saiyan_cephas/> | Anything with a browser |
| **3. Install it like an app** | Open the link, then **Add to Home Screen** (iPhone: Share → Add to Home Screen. Android/Chrome: ⋮ → Install app. Desktop Chrome/Edge: the ⊕ install icon in the address bar). | Full screen, no browser bars, works offline |
| **4. Download one file** | [**Download `SaiyanCephas-standalone.html`**](https://github.com/leosaiyanx/dragon_ball_z_saiyan_cephas/releases/latest/download/SaiyanCephas-standalone.html) — the *whole game* in a single 1 MB file. Double-click it and it plays. Email it, AirDrop it, put it on a USB stick. | No internet at all, or keeping a permanent copy |
| **5. Send it to someone** | That same single file is the easiest thing to share — one attachment, no instructions, works on any computer. | Grandparents, cousins, school |

There is also **[`PRINT_ME.html`](PRINT_ME.html)** — open it and print it for a
card with the QR code and the controls, good for sticking on a wall.

### Downloading the whole thing

Green **Code** button at the top of this page → **Download ZIP**. Unzip it and
double-click `index.html`, or `dist/SaiyanCephas-standalone.html`.

---

## Controls

### Keyboard

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| `Space` / `C` | Fly up / down |
| `Shift` | Boost dash (tap with a direction to teleport-dash) |
| `J` *(or left click)* | Punch & kick — **hold it** to keep the combo going |
| `U` | Heavy smash — launches them into the sky |
| `K` *(or right click)* | Ki blast |
| `L` | Charge ki (hold) |
| `I` | Guard (hold). Tap it the moment you get hit to **vanish** behind them |
| `1` `2` `3` `4` | The four signature special moves |
| `5` or `E` | Ultimate (needs the orange bar full) |
| `O` / `P` | Transform / power back down |
| `M` or `Esc` | Pause |

### Gamepad
Plug one in and it just works. `A` punch, `B` ki blast, `X` guard, `Y` charge,
`LB` boost, `RB` smash, triggers to fly, D-pad for specials, `R3` ultimate,
`L3` transform.

### Touch
On a phone or tablet the on-screen controls appear automatically: stick on the
left, buttons on the right, specials down the right edge. Turn the phone
sideways.

### Two players
Pick **2 Players** for split screen on one keyboard. Player 2 uses
`T` `F` `G` `H` to move, `Z` attack, `X` ki, `C` guard, `N` charge, `B` smash,
`R`/`V` fly, `6`–`9` specials, `0` ultimate. Two gamepads work too.

---

## What's in it

- **79 fighters** with **152 total forms** — everyone from Dragon Ball Z, GT,
  Super and the movies. Goku (through Super Saiyan 1/2/3, God, Blue and Ultra
  Instinct), Vegeta (to Ultra Ego), Gohan (to Beast), Frieza (to Black Frieza),
  Cell, Buu, Broly, Gogeta, Vegito, Beerus, Whis, Jiren, Hit, Goku Black,
  Zamasu, Omega Shenron, Baby, Janemba, the Ginyu Force, the Androids, the
  Namekians, and the Earthlings — Krillin, Tien, Yamcha, Roshi, Mr. Satan.
  **Everyone is unlocked from the start.** This is a present, not a grind.
- **12 arenas** — Namek, the Cell Games, the World Tournament, Planet Vegeta,
  the Hyperbolic Time Chamber, the Tournament of Power, the Sacred World of the
  Kais, King Kai's tiny planet, a ruined city, Hell, and more. The ground is
  **destructible** — slams and beams punch real craters into the terrain that
  you then fight around.
- **Story Mode** — 9 sagas, **50 fights**, from Raditz landing on Earth to the
  last stand against Jiren.
- **Versus, 2-Player split screen, World Tournament, Survival and Training.**
- **Cel-shaded like the show** — flat colour with a hard shadow terminator,
  hand-tuned rim light, and black ink outlines round every fighter. Real
  shadow maps ground them in the arena.
- **Hand-keyframed animation** — every strike has anticipation, a fast
  contact frame and a follow-through, driven by a clip system rather than
  snapping between two poses. Hips and shoulders counter-rotate through a
  punch, fighters bounce on their toes at rest, and the run has a real
  contralateral swing.
- **Real combat** — 5-hit combos into launchers, ki blasts, chargeable beams,
  homing discs, orb swarms, teleport rush attacks, guard breaks, vanishing
  counters, transformations, ultimates, and **beam struggles** (fire a beam into
  an incoming one and mash to shove the ball of light into their face).
- **Opponents that actually think** — the AI runs on delayed perception, so
  difficulty changes how fast it *notices* things, not what it's allowed to do.
  Five tiers from Rookie to Legendary. Every character also gets a personality
  derived from its own stats, so two Elite opponents don't play the same.

## Difficulty

Default is **Warrior**, which is tuned for ages 8–11: a player who learns to
block wins; a pure button-masher loses narrowly. **Rookie** is winnable by
mashing alone. **Legendary** vanishes through your combos and will not be kind.
Change it any time in Settings.

Settings also has **assists** (auto-face target, hold-to-combo), graphics
quality, glow, and volume. Everything saves automatically.

## Getting around the menus

Mouse, touch, keyboard and gamepad all work everywhere. Arrow keys or WASD
move a gold cursor between buttons, Enter picks, Backspace or Escape goes
back; on a gamepad that is the stick or d-pad, **A** and **B**. The roster
tiles are rendered from the actual 3D models, so the fighter on the card is
the fighter you get.

---

## For a grown-up: running it yourself

```bash
python3 tools/serve.py
```

Prints a `localhost` address and a home-Wi-Fi address, so you can open it on a
phone on the same network without any internet.

Other tools:

| Command | What it does |
|---|---|
| `python3 tools/release.py` | **Run this before every push.** Bumps the service-worker cache and rebuilds the standalone file and the printable card. Skip it and returning players keep the old version. |
| `python3 tools/bundle.py` | Rebuilds the single-file `dist/SaiyanCephas-standalone.html` |
| `python3 tools/make_icons.py` | Redraws the app icons (needs `pillow`) |
| `python3 tools/make_qr.py <url> <out.png>` | Makes a QR code (needs `segno`) |
| `python3 tools/make_poster.py` | Rebuilds `PRINT_ME.html` |
| `tools/shot.sh out.png 'ids=goku&pose=stance'` | Headless screenshot of any fighter, pose, clip frame or stage — the Browser dev pane caches frames and lies, this does not |

## How it is built

Plain JavaScript and [three.js](https://threejs.org/) — no build step, no
framework, no npm. **Zero downloaded art or audio.** Every character is
assembled at runtime from primitives described by a table of numbers; every
sound is synthesised with the Web Audio API; the music is a step sequencer. The
glow comes from a hand-written bloom pipeline (bright-pass, separable blur at
two scales, composite with radial blur, vignette and a saturation/contrast
grade). Fighters are cel-shaded with `MeshToonMaterial` over a stepped
gradient map, plus a rim term patched into the shader, and outlined with an
inverted hull that is baked down to one mesh per joint — 16 extra draw calls
per fighter instead of 96. A whole fight scene is about 245 draw calls.

| File | What lives there |
|---|---|
| `js/core.js` | Maths, settings, save data, difficulty tiers |
| `js/roster.js` | All 79 fighters as data |
| `js/build.js` | Turns a roster row into a posable 3D rig |
| `js/anim.js` | The pose library and keyframed animation clips |
| `js/portrait.js` | Renders roster tiles from the real 3D models |
| `js/fighter.js` | Physics, resources, animation, the ki aura shader |
| `js/moves.js` | Combos, projectiles, beams, beam struggles |
| `js/ai.js` | Perception → reflexes → utility planning |
| `js/arena.js` | Stages, destructible terrain, sky shader |
| `js/fx.js` | Particles and the bloom render pipeline |
| `js/audio.js` | Synthesised sound and music |
| `js/levels.js` | Sagas and game modes |
| `js/ui.js` | Menus, roster grid, HUD |
| `js/game.js` | Cameras, match flow, split screen |

---

Made for Cephas. Go be the strongest in the universe.
