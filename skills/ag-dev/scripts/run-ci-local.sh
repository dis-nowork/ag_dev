#!/usr/bin/env bash
# Run CI locally using nektos/act
# Usage: run-ci-local.sh <project_dir> [branch] [workflow]

set -euo pipefail

PROJECT_DIR="${1:?Usage: run-ci-local.sh <project_dir> [branch] [workflow]}"
BRANCH="${2:-}"
WORKFLOW="${3:-.github/workflows/ci.yml}"

log() { echo "[$(date -u +%H:%M:%S)] [ci-local] $*"; }

cd "$PROJECT_DIR"

# Checkout branch if specified
[[ -n "$BRANCH" ]] && git checkout "$BRANCH" 2>/dev/null

# Check if workflow exists
if [[ ! -f "$WORKFLOW" ]]; then
  log "⚠️  No CI workflow at $WORKFLOW — skipping"
  exit 0
fi

# Check act is installed
if ! command -v act &>/dev/null; then
  log "❌ act not installed. Install: curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
  exit 1
fi

log "🔄 Running CI locally via act..."
log "  Project: $PROJECT_DIR"
log "  Branch:  $(git rev-parse --abbrev-ref HEAD)"
log "  Workflow: $WORKFLOW"

# Run act with medium Ubuntu image
if act -W "$WORKFLOW" --container-architecture linux/amd64 -P ubuntu-latest=catthehacker/ubuntu:act-latest 2>&1; then
  log "✅ CI passed!"
  exit 0
else
  EXIT_CODE=$?
  log "❌ CI failed (exit code: $EXIT_CODE)"
  exit $EXIT_CODE
fi
