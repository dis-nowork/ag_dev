#!/usr/bin/env bash
# Setup tmux sessions for AG Dev agents
# Usage: setup-agents.sh <socket_path> <project_dir> [agents...]
# Example: setup-agents.sh /tmp/agdev.sock /path/to/project analyst architect dev

set -euo pipefail

SOCKET="${1:?Usage: setup-agents.sh <socket> <project_dir> [agents...]}"
PROJECT_DIR="${2:?Usage: setup-agents.sh <socket> <project_dir> [agents...]}"
shift 2

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS=("${@:-analyst architect dev qa devops pm po}")
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"

mkdir -p "$HANDOFF_DIR"

# Kill existing server on this socket if any
tmux -S "$SOCKET" kill-server 2>/dev/null || true

echo "🚀 Setting up AG Dev agents on socket: $SOCKET"
echo "📁 Project: $PROJECT_DIR"
echo "📂 Handoff: $HANDOFF_DIR"

for agent in "${AGENTS[@]}"; do
  SESSION="agent-$agent"
  CLAUDE_MD="$SKILL_DIR/agents/$agent.CLAUDE.md"

  # Create tmux session
  tmux -S "$SOCKET" new-session -d -s "$SESSION" -c "$PROJECT_DIR"

  # Copy CLAUDE.md into project's .agdev/ for this agent
  if [[ -f "$CLAUDE_MD" ]]; then
    cp "$CLAUDE_MD" "$PROJECT_DIR/.agdev/CLAUDE-$agent.md"
  fi

  # Launch Claude Code with the agent's persona
  # Using --print for non-interactive, but agents will be sent tasks via send-keys
  tmux -S "$SOCKET" send-keys -t "$SESSION" \
    "cd $PROJECT_DIR && export CLAUDE_MD=$PROJECT_DIR/.agdev/CLAUDE-$agent.md && echo '✅ Agent $agent ready in $PROJECT_DIR'" Enter

  echo "  ✅ $SESSION created"
done

echo ""
echo "🎯 All agents ready!"
echo ""
echo "Monitor: tmux -S $SOCKET attach"
echo "List:    tmux -S $SOCKET list-sessions"
echo "Capture: tmux -S $SOCKET capture-pane -p -J -t agent-<name> -S -200"
