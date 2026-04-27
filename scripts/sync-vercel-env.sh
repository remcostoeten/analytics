#!/usr/bin/env bash
set -euo pipefail

# ─── config ───────────────────────────────────────────────────────────────────
INGESTION_URL="https://ingestion.remcostoeten.nl/"
ANALYTICS_DEMO_PROJECT="analytics-demo"
ZENTJES_PROJECT="zentjes"
TEAM="remcostoetens-projects"
ENVS="production preview development"
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# ─── helpers ──────────────────────────────────────────────────────────────────
log()  { echo "▸ $*"; }
ok()   { echo "✓ $*"; }
warn() { echo "⚠ $*"; }

link_project() {
  local project="$1"
  vercel link --yes --project "$project" --scope "$TEAM" 2>&1 | grep -v "^$" || true
}

env_exists() {
  local name="$1" env="$2"
  vercel env ls "$env" 2>/dev/null | grep -q "^[[:space:]]*${name}[[:space:]]"
}

set_env() {
  local name="$1" value="$2" envs="$3"
  for env in $envs; do
    if env_exists "$name" "$env"; then
      log "Removing existing $name ($env)..."
      echo | vercel env rm "$name" "$env" --yes 2>/dev/null || true
    fi
    log "Setting $name ($env)..."
    echo "$value" | vercel env add "$name" "$env" >/dev/null 2>&1
    ok "$name → $env"
  done
}

pull_and_show_keys() {
  local project="$1" env="${2:-production}"
  local file="$TMP_DIR/${project}.env"
  vercel env pull "$file" --environment="$env" --yes 2>/dev/null
  log "Keys set for $project ($env):"
  grep -v "^#\|^$" "$file" | cut -d'=' -f1 | sed 's/^/  /'
  rm -f "$file"
}

# ─── parse args ───────────────────────────────────────────────────────────────
MODE="${1:-check}"  # check | update | add-missing

# ─── zentjes ──────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════"
echo "  Project: zentjes"
echo "══════════════════════════════════"

cd "$TMP_DIR"
link_project "$ZENTJES_PROJECT"

if [[ "$MODE" == "check" ]]; then
  pull_and_show_keys "$ZENTJES_PROJECT"
else
  set_env "NEXT_PUBLIC_INGEST_URL" "$INGESTION_URL" "production preview"
  ok "zentjes NEXT_PUBLIC_INGEST_URL synced"
fi

# ─── analytics-demo ───────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════"
echo "  Project: analytics-demo"
echo "══════════════════════════════════"

link_project "$ANALYTICS_DEMO_PROJECT"

if [[ "$MODE" == "check" ]]; then
  pull_and_show_keys "$ANALYTICS_DEMO_PROJECT"
else
  # analytics-demo: add NEXT_PUBLIC_INGEST_URL if missing
  if ! env_exists "NEXT_PUBLIC_INGEST_URL" "production"; then
    set_env "NEXT_PUBLIC_INGEST_URL" "$INGESTION_URL" "production preview development"
    ok "analytics-demo NEXT_PUBLIC_INGEST_URL added"
  else
    warn "analytics-demo already has NEXT_PUBLIC_INGEST_URL — use 'update' to force overwrite"
    if [[ "$MODE" == "update" ]]; then
      set_env "NEXT_PUBLIC_INGEST_URL" "$INGESTION_URL" "production preview development"
      ok "analytics-demo NEXT_PUBLIC_INGEST_URL updated"
    fi
  fi
fi

echo ""
echo "Done. Run with 'update' to force-set all, 'add-missing' to only fill gaps."
echo "Usage: ./scripts/sync-vercel-env.sh [check|update|add-missing]"
