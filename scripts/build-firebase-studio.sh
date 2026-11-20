#!/usr/bin/env bash
# Builds the stand-alone Photo Studio for Firebase Hosting from the same files the website uses,
# so both copies always stay in sync. Output: firebase-studio/dist
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=firebase-studio/dist
rm -rf "$OUT" && mkdir -p "$OUT"
cp public/admin/photostudio.css public/admin/photostudio.js "$OUT"/
# index.html = photostudio.html without the website login/data script, in stand-alone mode
python3 - "$OUT" <<'PY'
import sys, re
out = sys.argv[1]
s = open('public/admin/photostudio.html', encoding='utf-8').read()
s = s.replace('<script src="shim.js"></script>',
  '<script>window.PS_STANDALONE = { home: null };</script>')
s = s.replace('<title>Photo Studio · Control Panel</title>', '<title>Photo Studio · Prabhat</title>')
s = s.replace('Remove backgrounds · enhance · save to products', 'Remove backgrounds · enhance · download')
assert 'shim.js' not in s and 'PS_STANDALONE' in s
open(out + '/index.html', 'w', encoding='utf-8').write(s)
PY
ls -la "$OUT"
