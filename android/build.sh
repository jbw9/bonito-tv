#!/usr/bin/env bash
# Build the Android TV / Google TV / Fire TV app (a full-screen WebView of the hosted
# launcher) as bonito.apk at the repo root. Needs only the Android SDK and a JDK.
# Usage: android/build.sh
# Env:   ANDROID_HOME  SDK dir (default: ~/Library/Android/sdk)
# Keep release.keystore: updates must be signed with the same key to install over the old app.
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"

cd "$(dirname "$0")"
rm -rf build
mkdir -p build/res build/classes build/dex

if [ ! -f release.keystore ]; then
  keytool -genkeypair -keystore release.keystore -storepass bonito -keypass bonito \
    -alias bonito -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Bonito" >/dev/null
fi

"$BT/aapt2" compile --dir res -o build/res
"$BT/aapt2" link -o build/unsigned.apk -I "$JAR" --manifest AndroidManifest.xml build/res/*.flat
javac --release 11 -classpath "$JAR" -d build/classes $(find src -name '*.java')
"$BT/d8" --min-api 21 --lib "$JAR" --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 build/unsigned.apk build/aligned.apk
"$BT/apksigner" sign --ks release.keystore --ks-pass pass:bonito --ks-key-alias bonito \
  --out ../bonito.apk build/aligned.apk
rm -f ../bonito.apk.idsig
echo "Built $(cd .. && pwd)/bonito.apk"
