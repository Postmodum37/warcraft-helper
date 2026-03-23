#!/usr/bin/env bash
# sim.sh — SimHammer (sortbek/simcraft) API wrapper
# Usage: ./sim.sh quick-sim <profile-file>
#        ./sim.sh stat-weights <profile-file>
#        ./sim.sh top-gear <profile-file>
#        ./sim.sh droptimizer <profile-file>
#        ./sim.sh status <job-id>
#        ./sim.sh result <job-id>
#        ./sim.sh health
#
# Requires SimHammer Docker running (default: http://localhost:8000)

set -euo pipefail

# Load config
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  while IFS='=' read -r key val; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    val="${val%\"}" && val="${val#\"}"
    export "$key=$val"
  done < "$SCRIPT_DIR/.env"
fi

SIMHAMMER_URL="${SIMHAMMER_URL:-http://localhost:8000}"
POLL_INTERVAL=5
MAX_TIMEOUT=300  # 5 minutes

# --- Helper functions ---

die() {
  echo "Error: $*" >&2
  exit 1
}

usage() {
  echo "Usage: sim.sh <command> [args]" >&2
  echo "Commands:" >&2
  echo "  quick-sim <profile-file>     — run a quick DPS sim" >&2
  echo "  stat-weights <profile-file>  — calculate stat weights" >&2
  echo "  top-gear <profile-file>      — find best gear combination" >&2
  echo "  droptimizer <profile-file>   — simulate potential drops" >&2
  echo "  status <job-id>              — check job status" >&2
  echo "  result <job-id>              — fetch raw result" >&2
  echo "  health                       — check SimHammer health" >&2
  exit 1
}

health_check() {
  local response http_code
  response=$(curl -s -w "\n%{http_code}" --connect-timeout 5 "${SIMHAMMER_URL}/health" 2>/dev/null) || \
    die "SimHammer is not running at ${SIMHAMMER_URL}. Start the Docker container first."

  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    die "SimHammer health check failed (HTTP $http_code): $body"
  fi

  echo "$body"
}

submit_sim() {
  local endpoint="$1"
  local payload="$2"

  local response http_code
  response=$(curl -s -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "${SIMHAMMER_URL}${endpoint}")

  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    die "Sim submission failed (HTTP $http_code): $body"
  fi

  echo "$body"
}

poll_job() {
  local job_id="$1"
  local elapsed=0

  while (( elapsed < MAX_TIMEOUT )); do
    local response http_code
    response=$(curl -s -w "\n%{http_code}" "${SIMHAMMER_URL}/api/sim/${job_id}")
    http_code=$(echo "$response" | tail -1)
    local body
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" -ge 400 ]]; then
      die "Failed to poll job ${job_id} (HTTP $http_code): $body"
    fi

    local status progress stage
    status=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
    progress=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('progress',0))" 2>/dev/null || echo "0")
    stage=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('progress_stage','') or '')" 2>/dev/null || echo "")

    case "$status" in
      done)
        echo "$body"
        return 0
        ;;
      failed)
        local error_msg
        error_msg=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','Unknown error'))" 2>/dev/null)
        die "Simulation failed: $error_msg"
        ;;
      pending|running)
        local progress_info="${progress}%"
        [[ -n "$stage" ]] && progress_info="${progress_info} (${stage})"
        echo "Polling... status=${status} progress=${progress_info}" >&2
        sleep "$POLL_INTERVAL"
        elapsed=$((elapsed + POLL_INTERVAL))
        ;;
      *)
        die "Unknown job status: $status"
        ;;
    esac
  done

  die "Simulation timed out after ${MAX_TIMEOUT}s (job: ${job_id})"
}

fetch_status() {
  local job_id="$1"
  local response http_code
  response=$(curl -s -w "\n%{http_code}" "${SIMHAMMER_URL}/api/sim/${job_id}")
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    die "Failed to fetch status for job ${job_id} (HTTP $http_code): $body"
  fi

  echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
}

fetch_result() {
  local job_id="$1"
  local response http_code
  response=$(curl -s -w "\n%{http_code}" "${SIMHAMMER_URL}/api/sim/${job_id}/raw")
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    die "Failed to fetch result for job ${job_id} (HTTP $http_code): $body"
  fi

  echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
}

read_profile() {
  local profile_file="$1"
  [[ -f "$profile_file" ]] || die "Profile file not found: $profile_file"
  cat "$profile_file"
}

build_payload() {
  local simc_input="$1"
  local sim_type="$2"

  printf '%s\n---TYPE---\n%s' "$simc_input" "$sim_type" | python3 -c "
import sys, json
parts = sys.stdin.read().split('---TYPE---')
simc_input = parts[0].strip()
sim_type = parts[1].strip()
payload = {
    'simc_input': simc_input,
    'iterations': 10000,
    'fight_style': 'Patchwerk',
    'target_error': 0.1,
    'desired_targets': 1,
    'max_time': 300,
    'threads': 0
}
if sim_type in ('quick', 'stat_weights'):
    payload['sim_type'] = sim_type
print(json.dumps(payload))
"
}

# --- Main ---

if [[ $# -lt 1 ]]; then
  usage
fi

command="$1"
shift

case "$command" in
  health)
    health_check | python3 -m json.tool 2>/dev/null || health_check
    ;;

  status)
    [[ $# -ge 1 ]] || die "Usage: sim.sh status <job-id>"
    fetch_status "$1"
    ;;

  result)
    [[ $# -ge 1 ]] || die "Usage: sim.sh result <job-id>"
    fetch_result "$1"
    ;;

  quick-sim)
    [[ $# -ge 1 ]] || die "Usage: sim.sh quick-sim <profile-file>"
    health_check >/dev/null
    echo "SimHammer is healthy. Submitting quick sim..." >&2

    simc_input=$(read_profile "$1")
    payload=$(build_payload "$simc_input" "quick")
    submit_response=$(submit_sim "/api/sim" "$payload")

    job_id=$(echo "$submit_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null) || \
      die "Failed to parse job ID from response: $submit_response"
    echo "Job submitted: ${job_id}" >&2

    result=$(poll_job "$job_id")
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    ;;

  stat-weights)
    [[ $# -ge 1 ]] || die "Usage: sim.sh stat-weights <profile-file>"
    health_check >/dev/null
    echo "SimHammer is healthy. Submitting stat weights sim..." >&2

    simc_input=$(read_profile "$1")
    payload=$(build_payload "$simc_input" "stat_weights")
    submit_response=$(submit_sim "/api/sim" "$payload")

    job_id=$(echo "$submit_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null) || \
      die "Failed to parse job ID from response: $submit_response"
    echo "Job submitted: ${job_id}" >&2

    result=$(poll_job "$job_id")
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    ;;

  top-gear)
    [[ $# -ge 1 ]] || die "Usage: sim.sh top-gear <profile-file>"
    health_check >/dev/null
    echo "SimHammer is healthy. Submitting top gear sim..." >&2

    simc_input=$(read_profile "$1")
    payload=$(build_payload "$simc_input" "top_gear")
    submit_response=$(submit_sim "/api/top-gear/sim" "$payload")

    job_id=$(echo "$submit_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null) || \
      die "Failed to parse job ID from response: $submit_response"
    echo "Job submitted: ${job_id}" >&2

    result=$(poll_job "$job_id")
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    ;;

  droptimizer)
    [[ $# -ge 1 ]] || die "Usage: sim.sh droptimizer <profile-file>"
    health_check >/dev/null
    echo "SimHammer is healthy. Submitting droptimizer sim..." >&2

    simc_input=$(read_profile "$1")
    payload=$(build_payload "$simc_input" "droptimizer")
    submit_response=$(submit_sim "/api/droptimizer/sim" "$payload")

    job_id=$(echo "$submit_response" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null) || \
      die "Failed to parse job ID from response: $submit_response"
    echo "Job submitted: ${job_id}" >&2

    result=$(poll_job "$job_id")
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    ;;

  *)
    echo "Unknown command: $command" >&2
    usage
    ;;
esac
