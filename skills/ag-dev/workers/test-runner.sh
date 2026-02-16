#!/usr/bin/env bash
set -euo pipefail

# Worker: test-runner — Detect test framework, run, capture output + coverage
# Usage: test-runner.sh <project_dir> [extra_args...]
# Output: JSON { success, output, files_changed, framework, coverage }

PROJECT_DIR="${1:-.}"
shift || true
EXTRA_ARGS="${*:-}"

cd "$PROJECT_DIR"

###############################################################################
# Auto-detect test framework
###############################################################################

detect_test_framework() {
  # Node/JS ecosystem
  if [[ -f "package.json" ]]; then
    if [[ -f "vitest.config.ts" || -f "vitest.config.js" ]] || jq -e '.devDependencies.vitest // .dependencies.vitest' package.json &>/dev/null; then
      echo "vitest"; return
    fi
    if [[ -f "jest.config.js" || -f "jest.config.ts" || -f "jest.config.cjs" ]] || jq -e '.devDependencies.jest // .dependencies.jest' package.json &>/dev/null; then
      echo "jest"; return
    fi
    if jq -e '.devDependencies.mocha // .dependencies.mocha' package.json &>/dev/null; then
      echo "mocha"; return
    fi
    # Check scripts.test in package.json
    test_script=$(jq -r '.scripts.test // ""' package.json 2>/dev/null)
    if [[ -n "$test_script" && "$test_script" != "null" ]]; then
      echo "npm-test"; return
    fi
  fi
  # Python
  if [[ -f "pyproject.toml" || -f "setup.py" || -f "requirements.txt" ]]; then
    if command -v pytest &>/dev/null || [[ -f "pytest.ini" || -f "pyproject.toml" ]]; then
      echo "pytest"; return
    fi
    echo "unittest"; return
  fi
  # Rust
  if [[ -f "Cargo.toml" ]]; then
    echo "cargo-test"; return
  fi
  # Go
  if [[ -f "go.mod" ]]; then
    echo "go-test"; return
  fi
  echo "none"
}

FRAMEWORK=$(detect_test_framework)

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
# Run tests
###############################################################################

OUTPUT=""
EXIT_CODE=0
COVERAGE=""

case "$FRAMEWORK" in
  vitest)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER vitest run --reporter=verbose $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    # Try coverage
    COVERAGE=$($RUNNER vitest run --coverage --reporter=verbose $EXTRA_ARGS 2>&1 | grep -E "^(All files|Statements|Branches|Functions|Lines)" || true)
    ;;
  jest)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER jest --verbose $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    COVERAGE=$(echo "$OUTPUT" | grep -E "^(Statements|Branches|Functions|Lines)" || true)
    ;;
  mocha)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER mocha $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  npm-test)
    RUNNER=$(pkg_runner)
    OUTPUT=$($RUNNER run test $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  pytest)
    OUTPUT=$(python -m pytest -v $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    COVERAGE=$(python -m pytest --cov $EXTRA_ARGS 2>&1 | grep -E "^(TOTAL|Name)" || true)
    ;;
  unittest)
    OUTPUT=$(python -m unittest discover -v $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  cargo-test)
    OUTPUT=$(cargo test $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    ;;
  go-test)
    OUTPUT=$(go test -v ./... $EXTRA_ARGS 2>&1) || EXIT_CODE=$?
    COVERAGE=$(go test -cover ./... 2>&1 | grep "coverage:" || true)
    ;;
  none)
    OUTPUT="No test framework detected in project"
    EXIT_CODE=1
    ;;
esac

###############################################################################
# Output JSON
###############################################################################

SUCCESS=true
[[ $EXIT_CODE -ne 0 && "$FRAMEWORK" != "none" ]] && SUCCESS=false

# Truncate output
TRUNCATED_OUTPUT="${OUTPUT:0:4000}"
COVERAGE="${COVERAGE:0:1000}"

jq -n \
  --argjson success "$SUCCESS" \
  --arg output "$TRUNCATED_OUTPUT" \
  --arg framework "$FRAMEWORK" \
  --arg coverage "$COVERAGE" \
  --argjson exit_code "$EXIT_CODE" \
  '{
    success: $success,
    output: $output,
    files_changed: [],
    framework: $framework,
    coverage: (if $coverage == "" then null else $coverage end),
    exit_code: $exit_code
  }'
