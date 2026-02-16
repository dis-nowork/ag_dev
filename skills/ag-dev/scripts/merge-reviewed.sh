#!/usr/bin/env bash
# Merge QA-approved branches into main, run CI, push
# Usage: merge-reviewed.sh <project_dir> [socket] [branches...]

set -euo pipefail

PROJECT_DIR="${1:?Usage: merge-reviewed.sh <project_dir> [socket] [branches...]}"
SOCKET="${2:-/tmp/agdev.sock}"
shift 2
BRANCHES=("$@")

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

log() { echo "[$(date -u +%H:%M:%S)] [merge] $*"; }

cd "$PROJECT_DIR"
MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
git checkout "$MAIN_BRANCH" 2>/dev/null

if [[ ${#BRANCHES[@]} -eq 0 ]]; then
  log "No branches to merge"
  exit 0
fi

MERGED=()
FAILED=()

for branch in "${BRANCHES[@]}"; do
  log "🔀 Merging $branch → $MAIN_BRANCH"

  if git merge "$branch" --no-ff -m "Merge $branch (QA approved)" 2>/dev/null; then
    MERGED+=("$branch")
    log "  ✅ Merged $branch"
  else
    log "  ❌ Merge conflict on $branch — aborting this merge"
    git merge --abort 2>/dev/null || true
    FAILED+=("$branch")
  fi
done

# Run CI on merged result
if [[ ${#MERGED[@]} -gt 0 ]]; then
  log "🔄 Running CI on merged result..."
  if bash "$SKILL_DIR/scripts/run-ci-local.sh" "$PROJECT_DIR" 2>/dev/null; then
    log "✅ CI passed after merge"

    # Push if we have a remote
    if git remote get-url origin &>/dev/null; then
      log "📤 Pushing to origin/$MAIN_BRANCH..."
      git push origin "$MAIN_BRANCH" 2>/dev/null && log "  ✅ Pushed" || log "  ⚠️  Push failed"
    fi
  else
    log "⚠️  CI failed after merge (no CI config or test failures)"
  fi
fi

# Cleanup merged branches
for branch in "${MERGED[@]}"; do
  git branch -d "$branch" 2>/dev/null && log "  🗑️  Deleted $branch" || true
done

log ""
log "Merged: ${#MERGED[@]}  Failed: ${#FAILED[@]}"
[[ ${#FAILED[@]} -gt 0 ]] && log "Failed branches: ${FAILED[*]}"
