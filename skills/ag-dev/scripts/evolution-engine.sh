#!/usr/bin/env bash
# =============================================================================
# evolution-engine.sh — Self-Evolution System (META layer)
# =============================================================================
# Observes execution patterns, detects automation candidates, auto-generates
# workers, and identifies capability gaps. Runs in background after each dispatch.
#
# Usage:
#   evolution-engine.sh detect-patterns                     # Analyze logs, find worker candidates
#   evolution-engine.sh generate-worker "<pattern-id>"      # Create worker from proven pattern
#   evolution-engine.sh scan-gaps                           # Identify missing capabilities
#   evolution-engine.sh create-component <type> <name> <desc>  # Scaffold new component
#   evolution-engine.sh log-execution <json>                # Append to execution log
#   evolution-engine.sh status                              # Show evolution summary
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKERS_DIR="$SKILL_DIR/workers"
AGDEV_DIR="${AGDEV_DIR:-.agdev}"

EXECUTION_LOG="$AGDEV_DIR/execution-log.json"
PATTERNS_FILE="$AGDEV_DIR/patterns.json"
EVOLUTION_LOG="$AGDEV_DIR/evolution-log.json"

# Thresholds
PATTERN_THRESHOLD=3          # Occurrences before suggesting worker
PROVEN_SUCCESS_RATE="0.80"   # Min success rate for proven pattern

# =============================================================================
# HELPERS
# =============================================================================

ensure_files() {
  mkdir -p "$AGDEV_DIR"
  [[ -f "$EXECUTION_LOG" ]] || echo '[]' > "$EXECUTION_LOG"
  [[ -f "$PATTERNS_FILE" ]] || echo '{"patterns":[],"meta":{"version":"1.0","last_scan":"never"}}' > "$PATTERNS_FILE"
  [[ -f "$EVOLUTION_LOG" ]] || echo '[]' > "$EVOLUTION_LOG"
}

log() { echo "[evolution $(date -u +%H:%M:%S)] $*" >&2; }

next_id() {
  local prefix="$1" file="$2"
  local count
  count=$(jq 'if type == "array" then length else .patterns | length end' "$file" 2>/dev/null || echo "0")
  printf '%s-%03d' "$prefix" "$((count + 1))"
}

# =============================================================================
# COMMAND: log-execution
# =============================================================================
# Appends an execution record to the log.
# Input: JSON string or individual fields via flags.
#
# Usage:
#   evolution-engine.sh log-execution '{"task":"run tests","classifier_result":{...},...}'
#   evolution-engine.sh log-execution --task "run tests" --executor worker --worker test-runner \
#       --success true --duration 5000 --tokens 0 --files "src/index.ts,tests/index.test.ts"

cmd_log_execution() {
  ensure_files

  if [[ $# -eq 1 && "$1" == "{"* ]]; then
    # Raw JSON input — add id + timestamp
    local entry
    entry=$(echo "$1" | jq \
      --arg id "exec-$(date +%s)-$$" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '. + {id: $id, timestamp: $ts}')
    jq --argjson entry "$entry" '. += [$entry]' "$EXECUTION_LOG" > "${EXECUTION_LOG}.tmp" \
      && mv "${EXECUTION_LOG}.tmp" "$EXECUTION_LOG"
    echo "$entry"
    return
  fi

  # Flag-based input
  local task="" executor="" worker="" success="true" duration="0" tokens="0" files="" agent=""
  local classifier_complexity="" classifier_type=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --task)       task="$2"; shift 2 ;;
      --executor)   executor="$2"; shift 2 ;;
      --worker)     worker="$2"; shift 2 ;;
      --agent)      agent="$2"; shift 2 ;;
      --success)    success="$2"; shift 2 ;;
      --duration)   duration="$2"; shift 2 ;;
      --tokens)     tokens="$2"; shift 2 ;;
      --files)      files="$2"; shift 2 ;;
      --complexity) classifier_complexity="$2"; shift 2 ;;
      --type)       classifier_type="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  local files_json="[]"
  if [[ -n "$files" ]]; then
    files_json=$(echo "$files" | tr ',' '\n' | jq -R -s 'split("\n") | map(select(length > 0))')
  fi

  local entry
  entry=$(jq -nc \
    --arg id "exec-$(date +%s)-$$" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg task "$task" \
    --arg complexity "${classifier_complexity:-unknown}" \
    --arg type "${classifier_type:-unknown}" \
    --arg executor "$executor" \
    --arg worker "$worker" \
    --arg agent "$agent" \
    --argjson success "$success" \
    --argjson duration "$duration" \
    --argjson tokens "$tokens" \
    --argjson files_touched "$files_json" \
    '{
      id: $id,
      timestamp: $ts,
      task: $task,
      classifier_result: {complexity: $complexity, type: $type},
      executor_used: (if $worker != "" then $worker elif $agent != "" then $agent else $executor end),
      duration_ms: $duration,
      success: $success,
      files_touched: $files_touched,
      tokens_used: $tokens
    }')

  jq --argjson entry "$entry" '. += [$entry]' "$EXECUTION_LOG" > "${EXECUTION_LOG}.tmp" \
    && mv "${EXECUTION_LOG}.tmp" "$EXECUTION_LOG"
  echo "$entry"
}

# =============================================================================
# COMMAND: detect-patterns
# =============================================================================
# Analyzes execution logs and detects recurring task patterns.
# Groups tasks by normalized keywords, counts occurrences, calculates success rate.
# Patterns with 3+ occurrences and 80%+ success → "proven" (worker candidates).

cmd_detect_patterns() {
  ensure_files

  local log_count
  log_count=$(jq 'length' "$EXECUTION_LOG")

  if [[ "$log_count" -lt 2 ]]; then
    log "Not enough execution data ($log_count entries, need >= 2)"
    jq -nc '{patterns_found: 0, candidates: [], message: "Insufficient data"}'
    return
  fi

  log "Analyzing $log_count execution entries..."

  # Extract and normalize task keywords, group by executor + normalized task
  # Pattern detection: group by (executor_used, task_type) and find clusters
  local patterns_json
  patterns_json=$(jq -r '
    # Normalize task text to keyword signature
    def normalize_task:
      ascii_downcase
      | gsub("[^a-z0-9 ]"; " ")
      | gsub("\\s+"; " ")
      | ltrimstr(" ") | rtrimstr(" ")
      | split(" ")
      | map(select(length > 2))
      | sort
      | join(" ");

    # Group by normalized task signature
    group_by(.task | normalize_task)
    | map(select(length >= 1))
    | map({
        signature: (.[0].task | normalize_task),
        sample_task: .[0].task,
        occurrences: length,
        executor: (.[0].executor_used // "unknown"),
        classifier_type: (.[0].classifier_result.type // "unknown"),
        success_count: ([.[] | select(.success == true)] | length),
        success_rate: (([.[] | select(.success == true)] | length) / length),
        avg_duration_ms: ([.[] | .duration_ms] | add / length),
        total_tokens: ([.[] | .tokens_used] | add),
        files_pattern: (
          [.[] | .files_touched[]?] | group_by(.) | map({file: .[0], count: length})
          | sort_by(-.count) | .[:5]
        ),
        first_seen: ([.[] | .timestamp] | sort | first),
        last_seen: ([.[] | .timestamp] | sort | last)
      })
    | sort_by(-.occurrences)
  ' "$EXECUTION_LOG")

  # Determine status for each pattern
  local enriched_patterns
  enriched_patterns=$(echo "$patterns_json" | jq --argjson threshold "$PATTERN_THRESHOLD" '
    map(. + {
      status: (
        if .occurrences >= $threshold and .success_rate >= 0.80 then "proven"
        elif .occurrences >= 2 and .success_rate >= 0.60 then "emerging"
        else "observed"
        end
      ),
      worker_candidate: (.occurrences >= $threshold and .success_rate >= 0.80 and .total_tokens > 0)
    })
  ')

  # Generate pattern IDs and merge with existing patterns
  local existing_sigs
  existing_sigs=$(jq -r '[.patterns[].signature] // []' "$PATTERNS_FILE")

  local new_patterns
  new_patterns=$(echo "$enriched_patterns" | jq --argjson existing "$existing_sigs" '
    map(select(.signature as $s | ($existing | index($s)) | not))
  ')

  local new_count
  new_count=$(echo "$new_patterns" | jq 'length')

  if [[ "$new_count" -gt 0 ]]; then
    # Add IDs to new patterns
    local id_base
    id_base=$(jq '.patterns | length' "$PATTERNS_FILE")

    local indexed_patterns
    indexed_patterns=$(echo "$new_patterns" | jq --argjson base "$id_base" '
      to_entries | map(.value + {id: ("pat-" + ((.key + $base + 1) | tostring | ("000" + .)[-3:]))})
    ')

    # Merge into patterns file
    jq --argjson new "$indexed_patterns" '
      .patterns += $new
      | .meta.last_scan = (now | todate)
      | .meta.total_scans = ((.meta.total_scans // 0) + 1)
    ' "$PATTERNS_FILE" > "${PATTERNS_FILE}.tmp" \
      && mv "${PATTERNS_FILE}.tmp" "$PATTERNS_FILE"

    log "Found $new_count new patterns"
  fi

  # Update existing patterns with fresh stats
  jq --argjson fresh "$enriched_patterns" '
    .patterns |= map(
      .signature as $sig |
      ($fresh | map(select(.signature == $sig)) | first // null) as $update |
      if $update then . + {
        occurrences: $update.occurrences,
        success_rate: $update.success_rate,
        avg_duration_ms: $update.avg_duration_ms,
        total_tokens: $update.total_tokens,
        last_seen: $update.last_seen,
        status: $update.status,
        worker_candidate: $update.worker_candidate
      } else . end
    )
    | .meta.last_scan = (now | todate)
  ' "$PATTERNS_FILE" > "${PATTERNS_FILE}.tmp" \
    && mv "${PATTERNS_FILE}.tmp" "$PATTERNS_FILE"

  # Output summary
  local candidates
  candidates=$(echo "$enriched_patterns" | jq '[.[] | select(.worker_candidate == true)]')
  local candidate_count
  candidate_count=$(echo "$candidates" | jq 'length')

  jq -nc \
    --argjson total "$(echo "$enriched_patterns" | jq 'length')" \
    --argjson new "$new_count" \
    --argjson candidates "$candidates" \
    --argjson proven "$(echo "$enriched_patterns" | jq '[.[] | select(.status == "proven")] | length')" \
    --argjson emerging "$(echo "$enriched_patterns" | jq '[.[] | select(.status == "emerging")] | length')" \
    '{
      patterns_found: $total,
      new_patterns: $new,
      proven: $proven,
      emerging: $emerging,
      worker_candidates: ($candidates | length),
      candidates: $candidates,
      message: (
        if ($candidates | length) > 0 then
          (($candidates | length) | tostring) + " pattern(s) ready for worker generation"
        else
          "No worker candidates yet (need " + "3" + "+ occurrences with 80%+ success)"
        end
      )
    }'
}

# =============================================================================
# COMMAND: generate-worker
# =============================================================================
# Creates a new worker script from a proven pattern.
#
# Usage: evolution-engine.sh generate-worker <pattern-id>

cmd_generate_worker() {
  ensure_files

  local pattern_id="${1:?Usage: generate-worker <pattern-id>}"

  # Look up the pattern
  local pattern
  pattern=$(jq --arg id "$pattern_id" '.patterns[] | select(.id == $id)' "$PATTERNS_FILE")

  if [[ -z "$pattern" || "$pattern" == "null" ]]; then
    echo '{"error":"Pattern not found","id":"'"$pattern_id"'"}' | jq .
    return 1
  fi

  local name sig sample_task
  name=$(echo "$pattern" | jq -r '.signature | gsub(" "; "-") | .[:30]')
  sig=$(echo "$pattern" | jq -r '.signature')
  sample_task=$(echo "$pattern" | jq -r '.sample_task')

  # Sanitize worker name
  name=$(echo "$name" | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
  local worker_file="$WORKERS_DIR/${name}.sh"

  if [[ -f "$worker_file" ]]; then
    log "Worker already exists: $worker_file"
    echo '{"error":"Worker already exists","file":"'"$worker_file"'"}' | jq .
    return 1
  fi

  # Extract common files from pattern
  local files_pattern
  files_pattern=$(echo "$pattern" | jq -r '[.files_pattern[]? | .file] | join(", ")')

  # Generate worker script from template
  cat > "$worker_file" << 'WORKER_TEMPLATE'
#!/usr/bin/env bash
set -euo pipefail

# Worker: __NAME__ — Auto-generated by evolution engine
# Pattern: __SIGNATURE__
# Sample task: __SAMPLE_TASK__
# Generated: __TIMESTAMP__
#
# Usage: __NAME__.sh <project_dir> [extra_args...]
# Output: JSON { success, output, files_changed }

PROJECT_DIR="${1:-.}"
shift || true
EXTRA_ARGS="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect project type
###############################################################################

detect_project() {
  if [[ -f "package.json" ]]; then echo "node"
  elif [[ -f "pyproject.toml" || -f "requirements.txt" ]]; then echo "python"
  elif [[ -f "Cargo.toml" ]]; then echo "rust"
  elif [[ -f "go.mod" ]]; then echo "go"
  else echo "unknown"
  fi
}

PROJECT_TYPE=$(detect_project)

###############################################################################
# Execute
###############################################################################

OUTPUT=""
EXIT_CODE=0
FILES_BEFORE=$(git diff --name-only 2>/dev/null || true)

# TODO: Implement specific logic for this pattern
# Common files: __FILES_PATTERN__
# Adapt the commands below to match the detected pattern.
OUTPUT="Worker __NAME__ executed (auto-generated stub — customize me)" || EXIT_CODE=$?

FILES_AFTER=$(git diff --name-only 2>/dev/null || true)

CHANGED_FILES="[]"
if [[ -n "$FILES_AFTER" ]]; then
  CHANGED_FILES=$(echo "$FILES_AFTER" | jq -R -s 'split("\n") | map(select(length > 0))')
fi

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 ]] && SUCCESS=false

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "${OUTPUT:0:4000}" \
  --argjson files_changed "$CHANGED_FILES" \
  --arg project_type "$PROJECT_TYPE" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: $files_changed,
    project_type: $project_type,
    exit_code: $exit_code,
    auto_generated: true
  }'
WORKER_TEMPLATE

  # Substitute placeholders
  sed -i "s|__NAME__|${name}|g" "$worker_file"
  sed -i "s|__SIGNATURE__|${sig}|g" "$worker_file"
  sed -i "s|__SAMPLE_TASK__|${sample_task}|g" "$worker_file"
  sed -i "s|__TIMESTAMP__|$(date -u +%Y-%m-%dT%H:%M:%SZ)|g" "$worker_file"
  sed -i "s|__FILES_PATTERN__|${files_pattern}|g" "$worker_file"

  chmod +x "$worker_file"

  # Extract trigger keywords from the pattern signature
  local triggers
  triggers=$(echo "$sig" | tr ' ' '\n' | jq -R -s 'split("\n") | map(select(length > 2))')

  # Register in workers/registry.json
  if [[ -f "$WORKERS_DIR/registry.json" ]]; then
    jq --arg name "$name" \
       --arg script "${name}.sh" \
       --argjson triggers "$triggers" \
       --arg desc "Auto-generated from pattern: $sig" \
       '.workers[$name] = {script: $script, triggers: $triggers, description: $desc, auto_generated: true}' \
       "$WORKERS_DIR/registry.json" > "$WORKERS_DIR/registry.json.tmp" \
       && mv "$WORKERS_DIR/registry.json.tmp" "$WORKERS_DIR/registry.json"
  fi

  # Mark pattern as having a worker
  jq --arg id "$pattern_id" --arg worker "$name" '
    .patterns |= map(if .id == $id then . + {worker_generated: $worker, worker_generated_at: (now | todate)} else . end)
  ' "$PATTERNS_FILE" > "${PATTERNS_FILE}.tmp" \
    && mv "${PATTERNS_FILE}.tmp" "$PATTERNS_FILE"

  # Log evolution event
  local event
  event=$(jq -nc \
    --arg type "worker_generated" \
    --arg pattern_id "$pattern_id" \
    --arg worker "$name" \
    --arg file "$worker_file" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{type: $type, pattern_id: $pattern_id, worker: $worker, file: $file, timestamp: $ts}')

  jq --argjson event "$event" '. += [$event]' "$EVOLUTION_LOG" > "${EVOLUTION_LOG}.tmp" \
    && mv "${EVOLUTION_LOG}.tmp" "$EVOLUTION_LOG"

  log "Generated worker: $worker_file"
  jq -nc \
    --arg worker "$name" \
    --arg file "$worker_file" \
    --arg pattern_id "$pattern_id" \
    '{success: true, worker: $worker, file: $file, pattern_id: $pattern_id, message: "Worker generated — customize the execute section"}'
}

# =============================================================================
# COMMAND: scan-gaps
# =============================================================================
# Identifies capability gaps — tasks that were attempted but had no matching
# worker or required fallback to LLM when they could have been deterministic.

cmd_scan_gaps() {
  ensure_files

  local log_count
  log_count=$(jq 'length' "$EXECUTION_LOG")

  if [[ "$log_count" -eq 0 ]]; then
    jq -nc '{gaps: [], message: "No execution data to analyze"}'
    return
  fi

  # Load existing worker triggers for comparison
  local known_triggers="[]"
  if [[ -f "$WORKERS_DIR/registry.json" ]]; then
    known_triggers=$(jq '[.workers | to_entries[] | .value.triggers[]] | unique' "$WORKERS_DIR/registry.json" 2>/dev/null || echo '[]')
  fi

  # Find tasks classified as simple that used an agent (tokens > 0) instead of a worker
  local simple_no_worker
  simple_no_worker=$(jq '
    [.[] |
      select(
        (.classifier_result.complexity == "simple" or .classifier_result.complexity == "unknown")
        and .tokens_used > 0
      )
    ] | group_by(.task | ascii_downcase | gsub("[^a-z0-9 ]"; " ") | split(" ") | sort | join(" "))
    | map(select(length >= 1))
    | map({
        task_pattern: .[0].task,
        occurrences: length,
        total_tokens_wasted: ([.[] | .tokens_used] | add),
        suggestion: "Could be automated with a worker"
      })
    | sort_by(-.occurrences)
  ' "$EXECUTION_LOG")

  # Find failed executions — recurring failures indicate missing capability
  local recurring_failures
  recurring_failures=$(jq '
    [.[] | select(.success == false)]
    | group_by(.task | ascii_downcase | gsub("[^a-z0-9 ]"; " ") | split(" ") | sort | join(" "))
    | map(select(length >= 2))
    | map({
        task_pattern: .[0].task,
        failure_count: length,
        last_failure: ([.[] | .timestamp] | sort | last),
        suggestion: "Recurring failure — missing capability or broken worker"
      })
    | sort_by(-.failure_count)
  ' "$EXECUTION_LOG")

  # Find task types with no worker coverage
  local uncovered_types
  uncovered_types=$(jq --argjson triggers "$known_triggers" '
    [.[] | .classifier_result.type // "unknown"]
    | group_by(.)
    | map({type: .[0], count: length})
    | sort_by(-.count)
  ' "$EXECUTION_LOG")

  # Combine gaps
  local total_gaps
  total_gaps=$(( $(echo "$simple_no_worker" | jq 'length') + $(echo "$recurring_failures" | jq 'length') ))

  # Log scan event
  local event
  event=$(jq -nc \
    --arg type "gap_scan" \
    --argjson gaps_found "$total_gaps" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{type: $type, gaps_found: $gaps_found, timestamp: $ts}')

  jq --argjson event "$event" '. += [$event]' "$EVOLUTION_LOG" > "${EVOLUTION_LOG}.tmp" \
    && mv "${EVOLUTION_LOG}.tmp" "$EVOLUTION_LOG"

  jq -nc \
    --argjson automatable "$simple_no_worker" \
    --argjson failures "$recurring_failures" \
    --argjson type_coverage "$uncovered_types" \
    --argjson total_gaps "$total_gaps" \
    '{
      total_gaps: $total_gaps,
      automatable_tasks: $automatable,
      recurring_failures: $failures,
      type_coverage: $type_coverage,
      message: (
        if $total_gaps > 0 then
          ($total_gaps | tostring) + " gap(s) identified — review automatable_tasks and recurring_failures"
        else
          "No gaps detected"
        end
      )
    }'
}

# =============================================================================
# COMMAND: create-component
# =============================================================================
# Scaffolds a new component (worker, script, or checklist).
#
# Usage: evolution-engine.sh create-component <type> <name> "<description>"
# Types: worker, script, checklist

cmd_create_component() {
  ensure_files

  local comp_type="${1:?Usage: create-component <worker|script|checklist> <name> <description>}"
  local comp_name="${2:?Missing component name}"
  local comp_desc="${3:-Auto-generated component}"

  local target_file=""
  local created=false

  case "$comp_type" in
    worker)
      target_file="$WORKERS_DIR/${comp_name}.sh"
      if [[ -f "$target_file" ]]; then
        echo '{"error":"Worker already exists","file":"'"$target_file"'"}' | jq .
        return 1
      fi

      cat > "$target_file" << STUB
#!/usr/bin/env bash
set -euo pipefail

# Worker: ${comp_name} — ${comp_desc}
# Auto-generated by evolution engine on $(date -u +%Y-%m-%dT%H:%M:%SZ)
#
# Usage: ${comp_name}.sh <project_dir> [extra_args...]
# Output: JSON { success, output, files_changed }

PROJECT_DIR="\${1:-.}"
shift || true
EXTRA_ARGS="\${*:-}"
cd "\$PROJECT_DIR"

OUTPUT=""
EXIT_CODE=0

# TODO: Implement ${comp_desc}
OUTPUT="Worker ${comp_name} stub — not yet implemented"
EXIT_CODE=1

jq -n \\
  --argjson success false \\
  --arg output "\$OUTPUT" \\
  '{success: \$success, output: \$output, files_changed: [], stub: true}'
STUB
      chmod +x "$target_file"

      # Register in registry
      if [[ -f "$WORKERS_DIR/registry.json" ]]; then
        local name_triggers
        name_triggers=$(echo "$comp_name" | tr '-' '\n' | jq -R -s 'split("\n") | map(select(length > 2))')
        jq --arg name "$comp_name" \
           --arg script "${comp_name}.sh" \
           --argjson triggers "$name_triggers" \
           --arg desc "$comp_desc" \
           '.workers[$name] = {script: $script, triggers: $triggers, description: $desc, stub: true}' \
           "$WORKERS_DIR/registry.json" > "$WORKERS_DIR/registry.json.tmp" \
           && mv "$WORKERS_DIR/registry.json.tmp" "$WORKERS_DIR/registry.json"
      fi
      created=true
      ;;

    script)
      target_file="$SCRIPT_DIR/${comp_name}.sh"
      if [[ -f "$target_file" ]]; then
        echo '{"error":"Script already exists","file":"'"$target_file"'"}' | jq .
        return 1
      fi

      cat > "$target_file" << STUB
#!/usr/bin/env bash
set -euo pipefail

# Script: ${comp_name} — ${comp_desc}
# Auto-generated by evolution engine on $(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "Script ${comp_name} stub — not yet implemented"
exit 1
STUB
      chmod +x "$target_file"
      created=true
      ;;

    checklist)
      local checklists_dir="$SKILL_DIR/checklists"
      mkdir -p "$checklists_dir"
      target_file="$checklists_dir/${comp_name}.md"
      if [[ -f "$target_file" ]]; then
        echo '{"error":"Checklist already exists","file":"'"$target_file"'"}' | jq .
        return 1
      fi

      cat > "$target_file" << STUB
# ${comp_name} Checklist
# ${comp_desc}
# Auto-generated by evolution engine on $(date -u +%Y-%m-%dT%H:%M:%SZ)

- [ ] [required] Verify prerequisites
- [ ] [required] Execute main action
- [ ] [optional] Validate output
STUB
      created=true
      ;;

    *)
      echo '{"error":"Unknown component type. Use: worker, script, checklist"}' | jq .
      return 1
      ;;
  esac

  if $created; then
    # Log evolution event
    local event
    event=$(jq -nc \
      --arg type "component_created" \
      --arg comp_type "$comp_type" \
      --arg name "$comp_name" \
      --arg desc "$comp_desc" \
      --arg file "$target_file" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{type: $type, component_type: $comp_type, name: $name, description: $desc, file: $file, timestamp: $ts}')

    jq --argjson event "$event" '. += [$event]' "$EVOLUTION_LOG" > "${EVOLUTION_LOG}.tmp" \
      && mv "${EVOLUTION_LOG}.tmp" "$EVOLUTION_LOG"

    jq -nc \
      --arg comp_type "$comp_type" \
      --arg name "$comp_name" \
      --arg file "$target_file" \
      '{success: true, type: $comp_type, name: $name, file: $file, message: "Component created (stub — implement logic)"}'
  fi
}

# =============================================================================
# COMMAND: status
# =============================================================================
# Shows evolution system summary.

cmd_status() {
  ensure_files

  local exec_count pattern_count proven_count evo_count
  exec_count=$(jq 'length' "$EXECUTION_LOG" 2>/dev/null || echo 0)
  pattern_count=$(jq '.patterns | length' "$PATTERNS_FILE" 2>/dev/null || echo 0)
  proven_count=$(jq '[.patterns[] | select(.status == "proven")] | length' "$PATTERNS_FILE" 2>/dev/null || echo 0)
  evo_count=$(jq 'length' "$EVOLUTION_LOG" 2>/dev/null || echo 0)

  local worker_count=0
  local auto_workers=0
  if [[ -f "$WORKERS_DIR/registry.json" ]]; then
    worker_count=$(jq '.workers | length' "$WORKERS_DIR/registry.json" 2>/dev/null || echo 0)
    auto_workers=$(jq '[.workers | to_entries[] | select(.value.auto_generated == true)] | length' "$WORKERS_DIR/registry.json" 2>/dev/null || echo 0)
  fi

  local last_scan
  last_scan=$(jq -r '.meta.last_scan // "never"' "$PATTERNS_FILE" 2>/dev/null || echo "never")

  # Execution stats
  local success_rate="0"
  local total_tokens="0"
  local avg_duration="0"
  if [[ "$exec_count" -gt 0 ]]; then
    success_rate=$(jq '([.[] | select(.success == true)] | length) as $s | (length) as $t | ($s / $t * 100) | round' "$EXECUTION_LOG" 2>/dev/null || echo 0)
    total_tokens=$(jq '[.[] | .tokens_used // 0] | add' "$EXECUTION_LOG" 2>/dev/null || echo 0)
    avg_duration=$(jq '[.[] | .duration_ms // 0] | (add / length) | round' "$EXECUTION_LOG" 2>/dev/null || echo 0)
  fi

  jq -nc \
    --argjson executions "$exec_count" \
    --argjson patterns "$pattern_count" \
    --argjson proven "$proven_count" \
    --argjson evolution_events "$evo_count" \
    --argjson workers "$worker_count" \
    --argjson auto_workers "$auto_workers" \
    --arg last_scan "$last_scan" \
    --argjson success_rate "$success_rate" \
    --argjson total_tokens "$total_tokens" \
    --argjson avg_duration_ms "$avg_duration" \
    '{
      executions: $executions,
      patterns: {total: $patterns, proven: $proven},
      workers: {total: $workers, auto_generated: $auto_workers},
      evolution_events: $evolution_events,
      last_pattern_scan: $last_scan,
      stats: {
        success_rate_pct: $success_rate,
        total_tokens_used: $total_tokens,
        avg_duration_ms: $avg_duration_ms
      }
    }'
}

# =============================================================================
# MAIN
# =============================================================================

usage() {
  cat <<'EOF'
Usage: evolution-engine.sh <command> [args...]

Commands:
  detect-patterns                          Analyze execution logs for recurring patterns
  generate-worker <pattern-id>             Create worker from a proven pattern
  scan-gaps                                Identify missing capabilities
  create-component <type> <name> <desc>    Scaffold new worker/script/checklist
  log-execution <json|--flags>             Record execution to log
  status                                   Show evolution system summary

Environment:
  AGDEV_DIR    Override .agdev directory (default: .agdev)
EOF
  exit 1
}

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  detect-patterns)   cmd_detect_patterns "$@" ;;
  generate-worker)   cmd_generate_worker "$@" ;;
  scan-gaps)         cmd_scan_gaps "$@" ;;
  create-component)  cmd_create_component "$@" ;;
  log-execution)     cmd_log_execution "$@" ;;
  status)            cmd_status "$@" ;;
  *)                 usage ;;
esac
