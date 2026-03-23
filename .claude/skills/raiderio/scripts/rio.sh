#!/usr/bin/env bash
# rio.sh — Raider.IO API helper
# Usage: ./rio.sh <endpoint> [param=value ...]
# Example: ./rio.sh characters/profile region=us realm=illidan name=Toon fields=mythic_plus_scores_by_season:current
#
# No auth required. Free public API.

set -euo pipefail

BASE_URL="https://raider.io/api/v1"

if [[ $# -lt 1 ]]; then
  echo "Usage: rio.sh <endpoint> [param=value ...]" >&2
  echo "Endpoints: characters/profile, guilds/profile, mythic-plus/runs, mythic-plus/affixes," >&2
  echo "           mythic-plus/static-data, mythic-plus/season-cutoffs, mythic-plus/score-tiers," >&2
  echo "           raiding/raid-rankings" >&2
  exit 1
fi

endpoint="$1"
shift

# Build query string from remaining args
query=""
for arg in "$@"; do
  if [[ -n "$query" ]]; then
    query="${query}&${arg}"
  else
    query="${arg}"
  fi
done

url="${BASE_URL}/${endpoint}"
if [[ -n "$query" ]]; then
  url="${url}?${query}"
fi

response=$(curl -s -w "\n%{http_code}" "$url")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" -ge 400 ]]; then
  echo "Error: Raider.IO returned HTTP $http_code" >&2
  echo "$body" >&2
  exit 1
fi

echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
