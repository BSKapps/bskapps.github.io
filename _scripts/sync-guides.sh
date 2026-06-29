#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SITE="$(cd "$SCRIPT_DIR/.." && pwd)"
APPS_ROOT="$(cd "$SITE/.." && pwd)"
SRC="$SITE/_data/guides"

declare -a MAP=(
  "target-trace-guide.json:$APPS_ROOT/Target Trace/Target Trace/Resources/target-trace-guide.json"
  "fetch-puppy-guide.json:$APPS_ROOT/Fetch Puppy/Fetch Puppy/Resources/fetch-puppy-guide.json"
  "lab-assistant-guide.json:$APPS_ROOT/Lab Assistant/Lab Assistant/Resources/lab-assistant-guide.json"
)

for entry in "${MAP[@]}"; do
  name="${entry%%:*}"
  dest="${entry#*:}"
  mkdir -p "$(dirname "$dest")"
  cp "$SRC/$name" "$dest"
  echo "synced $name -> $dest"
done
