#!/usr/bin/env bash
# Gate Evaluator — Deterministic handoff validator between agents
# 100% grep/validate — ZERO LLM usage
#
# Usage: gate-evaluator.sh <handoff-file> <gate-type>
# Gate types: brief-to-arch, arch-to-dev, dev-to-qa, qa-verdict
# Output: JSON { "verdict": "APPROVED|NEEDS_REVISION|BLOCKED", "checks": [...], "missing": [...] }

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKLISTS_DIR="$(cd "$SCRIPT_DIR/../checklists" && pwd)"

# ═══════════════════════════════════════════════════════════════════════════════
#                              HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

_json_array() {
  # Converts newline-separated strings to a JSON array
  local items=("$@")
  if [ ${#items[@]} -eq 0 ]; then
    echo "[]"
    return
  fi
  local json="["
  local first=true
  for item in "${items[@]}"; do
    [ "$first" = true ] && first=false || json+=","
    json+="$(printf '%s' "$item" | jq -Rs '.')"
  done
  json+="]"
  echo "$json"
}

_check_result() {
  # Build a single check result JSON object
  local name="$1" passed="$2" severity="$3" message="$4"
  jq -nc \
    --arg name "$name" \
    --argjson passed "$passed" \
    --arg severity "$severity" \
    --arg message "$message" \
    '{name: $name, passed: $passed, severity: $severity, message: $message}'
}

# ═══════════════════════════════════════════════════════════════════════════════
#                         INDIVIDUAL CHECK FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

check_file_exists() {
  local file="$1"
  if [ -f "$file" ] && [ -s "$file" ]; then
    _check_result "file_exists" true "critical" "Handoff file exists and is non-empty"
  else
    _check_result "file_exists" false "critical" "Handoff file missing or empty: $file"
  fi
}

check_has_problem_statement() {
  local file="$1"
  if grep -qiE '(problem|issue|bug|task|objective|goal|description):?' "$file" 2>/dev/null; then
    _check_result "has_problem_statement" true "critical" "Problem statement found"
  else
    _check_result "has_problem_statement" false "critical" "No problem statement found"
  fi
}

check_has_requirements() {
  local file="$1"
  if grep -qiE '(requirement|must|shall|should|need|spec|feature|user stor)' "$file" 2>/dev/null; then
    _check_result "has_requirements" true "required" "Requirements section found"
  else
    _check_result "has_requirements" false "required" "No requirements found"
  fi
}

check_has_constraints() {
  local file="$1"
  if grep -qiE '(constraint|limitation|boundary|scope|out.of.scope|assumption|risk)' "$file" 2>/dev/null; then
    _check_result "has_constraints" true "optional" "Constraints/scope section found"
  else
    _check_result "has_constraints" false "optional" "No constraints/scope section found"
  fi
}

check_has_tech_stack() {
  local file="$1"
  if grep -qiE '(tech.?stack|framework|language|typescript|python|react|node|supabase|postgres|next\.?js|docker)' "$file" 2>/dev/null; then
    _check_result "has_tech_stack" true "required" "Tech stack references found"
  else
    _check_result "has_tech_stack" false "required" "No tech stack defined"
  fi
}

check_has_file_structure() {
  local file="$1"
  if grep -qiE '(file.?structure|directory|folder|src/|lib/|components/|├|└|\.ts|\.js|\.py|\.sh)' "$file" 2>/dev/null; then
    _check_result "has_file_structure" true "required" "File structure references found"
  else
    _check_result "has_file_structure" false "required" "No file structure defined"
  fi
}

check_has_api_contracts() {
  local file="$1"
  if grep -qiE '(api|endpoint|route|GET|POST|PUT|DELETE|graphql|query|mutation|schema|contract|interface)' "$file" 2>/dev/null; then
    _check_result "has_api_contracts" true "optional" "API contract references found"
  else
    _check_result "has_api_contracts" false "optional" "No API contracts documented"
  fi
}

check_has_data_model() {
  local file="$1"
  if grep -qiE '(data.?model|schema|table|entity|field|column|relation|foreign.?key|primary.?key|migration)' "$file" 2>/dev/null; then
    _check_result "has_data_model" true "optional" "Data model references found"
  else
    _check_result "has_data_model" false "optional" "No data model documented"
  fi
}

check_has_implementation() {
  local file="$1"
  if grep -qiE '(implement|creat|modif|add|built|wrote|code|function|class|component|module)' "$file" 2>/dev/null; then
    _check_result "has_implementation" true "critical" "Implementation references found"
  else
    _check_result "has_implementation" false "critical" "No implementation evidence found"
  fi
}

check_files_referenced_exist() {
  # Extract file paths from handoff and check they exist on disk
  local file="$1"
  local project_dir
  project_dir="$(pwd)"

  local missing=0
  local checked=0
  local missing_files=""

  # Extract paths that look like actual file references (containing / and a file extension)
  while IFS= read -r fpath; do
    # Clean up the path
    fpath="$(echo "$fpath" | sed 's/[`'"'"'",;:]//g' | xargs)"
    [ -z "$fpath" ] && continue

    # Resolve relative to project dir
    local full_path
    if [[ "$fpath" = /* ]]; then
      full_path="$fpath"
    else
      full_path="$project_dir/$fpath"
    fi

    checked=$((checked + 1))
    if [ ! -f "$full_path" ]; then
      missing=$((missing + 1))
      missing_files+="$fpath "
    fi
  done < <(grep -oE '[a-zA-Z0-9_./-]+\.[a-z]{1,5}' "$file" 2>/dev/null | grep '/' | sort -u | head -20)

  if [ "$checked" -eq 0 ]; then
    _check_result "files_exist" true "required" "No file paths referenced to validate"
  elif [ "$missing" -eq 0 ]; then
    _check_result "files_exist" true "required" "All $checked referenced files exist"
  else
    _check_result "files_exist" false "required" "$missing of $checked referenced files missing: $missing_files"
  fi
}

check_no_syntax_errors() {
  local file="$1"
  if grep -qiE '(syntax.?error|compile.?error|parse.?error|SyntaxError|TypeError|ReferenceError)' "$file" 2>/dev/null; then
    _check_result "no_syntax_errors" false "critical" "Syntax/compile errors mentioned in handoff"
  else
    _check_result "no_syntax_errors" true "critical" "No syntax errors mentioned"
  fi
}

check_tests_included() {
  local file="$1"
  if grep -qiE '(test|spec|\.test\.|\.spec\.|vitest|jest|pytest|mocha|coverage)' "$file" 2>/dev/null; then
    _check_result "tests_included" true "required" "Test references found"
  else
    _check_result "tests_included" false "required" "No test references found"
  fi
}

check_no_secrets() {
  local file="$1"
  if grep -qiE '(api.?key|secret.?key|password|token|credential).*[=:].*[a-zA-Z0-9]{16,}' "$file" 2>/dev/null; then
    _check_result "no_secrets" false "critical" "Possible hardcoded secrets detected"
  else
    _check_result "no_secrets" true "required" "No hardcoded secrets detected"
  fi
}

check_tests_pass() {
  local file="$1"
  if grep -qiE '(tests?\s+(pass|succeed|green|ok|✓|✅|all\s+pass)|passed\s+\d+|0\s+fail)' "$file" 2>/dev/null; then
    _check_result "tests_pass" true "critical" "Tests reported as passing"
  elif grep -qiE '(tests?\s+(fail|broke|red|✗|❌)|failed\s+\d+|[1-9]\d*\s+fail)' "$file" 2>/dev/null; then
    _check_result "tests_pass" false "critical" "Tests reported as failing"
  else
    _check_result "tests_pass" true "optional" "No explicit test results found (inconclusive)"
  fi
}

check_no_critical_issues() {
  local file="$1"
  if grep -qiE '(critical|blocker|blocked|fatal|crash|data.?loss|security.?vulnerab)' "$file" 2>/dev/null; then
    # Double-check it's not just mentioning the word in context of having none
    if grep -qiE '(no\s+critical|zero\s+critical|0\s+critical|no\s+blocker)' "$file" 2>/dev/null; then
      _check_result "no_critical_issues" true "required" "Critical issues mentioned but reported as resolved"
    else
      _check_result "no_critical_issues" false "required" "Critical/blocking issues mentioned"
    fi
  else
    _check_result "no_critical_issues" true "required" "No critical issues mentioned"
  fi
}

check_has_done_marker() {
  local file="$1"
  if grep -qE '^DONE$' "$file" 2>/dev/null || grep -qiE '(status:\s*done|status:\s*complete|##\s*done|✅\s*done)' "$file" 2>/dev/null; then
    _check_result "has_done_marker" true "critical" "DONE marker found"
  else
    _check_result "has_done_marker" false "critical" "No DONE marker — agent may not have finished"
  fi
}

check_follows_conventions() {
  local file="$1"
  if grep -qiE '(conventional.?commit|commit.*feat|commit.*fix|lint|format|prettier|eslint)' "$file" 2>/dev/null; then
    _check_result "follows_conventions" true "required" "Project conventions referenced"
  else
    _check_result "follows_conventions" false "optional" "No convention references found"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#                         GATE EVALUATION BY TYPE
# ═══════════════════════════════════════════════════════════════════════════════

evaluate_brief_to_arch() {
  local file="$1"
  local checks=()
  checks+=("$(check_file_exists "$file")")
  checks+=("$(check_has_problem_statement "$file")")
  checks+=("$(check_has_requirements "$file")")
  checks+=("$(check_has_constraints "$file")")
  printf '%s\n' "${checks[@]}"
}

evaluate_arch_to_dev() {
  local file="$1"
  local checks=()
  checks+=("$(check_file_exists "$file")")
  checks+=("$(check_has_tech_stack "$file")")
  checks+=("$(check_has_file_structure "$file")")
  checks+=("$(check_has_api_contracts "$file")")
  checks+=("$(check_has_data_model "$file")")
  printf '%s\n' "${checks[@]}"
}

evaluate_dev_to_qa() {
  local file="$1"
  local checks=()
  checks+=("$(check_file_exists "$file")")
  checks+=("$(check_has_implementation "$file")")
  checks+=("$(check_files_referenced_exist "$file")")
  checks+=("$(check_no_syntax_errors "$file")")
  checks+=("$(check_tests_included "$file")")
  checks+=("$(check_no_secrets "$file")")
  checks+=("$(check_has_done_marker "$file")")
  printf '%s\n' "${checks[@]}"
}

evaluate_qa_verdict() {
  local file="$1"
  local checks=()
  checks+=("$(check_file_exists "$file")")
  checks+=("$(check_tests_pass "$file")")
  checks+=("$(check_no_critical_issues "$file")")
  checks+=("$(check_follows_conventions "$file")")
  checks+=("$(check_has_done_marker "$file")")
  printf '%s\n' "${checks[@]}"
}

# ═══════════════════════════════════════════════════════════════════════════════
#                         CHECKLIST EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════

evaluate_checklist() {
  # Parse a checklist .md file and run checks against a handoff file
  local checklist_file="$1"
  local handoff_file="$2"
  local results=()

  if [ ! -f "$checklist_file" ]; then
    echo "[]"
    return
  fi

  # Parse checklist items: - [ ] [severity] description
  while IFS= read -r line; do
    local severity description
    severity="$(echo "$line" | grep -oE '\[(blocker|required|optional)\]' | tr -d '[]')"
    description="$(echo "$line" | sed 's/^-\s*\[[ x]\]\s*\(\[.*\]\)\?\s*//')"

    [ -z "$severity" ] && severity="optional"
    [ -z "$description" ] && continue

    # Map description to a check function
    local passed=true
    local message="Manual check: $description"

    case "$description" in
      *"Requirements document"*|*"requirements"*)
        local r; r="$(check_has_requirements "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"Architecture document"*)
        local r; r="$(check_has_file_structure "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"Tech stack"*)
        local r; r="$(check_has_tech_stack "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"File structure"*)
        local r; r="$(check_has_file_structure "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"API contracts"*)
        local r; r="$(check_has_api_contracts "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"syntax error"*|*"build passes"*)
        local r; r="$(check_no_syntax_errors "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"Tests exist"*|*"tests pass"*|*"All tests"*)
        local r; r="$(check_tests_included "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"hardcoded secrets"*|*"security"*)
        local r; r="$(check_no_secrets "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *"DONE marker"*)
        local r; r="$(check_has_done_marker "$handoff_file")"
        passed="$(echo "$r" | jq -r '.passed')"
        message="$(echo "$r" | jq -r '.message')"
        ;;
      *)
        # Can't evaluate automatically — pass with manual note
        passed=true
        message="Manual verification required: $description"
        ;;
    esac

    results+=("$(_check_result "$description" "$passed" "$severity" "$message")")
  done < <(grep -E '^\s*-\s*\[[ x]\]' "$checklist_file" 2>/dev/null)

  printf '%s\n' "${results[@]}"
}

# ═══════════════════════════════════════════════════════════════════════════════
#                         VERDICT DETERMINATION
# ═══════════════════════════════════════════════════════════════════════════════

determine_verdict() {
  # Reads check results from stdin, determines verdict
  # Returns: APPROVED, NEEDS_REVISION, or BLOCKED
  local checks_json="$1"

  local critical_failures high_failures medium_failures
  critical_failures="$(echo "$checks_json" | jq '[.[] | select(.passed == false and .severity == "critical")] | length')"
  high_failures="$(echo "$checks_json" | jq '[.[] | select(.passed == false and (.severity == "required" or .severity == "high"))] | length')"
  medium_failures="$(echo "$checks_json" | jq '[.[] | select(.passed == false and (.severity == "optional" or .severity == "medium"))] | length')"

  if [ "$critical_failures" -gt 0 ]; then
    echo "BLOCKED"
  elif [ "$high_failures" -gt 0 ]; then
    echo "NEEDS_REVISION"
  else
    echo "APPROVED"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#                              MAIN
# ═══════════════════════════════════════════════════════════════════════════════

usage() {
  cat <<'EOF'
Usage: gate-evaluator.sh <handoff-file> <gate-type> [--checklist <name>]

Gate types:
  brief-to-arch   Validates brief before passing to architect
  arch-to-dev     Validates architecture before passing to developer
  dev-to-qa       Validates development output before QA
  qa-verdict      Validates QA report for final verdict

Options:
  --checklist <name>   Also run a checklist (pre-development, post-development, qa-review)

Output: JSON with verdict, checks array, and missing items
EOF
  exit 1
}

main() {
  [ $# -lt 2 ] && usage

  local handoff_file="$1"
  local gate_type="$2"
  local checklist_name=""

  # Parse optional args
  shift 2
  while [ $# -gt 0 ]; do
    case "$1" in
      --checklist) checklist_name="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  # Validate handoff file
  if [ ! -f "$handoff_file" ]; then
    jq -nc \
      --arg verdict "BLOCKED" \
      --arg gate "$gate_type" \
      '{verdict: $verdict, gate: $gate, checks: [], missing: ["handoff file does not exist"], timestamp: (now | todate)}'
    exit 1
  fi

  # Run gate-specific checks
  local check_lines=""
  case "$gate_type" in
    brief-to-arch) check_lines="$(evaluate_brief_to_arch "$handoff_file")" ;;
    arch-to-dev)   check_lines="$(evaluate_arch_to_dev "$handoff_file")" ;;
    dev-to-qa)     check_lines="$(evaluate_dev_to_qa "$handoff_file")" ;;
    qa-verdict)    check_lines="$(evaluate_qa_verdict "$handoff_file")" ;;
    *)
      echo "ERROR: Unknown gate type: $gate_type" >&2
      usage
      ;;
  esac

  # Also run checklist if specified
  if [ -n "$checklist_name" ]; then
    local cl_file="$CHECKLISTS_DIR/${checklist_name}.md"
    if [ -f "$cl_file" ]; then
      local cl_lines
      cl_lines="$(evaluate_checklist "$cl_file" "$handoff_file")"
      if [ -n "$cl_lines" ]; then
        check_lines="$check_lines"$'\n'"$cl_lines"
      fi
    fi
  fi

  # Build checks JSON array
  local checks_json
  checks_json="$(echo "$check_lines" | jq -s '.')"

  # Determine verdict
  local verdict
  verdict="$(determine_verdict "$checks_json")"

  # Collect missing items (failed checks)
  local missing_json
  missing_json="$(echo "$checks_json" | jq '[.[] | select(.passed == false) | .message]')"

  # Build final output
  jq -nc \
    --arg verdict "$verdict" \
    --arg gate "$gate_type" \
    --argjson checks "$checks_json" \
    --argjson missing "$missing_json" \
    '{
      verdict: $verdict,
      gate: $gate,
      checks: $checks,
      missing: $missing,
      total_checks: ($checks | length),
      passed: ([$checks[] | select(.passed == true)] | length),
      failed: ([$checks[] | select(.passed == false)] | length),
      timestamp: (now | todate)
    }'
}

main "$@"
