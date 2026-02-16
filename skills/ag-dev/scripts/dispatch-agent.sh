#!/usr/bin/env bash
# Dispatch a task to an AG Dev agent via Claude Code CLI
# Usage: dispatch-agent.sh <socket> <agent_name> <project_dir> <task_prompt> [--print]
#
# FIXES (2026-02-16):
#   - Prompt passed via TEMP FILE (never shell expansion)
#   - PTY via script -qec wrapper
#   - --dangerously-skip-permissions for headless operation
#   - --allowedTools for explicit tool access
#   - Output captured via tee with flush

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

# Write task file for the agent
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

# Write the PROMPT to a temp file (NEVER pass large prompts via shell expansion)
PROMPT_FILE=$(mktemp /tmp/agdev-prompt-$AGENT-XXXXX.txt)
cat > "$PROMPT_FILE" << 'PROMPTEOF'
Read .agdev/CLAUDE-$AGENT.md for your persona if it exists. Then read .agdev/handoff/current-task-$AGENT.md and execute it fully. Save all output to .agdev/handoff/$AGENT-output.md. Write DONE as the last line when finished.
PROMPTEOF
# Replace $AGENT in the prompt file
sed -i "s/\$AGENT/$AGENT/g" "$PROMPT_FILE"

# Build the Claude CLI command — reads prompt from file via stdin
if [[ "$MODE" == "--print" ]]; then
  # Print mode: NO tool access, text-only output
  CLAUDE_CMD="cd $PROJECT_DIR && cat $PROMPT_FILE | script -qec 'claude --print -p -' /dev/null 2>&1 | tee .agdev/handoff/$AGENT-output.md && echo 'AGENT_DONE_$AGENT'"
else
  # Interactive mode (DEFAULT): full tool access via --dangerously-skip-permissions
  # Prompt via stdin pipe to avoid shell expansion issues
  CLAUDE_CMD="cd $PROJECT_DIR && cat $PROMPT_FILE | script -qec 'claude --dangerously-skip-permissions -p - --allowedTools '\"'\"'Bash(*)'\"'\"' '\"'\"'Read(*)'\"'\"' '\"'\"'Write(*)'\"'\"' '\"'\"'Edit(*)'\"'\"'' /dev/null 2>&1 | tee .agdev/handoff/$AGENT-output.md && rm -f $PROMPT_FILE && echo 'AGENT_DONE_$AGENT'"
fi

# Send to tmux session
tmux -S "$SOCKET" send-keys -t "$SESSION" "$CLAUDE_CMD" Enter

echo "📤 Task dispatched to $SESSION (prompt via file: $PROMPT_FILE)"
echo "📋 Task file: $HANDOFF_DIR/current-task-$AGENT.md"
echo ""
echo "Monitor:"
echo "  Live:     tmux -S $SOCKET attach -t $SESSION"
echo "  Capture:  tmux -S $SOCKET capture-pane -p -J -t $SESSION -S -200"
echo "  Done?:    tmux -S $SOCKET capture-pane -p -t $SESSION -S -5 | grep -q 'AGENT_DONE_$AGENT'"
echo "  Output:   cat $HANDOFF_DIR/$AGENT-output.md"
