#!/usr/bin/env bash
# Cleanup AG Dev tmux sessions
# Usage: cleanup.sh [socket_path]

SOCKET="${1:-/tmp/agdev.sock}"

if tmux -S "$SOCKET" list-sessions 2>/dev/null; then
  echo "🧹 Killing all sessions on $SOCKET..."
  tmux -S "$SOCKET" kill-server
  echo "✅ Done"
else
  echo "ℹ️  No sessions found on $SOCKET"
fi

rm -f "$SOCKET"
