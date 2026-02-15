#!/usr/bin/env bash
# Dispatch a task to an AG Dev agent via Claude Code CLI
# Usage: dispatch-agent.sh <socket> <agent_name> <project_dir> <task_prompt> [--interactive]
#
# Modes:
#   Default (--print): one-shot execution, agent outputs result and returns
#   --interactive: launches interactive Claude Code session (agent can use tools, ask questions)
#
# Example:
#   dispatch-agent.sh /tmp/agdev.sock analyst /tmp/project "Create a project brief"
#   dispatch-agent.sh /tmp/agdev.sock dev /tmp/project "Implement the auth module" --interactive

set -euo pipefail

SOCKET="${1:?Usage: dispatch-agent.sh <socket> <agent> <project_dir> <task_prompt> [--interactive]}"
AGENT="${2:?}"
PROJECT_DIR="${3:?}"
TASK_PROMPT="${4:?}"
MODE="${5:---print}"

SESSION="agent-$AGENT"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_MD="$SKILL_DIR/agents/$AGENT/CLAUDE.md"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"

# Ensure handoff dir exists
mkdir -p "$HANDOFF_DIR"

# Write the task to handoff
cat > "$HANDOFF_DIR/current-task.md" << TASK
# Task for: $AGENT
$(date -u +"%Y-%m-%d %H:%M UTC")

$TASK_PROMPT

## Instructions
- Read your persona from .agdev/CLAUDE-$AGENT.md
- Read any input files referenced in the task
- Save output to the path specified (or .agdev/handoff/$AGENT-output.md)
- Use conventional commits if modifying code
- When done, write a summary to .agdev/handoff/$AGENT-output.md
TASK

# Build the prompt that includes persona context
AGENT_PROMPT="Read your persona and behavioral rules from .agdev/CLAUDE-$AGENT.md first. Then read your task from .agdev/handoff/current-task.md. Execute the task following your persona's expertise and rules. Save all output to the handoff directory."

if [[ "$MODE" == "--interactive" ]]; then
  # Interactive mode: launch claude in the tmux session
  tmux -S "$SOCKET" send-keys -t "$SESSION" \
    "cd $PROJECT_DIR && claude" Enter
  sleep 2
  # Send the prompt to the interactive session
  tmux -S "$SOCKET" send-keys -t "$SESSION" \
    "$AGENT_PROMPT" Enter
  echo "📤 Interactive session started for $SESSION"
else
  # One-shot mode: use --print for quick tasks
  tmux -S "$SOCKET" send-keys -t "$SESSION" \
    "cd $PROJECT_DIR && claude --print \"$AGENT_PROMPT\" | tee .agdev/handoff/$AGENT-output.md" Enter
  echo "📤 Task dispatched to $SESSION (--print mode)"
fi

echo "📋 Task file: $HANDOFF_DIR/current-task.md"
echo "📊 Monitor:   tmux -S $SOCKET capture-pane -p -J -t $SESSION -S -200"
echo "🔍 Check done: tmux -S $SOCKET capture-pane -p -t $SESSION -S -5 | grep -q '\\$'"
