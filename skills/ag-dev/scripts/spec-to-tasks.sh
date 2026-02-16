#!/usr/bin/env bash
# Convert a project spec into parallelizable task list JSON
# Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]
#
# Output: JSON array of tasks suitable for parallel-dispatch.sh
# Requires: claude CLI (Claude Code), jq

set -euo pipefail

SPEC_INPUT="${1:?Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]}"
OUTPUT="${2:-/tmp/tasks.json}"
PROJECT_DIR="${3:-.}"

if [[ -f "$SPEC_INPUT" ]]; then
  SPEC=$(cat "$SPEC_INPUT")
else
  SPEC="$SPEC_INPUT"
fi

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
log "📋 Breaking spec into parallelizable tasks..."

mkdir -p "$(dirname "$OUTPUT")"

# Build the full prompt
FULL_PROMPT="You are a technical project manager. Break this project spec into parallelizable development tasks.

RULES:
- Each task must be independently implementable (no dependencies between parallel tasks)
- Group related work into single tasks (don't over-split, 2-5 tasks max)
- Assign the best agent type: dev, architect, qa, data-engineer, ux, content-writer, devops
- Each task gets its own git branch
- Output ONLY valid JSON array, nothing else. Start with [ end with ]

OUTPUT FORMAT (strict):
[{\"id\":\"task-1\",\"agent\":\"dev\",\"prompt\":\"Detailed instructions...\",\"branch\":\"feature/task-1-desc\",\"priority\":1,\"estimated_minutes\":15}]

PROJECT SPEC:
$SPEC"

# Claude Code CLI requires a PTY — write a runner script to avoid quoting hell
RUNNER=$(mktemp /tmp/claude-runner-XXXXX.sh)
PROMPT_FILE=$(mktemp /tmp/claude-prompt-XXXXX.txt)
RESULT_FILE=$(mktemp /tmp/claude-result-XXXXX.txt)

echo "$FULL_PROMPT" > "$PROMPT_FILE"

cat > "$RUNNER" << 'EOF'
#!/bin/bash
PROMPT=$(cat "$1")
claude -p "$PROMPT" --output-format text 2>/dev/null
EOF
chmod +x "$RUNNER"

# Execute with PTY wrapper
script -qc "bash $RUNNER $PROMPT_FILE" /dev/null > "$RESULT_FILE" 2>/dev/null || true

# Clean control characters and extract JSON
CLEAN=$(cat "$RESULT_FILE" | tr -d '\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\][0-9;]*//g' | sed 's/\[<u//g' | sed 's/\[?[0-9]*[a-z]//g')
rm -f "$RUNNER" "$PROMPT_FILE" "$RESULT_FILE"

# Extract JSON array — use python for reliable JSON extraction
python3 -c "
import json, sys
text = sys.stdin.read()
# Find the first [ and matching ]
start = text.find('[')
if start == -1:
    sys.exit(1)
depth = 0
for i in range(start, len(text)):
    if text[i] == '[': depth += 1
    elif text[i] == ']': depth -= 1
    if depth == 0:
        try:
            data = json.loads(text[start:i+1])
            json.dump(data, open('$OUTPUT', 'w'), indent=2)
            sys.exit(0)
        except json.JSONDecodeError:
            sys.exit(1)
sys.exit(1)
" <<< "$CLEAN"

# Validate JSON
if jq empty "$OUTPUT" 2>/dev/null && [[ $(jq length "$OUTPUT") -gt 0 ]]; then
  TASK_COUNT=$(jq length "$OUTPUT")
  log "✅ Generated $TASK_COUNT tasks → $OUTPUT"
  jq -r '.[] | "  \(.id) [\(.agent)] \(.prompt | .[0:60])..."' "$OUTPUT" 2>/dev/null || \
  jq -r '.[] | "  \(.id // .title) [\(.agent // "dev")] \(.prompt // .description | .[0:60])..."' "$OUTPUT"
else
  log "❌ Failed to generate valid JSON"
  cat "$OUTPUT" 2>/dev/null | head -10
  exit 1
fi
