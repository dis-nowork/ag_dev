#!/usr/bin/env bash
# Convert a project spec into parallelizable task list JSON
# Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]
#
# FIXES (2026-02-16):
#   - Prompt via temp file + stdin pipe (no shell expansion)
#   - PTY via script -qec
#   - --dangerously-skip-permissions
#   - Python JSON extractor handles nested brackets
#   - Robust ANSI/control char cleanup

set -euo pipefail

SPEC_INPUT="${1:?Usage: spec-to-tasks.sh <spec_file_or_text> [output_json] [project_dir]}"
OUTPUT="${2:-/tmp/tasks.json}"
PROJECT_DIR="${3:-.}"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }
log "📋 Breaking spec into parallelizable tasks..."

mkdir -p "$(dirname "$OUTPUT")"

# Get spec content
if [[ -f "$SPEC_INPUT" ]]; then
  SPEC_CONTENT="$SPEC_INPUT"  # It's a file path
else
  # Write text to temp file
  SPEC_CONTENT=$(mktemp /tmp/spec-content-XXXXX.txt)
  echo "$SPEC_INPUT" > "$SPEC_CONTENT"
fi

# Write the FULL prompt to a temp file (NEVER expand in shell)
PROMPT_FILE=$(mktemp /tmp/spec-prompt-XXXXX.txt)
cat > "$PROMPT_FILE" << 'PROMPTEOF'
You are a technical project manager. Break this project spec into parallelizable development tasks.

RULES:
- Each task must be independently implementable (no dependencies between parallel tasks)
- Group related work into single tasks (don't over-split, 2-5 tasks max)
- Assign the best agent type: dev, architect, qa, data-engineer, ux, content-writer, devops
- Each task gets its own git branch
- Output ONLY valid JSON array, nothing else. Start with [ end with ]

OUTPUT FORMAT (strict):
[{"id":"task-1","agent":"dev","prompt":"Detailed instructions...","branch":"feature/task-1-desc","priority":1,"estimated_minutes":15}]

PROJECT SPEC:
PROMPTEOF

# Append the actual spec content
cat "$SPEC_CONTENT" >> "$PROMPT_FILE"

# Execute Claude via stdin pipe + PTY wrapper
RESULT_FILE=$(mktemp /tmp/spec-result-XXXXX.txt)

log "🧠 Calling Claude to decompose spec..."
cat "$PROMPT_FILE" | script -qec "claude --dangerously-skip-permissions --print -p -" /dev/null > "$RESULT_FILE" 2>/dev/null || true

# Clean ANSI/control characters
CLEAN_FILE=$(mktemp /tmp/spec-clean-XXXXX.txt)
cat "$RESULT_FILE" | tr -d '\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' | sed 's/\x1b\][^\x07]*\x07//g' | sed 's/\x1b[^[a-zA-Z]//g' > "$CLEAN_FILE"

# Extract JSON array using Python (handles nested brackets reliably)
python3 -c "
import sys, json

text = open('$CLEAN_FILE').read()

# Find the outermost [...] in the text
start = text.find('[')
if start == -1:
    print('[]')
    sys.exit(0)

depth = 0
end = -1
for i in range(start, len(text)):
    if text[i] == '[':
        depth += 1
    elif text[i] == ']':
        depth -= 1
        if depth == 0:
            end = i + 1
            break

if end == -1:
    print('[]')
    sys.exit(0)

candidate = text[start:end]
try:
    parsed = json.loads(candidate)
    if isinstance(parsed, list) and len(parsed) > 0:
        json.dump(parsed, sys.stdout, indent=2)
    else:
        print('[]')
except json.JSONDecodeError:
    print('[]')
" > "$OUTPUT"

# Cleanup temp files
rm -f "$PROMPT_FILE" "$RESULT_FILE" "$CLEAN_FILE"
[[ -f "$SPEC_CONTENT" && "$SPEC_CONTENT" == /tmp/* ]] && rm -f "$SPEC_CONTENT"

TASK_COUNT=$(jq length "$OUTPUT" 2>/dev/null || echo 0)

if [[ "$TASK_COUNT" -gt 0 ]]; then
  log "✅ Decomposed into $TASK_COUNT tasks → $OUTPUT"
  jq -r '.[] | "  \(.id): [\(.agent)] \(.prompt[:60])..."' "$OUTPUT" 2>/dev/null || true
else
  log "❌ Failed to decompose spec into tasks"
  log "Raw output:"
  cat "$CLEAN_FILE" 2>/dev/null | head -20
  exit 1
fi
