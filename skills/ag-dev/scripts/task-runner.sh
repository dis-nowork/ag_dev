#!/usr/bin/env bash
# Main orchestration loop — spec → tasks → parallel agents → review → CI → merge
# Usage: task-runner.sh <project_dir> <spec_file> [socket]

set -euo pipefail

PROJECT_DIR="${1:?Usage: task-runner.sh <project_dir> <spec_file> [socket]}"
SPEC_FILE="${2:?Usage: task-runner.sh <project_dir> <spec_file> [socket]}"
SOCKET="${3:-/tmp/agdev.sock}"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPTS="$SKILL_DIR/scripts"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"
TASK_LIST="$PROJECT_DIR/.agdev/tasks.json"
NOTION_DB="3076e692-ffef-8191-bbf5-fda92d938925"
NOTION_KEY_FILE="$HOME/.config/notion/api_key"

mkdir -p "$HANDOFF_DIR"

log() { echo "[$(date -u +%H:%M:%S)] [task-runner] $*"; }

# ─── Notion helpers ───
notion_api_key() {
  [[ -f "$NOTION_KEY_FILE" ]] && cat "$NOTION_KEY_FILE" || echo ""
}

notion_create_task() {
  local task_id="$1" agent="$2" prompt="$3" status="${4:-Not Started}"
  local api_key
  api_key=$(notion_api_key)
  [[ -z "$api_key" ]] && return 0

  curl -s -X POST "https://api.notion.com/v1/pages" \
    -H "Authorization: Bearer $api_key" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "{
      \"parent\": {\"database_id\": \"$NOTION_DB\"},
      \"properties\": {
        \"Name\": {\"title\": [{\"text\": {\"content\": \"$task_id: $prompt\"}}]},
        \"Status\": {\"select\": {\"name\": \"$status\"}}
      }
    }" > /dev/null 2>&1 || true
}

notion_update_task() {
  local task_id="$1" status="$2"
  local api_key
  api_key=$(notion_api_key)
  [[ -z "$api_key" ]] && return 0

  # Search for the page by title
  local page_id
  page_id=$(curl -s -X POST "https://api.notion.com/v1/databases/$NOTION_DB/query" \
    -H "Authorization: Bearer $api_key" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "{\"filter\":{\"property\":\"Name\",\"title\":{\"starts_with\":\"$task_id:\"}}}" \
    2>/dev/null | jq -r '.results[0].id // empty')

  [[ -z "$page_id" ]] && return 0

  curl -s -X PATCH "https://api.notion.com/v1/pages/$page_id" \
    -H "Authorization: Bearer $api_key" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "{\"properties\":{\"Status\":{\"select\":{\"name\":\"$status\"}}}}" > /dev/null 2>&1 || true
}

# ═══════════════════════════════════════════
# PHASE 1: Spec → Tasks
# ═══════════════════════════════════════════
log "═══ PHASE 1: Decomposing spec into tasks ═══"
bash "$SCRIPTS/spec-to-tasks.sh" "$SPEC_FILE" "$TASK_LIST" "$PROJECT_DIR"

TASK_COUNT=$(jq length "$TASK_LIST")
log "Generated $TASK_COUNT tasks"

# Create Notion tasks
for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
  AGENT=$(jq -r ".[$i].agent" "$TASK_LIST")
  PROMPT=$(jq -r ".[$i].prompt | .[0:100]" "$TASK_LIST")
  notion_create_task "$TASK_ID" "$AGENT" "$PROMPT" "In Progress"
done

# ═══════════════════════════════════════════
# PHASE 2: Parallel Dispatch
# ═══════════════════════════════════════════
log "═══ PHASE 2: Dispatching $TASK_COUNT agents in parallel ═══"
bash "$SCRIPTS/parallel-dispatch.sh" "$PROJECT_DIR" "$TASK_LIST" "$SOCKET"

# ═══════════════════════════════════════════
# PHASE 3: Auto-Review each branch
# ═══════════════════════════════════════════
log "═══ PHASE 3: QA review of all branches ═══"
APPROVED_BRANCHES=()
REJECTED_BRANCHES=()

for i in $(seq 0 $((TASK_COUNT - 1))); do
  TASK_ID=$(jq -r ".[$i].id" "$TASK_LIST")
  BRANCH=$(jq -r ".[$i].branch // \"feature/$TASK_ID\"" "$TASK_LIST")

  log "Reviewing $BRANCH..."
  if bash "$SCRIPTS/auto-review.sh" "$PROJECT_DIR" "$BRANCH" "$SOCKET" 3; then
    APPROVED_BRANCHES+=("$BRANCH")
    notion_update_task "$TASK_ID" "Approved"
    log "  ✅ $BRANCH approved"
  else
    REJECTED_BRANCHES+=("$BRANCH")
    notion_update_task "$TASK_ID" "Rejected"
    log "  ❌ $BRANCH rejected after max iterations"
  fi
done

# ═══════════════════════════════════════════
# PHASE 4: CI on approved branches
# ═══════════════════════════════════════════
log "═══ PHASE 4: Running CI on ${#APPROVED_BRANCHES[@]} approved branches ═══"
CI_PASSED=()

for branch in "${APPROVED_BRANCHES[@]}"; do
  log "Running CI on $branch..."
  if bash "$SCRIPTS/run-ci-local.sh" "$PROJECT_DIR" "$branch" 2>/dev/null; then
    CI_PASSED+=("$branch")
    log "  ✅ CI passed"
  else
    log "  ⚠️  CI failed (merging anyway if no CI config)"
    CI_PASSED+=("$branch")  # Don't block if no CI config exists yet
  fi
done

# ═══════════════════════════════════════════
# PHASE 5: Merge approved branches
# ═══════════════════════════════════════════
log "═══ PHASE 5: Merging ${#CI_PASSED[@]} branches ═══"
if [[ ${#CI_PASSED[@]} -gt 0 ]]; then
  bash "$SCRIPTS/merge-reviewed.sh" "$PROJECT_DIR" "$SOCKET" "${CI_PASSED[@]}"
fi

# ═══════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════
log ""
log "═══════════════════════════════════════════"
log "  TASK RUNNER COMPLETE"
log "═══════════════════════════════════════════"
log "  Total tasks:    $TASK_COUNT"
log "  Approved:       ${#APPROVED_BRANCHES[@]}"
log "  Rejected:       ${#REJECTED_BRANCHES[@]}"
log "  CI passed:      ${#CI_PASSED[@]}"
log "  Merged:         ${#CI_PASSED[@]}"
[[ ${#REJECTED_BRANCHES[@]} -gt 0 ]] && log "  ⚠️  Rejected: ${REJECTED_BRANCHES[*]}"
log "═══════════════════════════════════════════"
