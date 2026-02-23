#!/bin/bash
# Complete Flow Test for Claude Plugin

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║           CLAUDE PLUGIN - COMPLETE FLOW TEST                     ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

cd ~/ag_dev/skills/site-controller

# Create test directory
mkdir -p test_artifacts
echo "✅ Created test_artifacts/ directory"
echo ""

# Test 1: Ask with artifact generation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Ask Claude to create artifact"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DISPLAY=:0 ./site-cli claude ask "Write a Python function that returns fibonacci numbers up to N. Create it as an artifact with proper documentation."

echo ""
read -p "👉 Press ENTER after Claude generates the artifact..."

# Test 2: Get artifacts
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: List generated artifacts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DISPLAY=:0 ./site-cli claude get-artifacts

# Test 3: Download artifact
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Download first artifact"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

DISPLAY=:0 ./site-cli claude download-artifact 0 test_artifacts/fibonacci

# Test 4: Verify downloaded file
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Verify downloaded artifact"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f test_artifacts/fibonacci.py ]; then
    echo "✅ File created: test_artifacts/fibonacci.py"
    echo ""
    echo "📄 Content preview:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    head -20 test_artifacts/fibonacci.py
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ TEST PASSED!"
else
    echo "❌ File not found: test_artifacts/fibonacci.py"
    echo ""
    echo "Files in test_artifacts/:"
    ls -la test_artifacts/
    echo ""
    echo "❌ TEST FAILED"
    exit 1
fi

# Test 5: Additional commands
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Test other commands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "5.1 - List chats"
DISPLAY=:0 ./site-cli claude list-chats | head -5
echo ""

echo "5.2 - List projects"
DISPLAY=:0 ./site-cli claude list-projects | head -5
echo ""

echo "5.3 - Get current model"
DISPLAY=:0 ./site-cli claude get-model
echo ""

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║                    ✅ ALL TESTS PASSED!                          ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Artifacts saved in: test_artifacts/"
echo "🎯 Claude Plugin is fully functional!"
echo ""
