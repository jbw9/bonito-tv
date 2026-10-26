#!/usr/bin/env bash
# Build the Android TV / Google TV / Fire TV app (a full-screen WebView of the hosted
# launcher) at the repo root, once per design: bonito.apk, horizon.apk, dial.apk,
# panorama.apk and mediabar.apk. They differ only in the look they start on, so the
# website can offer the one picked there. Needs only the Android SDK and a JDK.
# Usage: android/build.sh
# Env:   ANDROID_HOME  SDK dir (default: ~/Library/Android/sdk)
# Keep release.keystore: updates must be signed with the same key to install over the old app.
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"

cd "$(dirname "$0")"
rm -rf build
mkdir -p build/res

if [ ! -f release.keystore ]; then
  keytool -genkeypair -keystore release.keystore -storepass bonito -keypass bonito \
    -alias bonito -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Bonito" >/dev/null
fi

"$BT/aapt2" compile --dir res -o build/res
"$BT/aapt2" link -o build/base.apk -I "$JAR" --manifest AndroidManifest.xml build/res/*.flat

for design in bonito horizon dial panorama mediabar; do
  out="build/$design"
  mkdir -p "$out/classes" "$out/dex"
  cp -R src "$out/src"
  # bonito.apk keeps the plain address, so links to it and installs of it are unchanged.
  if [ "$design" != bonito ]; then
    sed -i '' "s|/app/?android\"|/app/?android\&design=$design\"|" "$out/src/tv/bonito/MainActivity.java"
  fi
  javac --release 11 -classpath "$JAR" -d "$out/classes" $(find "$out/src" -name '*.java')
  "$BT/d8" --min-api 21 --lib "$JAR" --output "$out/dex" $(find "$out/classes" -name '*.class')
  cp build/base.apk "$out/unsigned.apk"
  (cd "$out/dex" && zip -q ../unsigned.apk classes.dex)
  "$BT/zipalign" -f 4 "$out/unsigned.apk" "$out/aligned.apk"
  "$BT/apksigner" sign --ks release.keystore --ks-pass pass:bonito --ks-key-alias bonito \
    --out "../$design.apk" "$out/aligned.apk"
  rm -f "../$design.apk.idsig"
  echo "Built $(cd .. && pwd)/$design.apk"
done
