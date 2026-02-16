#!/usr/bin/env bash
# Parallel agent dispatch — spawns N agents in parallel, each on own branch
# Usage: parallel-dispatch.sh <project_dir> <task_list.json> [socket]
#
# FIXES (2026-02-16):
#   - Git worktree per agent (no shared checkout conflicts)
#   - Prompt via temp file + stdin pipe (no shell expansion)
#   - PTY wrapper via script -qec
#   - --dangerously-skip-permissions for headless
#   - Proper output capture with tee

set -euo pipefail

PROJECT_DIR="${1:?Usage: parallel-dispatch.sh <project_dir> <task_list.json> [socket]}"
TASK_LIST="${2:?Usage: parallel-dispatch.sh <project_dir> <task_list.json> [socket]}"
SOCKET="${3:-/tmp/agdev.sock}"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"
STATUS_DIR="$PROJECT_DIR/.agdev/parallel-status"
WORKTREE_BASE="$PROJECT_DIR/.agdev/worktrees"
MAIN_BRANCH=$(cd "$PROJECT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

mkdir -p "$HANDOFF_DIR" "$STATUS_DIR" "$WORKTREE_BASE"

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

  # === FIX: Use git worktree per agent (avoid shared checkout conflicts) ===
  WORK_DIR="$WORKTREE_BASE/$TASK_ID"
  if [[ -d "$WORK_DIR" ]]; then
    # Clean up existing worktree
    (cd "$PROJECT_DIR" && git worktree remove "$WORK_DIR" --force 2>/dev/null || rm -rf "$WORK_DIR")
  fi
  
  # Create branch if it doesn't exist
  (cd "$PROJECT_DIR" && git branch "$BRANCH" "$MAIN_BRANCH" 2>/dev/null || true)
  
  # Create worktree
  (cd "$PROJECT_DIR" && git worktree add "$WORK_DIR" "$BRANCH" 2>/dev/null) || {
    log "⚠️  Worktree failed, falling back to direct checkout"
    WORK_DIR="$PROJECT_DIR"
    (cd "$PROJECT_DIR" && git checkout -b "$BRANCH" "$MAIN_BRANCH" 2>/dev/null || git checkout "$BRANCH")
  }

  # Create tmux session for this task
  tmux -S "$SOCKET" new-session -d -s "$SESSION" -c "$WORK_DIR" 2>/dev/null || true

  # Copy agent persona if available
  CLAUDE_MD="$SKILL_DIR/agents/$AGENT/CLAUDE.md"
  AGDEV_DIR="$WORK_DIR/.agdev"
  mkdir -p "$AGDEV_DIR/handoff"
  if [[ -f "$CLAUDE_MD" ]]; then
    cp "$CLAUDE_MD" "$AGDEV_DIR/CLAUDE-$AGENT.md"
  fi

  # Write task prompt to FILE (NEVER pass via shell expansion)
  TASK_FILE="$AGDEV_DIR/handoff/current-task-$TASK_ID.md"
  cat > "$TASK_FILE" << TASK
# Task: $TASK_ID (Agent: $AGENT)
Branch: $BRANCH
$(date -u +"%Y-%m-%d %H:%M UTC")

$PROMPT

## Instructions
- Read .agdev/CLAUDE-$AGENT.md for your persona if it exists
- Implement the task fully in the working directory
- Save a summary to .agdev/handoff/$TASK_ID-output.md
- Use conventional commits
- Write DONE as the last line of your output file when finished
TASK

  # Write the Claude prompt to a temp file
  PROMPT_FILE=$(mktemp /tmp/agdev-task-$TASK_ID-XXXXX.txt)
  cat > "$PROMPT_FILE" << PEOF
Read .agdev/handoff/current-task-$TASK_ID.md and execute the task fully. If .agdev/CLAUDE-$AGENT.md exists, read it for your persona. Save a summary of what you did to .agdev/handoff/$TASK_ID-output.md. Write DONE as the last line when finished.
PEOF

  # === FIX: Launch Claude via stdin pipe + PTY + skip permissions ===
  CLAUDE_CMD="cd $WORK_DIR && cat $PROMPT_FILE | script -qec 'claude --dangerously-skip-permissions -p - --allowedTools '\"'\"'Bash(*)'\"'\"' '\"'\"'Read(*)'\"'\"' '\"'\"'Write(*)'\"'\"' '\"'\"'Edit(*)'\"'\"'' /dev/null 2>&1 | tee $AGDEV_DIR/handoff/$TASK_ID-output.md && rm -f $PROMPT_FILE && echo 'TASK_DONE_$TASK_ID'"

  tmux -S "$SOCKET" send-keys -t "$SESSION" "$CLAUDE_CMD" Enter

  # Track status
  echo "dispatched" > "$STATUS_DIR/$TASK_ID.status"

  log "  ✅ $SESSION running in worktree: $WORK_DIR"
  sleep 1  # Stagger launches to avoid API rate limits
done

log "═══════════════════════════════════════"
log "🚀 All $TASK_COUNT tasks dispatched!"
log "═══════════════════════════════════════"
log ""
log "Monitor all:"
log "  tmux -S $SOCKET list-sessions"
log ""
log "Wait for completion:"
log "  while true; do"
log "    DONE=\$(ls $STATUS_DIR/*.status 2>/dev/null | xargs grep -l 'done' 2>/dev/null | wc -l)"
log "    echo \"\$DONE / $TASK_COUNT done\""
log "    [[ \$DONE -eq $TASK_COUNT ]] && break"
log "    sleep 10"
log "  done"

# Monitor loop — check for TASK_DONE markers
log ""
log "⏳ Monitoring agents..."
COMPLETED=0
MAX_WAIT=1800  # 30 minutes max
ELAPSED=0

while [[ $COMPLETED -lt $TASK_COUNT && $ELAPSED -lt $MAX_WAIT ]]; do
  sleep 15
  ELAPSED=$((ELAPSED + 15))
  
  for i in $(seq 0 $((TASK_COUNT - 1))); do
    TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
    STATUS_FILE="$STATUS_DIR/$TASK_ID.status"
    
    if [[ "$(cat "$STATUS_FILE" 2>/dev/null)" == "dispatched" ]]; then
      # Check if agent finished
      SESSION="parallel-$TASK_ID"
      if tmux -S "$SOCKET" capture-pane -p -t "$SESSION" -S -10 2>/dev/null | grep -q "TASK_DONE_$TASK_ID"; then
        echo "done" > "$STATUS_FILE"
        COMPLETED=$((COMPLETED + 1))
        log "✅ $TASK_ID completed ($COMPLETED/$TASK_COUNT)"
      fi
    fi
  done
done

if [[ $COMPLETED -eq $TASK_COUNT ]]; then
  log ""
  log "═══════════════════════════════════════"
  log "🎉 All tasks completed!"
  
  # Consolidate results
  log "📊 Consolidating results..."
  RESULT_FILE="$HANDOFF_DIR/consolidated-$(date -u +%Y-%m-%d_%H%M%S).md"
  echo "# Consolidated Results — $(date)" > "$RESULT_FILE"
  
  for i in $(seq 0 $((TASK_COUNT - 1))); do
    TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
    AGENT=$(jq -r ".[$i].agent" "$TASK_LIST")
    WORK_DIR="$WORKTREE_BASE/$TASK_ID"
    OUTPUT_FILE="$WORK_DIR/.agdev/handoff/$TASK_ID-output.md"
    
    echo "" >> "$RESULT_FILE"
    echo "## $TASK_ID ($AGENT)" >> "$RESULT_FILE"
    if [[ -f "$OUTPUT_FILE" ]]; then
      # Strip ANSI codes from output
      cat "$OUTPUT_FILE" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' >> "$RESULT_FILE"
    else
      echo "(no output captured)" >> "$RESULT_FILE"
    fi
    echo "" >> "$RESULT_FILE"
    echo "---" >> "$RESULT_FILE"
  done
  
  log "📄 Consolidated: $RESULT_FILE"
  log "✅ All $TASK_COUNT agents completed!"
else
  log "⚠️  Timeout — $COMPLETED/$TASK_COUNT completed in ${ELAPSED}s"
fi

log "═══════════════════════════════════════"
log "DISPATCH COMPLETE"
log "═══════════════════════════════════════"
