#!/bin/sh
# Starts the game on http://localhost:8080 and opens the browser. Needs Node.js or Python 3.
cd "$(dirname "$0")"
URL=http://localhost:8080
( sleep 1; (xdg-open $URL || open $URL) >/dev/null 2>&1 ) &
if command -v node >/dev/null 2>&1; then exec node tools/serve.js 8080
elif command -v python3 >/dev/null 2>&1; then exec python3 -m http.server 8080
else echo "צריך Node.js או Python 3 כדי להריץ את המשחק מקומית. אפשר גם לשחק בגרסה המקוונת."; fi
