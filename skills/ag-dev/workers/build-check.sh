#!/usr/bin/env bash
set -euo pipefail

# Worker: build-check — Detect build tool, run build, report errors
# Usage: build-check.sh <project_dir> [extra_args...]
# Output: JSON { success, output, files_changed, build_tool }

PROJECT_DIR="${1:-.}"
shift || true
EXTRA_ARGS="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect build tool
###############################################################################

detect_build_tool() {
  if [[ -f "package.json" ]]; then
    # Check for specific build tools
    if [[ -f "next.config.js" || -f "next.config.mjs" || -f "next.config.ts" ]]; then
      echo "next"; return
    fi
    if [[ -f "vite.config.ts" || -f "vite.config.js" ]]; then
      echo "vite"; return
    fi
    if [[ -f "tsconfig.json" ]]; then
      echo "tsc"; return
    fi
    # Fallback to npm build script
    build_script=$(jq -r '.scripts.build // ""' package.json 2>/dev/null)
    if [[ -n "$build_script" && "$build_script" != "null" ]]; then
      echo "npm-build"; return
    fi
  fi
  if [[ -f "Cargo.toml" ]]; then
    echo "cargo"; return
  fi
  if [[ -f "go.mod" ]]; then
    echo "go"; return
  fi
  if [[ -f "Makefile" ]]; then
    echo "make"; return
  fi
  if [[ -f "pyproject.toml" ]]; then
    echo "python-build"; return
  fi
  echo "none"
}

BUILD_TOOL=$(detect_build_tool)

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
# Run build
###############################################################################

OUTPUT=""
EXIT_CODE=0

case "$BUILD_TOOL" in
  next)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER next build $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  vite)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER vite build $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  tsc)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER tsc --noEmit $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  npm-build)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER run build $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  cargo)
    OUTPUT=$(cargo build $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  go)
    OUTPUT=$(go build ./... $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  make)
    OUTPUT=$(make $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  python-build)
    OUTPUT=$(python -m build $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  none)
    OUTPUT="No build tool detected in project"
    EXIT_CODE=1
    ;;
esac

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 && "$BUILD_TOOL" != "none" ]] && SUCCESS=false

TRUNCATED_OUTPUT="${OUTPUT:0:4000}"

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "$TRUNCATED_OUTPUT" \
  --arg build_tool "$BUILD_TOOL" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: [],
    build_tool: $build_tool,
    exit_code: $exit_code
  }'
