#!/bin/bash
# Build the zip to upload to the Chrome Web Store: dist/wa-sender-<version>.zip
set -euo pipefail
cd "$(dirname "$0")"
version=$(python3 -c 'import json; print(json.load(open("extension/manifest.json"))["version"])')
mkdir -p dist
out="dist/wa-sender-$version.zip"
rm -f "$out"
(cd extension && zip -qr "../$out" . -x '*.test.js' -x '.*')
echo "$out"
