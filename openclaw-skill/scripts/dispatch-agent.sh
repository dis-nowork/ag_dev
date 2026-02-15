#!/usr/bin/env bash
# Dispatch a task to an AG Dev agent via Claude Code CLI
# Usage: dispatch-agent.sh <socket> <agent_name> <project_dir> <task_prompt>
# Example: dispatch-agent.sh /tmp/agdev.sock analyst /tmp/project "Create a project brief for a todo app"

set -euo pipefail

SOCKET="${1:?Usage: dispatch-agent.sh <socket> <agent> <project_dir> <task_prompt>}"
AGENT="${2:?}"
PROJECT_DIR="${3:?}"
TASK_PROMPT="${4:?}"

SESSION="agent-$AGENT"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_MD="$SKILL_DIR/agents/$AGENT.CLAUDE.md"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"

# Write the task to handoff
cat > "$HANDOFF_DIR/current-task.md" << TASK
$TASK_PROMPT
TASK

# Build the claude command
# Use the agent's CLAUDE.md as system prompt context
CLAUDE_CMD="claude --print"

# If CLAUDE.md exists, tell claude to read it first
if [[ -f "$CLAUDE_MD" ]]; then
  AGENT_PROMPT="You are operating as a specialized agent. First read your persona from $PROJECT_DIR/.agdev/CLAUDE-$AGENT.md, then read your task from $HANDOFF_DIR/current-task.md and execute it."
else
  AGENT_PROMPT="Read your task from $HANDOFF_DIR/current-task.md and execute it."
fi

# Send to tmux session
tmux -S "$SOCKET" send-keys -t "$SESSION" \
  "claude --print \"$AGENT_PROMPT\"" Enter

echo "📤 Task dispatched to $SESSION"
echo "📋 Monitor: tmux -S $SOCKET capture-pane -p -J -t $SESSION -S -200"
