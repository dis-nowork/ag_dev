#!/bin/bash
echo "⚡ AG Dev - Multi-Agent Development Platform"
echo "============================================"

# Check node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required (found v$NODE_VERSION)"
    exit 1
fi

# Build UI if needed
if [ ! -d "ui-dist" ]; then
    echo "📦 Building UI..."
    cd ui && npx vite build --outDir ../ui-dist && cd ..
fi

# Create data directories
mkdir -p data/graph

# Start server
echo "🚀 Starting server on port ${AG_DEV_PORT:-3456}..."
node server/server.js