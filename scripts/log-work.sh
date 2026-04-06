#!/usr/bin/env bash
# Append a dated work entry to docs/work-log.md (create if missing).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/docs/work-log.md"
DATE="$(date -u +"%Y-%m-%d %H:%M UTC")"
TITLE="${1:-작업 메모}"
shift || true
BODY="${*:-}"

mkdir -p "$(dirname "$LOG")"
if [[ ! -f "$LOG" ]]; then
  printf "# Work log\n\n" > "$LOG"
fi

{
  echo "## $DATE — $TITLE"
  if [[ -n "$BODY" ]]; then
    echo "$BODY"
  else
    echo "(내용을 편집기에서 보완하세요)"
  fi
  echo ""
} >> "$LOG"

echo "Appended to $LOG"
