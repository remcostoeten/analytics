#!/usr/bin/env bash
set -euo pipefail

REPO="remcostoeten/analytics"
TEAM_SLUG="${VERCEL_TEAM_SLUG:-remcostoetens-projects}"
V1_PROJECT="${V1_PROJECT:-ingestion}"
V1_DASHBOARD_PROJECT="${V1_DASHBOARD_PROJECT:-v1.analytics}"
API_PROJECT="${API_PROJECT:-analytics-api}"
DOCS_PROJECT="${DOCS_PROJECT:-analytics-docs}"
API_DOMAIN="${API_DOMAIN:-api.remcostoeten.nl}"
DOCS_DOMAIN="${DOCS_DOMAIN:-docs.analytics.remcostoeten.nl}"
API_URL="${API_URL:-https://${API_DOMAIN}}"
DASHBOARD_ORIGIN="${DASHBOARD_ORIGIN:-https://analytics.remcostoeten.nl}"
AUTH_COOKIE_DOMAIN="${AUTH_COOKIE_DOMAIN:-.remcostoeten.nl}"
BASELINE="${BASELINE:-0008_add_rollup_daily}"
SECRETS_FILE="${SECRETS_FILE:-.env.deploy}"
VERCEL_API="https://api.vercel.com"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf 'error: %s\n' "$*" >&2; exit 1; }

require() {
  for tool in "$@"; do
    command -v "$tool" >/dev/null 2>&1 || fail "$tool is not installed"
  done
}

require bun curl jq gh openssl
[ -n "${VERCEL_TOKEN:-}" ] || fail "set VERCEL_TOKEN to a token from https://vercel.com/account/tokens"
gh auth status >/dev/null 2>&1 || fail "run gh auth login first"

vercel_api() {
  local method="$1" path="$2" body="${3:-}"
  local separator="?"
  case "$path" in *\?*) separator="&";; esac
  if [ -n "$body" ]; then
    curl -sS -X "$method" "${VERCEL_API}${path}${separator}teamId=${TEAM_ID}" \
      -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "${VERCEL_API}${path}${separator}teamId=${TEAM_ID}" \
      -H "Authorization: Bearer ${VERCEL_TOKEN}"
  fi
}

vercel_error() {
  jq -r '.error.message // empty' <<<"$1"
}

log "Resolving the Vercel team ${TEAM_SLUG}"
TEAM_ID="$(curl -sS "${VERCEL_API}/v2/teams" -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  | jq -r --arg slug "$TEAM_SLUG" '.teams[] | select(.slug == $slug) | .id')"
[ -n "$TEAM_ID" ] || fail "team ${TEAM_SLUG} is not visible to this token"

log "Loading or generating the secrets in ${SECRETS_FILE}"
if [ -f "$SECRETS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
  set +a
fi
IP_HASH_SECRET="${IP_HASH_SECRET:-$(openssl rand -hex 32)}"
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-$(openssl rand -hex 32)}"
CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"

if [ -z "${DATABASE_URL:-}" ]; then
  log "Pulling DATABASE_URL from the Vercel project ${V1_PROJECT}"
  env_id="$(vercel_api GET "/v10/projects/${V1_PROJECT}/env" \
    | jq -r '.envs[] | select(.key == "DATABASE_URL" and (.target | index("production"))) | .id' | head -n 1)"
  [ -n "$env_id" ] || fail "no production DATABASE_URL on ${V1_PROJECT}; export DATABASE_URL and rerun"
  DATABASE_URL="$(vercel_api GET "/v1/projects/${V1_PROJECT}/env/${env_id}" | jq -r '.value // empty')"
  [ -n "$DATABASE_URL" ] || fail "DATABASE_URL on ${V1_PROJECT} is sensitive and cannot be read back; export it and rerun"
fi

umask 077
{
  printf 'DATABASE_URL=%s\n' "$DATABASE_URL"
  printf 'IP_HASH_SECRET=%s\n' "$IP_HASH_SECRET"
  printf 'BETTER_AUTH_SECRET=%s\n' "$BETTER_AUTH_SECRET"
  printf 'CRON_SECRET=%s\n' "$CRON_SECRET"
  [ -n "${GITHUB_CLIENT_ID:-}" ] && printf 'GITHUB_CLIENT_ID=%s\n' "$GITHUB_CLIENT_ID"
  [ -n "${GITHUB_CLIENT_SECRET:-}" ] && printf 'GITHUB_CLIENT_SECRET=%s\n' "$GITHUB_CLIENT_SECRET"
  [ -n "${MAIL_URL:-}" ] && printf 'MAIL_URL=%s\n' "$MAIL_URL"
  [ -n "${MAIL_FROM:-}" ] && printf 'MAIL_FROM=%s\n' "$MAIL_FROM"
  [ -n "${INTERNAL_PROJECT_SECRET:-}" ] && printf 'INTERNAL_PROJECT_SECRET=%s\n' "$INTERNAL_PROJECT_SECRET"
  [ -n "${CRUX_API_KEY:-}" ] && printf 'CRUX_API_KEY=%s\n' "$CRUX_API_KEY"
  true
} >"$SECRETS_FILE"

log "Migrating Neon: dry run"
DATABASE_URL="$DATABASE_URL" bun run migrate --dry-run --baseline "$BASELINE"
log "Migrating Neon: apply"
DATABASE_URL="$DATABASE_URL" bun run migrate --baseline "$BASELINE"

log "Configuring the GitHub production environment"
gh api -X PUT "repos/${REPO}/environments/production" >/dev/null
gh secret set DATABASE_URL --repo "$REPO" --env production --body "$DATABASE_URL"
gh secret set CRON_SECRET --repo "$REPO" --env production --body "$CRON_SECRET"
gh variable set API_URL --repo "$REPO" --env production --body "$API_URL"

log "Setting the ignored build step on the v1 projects"
for project in "$V1_PROJECT" "$V1_DASHBOARD_PROJECT"; do
  response="$(vercel_api PATCH "/v9/projects/${project}" \
    '{"commandForIgnoringBuildStep":"git diff --quiet HEAD^ HEAD -- ../../"}')"
  message="$(vercel_error "$response")"
  [ -z "$message" ] || echo "notice: ${project}: ${message}"
done

ensure_project() {
  local name="$1" body="$2"
  local response
  response="$(vercel_api GET "/v9/projects/${name}")"
  if [ "$(jq -r '.id // empty' <<<"$response")" != "" ]; then
    echo "${name} exists"
    return
  fi
  response="$(vercel_api POST "/v11/projects" "$body")"
  local message
  message="$(vercel_error "$response")"
  [ -z "$message" ] || fail "creating ${name}: ${message}"
  echo "${name} created"
}

set_env() {
  local project="$1" key="$2" value="$3" type="${4:-encrypted}"
  [ -n "$value" ] || return 0
  local body response message
  body="$(jq -cn --arg key "$key" --arg value "$value" --arg type "$type" \
    '[{key: $key, value: $value, type: $type, target: ["production"]}]')"
  response="$(vercel_api POST "/v10/projects/${project}/env?upsert=true" "$body")"
  message="$(vercel_error "$response")"
  [ -z "$message" ] || fail "setting ${key} on ${project}: ${message}"
}

add_domain() {
  local project="$1" domain="$2"
  local response message
  response="$(vercel_api POST "/v10/projects/${project}/domains" "$(jq -cn --arg name "$domain" '{name: $name}')")"
  message="$(vercel_error "$response")"
  case "$message" in
    "") echo "${domain} added to ${project}";;
    *"already"*) echo "${domain} is already on ${project}";;
    *) echo "notice: ${domain} on ${project}: ${message}";;
  esac
}

deploy_project() {
  local project="$1"
  local repo_id response message url
  repo_id="$(vercel_api GET "/v9/projects/${project}" | jq -r '.link.repoId // empty')"
  [ -n "$repo_id" ] || { echo "notice: ${project} is not linked to GitHub, push to master to deploy"; return; }
  response="$(vercel_api POST "/v13/deployments" "$(jq -cn --arg name "$project" --arg project "$project" --argjson repoId "$repo_id" \
    '{name: $name, project: $project, target: "production", gitSource: {type: "github", ref: "master", repoId: $repoId}}')")"
  message="$(vercel_error "$response")"
  [ -z "$message" ] || { echo "notice: deploying ${project}: ${message}"; return; }
  url="$(jq -r '.url' <<<"$response")"
  echo "${project} deploying at https://${url}"
}

log "Creating the API project ${API_PROJECT}"
ensure_project "$API_PROJECT" "$(jq -cn --arg name "$API_PROJECT" --arg repo "$REPO" \
  '{name: $name, framework: "elysia", rootDirectory: "apps/api", gitRepository: {type: "github", repo: $repo}}')"
set_env "$API_PROJECT" DATABASE_URL "$DATABASE_URL"
set_env "$API_PROJECT" IP_HASH_SECRET "$IP_HASH_SECRET"
set_env "$API_PROJECT" BETTER_AUTH_SECRET "$BETTER_AUTH_SECRET"
set_env "$API_PROJECT" CRON_SECRET "$CRON_SECRET"
set_env "$API_PROJECT" API_URL "$API_URL" plain
set_env "$API_PROJECT" DASHBOARD_ORIGIN "$DASHBOARD_ORIGIN" plain
set_env "$API_PROJECT" AUTH_COOKIE_DOMAIN "$AUTH_COOKIE_DOMAIN" plain
set_env "$API_PROJECT" GITHUB_CLIENT_ID "${GITHUB_CLIENT_ID:-}" plain
set_env "$API_PROJECT" GITHUB_CLIENT_SECRET "${GITHUB_CLIENT_SECRET:-}"
set_env "$API_PROJECT" MAIL_URL "${MAIL_URL:-}"
set_env "$API_PROJECT" MAIL_FROM "${MAIL_FROM:-}" plain
set_env "$API_PROJECT" INTERNAL_PROJECT_SECRET "${INTERNAL_PROJECT_SECRET:-}"
set_env "$API_PROJECT" CRUX_API_KEY "${CRUX_API_KEY:-}"
add_domain "$API_PROJECT" "$API_DOMAIN"

log "Creating the docs project ${DOCS_PROJECT}"
ensure_project "$DOCS_PROJECT" "$(jq -cn --arg name "$DOCS_PROJECT" --arg repo "$REPO" \
  '{name: $name, framework: "nextjs", rootDirectory: "apps/docs", buildCommand: "bun run build", installCommand: "bun install", gitRepository: {type: "github", repo: $repo}}')"
set_env "$DOCS_PROJECT" NEXT_PUBLIC_API_URL "$API_URL" plain
add_domain "$DOCS_PROJECT" "$DOCS_DOMAIN"

log "Deploying master"
deploy_project "$API_PROJECT"
deploy_project "$DOCS_PROJECT"

log "Done"
cat <<EOF
Secrets are in ${SECRETS_FILE} (gitignored); rerunning reuses them.
Point ${API_DOMAIN} and ${DOCS_DOMAIN} at Vercel if they are not yet, then check ${API_URL}/v2/health.
EOF
if [ -z "${GITHUB_CLIENT_ID:-}" ]; then
  cat <<EOF
GitHub sign-in is not configured: create the OAuth app from docs/v2/deploy.md step 4, then rerun with
GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET exported or added to ${SECRETS_FILE}.
EOF
fi
