#!/usr/bin/env bash
# Convert a project spec into parallelizable task list JSON
# Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]
#
# Output: JSON array of tasks suitable for parallel-dispatch.sh

set -euo pipefail

SPEC_INPUT="${1:?Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]}"
OUTPUT="${2:-/tmp/tasks.json}"
PROJECT_DIR="${3:-.}"

# Read spec from file or use as text
if [[ -f "$SPEC_INPUT" ]]; then
  SPEC=$(cat "$SPEC_INPUT")
else
  SPEC="$SPEC_INPUT"
fi

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
log "📋 Breaking spec into parallelizable tasks..."

# Use Claude to decompose the spec
PROMPT="You are a technical project manager. Break this project spec into parallelizable development tasks.

RULES:
- Each task must be independently implementable (no dependencies between parallel tasks)
- Group related work into single tasks (don't over-split)
- Assign the best agent type: dev, architect, qa, data-engineer, ux, content-writer, devops
- Each task gets its own git branch
- Output ONLY valid JSON, no markdown fences, no explanation

OUTPUT FORMAT (JSON array):
[
  {
    \"id\": \"task-1\",
    \"agent\": \"dev\",
    \"prompt\": \"Detailed implementation instructions...\",
    \"branch\": \"feature/task-1-short-desc\",
    \"priority\": 1,
    \"estimated_minutes\": 15
  }
]

PROJECT SPEC:
$SPEC"

# Use claude --print for pure text generation (no tools needed)
RESULT=$(claude --print "$PROMPT" 2>/dev/null)

# Extract JSON from response (handle potential markdown wrapping)
echo "$RESULT" | sed -n '/^\[/,/^\]/p' > "$OUTPUT" 2>/dev/null || echo "$RESULT" > "$OUTPUT"

# Validate JSON
if jq empty "$OUTPUT" 2>/dev/null; then
  TASK_COUNT=$(jq length "$OUTPUT")
  log "✅ Generated $TASK_COUNT tasks → $OUTPUT"
  jq -r '.[] | "  \(.id) [\(.agent)] \(.prompt | .[0:60])..."' "$OUTPUT"
else
  log "❌ Failed to generate valid JSON. Raw output saved to $OUTPUT"
  exit 1
fi
