#!/usr/bin/env bash
set -euo pipefail

# Worker: git-ops — Git operations with structured args
# Usage: git-ops.sh <project_dir> <operation> [args...]
#   Operations: branch, commit, push, merge, cherry-pick, status, log, stash, tag
# Output: JSON { success, output, files_changed, operation }

PROJECT_DIR="${1:-.}"
OPERATION="${2:-status}"
shift 2 || true
EXTRA_ARGS="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Validate git repo
###############################################################################

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  jq -n '{"success":false,"output":"Not a git repository","files_changed":[],"operation":"none"}'
  exit 1
fi

###############################################################################
# Execute operation
###############################################################################

OUTPUT=""
EXIT_CODE=0

case "$OPERATION" in
  branch)
    if [[ -z "$EXTRA_ARGS" ]]; then
      OUTPUT=$(git branch -a 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(git checkout -b $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    fi
    ;;
  checkout)
    OUTPUT=$(git checkout $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  commit)
    MSG="${EXTRA_ARGS:-auto-commit}"
    OUTPUT=$(git add -A && git commit -m "$MSG" 2>&1) || EXIT_CODE=$?
    ;;
  push)
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [[ -n "$EXTRA_ARGS" ]]; then
      OUTPUT=$(git push $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(git push origin "$BRANCH" 2>&1) || EXIT_CODE=$?
    fi
    ;;
  pull)
    OUTPUT=$(git pull $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  merge)
    OUTPUT=$(git merge $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  cherry-pick)
    OUTPUT=$(git cherry-pick $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  status)
    OUTPUT=$(git status --short 2>&1) || EXIT_CODE=$?
    ;;
  log)
    OUTPUT=$(git log --oneline -20 $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  stash)
    if [[ -z "$EXTRA_ARGS" ]]; then
      OUTPUT=$(git stash 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(git stash $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    fi
    ;;
  tag)
    if [[ -z "$EXTRA_ARGS" ]]; then
      OUTPUT=$(git tag -l 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(git tag $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    fi
    ;;
  diff)
    OUTPUT=$(git diff --stat $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  *)
    OUTPUT="Unknown git operation: $OPERATION. Supported: branch, checkout, commit, push, pull, merge, cherry-pick, status, log, stash, tag, diff"
    EXIT_CODE=1
    ;;
esac

###############################################################################
# Collect changed files
###############################################################################

CHANGED_FILES="[]"
if [[ "$OPERATION" == "commit" || "$OPERATION" == "merge" || "$OPERATION" == "cherry-pick" ]]; then
  FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)
  if [[ -n "$FILES" ]]; then
    CHANGED_FILES=$(echo "$FILES" | jq -R -s 'split("\n") | map(select(length > 0))')
  fi
fi

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 ]] && SUCCESS=false

TRUNCATED_OUTPUT="${OUTPUT:0:4000}"

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "$TRUNCATED_OUTPUT" \
  --argjson files_changed "$CHANGED_FILES" \
  --arg operation "$OPERATION" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: $files_changed,
    operation: $operation,
    exit_code: $exit_code
  }'
