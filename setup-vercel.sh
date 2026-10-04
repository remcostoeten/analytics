#!/usr/bin/env bash
set -euo pipefail

team="${VERCEL_TEAM:-remcostoetens-projects}"
repo="remcostoeten/analytics"
api_project="${API_PROJECT:-v2.ingestion}"
docs_project="${DOCS_PROJECT:-v2.analytics-docs}"
api_domain="${API_DOMAIN:-api.analytics.remcostoeten.nl}"
docs_domain="${DOCS_DOMAIN:-docs.analytics.remcostoeten.nl}"
dashboard_origin="${DASHBOARD_ORIGIN:-https://analytics.remcostoeten.nl}"
cookie_domain="${AUTH_COOKIE_DOMAIN:-.remcostoeten.nl}"
v1_projects="${V1_PROJECTS:-ingestion v1.analytics}"
state_file="$(cd "$(dirname "$0")" && pwd)/.env.deploy"
vercel_api="https://api.vercel.com"

function usage {
	cat <<EOF
Creates the v2 Vercel projects, sets their variables and domains, stops the v1
projects rebuilding on v2 pushes and, when gh is signed in, sets the GitHub
production environment for the migrate and jobs workflows.

Required:
  VERCEL_TOKEN          https://vercel.com/account/tokens, scoped to $team
  DATABASE_URL          the pooled Neon connection string
  GITHUB_CLIENT_ID      the GitHub OAuth app (docs/v2/deploy.md step 4)
  GITHUB_CLIENT_SECRET

Optional: MAIL_URL, MAIL_FROM, INTERNAL_PROJECT_SECRET, CRUX_API_KEY,
VERCEL_TEAM, API_PROJECT, DOCS_PROJECT, API_DOMAIN, DOCS_DOMAIN,
DASHBOARD_ORIGIN, AUTH_COOKIE_DOMAIN, V1_PROJECTS, SKIP_DEPLOY=1.

IP_HASH_SECRET, BETTER_AUTH_SECRET and CRON_SECRET are generated once and kept
in .env.deploy, so a second run never rotates them. Every step is safe to rerun.

Usage: VERCEL_TOKEN=... DATABASE_URL=... GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=... ./setup-vercel.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
	usage
	exit 0
fi

for tool in curl openssl; do
	command -v "$tool" >/dev/null || {
		echo "Missing $tool" >&2
		exit 1
	}
done

if [[ -f "$state_file" ]]; then
	source "$state_file"
fi

missing=()
for name in VERCEL_TOKEN DATABASE_URL GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET; do
	[[ -n "${!name:-}" ]] || missing+=("$name")
done
if ((${#missing[@]})); then
	echo "Missing: ${missing[*]}" >&2
	echo >&2
	usage >&2
	exit 1
fi

for name in IP_HASH_SECRET BETTER_AUTH_SECRET CRON_SECRET; do
	if [[ -z "${!name:-}" ]]; then
		printf -v "$name" '%s' "$(openssl rand -hex 32)"
		echo "Generated $name"
	fi
done

umask 077
cat >"$state_file" <<EOF
IP_HASH_SECRET=$IP_HASH_SECRET
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
CRON_SECRET=$CRON_SECRET
EOF

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT
status=""
response=""

function escape {
	local value=$1
	value=${value//\\/\\\\}
	value=${value//\"/\\\"}
	printf '%s' "$value"
}

function call {
	local method=$1 path=$2 data=${3:-}
	local separator='?'
	[[ "$path" == *\?* ]] && separator='&'
	local args=(-sS -X "$method" -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" -o "$response_file" -w '%{http_code}')
	[[ -n "$data" ]] && args+=(--data "$data")
	status=$(curl "${args[@]}" "$vercel_api$path${separator}slug=$team")
	response=$(cat "$response_file")
}

function fail {
	echo "$1 failed with $status: $response" >&2
	exit 1
}

function ensure_project {
	local name=$1 settings=$2
	call GET "/v9/projects/$name"
	if [[ "$status" == 200 ]]; then
		call PATCH "/v9/projects/$name" "{$settings}"
		[[ "$status" == 200 ]] || fail "Updating $name"
		echo "Updated project $name"
	elif [[ "$status" == 404 ]]; then
		call POST "/v11/projects" "{\"name\":\"$name\",\"gitRepository\":{\"type\":\"github\",\"repo\":\"$repo\"},$settings}"
		[[ "$status" == 200 ]] || fail "Creating $name"
		echo "Created project $name"
	else
		fail "Reading $name"
	fi
}

function set_env {
	local project=$1
	shift
	local items=() pair key value
	for pair in "$@"; do
		key=${pair%%=*}
		value=${pair#*=}
		[[ -n "$value" ]] || continue
		items+=("{\"key\":\"$key\",\"value\":\"$(escape "$value")\",\"type\":\"encrypted\",\"target\":[\"production\"]}")
	done
	((${#items[@]})) || return 0
	local body
	body=$(
		IFS=,
		printf '[%s]' "${items[*]}"
	)
	call POST "/v10/projects/$project/env?upsert=true" "$body"
	[[ "$status" == 200 || "$status" == 201 ]] || fail "Setting variables on $project"
	echo "Set ${#items[@]} variables on $project"
}

function add_domain {
	local project=$1 domain=$2
	call POST "/v10/projects/$project/domains" "{\"name\":\"$domain\"}"
	case "$status" in
	200) echo "Added $domain to $project" ;;
	409) echo "$domain is already on a project" ;;
	*) echo "Could not add $domain to $project ($status): $response" >&2 ;;
	esac
	if [[ "$response" == *'"verified":false'* ]]; then
		echo "  $domain needs DNS: CNAME to cname.vercel-dns.com, then check it in the project's Domains tab"
	fi
}

function deploy {
	local project=$1
	call POST "/v13/deployments" "{\"name\":\"$project\",\"project\":\"$project\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"org\":\"${repo%%/*}\",\"repo\":\"${repo#*/}\",\"ref\":\"master\"}}"
	if [[ "$status" == 200 ]]; then
		echo "Deploying $project from master"
	else
		echo "Could not start a deploy of $project ($status): $response" >&2
	fi
}

echo "Team $team"

for project in $v1_projects; do
	call PATCH "/v9/projects/$project" '{"commandForIgnoringBuildStep":"git diff --quiet HEAD^ HEAD -- ../../"}'
	if [[ "$status" == 200 ]]; then
		echo "Set the ignored build step on $project"
	else
		echo "Skipped the ignored build step on $project ($status)" >&2
	fi
done

ensure_project "$api_project" '"framework":"elysia","rootDirectory":"apps/api"'
set_env "$api_project" \
	"DATABASE_URL=$DATABASE_URL" \
	"IP_HASH_SECRET=$IP_HASH_SECRET" \
	"BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" \
	"CRON_SECRET=$CRON_SECRET" \
	"API_URL=https://$api_domain" \
	"DASHBOARD_ORIGIN=$dashboard_origin" \
	"AUTH_COOKIE_DOMAIN=$cookie_domain" \
	"GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID" \
	"GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET" \
	"MAIL_URL=${MAIL_URL:-}" \
	"MAIL_FROM=${MAIL_FROM:-}" \
	"INTERNAL_PROJECT_SECRET=${INTERNAL_PROJECT_SECRET:-}" \
	"CRUX_API_KEY=${CRUX_API_KEY:-}"
add_domain "$api_project" "$api_domain"

ensure_project "$docs_project" '"framework":"nextjs","rootDirectory":"apps/docs","installCommand":"bun install","buildCommand":"bun run build"'
set_env "$docs_project" "NEXT_PUBLIC_API_URL=https://$api_domain"
add_domain "$docs_project" "$docs_domain"

if [[ "${SKIP_DEPLOY:-}" != 1 ]]; then
	deploy "$api_project"
	deploy "$docs_project"
fi

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
	gh api -X PUT "repos/$repo/environments/production" >/dev/null
	gh secret set DATABASE_URL --env production --repo "$repo" --body "$DATABASE_URL"
	gh secret set CRON_SECRET --env production --repo "$repo" --body "$CRON_SECRET"
	gh variable set API_URL --env production --repo "$repo" --body "https://$api_domain"
	echo "Set the GitHub production environment: DATABASE_URL, CRON_SECRET, API_URL"
else
	echo "gh is not signed in: set DATABASE_URL and CRON_SECRET secrets and the API_URL variable on the production environment by hand" >&2
fi

cat <<EOF

Done. Secrets are in $state_file; keep a copy somewhere safe.
Next:
  1. Point DNS for $api_domain and $docs_domain at Vercel if the domains are unverified.
  2. Actions, migrate: dry-run with baseline 0008_add_rollup_daily, then apply.
  3. Check https://$api_domain/v2/health answers ok: true.
  4. Sign in and create a token (docs/v2/deploy.md step 8).
EOF
