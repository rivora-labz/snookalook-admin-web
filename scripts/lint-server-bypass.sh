#!/usr/bin/env bash
# Doctrine 8.36 (candidate) gate — Vercel-Edge → CF-orange-cloud BFM block class.
#
# Server-side files (middleware, route handlers under src/app/api, server actions,
# server-only libs) MUST NOT hard-code api.snookalook.com. CF Bot Fight Mode
# flags the Vercel ASN at firewall_managed phase (before firewall_custom Skip
# rules apply) → 1020 "Access denied" → /forbidden redirect cascade.
#
# Use SERVER_API_BASE (vapi.bypass.snookalook.com) from src/lib/api-base.ts.
# Browser-origin client code may still hard-code api.snookalook.com (allowed).
set -euo pipefail

PATTERNS=(
  "src/middleware.ts"
  "src/lib/auth.ts"
  "src/lib/master-api.ts"
)

DIRS=(
  "src/app/api"
  "src/app/actions"
)

# Strip line + block comments before matching so doctrine comments don't trip the gate.
strip_comments() {
  # Naive but effective: drop // comment lines + remove trailing // tails.
  sed -E '/^\s*\/\//d; s|//.*$||'
}

FAIL=0

check_file() {
  local f="$1"
  if [[ ! -f "$f" ]]; then return 0; fi
  local hits
  hits=$(strip_comments < "$f" | grep -nE "api\.snookalook\.com" || true)
  if [[ -n "$hits" ]]; then
    echo "[lint-server-bypass] FAIL: $f references api.snookalook.com — use SERVER_API_BASE" >&2
    echo "$hits" >&2
    FAIL=1
  fi
}

for f in "${PATTERNS[@]}"; do
  check_file "$f"
done

for d in "${DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    while IFS= read -r f; do
      check_file "$f"
    done < <(find "$d" -type f \( -name "*.ts" -o -name "*.tsx" \))
  fi
done

if [[ "$FAIL" -ne 0 ]]; then
  echo "" >&2
  echo "[lint-server-bypass] Doctrine 8.36 violation — server-side fetch must route via SERVER_API_BASE (vapi.bypass.snookalook.com)." >&2
  echo "[lint-server-bypass] See src/lib/api-base.ts + docs/doctrine/draft/8.36-*.md" >&2
  exit 1
fi

echo "[lint-server-bypass] OK — no server-side hard-codes of api.snookalook.com"
