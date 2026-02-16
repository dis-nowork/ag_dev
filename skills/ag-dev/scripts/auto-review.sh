#!/usr/bin/env bash
# Auto-review — QA agent reviews each completed branch
# Usage: auto-review.sh <project_dir> <branch_name> [socket] [max_iterations]
#
# Flow: diff branch vs main → QA agent reviews → APPROVE/REJECT → re-dispatch if rejected

set -euo pipefail

PROJECT_DIR="${1:?Usage: auto-review.sh <project_dir> <branch_name> [socket] [max_iterations]}"
BRANCH="${2:?Usage: auto-review.sh <project_dir> <branch_name> [socket] [max_iterations]}"
SOCKET="${3:-/tmp/agdev.sock}"
MAX_ITER="${4:-3}"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"
MAIN_BRANCH=$(cd "$PROJECT_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
REVIEW_SESSION="review-$(echo "$BRANCH" | tr '/' '-')"

mkdir -p "$HANDOFF_DIR"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# Ensure tmux
tmux -S "$SOCKET" list-sessions &>/dev/null || tmux -S "$SOCKET" new-session -d -s orchestrator

for iter in $(seq 1 "$MAX_ITER"); do
  log "🔍 Review iteration $iter/$MAX_ITER for $BRANCH"

  # Generate diff
  DIFF_FILE="$HANDOFF_DIR/review-diff-$(echo "$BRANCH" | tr '/' '-').patch"
  (cd "$PROJECT_DIR" && git diff "$MAIN_BRANCH...$BRANCH" > "$DIFF_FILE" 2>/dev/null) || {
    log "❌ Failed to generate diff for $BRANCH"
    exit 1
  }

  DIFF_SIZE=$(wc -c < "$DIFF_FILE")
  if [[ $DIFF_SIZE -eq 0 ]]; then
    log "⚠️  Empty diff — no changes on $BRANCH"
    echo "APPROVE" > "$HANDOFF_DIR/review-result-$(echo "$BRANCH" | tr '/' '-').txt"
    exit 0
  fi

  # Truncate diff if too large (keep first 50KB)
  if [[ $DIFF_SIZE -gt 51200 ]]; then
    head -c 51200 "$DIFF_FILE" > "${DIFF_FILE}.tmp" && mv "${DIFF_FILE}.tmp" "$DIFF_FILE"
    log "  ⚠️  Diff truncated to 50KB (was ${DIFF_SIZE}B)"
  fi

  # Write QA review task
  REVIEW_TASK="$HANDOFF_DIR/review-task-$(echo "$BRANCH" | tr '/' '-').md"
  cat > "$REVIEW_TASK" << TASK
# QA Review — Branch: $BRANCH (Iteration $iter/$MAX_ITER)

Review the following code changes. Check for:
1. Code quality, readability, naming
2. Bugs, edge cases, error handling
3. Security issues
4. Test coverage (are there tests?)
5. Architecture consistency

## The Diff
\`\`\`diff
$(cat "$DIFF_FILE")
\`\`\`

## Your Response Format
Start your output with exactly one of:
- APPROVE — if the code is acceptable
- REJECT — if issues need fixing

Then provide detailed feedback. If REJECT, list specific files and lines to fix.

Save your review to .agdev/handoff/review-result-$(echo "$BRANCH" | tr '/' '-').md
Write DONE as the last line.
TASK

  # Create/reuse tmux session for QA
  tmux -S "$SOCKET" new-session -d -s "$REVIEW_SESSION" -c "$PROJECT_DIR" 2>/dev/null || true

  # Dispatch QA review
  tmux -S "$SOCKET" send-keys -t "$REVIEW_SESSION" \
    "cd $PROJECT_DIR && claude -p 'Read .agdev/handoff/review-task-$(echo "$BRANCH" | tr '/' '-').md and execute the review. Save your review to .agdev/handoff/review-result-$(echo "$BRANCH" | tr '/' '-').md. Start with APPROVE or REJECT. Write DONE as the last line.' 2>&1 | tee .agdev/handoff/review-result-$(echo "$BRANCH" | tr '/' '-').md && echo 'REVIEW_DONE'" Enter

  # Wait for review
  log "  ⏳ Waiting for QA review..."
  WAIT=0
  while [[ $WAIT -lt 600 ]]; do
    sleep 10
    WAIT=$((WAIT + 10))
    if tmux -S "$SOCKET" capture-pane -p -t "$REVIEW_SESSION" -S -5 2>/dev/null | grep -q "REVIEW_DONE"; then
      break
    fi
  done

  # Parse result
  RESULT_FILE="$HANDOFF_DIR/review-result-$(echo "$BRANCH" | tr '/' '-').md"
  if [[ ! -f "$RESULT_FILE" ]]; then
    log "  ❌ No review result file found"
    continue
  fi

  if head -5 "$RESULT_FILE" | grep -qi "^APPROVE"; then
    log "  ✅ APPROVED on iteration $iter"
    echo "APPROVED" > "$HANDOFF_DIR/review-status-$(echo "$BRANCH" | tr '/' '-').txt"
    exit 0
  fi

  if [[ $iter -eq $MAX_ITER ]]; then
    log "  ❌ REJECTED after $MAX_ITER iterations — escalating to human"
    echo "REJECTED" > "$HANDOFF_DIR/review-status-$(echo "$BRANCH" | tr '/' '-').txt"
    exit 1
  fi

  log "  🔄 REJECTED — re-dispatching dev agent with feedback (iteration $((iter+1)))"

  # Re-dispatch dev agent with feedback
  FIX_SESSION="fix-$(echo "$BRANCH" | tr '/' '-')"
  tmux -S "$SOCKET" new-session -d -s "$FIX_SESSION" -c "$PROJECT_DIR" 2>/dev/null || true

  FIX_TASK="$HANDOFF_DIR/fix-task-$(echo "$BRANCH" | tr '/' '-').md"
  cat > "$FIX_TASK" << FIX
# Fix Required — Branch: $BRANCH (Attempt $((iter+1)))

The QA review rejected your changes. Fix the issues below and commit.

## QA Feedback
$(cat "$RESULT_FILE")

## Instructions
- Checkout branch: $BRANCH
- Fix all issues mentioned in the QA feedback
- Commit with conventional commits
- Write DONE to .agdev/handoff/fix-output-$(echo "$BRANCH" | tr '/' '-').md when finished
FIX

  tmux -S "$SOCKET" send-keys -t "$FIX_SESSION" \
    "cd $PROJECT_DIR && git checkout $BRANCH && claude -p 'Read .agdev/handoff/fix-task-$(echo "$BRANCH" | tr '/' '-').md and fix all issues. Commit your fixes. Write DONE when finished.' 2>&1 | tee .agdev/handoff/fix-output-$(echo "$BRANCH" | tr '/' '-').md && echo 'FIX_DONE'" Enter

  # Wait for fix
  WAIT=0
  while [[ $WAIT -lt 600 ]]; do
    sleep 10
    WAIT=$((WAIT + 10))
    if tmux -S "$SOCKET" capture-pane -p -t "$FIX_SESSION" -S -5 2>/dev/null | grep -q "FIX_DONE"; then
      break
    fi
  done

  log "  ✅ Fix applied, re-reviewing..."
done
