#!/usr/bin/env bash
# Convert a project spec into parallelizable task list JSON
# Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]
#
# APPROACH: Write full prompt to temp file → $(cat file) inside script -qec
# Python JSON extractor handles nested brackets reliably.

set -euo pipefail

SPEC_INPUT="${1:?Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]}"
OUTPUT="${2:-/tmp/tasks.json}"
PROJECT_DIR="${3:-.}"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
log "📋 Breaking spec into parallelizable tasks..."

mkdir -p "$(dirname "$OUTPUT")"

# Get spec content into a variable
if [[ -f "$SPEC_INPUT" ]]; then
  SPEC_TEXT=$(cat "$SPEC_INPUT")
else
  SPEC_TEXT="$SPEC_INPUT"
fi

# Write the FULL prompt to a temp file using heredoc with QUOTED delimiter
# (quoted delimiter prevents ALL shell expansion during write)
PROMPT_FILE=$(mktemp /tmp/spec-prompt-XXXXX.txt)
cat > "$PROMPT_FILE" << 'SYSTEMEOF'
You are a technical project manager. Break this project spec into parallelizable development tasks.

RULES:
- Each task must be independently implementable (no dependencies between parallel tasks)
- Group related work into single tasks (don't over-split, 2-5 tasks max)
- Assign the best agent type: dev, architect, qa, data-engineer, ux, content-writer, devops
- Each task gets its own git branch
- Output ONLY valid JSON array, nothing else. Start with [ end with ]

OUTPUT FORMAT (strict JSON):
[{"id":"task-1","agent":"dev","prompt":"Detailed instructions...","branch":"feature/task-1-desc","priority":1,"estimated_minutes":15}]

PROJECT SPEC:
SYSTEMEOF

# Append spec text (this CAN have special chars, but it's appended not expanded)
echo "$SPEC_TEXT" >> "$PROMPT_FILE"

# Execute: $(cat file) inside script -qec → Claude reads from expanded arg
log "🧠 Calling Claude to decompose spec..."
RESULT_FILE=$(mktemp /tmp/spec-result-XXXXX.txt)

script -qec "claude --dangerously-skip-permissions --print -p \"\$(cat $PROMPT_FILE)\"" /dev/null > "$RESULT_FILE" 2>/dev/null || true

# Clean ANSI/control characters
CLEAN=$(cat "$RESULT_FILE" | tr -d '\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\][^\x07]*\x07//g' | sed 's/\[<u//g' | sed 's/\[?[0-9]*[a-z]//g')

# Extract JSON array using Python (handles nested brackets)
echo "$CLEAN" | python3 -c "
import sys, json

text = sys.stdin.read()
start = text.find('[')
if start == -1:
    print('[]'); sys.exit(0)

depth = 0
end = -1
for i in range(start, len(text)):
    if text[i] == '[': depth += 1
    elif text[i] == ']':
        depth -= 1
        if depth == 0: end = i + 1; break

if end == -1:
    print('[]'); sys.exit(0)

try:
    parsed = json.loads(text[start:end])
    json.dump(parsed if isinstance(parsed, list) and parsed else [], sys.stdout, indent=2)
except json.JSONDecodeError:
    print('[]')
" > "$OUTPUT"

# Cleanup
rm -f "$PROMPT_FILE" "$RESULT_FILE"

TASK_COUNT=$(jq length "$OUTPUT" 2>/dev/null || echo 0)

if [[ "$TASK_COUNT" -gt 0 ]]; then
  log "✅ Decomposed into $TASK_COUNT tasks → $OUTPUT"
  jq -r '.[] | "  \(.id): [\(.agent)] \(.prompt[:60])..."' "$OUTPUT" 2>/dev/null || true
else
  log "❌ Failed to decompose spec into tasks"
  exit 1
fi
