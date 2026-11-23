#!/bin/bash
# =====================================================
# Build BasicLearning APK without Gradle
# aapt2 -> javac -> d8 -> zip -> zipalign -> apksigner
#
# Requirements:
#   - Android SDK build-tools (aapt2, d8, zipalign, apksigner)
#   - android.jar from a platform (e.g. android-34)
#   - JDK 17+ (javac, keytool)
#   - zip
#
# Configuration (env vars):
#   ANDROID_HOME          SDK root (build-tools/platforms auto-detected)
#   ANDROID_BUILD_TOOLS   path to build-tools dir (overrides ANDROID_HOME)
#   ANDROID_JAR           path to android.jar      (overrides ANDROID_HOME)
#   JAVAC / KEYTOOL       java binaries (default: on PATH)
#   APP_ROOT              project root (default: repo root = script dir/..)
#   VERSION_CODE / VERSION_NAME
# =====================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${APP_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# --- locate Android SDK pieces ---
if [ -z "${ANDROID_BUILD_TOOLS:-}" ] && [ -n "${ANDROID_HOME:-}" ]; then
  ANDROID_BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* 2>/dev/null | sort -V | tail -n1)"
fi
if [ -z "${ANDROID_JAR:-}" ] && [ -n "${ANDROID_HOME:-}" ]; then
  ANDROID_JAR="$(ls "$ANDROID_HOME"/platforms/android-*/android.jar 2>/dev/null | sort -V | tail -n1)"
fi
BT="${ANDROID_BUILD_TOOLS:-}"
AJ="${ANDROID_JAR:-}"
JAVAC="${JAVAC:-javac}"
KEYTOOL="${KEYTOOL:-keytool}"

for tool in "$BT/aapt2" "$BT/d8" "$BT/zipalign" "$BT/apksigner" "$AJ" "$JAVAC" "$KEYTOOL"; do
  if [ -z "$tool" ] || [ ! -e "$tool" ]; then
    echo "ERROR: missing build tool or file: ${tool:-<empty>}" >&2
    echo "Set ANDROID_HOME, or ANDROID_BUILD_TOOLS + ANDROID_JAR." >&2
    exit 1
  fi
done

VERSION_CODE="${VERSION_CODE:-2}"
VERSION_NAME="${VERSION_NAME:-1.1}"

cd "$ROOT"
rm -rf build
mkdir -p build/gen build/classes build/dex

echo "=== [1/7] aapt2 compile resources ==="
"$BT/aapt2" compile --dir app/res -o build/res.zip

echo "=== [2/7] aapt2 link (base.apk + R.java) ==="
"$BT/aapt2" link -o build/base.apk \
  -I "$AJ" \
  --manifest app/AndroidManifest.xml \
  -R build/res.zip \
  -A app/assets \
  --java build/gen \
  --auto-add-overlay \
  --min-sdk-version 21 \
  --target-sdk-version 34 \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION_NAME"

echo "=== [3/7] javac compile ==="
SRCS="$(find build/gen app/src -name '*.java')"
"$JAVAC" -source 8 -target 8 \
  -classpath "$AJ" \
  -d build/classes \
  -nowarn -Xlint:none \
  $SRCS

echo "=== [4/7] d8 dex ==="
CLASSES="$(find build/classes -name '*.class')"
"$BT/d8" --release --min-api 21 --lib "$AJ" --output build/dex $CLASSES

echo "=== [5/7] package classes.dex into APK ==="
(cd build/dex && zip -q -j ../base.apk classes.dex)

echo "=== [6/7] zipalign ==="
"$BT/zipalign" -f 4 build/base.apk build/aligned.apk

echo "=== [7/7] debug keystore + sign ==="
# keystore lives OUTSIDE build/ so the signing key survives rebuilds
KS="$ROOT/debug.keystore"
if [ ! -f "$KS" ]; then
  "$KEYTOOL" -genkeypair -v \
    -keystore "$KS" \
    -alias androiddebugkey \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass android -keypass android \
    -dname "CN=BasicLearning Debug,O=BasicLearning,C=KH" >/dev/null 2>&1
fi
"$BT/apksigner" sign \
  --ks "$KS" \
  --ks-key-alias androiddebugkey \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "build/BasicLearning_v${VERSION_NAME}.apk" \
  build/aligned.apk

echo ""
echo "=== VERIFY ==="
"$BT/apksigner" verify --print-certs "build/BasicLearning_v${VERSION_NAME}.apk" | head -5
ls -la "build/BasicLearning_v${VERSION_NAME}.apk"
echo "BUILD OK"
