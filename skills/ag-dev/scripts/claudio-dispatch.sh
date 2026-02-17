#!/usr/bin/env bash
# =============================================================================
# claudio-dispatch.sh — Intelligent Task Dispatcher v2
# =============================================================================
# Routes tasks through: classify → worker/agent → gate evaluate → log → evolve.
# Replaces LLM-based complexity evaluation with deterministic task-classifier.
#
# Flow:
#   1. task-classifier.sh "<task>" → { complexity, type, executor, agent, worker }
#   2. executor == "worker"  → Run worker (0 tokens) → log → return
#   3. executor == "single"  → Inject gotchas → dispatch agent → gate evaluate → log
#   4. executor == "multi"   → Decompose → per-subtask classify → execute waves → gates → log
#   5. evolution-engine.sh detect-patterns (background, async)
#
# Usage:
#   claudio-dispatch.sh <task_description> [project_dir] [--force-parallel] [--force-single]
#
# Modes:
#   auto (default)     — Deterministic classifier decides (0 tokens)
#   --force-parallel   — Always decompose and run parallel agents
#   --force-single     — Always run as single agent
#   --force-worker     — Force worker execution (skip agent fallback)
#   --dry-run          — Show plan without executing
#
# Examples:
#   claudio-dispatch.sh "Build a REST API for user management"
#   claudio-dispatch.sh "Fix the typo in README" --force-single
#   claudio-dispatch.sh "run tests" /tmp/my-project
#   claudio-dispatch.sh "Build full SaaS app" /tmp/my-project --force-parallel
# =============================================================================

set -euo pipefail

TASK="${1:?Usage: claudio-dispatch.sh <task_description> [project_dir] [--flags]}"
PROJECT_DIR="${2:-.}"
MODE="auto"
DRY_RUN=false

# Parse flags (skip $1 task and $2 project_dir)
for arg in "$@"; do
  case "$arg" in
    --force-parallel) MODE="parallel" ;;
    --force-single)   MODE="single" ;;
    --force-worker)   MODE="worker" ;;
    --dry-run)        DRY_RUN=true ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/../skills/ag-dev" && pwd)"
SOCKET="/tmp/agdev.sock"
WORKSPACE="/home/agdev/.openclaw/workspace"
RESULTS_DIR="$PROJECT_DIR/.agdev/results"
STATUS_FILE="$PROJECT_DIR/.agdev/dispatch-status.json"
TIMESTAMP=$(date -u +"%Y-%m-%d_%H%M%S")
START_EPOCH=$(date +%s)

# Script paths
CLASSIFIER="$SKILL_DIR/scripts/task-classifier.sh"
GATE_EVALUATOR="$SKILL_DIR/scripts/gate-evaluator.sh"
GOTCHAS="$SKILL_DIR/scripts/gotchas.sh"
EVOLUTION="$SKILL_DIR/scripts/evolution-engine.sh"
LOGGER="$SKILL_DIR/scripts/dispatch-logger.sh"
WORKERS_DIR="$SKILL_DIR/workers"
HISTORY_FILE="$PROJECT_DIR/.agdev/dispatch-history.json"
GATE_RESULTS_FILE="$PROJECT_DIR/.agdev/gate-results.json"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# Status file for external monitoring (LobsterBoard, Telegram, etc.)
# Extra metadata fields stored in global vars for enriched status writes
CLASSIFIER_JSON=""
ACTIVE_AGENTS=""
GATE_VERDICT=""

update_status() {
  local phase="$1" detail="$2"
  mkdir -p "$(dirname "$STATUS_FILE")"

  local status_json
  status_json=$(jq -nc \
    --arg phase "$phase" \
    --arg detail "$detail" \
    --arg task "$(echo "$TASK" | head -c 100)" \
    --arg mode "$MODE" \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg project "$PROJECT_DIR" \
    --argjson classifier "${CLASSIFIER_JSON:-null}" \
    --arg agents "${ACTIVE_AGENTS:-}" \
    --arg gate_verdict "${GATE_VERDICT:-}" \
    --argjson start_epoch "$START_EPOCH" \
    '{
      phase: $phase,
      detail: $detail,
      task: $task,
      mode: $mode,
      timestamp: $ts,
      project: $project,
      start_epoch: $start_epoch,
      classifier_result: $classifier,
      agents: (if $agents != "" then ($agents | split(",")) else [] end),
      gate_verdict: (if $gate_verdict != "" then $gate_verdict else null end)
    }')

  if [[ -x "$LOGGER" ]]; then
    AGDEV_DIR="$PROJECT_DIR/.agdev" bash "$LOGGER" update-status "$status_json" 2>/dev/null || echo "$status_json" > "$STATUS_FILE"
  else
    echo "$status_json" > "$STATUS_FILE"
  fi
}

mkdir -p "$RESULTS_DIR" 2>/dev/null || true

# Initialize data files if they don't exist
if [[ -x "$LOGGER" ]]; then
  AGDEV_DIR="$PROJECT_DIR/.agdev" bash "$LOGGER" init-files > /dev/null 2>&1 || true
fi

# =============================================================================
# STEP 1: Deterministic Task Classification (0 tokens)
# =============================================================================
classify_task() {
  local task="$1"

  if [[ ! -x "$CLASSIFIER" ]]; then
    log "WARN: task-classifier.sh not found, falling back to LLM evaluation"
    evaluate_complexity_llm "$task"
    return
  fi

  local result
  result=$(bash "$CLASSIFIER" "$task" 2>/dev/null) || {
    log "WARN: Classifier failed, falling back to LLM evaluation"
    evaluate_complexity_llm "$task"
    return
  }

  echo "$result"
}

# Legacy LLM fallback (used when classifier confidence < 0.3)
evaluate_complexity_llm() {
  local task="$1"

  # FIX: Write prompt to temp file, pass via stdin (no shell expansion issues)
  local EVAL_PROMPT_FILE=$(mktemp /tmp/eval-prompt-XXXXX.txt)
  cat > "$EVAL_PROMPT_FILE" << EVALEOF
You are a task complexity evaluator. Analyze this task and respond with ONLY one word: SINGLE or PARALLEL.

SINGLE = task is simple, quick (<5 min), or conversational (Q&A, lookup, simple edit, one-file change)
PARALLEL = task is complex, multi-step, involves multiple files/components, or would benefit from specialization

Task: $task

Answer (SINGLE or PARALLEL):
EVALEOF

  RESULT=$(script -qec "claude --dangerously-skip-permissions --print -p \"\$(cat $EVAL_PROMPT_FILE)\"" /dev/null 2>/dev/null | tr -d '\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | tr -d '[:space:]' | head -c 10 || echo "SINGLE")
  rm -f "$EVAL_PROMPT_FILE"

  if [[ "$RESULT" == *"PARALLEL"* ]]; then
    echo '{"complexity":"complex","type":"code","executor":"multi-agent","agent":"@dev","confidence":0.50,"worker":null,"llm_fallback":true}'
  else
    echo '{"complexity":"medium","type":"code","executor":"single-agent","agent":"@dev","confidence":0.50,"worker":null,"llm_fallback":true}'
  fi
}

# =============================================================================
# STEP 2: Worker Execution (0 tokens, deterministic)
# =============================================================================
run_worker() {
  local worker_name="$1"
  local project="$2"
  shift 2
  local extra_args="${*:-}"

  update_status "running" "worker:$worker_name"
  log "Worker: $worker_name"

  local worker_script
  worker_script=$(jq -r --arg w "$worker_name" '.workers[$w].script // ""' "$WORKERS_DIR/registry.json" 2>/dev/null)

  if [[ -z "$worker_script" || ! -f "$WORKERS_DIR/$worker_script" ]]; then
    log "WARN: Worker script not found: $worker_name"
    return 1
  fi

  if $DRY_RUN; then
    log "[DRY-RUN] Would execute worker: $worker_name on $project"
    jq -nc --arg w "$worker_name" '{dry_run: true, worker: $w}'
    return 0
  fi

  local result
  local exit_code=0
  result=$(bash "$WORKERS_DIR/$worker_script" "$project" $extra_args 2>&1) || exit_code=$?

  local success
  success=$(echo "$result" | jq -r '.success // false' 2>/dev/null || echo "false")

  # Log execution (0 tokens — pure worker)
  local worker_duration_ms=$(( ($(date +%s) - START_EPOCH) * 1000 ))
  log_execution "$TASK" "worker" "$worker_name" "" "$success" "$exit_code" "0" "$worker_duration_ms"

  # Log to execution-log.json via dispatch-logger (with flock)
  if [[ -x "$LOGGER" ]]; then
    AGDEV_DIR="$PROJECT_DIR/.agdev" bash "$LOGGER" log-execution \
      "$TASK" "${CLASSIFIER_JSON:-"{}"}" "worker:$worker_name" "$worker_duration_ms" "$success" "0" \
      > /dev/null 2>&1 || true
  fi

  log "Worker $worker_name result: success=$success"
  echo "$result"
}

# =============================================================================
# STEP 3: Single Agent Execution (with gotchas injection + gate evaluation)
# =============================================================================
run_single() {
  local task="$1"
  local project="$2"
  local agent="${3:-dev}"

  # Strip @ prefix from agent name if present
  agent="${agent#@}"

  update_status "running" "single-agent:$agent"
  log "SINGLE AGENT mode (agent=$agent)"
  log "Task: ${task:0:80}..."

  if $DRY_RUN; then
    log "[DRY-RUN] Would execute single agent ($agent) on: $task"
    return 0
  fi

  # Inject gotchas context into the task prompt
  local enriched_task="$task"
  if [[ -x "$GOTCHAS" ]]; then
    local gotcha_context
    gotcha_context=$(bash "$GOTCHAS" context "$task" 2>/dev/null || true)
    if [[ -n "$gotcha_context" && "$gotcha_context" != "null" && "$gotcha_context" != "[]" ]]; then
      enriched_task="$task

---
KNOWN GOTCHAS (from previous experience):
$gotcha_context
---"
      log "Injected gotchas context"
    fi
  fi

  # Setup and dispatch agent
  ACTIVE_AGENTS="$agent"
  update_status "running" "agent:$agent dispatching"

  bash "$SKILL_DIR/scripts/setup-agents.sh" "$SOCKET" "$project" "$agent" 2>/dev/null
  bash "$SKILL_DIR/scripts/dispatch-agent.sh" "$SOCKET" "$agent" "$project" "$enriched_task"

  # Log agent dispatch event
  if [[ -x "$LOGGER" ]]; then
    AGDEV_DIR="$project/.agdev" bash "$LOGGER" log-execution \
      "$task" "${CLASSIFIER_JSON:-"{}"}" "agent:$agent" "0" "true" "0" \
      > /dev/null 2>&1 || true
  fi

  # Wait for completion (max 10 min)
  local waited=0
  local max_wait=600
  local agent_success=false
  while [[ $waited -lt $max_wait ]]; do
    if tmux -S "$SOCKET" capture-pane -p -t "agent-$agent" -S -5 2>/dev/null | grep -q "AGENT_DONE_$agent"; then
      log "Single agent completed in ${waited}s"
      agent_success=true

      # Capture output
      if [[ -f "$project/.agdev/handoff/${agent}-output.md" ]]; then
        cp "$project/.agdev/handoff/${agent}-output.md" "$RESULTS_DIR/result-$TIMESTAMP.md"
        log "Output: $RESULTS_DIR/result-$TIMESTAMP.md"
      fi
      break
    fi
    sleep 5
    waited=$((waited + 5))

    if (( waited % 30 == 0 )); then
      log "Working... (${waited}s elapsed)"
    fi
  done

  if ! $agent_success; then
    log "WARN: Agent timed out after ${max_wait}s"
  fi

  # Gate evaluation on agent output
  local gate_verdict="SKIPPED"
  local handoff_file="$project/.agdev/handoff/${agent}-output.md"
  if [[ -x "$GATE_EVALUATOR" && -f "$handoff_file" ]]; then
    update_status "gates" "evaluating agent:$agent output"

    local gate_result
    gate_result=$(bash "$GATE_EVALUATOR" "$handoff_file" "dev-to-qa" 2>/dev/null || true)
    gate_verdict=$(echo "$gate_result" | jq -r '.verdict // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")
    log "Gate verdict: $gate_verdict"

    # Write gate result to gate-results.json
    GATE_VERDICT="$gate_verdict"
    if [[ -x "$LOGGER" && -n "$gate_result" ]]; then
      AGDEV_DIR="$project/.agdev" bash "$LOGGER" log-gate "dev-to-qa" "$gate_verdict" "$gate_result" \
        > /dev/null 2>&1 || true
    fi

    if [[ "$gate_verdict" == "BLOCKED" ]]; then
      log "WARN: Gate BLOCKED — output has critical issues"
    fi
  fi

  # Log execution
  local duration_ms=$(( ($(date +%s) - START_EPOCH) * 1000 ))
  # Estimate tokens: ~1000 tokens per 30s of agent time (rough heuristic)
  local token_estimate=$(( duration_ms / 30 ))
  log_execution "$task" "single-agent" "" "$agent" "$agent_success" "0" "$token_estimate" "$duration_ms"

  # Log to execution-log.json via dispatch-logger (with flock)
  if [[ -x "$LOGGER" ]]; then
    AGDEV_DIR="$project/.agdev" bash "$LOGGER" log-execution \
      "$task" "${CLASSIFIER_JSON:-"{}"}" "agent:$agent" "$duration_ms" "$agent_success" "$token_estimate" \
      > /dev/null 2>&1 || true
  fi

  update_status "completed" "agent:$agent done (gate=$gate_verdict)"

  $agent_success
}

# =============================================================================
# STEP 4: Parallel Multi-Agent Execution (with gates between phases)
# =============================================================================
run_parallel() {
  local task="$1"
  local project="$2"

  update_status "decomposing" "parallel-multi-agent"
  log "PARALLEL MULTI-AGENT mode"
  log "Task: ${task:0:80}..."

  # Decompose task into subtasks
  log "Decomposing task..."

  local tasks_json="$project/.agdev/tasks.json"
  mkdir -p "$project/.agdev"

  if $DRY_RUN; then
    log "[DRY-RUN] Would decompose and dispatch parallel agents for: $task"
    bash "$SKILL_DIR/scripts/spec-to-tasks.sh" "$task" "$tasks_json" "$project"
    log "[DRY-RUN] Generated tasks above. No execution."
    return 0
  fi

  bash "$SKILL_DIR/scripts/spec-to-tasks.sh" "$task" "$tasks_json" "$project"

  if ! jq empty "$tasks_json" 2>/dev/null; then
    log "ERROR: Failed to decompose task. Falling back to single agent."
    run_single "$task" "$project"
    return $?
  fi

  local task_count
  task_count=$(jq length "$tasks_json")

  if [[ "$task_count" -eq 0 ]]; then
    log "WARN: No tasks generated. Falling back to single agent."
    run_single "$task" "$project"
    return $?
  fi

  if [[ "$task_count" -eq 1 ]]; then
    log "Only 1 task generated. Running as single agent."
    local agent prompt
    agent=$(jq -r '.[0].agent' "$tasks_json")
    prompt=$(jq -r '.[0].prompt' "$tasks_json")
    run_single "$prompt" "$project" "$agent"
    return $?
  fi

  # Re-classify each subtask — some may be worker-eligible
  log "Re-classifying $task_count subtasks..."
  local worker_tasks=()
  local agent_tasks=()

  for i in $(seq 0 $((task_count - 1))); do
    local sub_prompt sub_agent
    sub_prompt=$(jq -r ".[$i].prompt" "$tasks_json")
    sub_agent=$(jq -r ".[$i].agent" "$tasks_json")

    if [[ -x "$CLASSIFIER" ]]; then
      local sub_class
      sub_class=$(bash "$CLASSIFIER" "$sub_prompt" 2>/dev/null || echo '{}')
      local sub_executor
      sub_executor=$(echo "$sub_class" | jq -r '.executor // "single-agent"' 2>/dev/null || echo "single-agent")
      local sub_worker
      sub_worker=$(echo "$sub_class" | jq -r '.worker // empty' 2>/dev/null || true)

      if [[ "$sub_executor" == "worker" && -n "$sub_worker" ]]; then
        log "  Subtask $i → worker:$sub_worker"
        worker_tasks+=("$i:$sub_worker")
      else
        log "  Subtask $i → agent:$sub_agent"
        agent_tasks+=("$i")
      fi
    else
      agent_tasks+=("$i")
    fi
  done

  # Execute worker tasks first (instant, 0 tokens)
  for wt in "${worker_tasks[@]:-}"; do
    [[ -z "$wt" ]] && continue
    local idx="${wt%%:*}"
    local wname="${wt#*:}"
    log "Running worker for subtask $idx: $wname"
    run_worker "$wname" "$project" || true
  done

  # Execute remaining agent tasks in parallel
  if [[ ${#agent_tasks[@]} -gt 0 ]]; then
    local agents
    agents=$(jq -r '.[].agent' "$tasks_json" | sort -u | tr '\n' ' ')
    ACTIVE_AGENTS=$(echo "$agents" | tr ' ' ',' | sed 's/,$//')

    update_status "dispatching" "${#agent_tasks[@]} agents"
    log "Dispatching ${#agent_tasks[@]} agent tasks in parallel..."
    bash "$SKILL_DIR/scripts/setup-agents.sh" "$SOCKET" "$project" $agents 2>/dev/null

    bash "$SKILL_DIR/scripts/parallel-dispatch.sh" "$project" "$tasks_json" "$SOCKET"

    # Gate evaluate each agent's output
    if [[ -x "$GATE_EVALUATOR" ]]; then
      update_status "gates" "evaluating agent outputs"
      log "Running gate evaluations..."
      for f in "$project/.agdev/handoff/"*-output.md; do
        [[ -f "$f" ]] || continue
        local agent_name
        agent_name=$(basename "$f" | sed 's/-output.md//')
        local gate_full_result
        gate_full_result=$(bash "$GATE_EVALUATOR" "$f" "dev-to-qa" 2>/dev/null || true)
        local gv
        gv=$(echo "$gate_full_result" | jq -r '.verdict // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")
        log "  Gate $agent_name: $gv"

        # Write gate result via logger
        if [[ -x "$LOGGER" && -n "$gate_full_result" ]]; then
          AGDEV_DIR="$project/.agdev" bash "$LOGGER" log-gate "dev-to-qa:$agent_name" "$gv" "$gate_full_result" \
            > /dev/null 2>&1 || true
        fi
      done
    fi
  fi

  # Consolidate results
  log "Consolidating results..."
  local consolidated="$RESULTS_DIR/consolidated-$TIMESTAMP.md"
  echo "# Consolidated Results — $(date -u)" > "$consolidated"
  echo "" >> "$consolidated"

  for f in "$project/.agdev/handoff/"*-output.md; do
    if [[ -f "$f" ]]; then
      local agent_name
      agent_name=$(basename "$f" | sed 's/-output.md//')
      echo "## Agent: $agent_name" >> "$consolidated"
      echo "" >> "$consolidated"
      cat "$f" >> "$consolidated"
      echo "" >> "$consolidated"
      echo "---" >> "$consolidated"
      echo "" >> "$consolidated"
    fi
  done

  # Log execution
  local duration_ms=$(( ($(date +%s) - START_EPOCH) * 1000 ))
  # Token estimate: ~1000 tokens per 30s per agent
  local token_estimate=$(( (duration_ms / 30) * ${#agent_tasks[@]} ))
  log_execution "$task" "multi-agent" "" "" "true" "0" "$token_estimate" "$duration_ms"

  # Log to execution-log.json via dispatch-logger (with flock)
  if [[ -x "$LOGGER" ]]; then
    AGDEV_DIR="$project/.agdev" bash "$LOGGER" log-execution \
      "$task" "${CLASSIFIER_JSON:-"{}"}" "multi-agent" "$duration_ms" "true" "$token_estimate" \
      > /dev/null 2>&1 || true
  fi

  # =========================================================================
  # FINALIZATION CHECK — Verify all agents completed, fix stragglers
  # =========================================================================
  log "Running finalization check..."
  local all_done=true
  local failed_agents=()
  local pending_agents=()

  for i in "${agent_tasks[@]}"; do
    local sub_agent
    sub_agent=$(jq -r ".[$i].agent" "$tasks_json")
    local output_file="$project/.agdev/handoff/${sub_agent}-output.md"

    if [[ ! -f "$output_file" ]]; then
      all_done=false
      # Check if agent tmux session still exists
      if tmux -S "$SOCKET" has-session -t "$sub_agent" 2>/dev/null; then
        pending_agents+=("$sub_agent")
        log "  ⏳ Agent $sub_agent still running (no output yet)"
      else
        failed_agents+=("$sub_agent")
        log "  ❌ Agent $sub_agent has no output and no session — FAILED"
      fi
    elif [[ ! -s "$output_file" ]]; then
      failed_agents+=("$sub_agent")
      log "  ❌ Agent $sub_agent output is empty — FAILED"
    else
      log "  ✅ Agent $sub_agent completed"
    fi
  done

  # Wait for pending agents (up to 120s more)
  if [[ ${#pending_agents[@]} -gt 0 ]]; then
    log "Waiting for ${#pending_agents[@]} pending agents (max 120s)..."
    local wait_start=$(date +%s)
    local max_wait=120

    while [[ ${#pending_agents[@]} -gt 0 ]]; do
      local elapsed=$(( $(date +%s) - wait_start ))
      if [[ $elapsed -ge $max_wait ]]; then
        log "  ⏰ Timeout waiting for agents: ${pending_agents[*]}"
        failed_agents+=("${pending_agents[@]}")
        break
      fi

      sleep 10
      local still_pending=()
      for pa in "${pending_agents[@]}"; do
        local pa_output="$project/.agdev/handoff/${pa}-output.md"
        if [[ -f "$pa_output" && -s "$pa_output" ]]; then
          log "  ✅ Agent $pa completed (after wait)"
          # Append to consolidated
          echo "## Agent: $pa (late completion)" >> "$consolidated"
          echo "" >> "$consolidated"
          cat "$pa_output" >> "$consolidated"
          echo "" >> "$consolidated"
          echo "---" >> "$consolidated"
        elif tmux -S "$SOCKET" has-session -t "$pa" 2>/dev/null; then
          still_pending+=("$pa")
        else
          log "  ❌ Agent $pa session died without output"
          failed_agents+=("$pa")
        fi
      done
      pending_agents=("${still_pending[@]}")
    done
  fi

  # Handle failed agents — retry once with single agent
  if [[ ${#failed_agents[@]} -gt 0 ]]; then
    log "⚠️  ${#failed_agents[@]} agent(s) failed: ${failed_agents[*]}"
    log "Attempting recovery for failed agents..."

    for fa in "${failed_agents[@]}"; do
      local fa_prompt
      # Find the original prompt for this agent
      fa_prompt=$(jq -r --arg agent "$fa" '.[] | select(.agent == $agent) | .prompt' "$tasks_json" 2>/dev/null | head -1)

      if [[ -n "$fa_prompt" ]]; then
        log "  🔄 Retrying $fa as single agent..."
        run_single "$fa_prompt" "$project" "$fa" 2>/dev/null || {
          log "  ❌ Retry failed for $fa — escalating to human"
          echo "## ⚠️ FAILED: Agent $fa" >> "$consolidated"
          echo "Task could not be completed after retry." >> "$consolidated"
          echo "Original prompt: $fa_prompt" >> "$consolidated"
          echo "---" >> "$consolidated"
        }
      fi
    done

    # Re-run gate evaluation on retried outputs
    if [[ -x "$GATE_EVALUATOR" ]]; then
      for fa in "${failed_agents[@]}"; do
        local fa_output="$project/.agdev/handoff/${fa}-output.md"
        if [[ -f "$fa_output" && -s "$fa_output" ]]; then
          local gate_result
          gate_result=$(bash "$GATE_EVALUATOR" "$fa_output" "dev-to-qa" 2>/dev/null || true)
          local gv
          gv=$(echo "$gate_result" | jq -r '.verdict // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")
          log "  Gate retry $fa: $gv"
        fi
      done
    fi
  fi

  # Final status
  local final_failed=${#failed_agents[@]}
  if [[ $final_failed -eq 0 ]]; then
    update_status "completed" "$task_count tasks done (${#worker_tasks[@]} workers + ${#agent_tasks[@]} agents) ✅ All verified"
    log "✅ Finalization: ALL agents completed successfully!"
  else
    update_status "completed-with-errors" "$task_count tasks, $final_failed failed agents"
    log "⚠️ Finalization: $final_failed agent(s) had issues. Check consolidated report."
  fi

  log "Consolidated: $consolidated"
  log "Dispatch complete!"
}

# =============================================================================
# STEP 5: Native Teams Support (Future — Claude Code Agent Teams)
# =============================================================================
run_native_teams() {
  local task="$1"
  local project="$2"

  log "NATIVE TEAMS mode (Claude Code Agent Teams)"
  log "WARN: Not yet available. Falling back to parallel dispatch."

  run_parallel "$task" "$project"
}

# =============================================================================
# Execution Logging
# =============================================================================
log_execution() {
  local task="$1" executor="$2" worker="${3:-}" agent="${4:-}" success="${5:-true}" exit_code="${6:-0}" tokens="${7:-0}" duration="${8:-0}"

  if [[ -x "$EVOLUTION" ]]; then
    bash "$EVOLUTION" log-execution \
      --task "$task" \
      --executor "$executor" \
      --worker "$worker" \
      --agent "$agent" \
      --success "$success" \
      --duration "${duration:-0}" \
      --tokens "${tokens:-0}" \
      > /dev/null 2>&1 || true
  fi
}

# =============================================================================
# Evolution: Background Pattern Detection
# =============================================================================
run_evolution_background() {
  if [[ -x "$EVOLUTION" ]]; then
    log "Evolution engine scanning patterns (background)..."
    (
      cd "$PROJECT_DIR"
      bash "$EVOLUTION" detect-patterns > /dev/null 2>&1 || true
    ) &
    disown 2>/dev/null || true
  fi
}

# =============================================================================
# MAIN
# =============================================================================
log "========================================="
log "  CLAUDIO DISPATCH v2 — Task Router"
log "========================================="

# Ensure project dir exists
if [[ ! -d "$PROJECT_DIR" ]]; then
  mkdir -p "$PROJECT_DIR"
  cd "$PROJECT_DIR" && git init 2>/dev/null || true
fi

# STEP 1: Classify task (deterministic, 0 tokens)
update_status "classifying" "deterministic classifier"

CLASSIFICATION=""
if [[ "$MODE" == "auto" ]]; then
  log "Classifying task (deterministic)..."
  CLASSIFICATION=$(classify_task "$TASK")

  COMPLEXITY=$(echo "$CLASSIFICATION" | jq -r '.complexity // "medium"' 2>/dev/null || echo "medium")
  EXECUTOR=$(echo "$CLASSIFICATION" | jq -r '.executor // "single-agent"' 2>/dev/null || echo "single-agent")
  AGENT=$(echo "$CLASSIFICATION" | jq -r '.agent // "@dev"' 2>/dev/null || echo "@dev")
  WORKER=$(echo "$CLASSIFICATION" | jq -r '.worker // empty' 2>/dev/null || true)
  CONFIDENCE=$(echo "$CLASSIFICATION" | jq -r '.confidence // 0' 2>/dev/null || echo "0")
  TASK_TYPE=$(echo "$CLASSIFICATION" | jq -r '.type // "code"' 2>/dev/null || echo "code")
  LLM_FALLBACK=$(echo "$CLASSIFICATION" | jq -r '.llm_fallback // false' 2>/dev/null || echo "false")

  # Store classifier result for status enrichment
  CLASSIFIER_JSON="$CLASSIFICATION"

  log "Classification: complexity=$COMPLEXITY type=$TASK_TYPE executor=$EXECUTOR agent=$AGENT worker=${WORKER:-none} confidence=$CONFIDENCE"

  # Update status with classifier result
  update_status "classified" "complexity=$COMPLEXITY executor=$EXECUTOR"

  # Low confidence fallback to LLM
  if [[ "$LLM_FALLBACK" != "true" ]] && awk "BEGIN {exit !($CONFIDENCE < 0.3)}" 2>/dev/null; then
    log "Low confidence ($CONFIDENCE) — falling back to LLM evaluation"
    CLASSIFICATION=$(evaluate_complexity_llm "$TASK")
    EXECUTOR=$(echo "$CLASSIFICATION" | jq -r '.executor // "single-agent"')
    AGENT=$(echo "$CLASSIFICATION" | jq -r '.agent // "@dev"')
    WORKER=""
  fi

  # Map executor to mode
  case "$EXECUTOR" in
    worker)       MODE="worker" ;;
    single-agent) MODE="single" ;;
    multi-agent)  MODE="parallel" ;;
    *)            MODE="single" ;;
  esac
fi

log "Mode: $MODE"

# STEP 2: Execute
DISPATCH_SUCCESS=true
case "$MODE" in
  worker)
    if [[ -n "${WORKER:-}" ]]; then
      run_worker "$WORKER" "$PROJECT_DIR" || {
        log "Worker failed, falling back to single agent"
        run_single "$TASK" "$PROJECT_DIR" "${AGENT:-dev}" || DISPATCH_SUCCESS=false
      }
    else
      log "No worker matched, running as single agent"
      run_single "$TASK" "$PROJECT_DIR" "${AGENT:-dev}" || DISPATCH_SUCCESS=false
    fi
    ;;
  single)
    run_single "$TASK" "$PROJECT_DIR" "${AGENT:-dev}" || DISPATCH_SUCCESS=false
    ;;
  parallel)
    run_parallel "$TASK" "$PROJECT_DIR" || DISPATCH_SUCCESS=false
    ;;
  teams)
    run_native_teams "$TASK" "$PROJECT_DIR" || DISPATCH_SUCCESS=false
    ;;
  *)
    log "ERROR: Unknown mode: $MODE"
    exit 1
    ;;
esac

# Cleanup tmux sessions (optional — keep for debugging)
# bash "$SKILL_DIR/scripts/cleanup.sh" "$SOCKET"

# Final status + history
DURATION_MS=$(( ($(date +%s) - START_EPOCH) * 1000 ))
DISPATCH_STATUS="completed"
$DISPATCH_SUCCESS || DISPATCH_STATUS="failed"

update_status "$DISPATCH_STATUS" "duration=${DURATION_MS}ms"

# Record run in dispatch-history.json with full details
if [[ -x "$LOGGER" ]]; then
  local_agents="${ACTIVE_AGENTS:-}"
  HISTORY_ENTRY=$(jq -nc \
    --arg task "$(echo "$TASK" | head -c 200)" \
    --arg mode "$MODE" \
    --arg status "$DISPATCH_STATUS" \
    --arg startedAt "$(date -u -d @$START_EPOCH +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson durationMs "$DURATION_MS" \
    --argjson classifier "${CLASSIFIER_JSON:-null}" \
    --arg gate_verdict "${GATE_VERDICT:-}" \
    --arg agents "${local_agents}" \
    '{
      task: $task,
      mode: $mode,
      status: $status,
      startedAt: $startedAt,
      durationMs: $durationMs,
      classifier: $classifier,
      gate_verdict: (if $gate_verdict != "" then $gate_verdict else null end),
      agents: (if $agents != "" then ($agents | split(",")) else [] end)
    }')

  AGDEV_DIR="$PROJECT_DIR/.agdev" bash "$LOGGER" log-history "$HISTORY_ENTRY" > /dev/null 2>&1 || true
fi

# Record run in LobsterBoard history (HTTP)
curl -s -X POST "http://localhost:8080/api/pages/dispatch/record" \
  -H "Content-Type: application/json" \
  -d "{\"task\":\"$(echo "$TASK" | head -c 200 | sed 's/"/\\"/g')\",\"mode\":\"$MODE\",\"status\":\"$DISPATCH_STATUS\",\"startedAt\":\"$(date -u -d @$START_EPOCH +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)\",\"durationMs\":$DURATION_MS,\"taskCount\":0}" \
  > /dev/null 2>&1 || true

# Evolution engine — detect patterns (background, post-completion)
run_evolution_background

log "========================================="
log "  DISPATCH COMPLETE (${DURATION_MS}ms)"
log "========================================="
