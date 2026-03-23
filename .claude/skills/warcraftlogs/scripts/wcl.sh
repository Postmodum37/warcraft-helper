#!/usr/bin/env bash
# wcl.sh — WarcraftLogs GraphQL API helper
# Usage: ./wcl.sh 'GRAPHQL_QUERY' ['{"var":"value"}']
# Handles OAuth token caching and query execution.

set -euo pipefail

TOKEN_CACHE="/tmp/wcl_token_cache"
TOKEN_TTL=3500  # slightly under 1 hour to avoid edge-case expiry

# --- Load credentials ---
load_credentials() {
  if [[ -n "${WCL_CLIENT_ID:-}" && -n "${WCL_CLIENT_SECRET:-}" ]]; then
    return 0
  fi

  # Search for .env relative to script location
  local env_files=(
    "$(dirname "$0")/../.env"
  )
  for f in "${env_files[@]}"; do
    if [[ -f "$f" ]]; then
      while IFS='=' read -r key val; do
        [[ -z "$key" || "$key" == \#* ]] && continue
        val="${val%\"}" && val="${val#\"}"
        export "$key=$val"
      done < "$f"
      break
    fi
  done

  if [[ -z "${WCL_CLIENT_ID:-}" || -z "${WCL_CLIENT_SECRET:-}" ]]; then
    echo "Error: WCL_CLIENT_ID and WCL_CLIENT_SECRET must be set (env vars or .env file)" >&2
    exit 1
  fi
}

# --- Token management ---
get_token() {
  if [[ -f "$TOKEN_CACHE" ]]; then
    local cached_time cached_token
    cached_time=$(head -1 "$TOKEN_CACHE")
    cached_token=$(tail -1 "$TOKEN_CACHE")
    local now
    now=$(date +%s)
    if (( now - cached_time < TOKEN_TTL )); then
      echo "$cached_token"
      return 0
    fi
  fi

  local response
  response=$(curl -s -u "${WCL_CLIENT_ID}:${WCL_CLIENT_SECRET}" \
    -d grant_type=client_credentials \
    https://www.warcraftlogs.com/oauth/token)

  local token
  token=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

  if [[ -z "$token" ]]; then
    echo "Error: Failed to obtain access token. Response: $response" >&2
    exit 1
  fi

  (umask 077 && echo "$(date +%s)" > "$TOKEN_CACHE" && echo "$token" >> "$TOKEN_CACHE")

  echo "$token"
}

# --- Execute query ---
run_query() {
  local query="$1"
  local variables="${2:-null}"
  local token
  token=$(get_token)

  # Build JSON payload safely via python3 stdin to avoid quoting issues
  local payload
  if [[ "$variables" == "null" ]]; then
    payload=$(printf '%s' "$query" | python3 -c "
import sys, json
q = sys.stdin.read()
print(json.dumps({'query': q}))
")
  else
    payload=$(printf '%s\n---VARS---\n%s' "$query" "$variables" | python3 -c "
import sys, json
parts = sys.stdin.read().split('---VARS---')
q = parts[0].strip()
v = json.loads(parts[1].strip())
print(json.dumps({'query': q, 'variables': v}))
")
  fi

  local http_code response
  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$payload" \
    https://www.warcraftlogs.com/api/v2/client)

  http_code=$(echo "$response" | tail -1)
  response=$(echo "$response" | sed '$d')

  # Retry once with a fresh token on 401 (expired/invalid token)
  if [[ "$http_code" == "401" ]]; then
    rm -f "$TOKEN_CACHE"
    token=$(get_token)
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d "$payload" \
      https://www.warcraftlogs.com/api/v2/client)
    http_code=$(echo "$response" | tail -1)
    response=$(echo "$response" | sed '$d')
  fi

  if [[ "$http_code" -ge 400 ]]; then
    echo "Error: API returned HTTP $http_code" >&2
    echo "$response" >&2
    exit 1
  fi

  echo "$response"
}

# --- Main ---
if [[ $# -lt 1 ]]; then
  echo "Usage: wcl.sh 'GRAPHQL_QUERY' ['{\"variables\": \"json\"}']" >&2
  exit 1
fi

load_credentials
result=$(run_query "$1" "${2:-null}")

# Pretty-print
echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
