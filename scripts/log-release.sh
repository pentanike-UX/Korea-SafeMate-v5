#!/usr/bin/env bash
# Prepend a release block stub to docs/11_release-log.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REL="$ROOT/docs/11_release-log.md"
DATE="$(date -u +"%Y-%m-%d")"
SUMMARY="${1:-주요 업데이트 요약}"

if [[ ! -f "$REL" ]]; then
  echo "Missing $REL — create docs from template first." >&2
  exit 1
fi

BLOCK=$(cat <<EOF
## $DATE

- **주요 업데이트**: $SUMMARY
- **영향 화면/기능**: TODO
- **기술적 변경**: TODO (커밋: \`$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo "?")\`)
- **비고**:

---
EOF
)

TMP="$(mktemp)"
{
  head -n 1 "$REL"
  echo ""
  echo "$BLOCK"
  echo ""
  tail -n +2 "$REL"
} > "$TMP"
mv "$TMP" "$REL"

echo "Prepended release block to $REL"
