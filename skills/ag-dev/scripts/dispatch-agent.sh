#!/usr/bin/env bash
# Dispatch a task to an AG Dev agent via Claude Code CLI
# Usage: dispatch-agent.sh <socket> <agent_name> <project_dir> <task_prompt> [--print]
#
# APPROACH: Prompt → heredoc to temp file → $(cat file) inside script -qec
# This avoids shell expansion issues while maintaining PTY support.

set -euo pipefail

SOCKET="${1:?Usage: dispatch-agent.sh <socket> <agent> <project_dir> <task_prompt> [--print]}"
AGENT="${2:?}"
PROJECT_DIR="${3:?}"
TASK_PROMPT="${4:?}"
MODE="${5:-}"

SESSION="agent-$AGENT"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"

mkdir -p "$HANDOFF_DIR"

# Write task file for the agent (details go here, not in CLI prompt)
cat > "$HANDOFF_DIR/current-task-$AGENT.md" << TASK
# Task for: $AGENT
$(date -u +"%Y-%m-%d %H:%M UTC")

$TASK_PROMPT

## Instructions
- Read your persona from .agdev/CLAUDE-$AGENT.md if it exists
- Read any input files referenced in the task
- Save output to .agdev/handoff/$AGENT-output.md
- Use conventional commits if modifying code
- When done, write DONE to the last line of your output file
TASK

# The CLI prompt is SHORT and stable — task details are in the file above
PROMPT_FILE=$(mktemp /tmp/agdev-prompt-${AGENT}-XXXXX.txt)
cat > "$PROMPT_FILE" << 'PEOF'
Read .agdev/handoff/current-task-AGENT_PLACEHOLDER.md and execute it fully. If .agdev/CLAUDE-AGENT_PLACEHOLDER.md exists, read it for your persona. Save output to .agdev/handoff/AGENT_PLACEHOLDER-output.md. Write DONE as the last line when finished.
PEOF
sed -i "s/AGENT_PLACEHOLDER/$AGENT/g" "$PROMPT_FILE"

OUTPUT_FILE="$HANDOFF_DIR/$AGENT-output.md"

if [[ "$MODE" == "--print" ]]; then
  CLAUDE_CMD="cd $PROJECT_DIR && script -qec \"claude --dangerously-skip-permissions --print -p \\\"\\\$(cat $PROMPT_FILE)\\\"\" /dev/null 2>&1 | tee $OUTPUT_FILE && rm -f $PROMPT_FILE && echo 'AGENT_DONE_$AGENT'"
else
  CLAUDE_CMD="cd $PROJECT_DIR && script -qec \"claude --dangerously-skip-permissions -p \\\"\\\$(cat $PROMPT_FILE)\\\" --allowedTools 'Bash(*)' 'Read(*)' 'Write(*)' 'Edit(*)'\" /dev/null 2>&1 | tee $OUTPUT_FILE && rm -f $PROMPT_FILE && echo 'AGENT_DONE_$AGENT'"
fi

tmux -S "$SOCKET" send-keys -t "$SESSION" "$CLAUDE_CMD" Enter

echo "📤 Task dispatched to $SESSION"
echo "📋 Task file: $HANDOFF_DIR/current-task-$AGENT.md"
echo "📄 Prompt file: $PROMPT_FILE"
echo ""
echo "Monitor:"
echo "  Live:     tmux -S $SOCKET attach -t $SESSION"
echo "  Capture:  tmux -S $SOCKET capture-pane -p -J -t $SESSION -S -200"
echo "  Done?:    tmux -S $SOCKET capture-pane -p -t $SESSION -S -5 | grep -q 'AGENT_DONE_$AGENT'"
echo "  Output:   cat $OUTPUT_FILE"
