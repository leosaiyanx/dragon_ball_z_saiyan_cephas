#!/usr/bin/env bash
# Headless screenshot of the staging page in dist/_shot.html.
#
#   tools/shot.sh out.png "ids=goku,vegeta&pose=stance" [W] [H]
#
# The Browser pane caches frames and will happily hand back a stale image, so
# every visual check in this project goes through headless Chrome instead.
set -euo pipefail
OUT="${1:?usage: shot.sh out.png 'query' [w] [h]}"
QUERY="${2:-}"
W="${3:-1400}"
H="${4:-760}"
PORT="${PORT:-8947}"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || CHROME="/Applications/Chromium.app/Contents/MacOS/Chromium"

# The staging page lives in tools/ but has to be served from a path the
# game's own server allows, so it is copied into dist/ for the shot and
# removed again — nothing stray ever ends up in a release.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cp "$ROOT/tools/shot.html" "$ROOT/dist/_shot.html"
trap 'rm -f "$ROOT/dist/_shot.html"' EXIT

"$CHROME" --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader \
  --disable-lcd-text --force-device-scale-factor=1 \
  --window-size="${W},${H}" --virtual-time-budget=9000 \
  --screenshot="$OUT" "http://localhost:${PORT}/dist/_shot.html?${QUERY}" 2>/dev/null || true

if [ -s "$OUT" ]; then
  echo "wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
else
  echo "FAILED to capture $OUT" >&2
  exit 1
fi
