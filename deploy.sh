#!/usr/bin/env bash
# Package the launcher (app/) as a signed .wgt, install it on a Samsung TV in Developer
# Mode, then open it. See docs/guide.md for the one-time setup.
# Usage: ./deploy.sh <tv-ip> [design]
#        design: the look it starts on: bonito (default), horizon, dial, panorama or mediabar
# Env:   CERT_PROFILE  certificate profile name from Tizen Certificate Manager (default: tv)
#        ROOM          pin this TV's phone room (4-8 letters) instead of a random one
#        TIZEN_HOME    Tizen Studio install dir (default: ~/tizen-studio)
set -euo pipefail

TV_IP="${1:?usage: ./deploy.sh <tv-ip> [design]}"
DESIGN="${2:-}"
case "$DESIGN" in
  ''|bonito|horizon|dial|panorama|mediabar) ;;
  *) echo "Unknown design '$DESIGN': use bonito, horizon, dial, panorama or mediabar." >&2; exit 1 ;;
esac
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
TIZEN="$TIZEN_HOME/tools/ide/bin/tizen"
SDB="$TIZEN_HOME/tools/sdb"
PROFILE="${CERT_PROFILE:-tv}"
LAUNCHER_ID="SkrFlap001.SeekerFlap"

cd "$(dirname "$0")"

"$SDB" connect "$TV_IP"
SERIAL=$("$SDB" devices | awk -v ip="$TV_IP" 'index($1, ip) == 1 { print $1 }')
if [ -z "$SERIAL" ]; then
  echo "TV not visible to sdb. Check Developer Mode is on and its Host PC IP is this computer." >&2
  exit 1
fi

# Signing writes files into the folder it packages, so package a copy.
rm -rf build dist
mkdir -p build dist/launcher
# -L: config.local.js may be a link to a private repo; copy what it points at.
cp -RL app build/launcher
# The picked look goes after anything in config.local.js, so it wins.
if [ -n "$DESIGN" ]; then echo "CONFIG.design = '$DESIGN';" >> build/launcher/config.local.js; fi
if [ -n "${ROOM:-}" ]; then echo "CONFIG.room = '$ROOM';" >> build/launcher/config.local.js; fi
# -o is resolved against the tizen CLI's own folder unless absolute.
"$TIZEN" package -t wgt -s "$PROFILE" -o "$PWD/dist/launcher" -- build/launcher
# The TV's installer fails silently on file names with spaces (the .wgt is named after <name>).
(cd dist/launcher && mv ./*.wgt launcher.wgt && "$TIZEN" install -n launcher.wgt -s "$SERIAL")

"$TIZEN" run -p "$LAUNCHER_ID" -s "$SERIAL"
