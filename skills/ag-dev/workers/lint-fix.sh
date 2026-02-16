#!/usr/bin/env bash
set -euo pipefail

# Worker: lint-fix — Detect linter, run auto-fix, report
# Usage: lint-fix.sh <project_dir> [extra_args...]
# Output: JSON { success, output, files_changed }

PROJECT_DIR="${1:-.}"
shift || true
EXTRA_ARGS="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect project type and linter
###############################################################################

detect_linter() {
  # Node/JS ecosystem
  if [[ -f "package.json" ]]; then
    if [[ -f ".eslintrc" || -f ".eslintrc.js" || -f ".eslintrc.json" || -f ".eslintrc.yml" || -f ".eslintrc.cjs" || -f "eslint.config.js" || -f "eslint.config.mjs" || -f "eslint.config.ts" ]]; then
      echo "eslint"
      return
    fi
    if jq -e '.devDependencies.eslint // .dependencies.eslint // .devDependencies.biome // .dependencies.biome' package.json &>/dev/null; then
      if jq -e '.devDependencies.biome // .dependencies.biome' package.json &>/dev/null || [[ -f "biome.json" ]]; then
        echo "biome"
        return
      fi
      echo "eslint"
      return
    fi
  fi
  # Python
  if [[ -f "pyproject.toml" || -f "setup.py" || -f "requirements.txt" ]]; then
    if command -v ruff &>/dev/null; then
      echo "ruff"
      return
    fi
    if command -v flake8 &>/dev/null; then
      echo "flake8"
      return
    fi
    if command -v pylint &>/dev/null; then
      echo "pylint"
      return
    fi
  fi
  # Rust
  if [[ -f "Cargo.toml" ]]; then
    echo "clippy"
    return
  fi
  # Go
  if [[ -f "go.mod" ]]; then
    echo "golangci-lint"
    return
  fi
  echo "none"
}

LINTER=$(detect_linter)

###############################################################################
# Detect package runner
###############################################################################

pkg_runner() {
  if [[ -f "pnpm-lock.yaml" ]]; then echo "pnpm"
  elif [[ -f "bun.lockb" || -f "bun.lock" ]]; then echo "bun"
  elif [[ -f "yarn.lock" ]]; then echo "yarn"
  else echo "npx"
  fi
}

###############################################################################
# Run linter with auto-fix
###############################################################################

OUTPUT=""
EXIT_CODE=0
FILES_BEFORE=$(git diff --name-only 2>/dev/null || true)

case "$LINTER" in
  eslint)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER eslint --fix ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  biome)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER biome check --write ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  ruff)
    OUTPUT=$(ruff check --fix ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  flake8)
    OUTPUT=$(flake8 ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  pylint)
    OUTPUT=$(pylint ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  clippy)
    OUTPUT=$(cargo clippy --fix --allow-dirty ${EXTRA_ARGS} 2>&1) || EXIT_CODE=$?
    ;;
  golangci-lint)
    OUTPUT=$(golangci-lint run --fix ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  none)
    OUTPUT="No linter detected in project"
    EXIT_CODE=1
    ;;
esac

FILES_AFTER=$(git diff --name-only 2>/dev/null || true)

# Compute changed files
CHANGED_FILES="[]"
if [[ -n "$FILES_AFTER" ]]; then
  CHANGED_FILES=$(echo "$FILES_AFTER" | jq -R -s 'split("\n") | map(select(length > 0))')
fi

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 && "$LINTER" != "none" ]] && SUCCESS=false

# Truncate output to 4000 chars to keep JSON manageable
TRUNCATED_OUTPUT="${OUTPUT:0:4000}"

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "$TRUNCATED_OUTPUT" \
  --argjson files_changed "$CHANGED_FILES" \
  --arg linter "$LINTER" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: $files_changed,
    linter: $linter,
    exit_code: $exit_code
  }'
