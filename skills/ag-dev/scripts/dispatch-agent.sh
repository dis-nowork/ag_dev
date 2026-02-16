#!/usr/bin/env bash
# Dispatch a task to an AG Dev agent via Claude Code CLI
# Usage: dispatch-agent.sh <socket> <agent_name> <project_dir> <task_prompt> [--print]
#
# Modes:
#   Default (interactive): launches Claude Code with tool access (Read/Write/exec)
#   --print: one-shot, NO tool access — only for pure text generation tasks
#
# ⚠️  IMPORTANT: --print mode CANNOT read/write files. Use interactive (default) for any
#     task that requires reading code, writing files, or running commands.
#
# Example:
#   dispatch-agent.sh /tmp/agdev.sock analyst /tmp/project "Create a project brief"
#   dispatch-agent.sh /tmp/agdev.sock dev /tmp/project "Implement auth" 
#   dispatch-agent.sh /tmp/agdev.sock pm /tmp/project "Write a summary" --print

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
- Read your persona from .agdev/CLAUDE-$AGENT.md
- Read any input files referenced in the task
- Save output to .agdev/handoff/$AGENT-output.md
- Use conventional commits if modifying code
- When done, write DONE to the last line of your output file
TASK

# The prompt that tells the agent what to do
AGENT_PROMPT="Read .agdev/CLAUDE-$AGENT.md for your persona. Then read .agdev/handoff/current-task-$AGENT.md and execute it. Save all output to .agdev/handoff/$AGENT-output.md. Write DONE as the last line when finished."

if [[ "$MODE" == "--print" ]]; then
  # ⚠️  Print mode: NO tool access. Only for pure text generation.
  echo "⚠️  Using --print mode (no file access). Use default mode for tasks needing Read/Write."
  tmux -S "$SOCKET" send-keys -t "$SESSION" \
    "cd $PROJECT_DIR && claude --print '$AGENT_PROMPT' 2>&1 | tee .agdev/handoff/$AGENT-output.md && echo 'AGENT_DONE_$AGENT'" Enter
  echo "📤 Task dispatched to $SESSION (--print, no tools)"
else
  # Interactive mode (DEFAULT): full tool access — Read, Write, exec, etc.
  # Uses --verbose to show progress, pipes to tee for capture
  # The -p flag auto-accepts tool use permissions
  tmux -S "$SOCKET" send-keys -t "$SESSION" \
    "cd $PROJECT_DIR && claude -p '$AGENT_PROMPT' 2>&1 | tee .agdev/handoff/$AGENT-output.md && echo 'AGENT_DONE_$AGENT'" Enter
  echo "📤 Task dispatched to $SESSION (interactive, full tool access)"
fi

echo "📋 Task file: $HANDOFF_DIR/current-task-$AGENT.md"
echo ""
echo "Monitor:"
echo "  Live:     tmux -S $SOCKET attach -t $SESSION"
echo "  Capture:  tmux -S $SOCKET capture-pane -p -J -t $SESSION -S -200"
echo "  Done?:    tmux -S $SOCKET capture-pane -p -t $SESSION -S -5 | grep -q 'AGENT_DONE_$AGENT'"
echo "  Output:   cat $HANDOFF_DIR/$AGENT-output.md"
