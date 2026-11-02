#!/bin/bash
# Build the Safari app (wraps the same extension/ folder): safari/build/Release/WA Sender.app
set -euo pipefail
cd "$(dirname "$0")"
xcodebuild -quiet -project "safari/WA Sender/WA Sender.xcodeproj" -scheme "WA Sender" \
  -configuration Release -derivedDataPath safari/build "$@" build
app="safari/build/Build/Products/Release/WA Sender.app"
echo "$app"
