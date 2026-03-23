#!/usr/bin/env bash
# raidbots.sh — Raidbots public data fetcher
# Usage: ./raidbots.sh report <report-id>     — fetch sim report results
#        ./raidbots.sh static <data-key>       — fetch static game data
#
# No auth required. Public read-only endpoints.

set -euo pipefail

RAIDBOTS_URL="https://www.raidbots.com"
RAIDBOTS_STATIC="https://www.raidbots.com/static/data"

if [[ $# -lt 2 ]]; then
  echo "Usage: raidbots.sh <command> <arg>" >&2
  echo "Commands:" >&2
  echo "  report <report-id>  — fetch sim report results" >&2
  echo "  static <data-key>   — fetch static game data" >&2
  echo "Static keys: instances, talents, bonuses, crafting, enchantments," >&2
  echo "  equippable-items, item-conversions, item-curves, item-limit-categories," >&2
  echo "  item-names, item-sets" >&2
  exit 1
fi

command="$1"
arg="$2"

case "$command" in
  report) url="${RAIDBOTS_URL}/reports/${arg}/data.json" ;;
  static) url="${RAIDBOTS_STATIC}/live/${arg}.json" ;;
  *) echo "Unknown command: $command" >&2; exit 1 ;;
esac

response=$(curl -s -w "\n%{http_code}" "$url")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" -ge 400 ]]; then
  echo "Error: Raidbots returned HTTP $http_code" >&2
  echo "$body" >&2
  exit 1
fi

echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
