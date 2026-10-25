#!/usr/bin/env bash
# Package the launcher (app/) as a signed .wgt, install it on a Samsung TV in Developer
# Mode, then open it. See README.md for the one-time setup.
# Usage: ./deploy.sh <tv-ip>
# Env:   CERT_PROFILE  certificate profile name from Tizen Certificate Manager (default: tv)
#        TIZEN_HOME    Tizen Studio install dir (default: ~/tizen-studio)
set -euo pipefail

TV_IP="${1:?usage: ./deploy.sh <tv-ip>}"
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
cp -R app build/launcher
# -o is resolved against the tizen CLI's own folder unless absolute.
"$TIZEN" package -t wgt -s "$PROFILE" -o "$PWD/dist/launcher" -- build/launcher
# The TV's installer fails silently on file names with spaces (the .wgt is named after <name>).
(cd dist/launcher && mv ./*.wgt launcher.wgt && "$TIZEN" install -n launcher.wgt -s "$SERIAL")

"$TIZEN" run -p "$LAUNCHER_ID" -s "$SERIAL"
