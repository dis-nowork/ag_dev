#!/bin/bash
# Site Controller Installation

set -e

echo "=========================================="
echo "Site Controller Installation"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found"
    exit 1
fi

echo "✅ Python: $(python3 --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install --upgrade playwright patchright --break-system-packages

# Install Chromium
echo ""
echo "🌐 Installing Chromium browser..."
playwright install chromium

# Verify Chromium location
CHROMIUM_PATH=$(find ~/.cache/ms-playwright -name "chrome" -type f 2>/dev/null | head -1)
if [ -n "$CHROMIUM_PATH" ]; then
    echo "✅ Chromium installed: $CHROMIUM_PATH"
else
    echo "⚠️  Chromium not found in expected location"
fi

# Make CLI executable
echo ""
echo "🔧 Making CLI executable..."
chmod +x site-cli

# Create .gitkeep for profiles
touch profiles/.gitkeep

echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Test installation:"
echo "   ./site-cli claude current-url"
echo ""
echo "2. Login to Claude.ai (browser will open)"
echo "   Close browser when logged in"
echo ""
echo "3. Test in headless mode:"
echo "   ./site-cli claude ask 'Hello!' --headless"
echo ""
echo "4. Add to PATH (optional):"
echo "   echo 'export PATH=\"\$HOME/ag_dev/skills/site-controller:\$PATH\"' >> ~/.bashrc"
echo ""
echo "5. Read documentation:"
echo "   cat README.md"
echo "   cat guides/MAPPING_PROCESS.md"
echo ""
