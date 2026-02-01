#!/bin/bash
# AG Dev — Installation Script
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "╔═══════════════════════════════════════╗"
echo "║   AG Dev — Installing Dependencies    ║"
echo "╚═══════════════════════════════════════╝"

# Server deps
echo "📦 Installing server dependencies..."
cd "$ROOT_DIR/server"
npm install --production 2>/dev/null

# UI deps + build
echo "📦 Installing UI dependencies..."
cd "$ROOT_DIR/ui"
npm install 2>/dev/null

echo "🔨 Building UI..."
npx vite build 2>/dev/null

# Copy build to ui-dist
echo "📂 Copying build to ui-dist..."
rm -rf "$ROOT_DIR/ui-dist"
cp -r "$ROOT_DIR/ui/dist" "$ROOT_DIR/ui-dist"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   ✅ AG Dev installed successfully!    ║"
echo "╠═══════════════════════════════════════╣"
echo "║                                       ║"
echo "║  Standalone:                          ║"
echo "║    cd ag_dev && npm start             ║"
echo "║                                       ║"
echo "║  As Clawdbot plugin:                  ║"
echo "║    Add to clawdbot.json:              ║"
echo "║    extensions: {                      ║"
echo "║      \"ag-dev\": {                      ║"
echo "║        \"enabled\": true,               ║"
echo "║        \"port\": 3000                   ║"
echo "║      }                                ║"
echo "║    }                                  ║"
echo "║                                       ║"
echo "╚═══════════════════════════════════════╝"
