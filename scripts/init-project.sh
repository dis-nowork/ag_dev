#!/bin/bash
# AG Dev — Initialize for a project
set -e

PROJECT_DIR="${1:-.}"
PROJECT_DIR="$(realpath "$PROJECT_DIR")"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AG_DEV_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
TEMPLATE="${2:-saas}"

echo "🚀 Initializing AG Dev for: $PROJECT_NAME"
echo "   Path: $PROJECT_DIR"
echo "   Template: $TEMPLATE"

# Create .ag-dev config
mkdir -p "$PROJECT_DIR/.ag-dev"

cat > "$PROJECT_DIR/.ag-dev/config.json" << EOF
{
  "name": "$PROJECT_NAME",
  "projectRoot": "$PROJECT_DIR",
  "template": "$TEMPLATE",
  "agents": {
    "definitionsDir": "$AG_DEV_DIR/core/agents"
  },
  "created": "$(date -Iseconds)"
}
EOF

# Update AG Dev main config
cat > "$AG_DEV_DIR/config.json" << EOF
{
  "projectRoot": "$PROJECT_DIR",
  "port": 3000,
  "name": "$PROJECT_NAME",
  "gateway": {
    "url": "ws://127.0.0.1:18789",
    "token": ""
  },
  "agents": {
    "definitionsDir": "./core/agents",
    "autoSpawn": false
  },
  "auth": {
    "token": ""
  }
}
EOF

echo ""
echo "✅ AG Dev initialized for $PROJECT_NAME"
echo ""
echo "Next steps:"
echo "  cd $AG_DEV_DIR && npm start"
echo "  Then open http://localhost:3000"
