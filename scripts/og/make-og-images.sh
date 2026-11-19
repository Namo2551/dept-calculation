#!/usr/bin/env bash
# Regenerate the share images: src/app/(th)/opengraph-image.png and src/app/(en)/en/opengraph-image.png.
# Requires Google Chrome. Run from the repository root: bash scripts/og/make-og-images.sh
set -euo pipefail
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TEMPLATE="file://$PWD/scripts/og/og.html"
shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1200,630 --virtual-time-budget=2000 --screenshot="$2" "$TEMPLATE#$1" >/dev/null 2>&1
}
shot th "src/app/(th)/opengraph-image.png"
shot en "src/app/(en)/en/opengraph-image.png"
echo "share images updated"
