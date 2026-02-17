#!/usr/bin/env bash
# =============================================================================
# dispatch-logger.sh — Concurrency-safe logging for claudio-dispatch.sh
# =============================================================================
# All file writes use flock to prevent corruption from parallel agents.
#
# Commands:
#   init-files                          Initialize .agdev data files
#   update-status <json>                Write dispatch status atomically
#   log-execution <task> <classifier> <executor> <duration_ms> <success> <tokens>
#   log-gate <gate_name> <verdict> <result_json>
#   log-history <history_json>          Append to dispatch-history.json
# =============================================================================

set -euo pipefail

AGDEV_DIR="${AGDEV_DIR:-.agdev}"
CMD="${1:?Usage: dispatch-logger.sh <command> [args...]}"
shift

STATUS_FILE="$AGDEV_DIR/dispatch-status.json"
EXEC_LOG="$AGDEV_DIR/execution-log.json"
GATE_LOG="$AGDEV_DIR/gate-results.json"
HISTORY_FILE="$AGDEV_DIR/dispatch-history.json"

# Atomic append to a JSON array file using flock
append_json_array() {
  local file="$1" entry="$2"
  local lockfile="$file.lock"

  (
    flock -w 5 200 2>/dev/null || true

    if [[ ! -f "$file" || ! -s "$file" ]]; then
      echo "[$entry]" > "$file"
    else
      # Remove trailing ] and whitespace, append new entry
      local tmp
      tmp=$(mktemp)
      # Remove last ] , add comma + new entry + ]
      python3 -c "
import json, sys
try:
    with open('$file') as f:
        arr = json.load(f)
    if not isinstance(arr, list):
        arr = []
except:
    arr = []
arr.append(json.loads(sys.argv[1]))
with open('$file', 'w') as f:
    json.dump(arr, f, indent=2)
" "$entry" 2>/dev/null || echo "[$entry]" > "$file"
      rm -f "$tmp"
    fi
  ) 200>"$lockfile"
}

case "$CMD" in
  init-files)
    mkdir -p "$AGDEV_DIR" "$AGDEV_DIR/handoff" "$AGDEV_DIR/results" "$AGDEV_DIR/parallel-status"
    [[ -f "$EXEC_LOG" ]] || echo "[]" > "$EXEC_LOG"
    [[ -f "$GATE_LOG" ]] || echo "[]" > "$GATE_LOG"
    [[ -f "$HISTORY_FILE" ]] || echo "[]" > "$HISTORY_FILE"
    [[ -f "$AGDEV_DIR/patterns.json" ]] || echo "[]" > "$AGDEV_DIR/patterns.json"
    [[ -f "$AGDEV_DIR/gotchas.json" ]] || echo "[]" > "$AGDEV_DIR/gotchas.json"
    ;;

  update-status)
    local_json="${1:?update-status requires JSON argument}"
    mkdir -p "$(dirname "$STATUS_FILE")"
    (
      flock -w 3 200 2>/dev/null || true
      echo "$local_json" > "$STATUS_FILE"
    ) 200>"$STATUS_FILE.lock"
    ;;

  log-execution)
    task="${1:-}"
    classifier="${2:-"{}"}"
    executor="${3:-unknown}"
    duration_ms="${4:-0}"
    success="${5:-false}"
    tokens="${6:-0}"

    entry=$(jq -nc \
      --arg task "$task" \
      --argjson classifier "$classifier" \
      --arg executor "$executor" \
      --argjson duration_ms "${duration_ms:-0}" \
      --argjson success "$success" \
      --argjson tokens "${tokens:-0}" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{
        task: $task,
        classifier: $classifier,
        executor: $executor,
        duration_ms: $duration_ms,
        success: $success,
        estimated_tokens: $tokens,
        timestamp: $ts
      }' 2>/dev/null) || entry="{}"

    append_json_array "$EXEC_LOG" "$entry"
    ;;

  log-gate)
    gate_name="${1:-}"
    verdict="${2:-}"
    result_json="${3:-"{}"}"

    entry=$(jq -nc \
      --arg gate "$gate_name" \
      --arg verdict "$verdict" \
      --argjson result "$result_json" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{gate: $gate, verdict: $verdict, result: $result, timestamp: $ts}' \
      2>/dev/null) || entry="{}"

    append_json_array "$GATE_LOG" "$entry"
    ;;

  log-history)
    history_json="${1:?log-history requires JSON argument}"
    append_json_array "$HISTORY_FILE" "$history_json"
    ;;

  *)
    echo "Unknown command: $CMD" >&2
    echo "Usage: dispatch-logger.sh {init-files|update-status|log-execution|log-gate|log-history}" >&2
    exit 1
    ;;
esac
