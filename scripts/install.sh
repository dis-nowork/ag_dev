#!/bin/bash
# AG Dev Installer — installs the armor into any project
set -e

PROJECT_DIR="${1:-.}"
AGDEV_DIR="$PROJECT_DIR/.ag-dev"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║         AG DEV — Installing Armor         ║"
echo "  ╚═══════════════════════════════════════════╝"
echo ""

# Copy core files
echo "📦 Installing core agents & workflows..."
mkdir -p "$AGDEV_DIR"
cp -r "$SCRIPT_DIR/core" "$AGDEV_DIR/"
cp -r "$SCRIPT_DIR/server" "$AGDEV_DIR/"

# Install server deps
echo "📦 Installing server dependencies..."
cd "$AGDEV_DIR/server" && npm install --production 2>/dev/null

# Build UI if not pre-built
if [ -d "$SCRIPT_DIR/ui/dist" ]; then
  echo "📦 Copying pre-built UI..."
  cp -r "$SCRIPT_DIR/ui/dist" "$AGDEV_DIR/ui-dist"
else
  echo "📦 Building UI..."
  cd "$SCRIPT_DIR/ui"
  NODE_ENV=development npm install 2>/dev/null
  npx vite build 2>/dev/null
  cp -r dist "$AGDEV_DIR/ui-dist"
fi

# Update server to point to project root
cat > "$AGDEV_DIR/config.json" << EOF
{
  "projectRoot": "$(cd "$PROJECT_DIR" && pwd)",
  "port": 80,
  "name": "$(basename "$(cd "$PROJECT_DIR" && pwd)")"
}
EOF

echo ""
echo "  ✅ AG Dev installed!"
echo ""
echo "  Start:  node $AGDEV_DIR/server/server.js"
echo "  Open:   http://localhost (or Tailscale IP)"
echo ""
