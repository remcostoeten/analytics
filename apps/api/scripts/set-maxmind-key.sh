#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

conf="${1:-$HOME/Downloads/GeoIP.conf}"
key=""
if [[ -f "$conf" ]]; then
  key="$(awk '$1 == "LicenseKey" { print $2 }' "$conf")"
  [[ -n "$key" ]] && echo "Using LicenseKey from $conf"
fi
if [[ -z "$key" ]]; then
  read -rsp "MaxMind license key: " key
  echo
fi
if [[ -z "$key" ]]; then
  echo "No key entered." >&2
  exit 1
fi

for target in production preview; do
  printf '%s' "$key" | vercel env add MAXMIND_LICENSE_KEY "$target" --sensitive --force --yes
done
printf '%s' "$key" | vercel env add MAXMIND_LICENSE_KEY development --force --yes

touch .env.local
grep -v '^MAXMIND_LICENSE_KEY=' .env.local > .env.local.tmp || true
printf 'MAXMIND_LICENSE_KEY=%s\n' "$key" >> .env.local.tmp
mv .env.local.tmp .env.local

echo "Set MAXMIND_LICENSE_KEY on v2.ingestion (production, preview, development) and in apps/api/.env.local."
