#!/usr/bin/env bash
# Parallel agent dispatch — spawns N agents in parallel, each on own branch
# Usage: parallel-dispatch.sh <project_dir> <task_list.json> [socket]
#
# Task list JSON format:
# [
#   {"id": "task-1", "agent": "dev", "prompt": "Implement auth module", "branch": "feature/task-1"},
#   {"id": "task-2", "agent": "dev", "prompt": "Implement payments", "branch": "feature/task-2"}
# ]

set -euo pipefail

PROJECT_DIR="${1:?Usage: parallel-dispatch.sh <project_dir> <task_list.json> [socket]}"
TASK_LIST="${2:?Usage: parallel-dispatch.sh <project_dir> <task_list.json> [socket]}"
SOCKET="${3:-/tmp/agdev.sock}"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"
STATUS_DIR="$PROJECT_DIR/.agdev/parallel-status"
MAIN_BRANCH=$(cd "$PROJECT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

mkdir -p "$HANDOFF_DIR" "$STATUS_DIR"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# Parse task count
TASK_COUNT=$(jq length "$TASK_LIST")
log "📋 $TASK_COUNT tasks to dispatch from $TASK_LIST"

# Ensure tmux server exists
tmux -S "$SOCKET" list-sessions &>/dev/null || tmux -S "$SOCKET" new-session -d -s orchestrator

# Dispatch all tasks
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
  AGENT=$(jq -r ".[$i].agent" "$TASK_LIST")
  PROMPT=$(jq -r ".[$i].prompt" "$TASK_LIST")
  BRANCH=$(jq -r ".[$i].branch // \"feature/$TASK_ID\"" "$TASK_LIST")

  SESSION="parallel-$TASK_ID"
  log "🚀 Dispatching $TASK_ID → agent=$AGENT branch=$BRANCH"

  # Create branch from main
  (cd "$PROJECT_DIR" && git checkout -b "$BRANCH" "$MAIN_BRANCH" 2>/dev/null || git checkout "$BRANCH")

  # Create tmux window for this task
  tmux -S "$SOCKET" new-session -d -s "$SESSION" -c "$PROJECT_DIR" 2>/dev/null || \
    tmux -S "$SOCKET" new-window -t "$SESSION" -c "$PROJECT_DIR" 2>/dev/null || true

  # Copy agent persona if available
  CLAUDE_MD="$SKILL_DIR/agents/$AGENT/CLAUDE.md"
  if [[ -f "$CLAUDE_MD" ]]; then
    cp "$CLAUDE_MD" "$PROJECT_DIR/.agdev/CLAUDE-$AGENT.md"
  fi

  # Write task file
  cat > "$HANDOFF_DIR/current-task-$TASK_ID.md" << TASK
# Task: $TASK_ID (Agent: $AGENT)
Branch: $BRANCH
$(date -u +"%Y-%m-%d %H:%M UTC")

$PROMPT

## Instructions
- You are working on branch: $BRANCH
- Save output to .agdev/handoff/$TASK_ID-output.md
- Commit your changes with conventional commits
- Write DONE as the last line of your output file when finished
TASK

  # Mark as running
  echo "RUNNING" > "$STATUS_DIR/$TASK_ID.status"

  # Dispatch via claude -p in tmux
  AGENT_CMD="cd $PROJECT_DIR && git checkout $BRANCH && claude -p 'Read .agdev/handoff/current-task-$TASK_ID.md and execute the task. Save output to .agdev/handoff/$TASK_ID-output.md. Write DONE as the last line when finished.' 2>&1 | tee .agdev/handoff/$TASK_ID-output.md && echo 'AGENT_DONE_$TASK_ID'"
  tmux -S "$SOCKET" send-keys -t "$SESSION" "$AGENT_CMD" Enter

  log "  ✅ $SESSION dispatched"
  sleep 1  # Stagger launches slightly
done

# Switch back to main
(cd "$PROJECT_DIR" && git checkout "$MAIN_BRANCH" 2>/dev/null || true)

log ""
log "⏳ Monitoring $TASK_COUNT tasks..."

# Poll for completion
COMPLETED=0
MAX_WAIT=3600  # 1 hour max
ELAPSED=0
POLL_INTERVAL=15

while [[ $COMPLETED -lt $TASK_COUNT && $ELAPSED -lt $MAX_WAIT ]]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  COMPLETED=0

  for i in $(seq 0 $((TASK_COUNT - 1))); do
    TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
    SESSION="parallel-$TASK_ID"

    # Check if done
    if tmux -S "$SOCKET" capture-pane -p -t "$SESSION" -S -5 2>/dev/null | grep -q "AGENT_DONE_$TASK_ID"; then
      if [[ "$(cat "$STATUS_DIR/$TASK_ID.status" 2>/dev/null)" != "DONE" ]]; then
        echo "DONE" > "$STATUS_DIR/$TASK_ID.status"
        log "  ✅ $TASK_ID completed"
      fi
      COMPLETED=$((COMPLETED + 1))
    fi
  done

  log "  Progress: $COMPLETED/$TASK_COUNT (${ELAPSED}s elapsed)"
done

# Final status summary
log ""
log "═══════════════════════════════════"
log "  PARALLEL DISPATCH SUMMARY"
log "═══════════════════════════════════"
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
  AGENT=$(jq -r ".[$i].agent" "$TASK_LIST")
  BRANCH=$(jq -r ".[$i].branch // \"feature/$TASK_ID\"" "$TASK_LIST")
  STATUS=$(cat "$STATUS_DIR/$TASK_ID.status" 2>/dev/null || echo "UNKNOWN")
  log "  $TASK_ID ($AGENT) on $BRANCH → $STATUS"
done
log "═══════════════════════════════════"

if [[ $COMPLETED -eq $TASK_COUNT ]]; then
  log "🎉 All tasks completed!"
  exit 0
else
  log "⚠️  $((TASK_COUNT - COMPLETED)) tasks did not complete within timeout"
  exit 1
fi
