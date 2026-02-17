#!/usr/bin/env bash
set -euo pipefail

# Task Classifier — Deterministic keyword/regex scoring
# Usage: task-classifier.sh "<task description>"
# Output: JSON { complexity, type, executor, agent, confidence }

TASK="${1:-}"

if [[ -z "$TASK" ]]; then
  echo '{"error":"No task description provided","usage":"task-classifier.sh \"<task description>\""}' | jq .
  exit 1
fi

TASK_LOWER="$(echo "$TASK" | tr '[:upper:]' '[:lower:]')"

###############################################################################
# Complexity scoring — keyword + regex pattern matching
###############################################################################

score_simple=0
score_medium=0
score_complex=0

# --- Simple keywords (weight 1 each) ---
for kw in "fix typo" "rename" "lint" "format" "install" "update version" \
          "add import" "remove import" "fix import" "quick fix" "minor" \
          "simple" "quick" "bump" "upgrade dep" "delete file" "move file" \
          "run tests" "run test" "run lint" "run build" "run format" \
          "commit" "push" "cherry-pick"; do
  if [[ "$TASK_LOWER" == *"$kw"* ]]; then
    score_simple=$((score_simple + 1))
  fi
done

# Simple regex patterns (weight 2 each)
simple_patterns=(
  'fix[[:space:]]+import'
  'update[[:space:]]+version'
  'rename[[:space:]]+'
  'add[[:space:]]+console'
  'remove[[:space:]]+unused'
  'fix[[:space:]]+typo'
  'change[[:space:]]+name'
  'bump[[:space:]]+to'
  'run[[:space:]]+(tests?|lint|build|format)'
)
for pat in "${simple_patterns[@]}"; do
  if echo "$TASK_LOWER" | grep -qiE "$pat"; then
    score_simple=$((score_simple + 2))
  fi
done

# --- Medium keywords (weight 1 each) ---
for kw in "implement" "create" "build" "add feature" "refactor" "modify" "update" \
          "add function" "add method" "add endpoint" "add page" "add route" \
          "add component" "add hook" "add test" "add api" "write" "extend" \
          "improve" "enhance" "add validation" "add handler"; do
  if [[ "$TASK_LOWER" == *"$kw"* ]]; then
    score_medium=$((score_medium + 1))
  fi
done

# Medium regex patterns (weight 2 each)
medium_patterns=(
  'create[[:space:]]+component'
  'implement[[:space:]]+[a-z]+'
  'add[[:space:]]+function'
  'add[[:space:]]+feature'
  'refactor[[:space:]]+[a-z]+'
  'write[[:space:]]+test'
  'add[[:space:]]+endpoint'
  'create[[:space:]]+page'
)
for pat in "${medium_patterns[@]}"; do
  if echo "$TASK_LOWER" | grep -qiE "$pat"; then
    score_medium=$((score_medium + 2))
  fi
done

# --- Complex keywords (weight 1 each) ---
for kw in "architecture" "design system" "security" "migrate" "full" \
          "projeto" "sistema" "integration" "optimize" "performance" \
          "complex" "overhaul" "rewrite" "rebuild" "multi" "pipeline" \
          "ci/cd" "infrastructure" "database design" "auth system" \
          "build.*app" "full stack" "end to end"; do
  if [[ "$TASK_LOWER" == *"$kw"* ]]; then
    score_complex=$((score_complex + 1))
  fi
done

# Complex regex patterns (weight 2 each)
complex_patterns=(
  'design[[:space:]]+system'
  'security[[:space:]]+review'
  'build[[:space:]]+.*app'
  'architect'
  'full[[:space:]]+stack'
  'migrate[[:space:]]+from'
  'end[[:space:]]+to[[:space:]]+end'
  'set[[:space:]]+up[[:space:]]+ci'
  'deploy[[:space:]]+to[[:space:]]+'
)
for pat in "${complex_patterns[@]}"; do
  if echo "$TASK_LOWER" | grep -qiE "$pat"; then
    score_complex=$((score_complex + 2))
  fi
done

###############################################################################
# Determine complexity level (AIOS weighted-score approach)
###############################################################################

total=$((score_simple + score_medium + score_complex))

if [[ $total -eq 0 ]]; then
  # No signals — default to medium with low confidence
  complexity="medium"
  confidence="0.20"
else
  # Weighted score: simple=0, medium=0.5, complex=1
  # Using integer math × 100 for precision
  weighted=$(( score_simple * 0 + score_medium * 50 + score_complex * 100 ))
  normalized=$(( weighted / total ))

  if [[ $normalized -lt 30 ]]; then
    complexity="simple"
  elif [[ $normalized -gt 70 ]]; then
    complexity="complex"
  else
    complexity="medium"
  fi

  # Confidence = max(scores) / total
  max_score=$score_simple
  [[ $score_medium -gt $max_score ]] && max_score=$score_medium
  [[ $score_complex -gt $max_score ]] && max_score=$score_complex
  confidence=$(awk "BEGIN {printf \"%.2f\", $max_score / $total}")
fi

###############################################################################
# Executor mapping
###############################################################################

case "$complexity" in
  simple)  executor="worker" ;;
  medium)  executor="single-agent" ;;
  complex) executor="multi-agent" ;;
esac

###############################################################################
# Task type detection (keyword-based)
###############################################################################

task_type="code"  # default

type_scores_db=0; type_scores_api=0; type_scores_test=0; type_scores_deploy=0
type_scores_arch=0; type_scores_docs=0; type_scores_ui=0; type_scores_seo=0
type_scores_plan=0

for kw in "database" "migration" "schema" "rls" "sql" "table" "supabase" "prisma"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_db=$((type_scores_db + 1))
done
for kw in "api" "backend" "feature" "endpoint" "crud" "server" "route" "handler" "rest" "auth" "middleware" "express" "fastapi" "flask" "nest"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_api=$((type_scores_api + 1))
done
for kw in "test" "review" "qa" "coverage" "spec" "assert" "mock"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_test=$((type_scores_test + 1))
done
for kw in "deploy" "ci" "cd" "docker" "infra" "kubernetes" "nginx" "pipeline"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_deploy=$((type_scores_deploy + 1))
done
for kw in "architecture" "design" "system" "architect" "pattern"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_arch=$((type_scores_arch + 1))
done
for kw in "docs" "documentation" "readme" "jsdoc" "comment" "changelog"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_docs=$((type_scores_docs + 1))
done
for kw in "ui" "frontend" "component" "css" "style" "tailwind" "react" "page" "layout"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_ui=$((type_scores_ui + 1))
done
for kw in "seo" "analytics" "growth" "meta tag" "sitemap" "lighthouse"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_seo=$((type_scores_seo + 1))
done
for kw in "planning" "prd" "strategy" "roadmap" "scope" "requirement"; do
  [[ "$TASK_LOWER" == *"$kw"* ]] && type_scores_plan=$((type_scores_plan + 1))
done

# Find highest type score
max_type_score=0
declare -A type_map=(
  [db]=$type_scores_db [api]=$type_scores_api [test]=$type_scores_test
  [deploy]=$type_scores_deploy [arch]=$type_scores_arch [docs]=$type_scores_docs
  [ui]=$type_scores_ui [seo]=$type_scores_seo [plan]=$type_scores_plan
)
winner="api"
for key in "${!type_map[@]}"; do
  if [[ ${type_map[$key]} -gt $max_type_score ]]; then
    max_type_score=${type_map[$key]}
    winner="$key"
  fi
done

case "$winner" in
  db)     task_type="data" ;;
  api)    task_type="code" ;;
  test)   task_type="test" ;;
  deploy) task_type="deploy" ;;
  arch)   task_type="design" ;;
  docs)   task_type="docs" ;;
  ui)     task_type="code" ;;
  seo)    task_type="analysis" ;;
  plan)   task_type="design" ;;
esac

###############################################################################
# Agent mapping
###############################################################################

case "$winner" in
  db)     agent="@data-engineer" ;;
  api)    agent="@dev" ;;
  test)   agent="@qa" ;;
  deploy) agent="@devops" ;;
  arch)   agent="@architect" ;;
  docs)   agent="@content-writer" ;;
  ui)     agent="@ux @dev" ;;
  seo)    agent="@seo-analyst" ;;
  plan)   agent="@pm" ;;
  *)      agent="@dev" ;;
esac

###############################################################################
# Worker matching (for simple tasks)
###############################################################################

worker=""
if [[ "$complexity" == "simple" ]]; then
  WORKER_DIR="$(cd "$(dirname "$0")/../workers" 2>/dev/null && pwd)" || true
  REGISTRY="${WORKER_DIR}/registry.json"

  if [[ -f "$REGISTRY" ]]; then
    worker_keys=$(jq -r '.workers | keys[]' "$REGISTRY" 2>/dev/null || true)
    for wk in $worker_keys; do
      triggers=$(jq -r ".workers[\"$wk\"].triggers[]" "$REGISTRY" 2>/dev/null || true)
      for trigger in $triggers; do
        if [[ "$TASK_LOWER" == *"$trigger"* ]]; then
          worker="$wk"
          break 2
        fi
      done
    done
  fi
fi

###############################################################################
# Output JSON
###############################################################################

jq -n \
  --arg complexity "$complexity" \
  --arg type "$task_type" \
  --arg executor "$executor" \
  --arg agent "$agent" \
  --arg confidence "$confidence" \
  --arg worker "$worker" \
  --argjson score_simple "$score_simple" \
  --argjson score_medium "$score_medium" \
  --argjson score_complex "$score_complex" \
  '{
    complexity: $complexity,
    type: $type,
    executor: $executor,
    agent: $agent,
    confidence: ($confidence | tonumber),
    worker: (if $worker == "" then null else $worker end),
    scores: {
      simple: $score_simple,
      medium: $score_medium,
      complex: $score_complex
    }
  }'
