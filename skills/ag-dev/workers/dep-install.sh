#!/usr/bin/env bash
set -euo pipefail

# Worker: dep-install — Detect package manager, install deps, report
# Usage: dep-install.sh <project_dir> [packages...]
# Output: JSON { success, output, files_changed, package_manager }

PROJECT_DIR="${1:-.}"
shift || true
PACKAGES="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect package manager
###############################################################################

detect_package_manager() {
  # Node/JS — lock file detection
  if [[ -f "pnpm-lock.yaml" ]]; then echo "pnpm"; return; fi
  if [[ -f "bun.lockb" || -f "bun.lock" ]]; then echo "bun"; return; fi
  if [[ -f "yarn.lock" ]]; then echo "yarn"; return; fi
  if [[ -f "package-lock.json" || -f "package.json" ]]; then echo "npm"; return; fi
  # Python
  if [[ -f "poetry.lock" || -f "pyproject.toml" ]]; then
    if command -v poetry &>/dev/null; then echo "poetry"; return; fi
    if command -v uv &>/dev/null; then echo "uv"; return; fi
    echo "pip"; return
  fi
  if [[ -f "Pipfile" ]]; then echo "pipenv"; return; fi
  if [[ -f "requirements.txt" ]]; then echo "pip"; return; fi
  # Rust
  if [[ -f "Cargo.toml" ]]; then echo "cargo"; return; fi
  # Go
  if [[ -f "go.mod" ]]; then echo "go"; return; fi
  echo "none"
}

PKG_MANAGER=$(detect_package_manager)

###############################################################################
# Run install
###############################################################################

OUTPUT=""
EXIT_CODE=0

case "$PKG_MANAGER" in
  npm)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(npm install $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(npm install 2>&1) || EXIT_CODE=$?
    fi
    ;;
  pnpm)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(pnpm add $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(pnpm install 2>&1) || EXIT_CODE=$?
    fi
    ;;
  bun)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(bun add $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(bun install 2>&1) || EXIT_CODE=$?
    fi
    ;;
  yarn)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(yarn add $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(yarn install 2>&1) || EXIT_CODE=$?
    fi
    ;;
  pip)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(pip install $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(pip install -r requirements.txt 2>&1) || EXIT_CODE=$?
    fi
    ;;
  poetry)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(poetry add $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(poetry install 2>&1) || EXIT_CODE=$?
    fi
    ;;
  uv)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(uv pip install $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(uv pip install -r requirements.txt 2>&1) || EXIT_CODE=$?
    fi
    ;;
  pipenv)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(pipenv install $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(pipenv install 2>&1) || EXIT_CODE=$?
    fi
    ;;
  cargo)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(cargo add $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT="Cargo: no packages specified, use 'cargo build' to fetch deps"
      EXIT_CODE=0
    fi
    ;;
  go)
    if [[ -n "$PACKAGES" ]]; then
      OUTPUT=$(go get $PACKAGES 2>&1) || EXIT_CODE=$?
    else
      OUTPUT=$(go mod download 2>&1) || EXIT_CODE=$?
    fi
    ;;
  none)
    OUTPUT="No package manager detected in project"
    EXIT_CODE=1
    ;;
esac

###############################################################################
# Detect changed files
###############################################################################

CHANGED_FILES="[]"
FILES=$(git diff --name-only 2>/dev/null || true)
if [[ -n "$FILES" ]]; then
  CHANGED_FILES=$(echo "$FILES" | jq -R -s 'split("\n") | map(select(length > 0))')
fi

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 && "$PKG_MANAGER" != "none" ]] && SUCCESS=false

TRUNCATED_OUTPUT="${OUTPUT:0:4000}"

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "$TRUNCATED_OUTPUT" \
  --argjson files_changed "$CHANGED_FILES" \
  --arg package_manager "$PKG_MANAGER" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: $files_changed,
    package_manager: $package_manager,
    exit_code: $exit_code
  }'
