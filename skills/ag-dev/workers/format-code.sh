#!/usr/bin/env bash
set -euo pipefail

# Worker: format-code — Detect formatter, run format, report changes
# Usage: format-code.sh <project_dir> [extra_args...]
# Output: JSON { success, output, files_changed, formatter }

PROJECT_DIR="${1:-.}"
shift || true
EXTRA_ARGS="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect formatter
###############################################################################

detect_formatter() {
  # Node/JS ecosystem
  if [[ -f "package.json" ]]; then
    if [[ -f "biome.json" || -f "biome.jsonc" ]] || jq -e '.devDependencies["@biomejs/biome"] // .dependencies["@biomejs/biome"]' package.json &>/dev/null; then
      echo "biome"; return
    fi
    if [[ -f ".prettierrc" || -f ".prettierrc.js" || -f ".prettierrc.json" || -f ".prettierrc.yml" || -f ".prettierrc.cjs" || -f "prettier.config.js" || -f "prettier.config.cjs" ]] || jq -e '.devDependencies.prettier // .dependencies.prettier' package.json &>/dev/null; then
      echo "prettier"; return
    fi
    # Check for format script
    fmt_script=$(jq -r '.scripts.format // ""' package.json 2>/dev/null)
    if [[ -n "$fmt_script" && "$fmt_script" != "null" ]]; then
      echo "npm-format"; return
    fi
  fi
  # Python
  if [[ -f "pyproject.toml" || -f "setup.py" || -f "requirements.txt" ]]; then
    if command -v ruff &>/dev/null; then echo "ruff"; return; fi
    if command -v black &>/dev/null; then echo "black"; return; fi
    if command -v autopep8 &>/dev/null; then echo "autopep8"; return; fi
  fi
  # Rust
  if [[ -f "Cargo.toml" ]]; then echo "rustfmt"; return; fi
  # Go
  if [[ -f "go.mod" ]]; then echo "gofmt"; return; fi
  # Deno
  if [[ -f "deno.json" || -f "deno.jsonc" ]]; then echo "deno-fmt"; return; fi
  echo "none"
}

FORMATTER=$(detect_formatter)

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
# Snapshot files before formatting
###############################################################################

FILES_BEFORE=$(git diff --name-only 2>/dev/null || true)

###############################################################################
# Run formatter
###############################################################################

OUTPUT=""
EXIT_CODE=0

case "$FORMATTER" in
  prettier)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER prettier --write ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  biome)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER biome format --write ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  npm-format)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER run format $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  black)
    OUTPUT=$(black ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  ruff)
    OUTPUT=$(ruff format ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  autopep8)
    OUTPUT=$(autopep8 --in-place --recursive ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  rustfmt)
    OUTPUT=$(cargo fmt $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  gofmt)
    OUTPUT=$(gofmt -w ${EXTRA_ARGS:-.} 2>&1) || EXIT_CODE=$?
    ;;
  deno-fmt)
    OUTPUT=$(deno fmt $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  none)
    OUTPUT="No formatter detected in project"
    EXIT_CODE=1
    ;;
esac

###############################################################################
# Detect changed files
###############################################################################

FILES_AFTER=$(git diff --name-only 2>/dev/null || true)

CHANGED_FILES="[]"
if [[ -n "$FILES_AFTER" ]]; then
  CHANGED_FILES=$(echo "$FILES_AFTER" | jq -R -s 'split("\n") | map(select(length > 0))')
fi

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 && "$FORMATTER" != "none" ]] && SUCCESS=false

TRUNCATED_OUTPUT="${OUTPUT:0:4000}"

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "$TRUNCATED_OUTPUT" \
  --argjson files_changed "$CHANGED_FILES" \
  --arg formatter "$FORMATTER" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: $files_changed,
    formatter: $formatter,
    exit_code: $exit_code
  }'
