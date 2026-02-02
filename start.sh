#!/bin/bash

echo "🚀 Starting AG Dev - Multi-Agent Terminal Multiplexer"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting AG Dev Server on port 3456..."
echo "📊 Web interface will be available at: http://localhost:3456"
echo "🔗 API endpoints available at: http://localhost:3456/api/*"
echo ""
echo "Press Ctrl+C to stop the server"
echo "----------------------------------------"

# Start the server
node server/server.js