#!/usr/bin/env bash
# Create a new ADR file under docs/adr/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADR_DIR="$ROOT/docs/adr"
mkdir -p "$ADR_DIR"

SLUG="${1:?usage: new-adr.sh decision-title-kebab-case}"
SLUG="${SLUG// /-}"
NEXT="$(find "$ADR_DIR" -maxdepth 1 -name '[0-9][0-9][0-9]-*.md' 2>/dev/null | wc -l | tr -d ' ')"
NEXT=$((NEXT + 1))
NUM="$(printf '%03d' "$NEXT")"
FILE="$ADR_DIR/$NUM-$SLUG.md"

cat > "$FILE" <<EOF
# ADR-$NUM: ${1}

- **상태**: 제안
- **날짜**: $(date -u +"%Y-%m-%d")

## 맥락

## 결정

## 결과 / 트레이드오프

## 근거

- 코드/커밋:
EOF

echo "Created $FILE"
