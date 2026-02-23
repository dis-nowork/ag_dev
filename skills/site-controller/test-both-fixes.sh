#!/bin/bash
# Test both FIX 1 (artifacts) and FIX 2 (smart delivery)

set -e

cd ~/ag_dev/skills/site-controller

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║           TESTING BOTH FIXES - v2.0.2                           ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# FIX 1 - ARTIFACT DETECTION
# =============================================================================

echo "═══════════════════════════════════════════════════════════════════"
echo "FIX 1 - ARTIFACT DETECTION"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "Test 1.1: Request artifact creation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY=:0 ./site-cli claude ask "Create a Python fibonacci function as an artifact" --output file:/tmp/test_artifact_response.txt
echo ""

echo "Test 1.2: Wait for artifact to render..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10
echo "✅ Wait complete"
echo ""

echo "Test 1.3: Get artifacts (should find at least 1)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY=:0 ./site-cli claude get-artifacts > /tmp/artifacts_result.json
cat /tmp/artifacts_result.json
echo ""

# Check if artifacts were found
if grep -q '"index":' /tmp/artifacts_result.json; then
    echo "✅ PASSED: Artifacts detected!"

    echo ""
    echo "Test 1.4: Download first artifact"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY=:0 ./site-cli claude download-artifact 0 /tmp/test_fibonacci.py

    if [ -f /tmp/test_fibonacci.py ]; then
        echo "✅ Artifact downloaded successfully!"
        echo "Preview:"
        head -5 /tmp/test_fibonacci.py
    else
        echo "❌ FAILED: Artifact file not found"
    fi
else
    echo "⚠️  WARNING: No artifacts detected"
    echo "   This may mean Claude didn't create an artifact"
    echo "   Check artifacts_debug.png for visual confirmation"
fi

echo ""
echo ""

# =============================================================================
# FIX 2 - SMART DELIVERY
# =============================================================================

echo "═══════════════════════════════════════════════════════════════════"
echo "FIX 2 - SMART DELIVERY"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

echo "Test 2.1: Short response (direct return)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(DISPLAY=:0 ./site-cli claude ask "Say hello")
echo "Response: $RESPONSE"
if [ ${#RESPONSE} -lt 100 ]; then
    echo "✅ PASSED: Short response returned directly"
else
    echo "⚠️  Response longer than expected"
fi
echo ""

echo "Test 2.2: Long response (auto-save to .md file)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY=:0 ./site-cli claude ask "Explain Python async/await in detail with examples" > /tmp/long_response.json
cat /tmp/long_response.json
echo ""

if grep -q '"type": "file"' /tmp/long_response.json; then
    echo "✅ PASSED: Long response auto-saved to file"
    FILE_PATH=$(grep '"path"' /tmp/long_response.json | cut -d'"' -f4)
    echo "   File: $FILE_PATH"
    if [ -f "$FILE_PATH" ]; then
        echo "   Size: $(wc -c < "$FILE_PATH") bytes"
        echo "   Preview (first 3 lines):"
        head -3 "$FILE_PATH"
    fi
else
    echo "⚠️  Expected file delivery but got: $(cat /tmp/long_response.json)"
fi
echo ""

echo "Test 2.3: Custom file destination"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DISPLAY=:0 ./site-cli claude ask "List 5 Python best practices" --output file:/tmp/async.md
if [ -f /tmp/async.md ]; then
    echo "✅ PASSED: Response saved to custom path"
    echo "   File: /tmp/async.md"
    echo "   Size: $(wc -c < /tmp/async.md) bytes"
else
    echo "❌ FAILED: File not created at /tmp/async.md"
fi
echo ""

echo "Test 2.4: ClickUp integration (Brain Dump list)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Sending to ClickUp list 901325676925..."
CLICKUP_RESULT=$(DISPLAY=:0 ./site-cli claude ask "Top 3 best practices for AI agents" --output clickup:901325676925)
echo "$CLICKUP_RESULT"

if echo "$CLICKUP_RESULT" | grep -q '"url"'; then
    echo "✅ PASSED: Task created in ClickUp!"
    TASK_URL=$(echo "$CLICKUP_RESULT" | grep '"url"' | cut -d'"' -f4)
    echo "   Task URL: $TASK_URL"
else
    echo "⚠️  ClickUp integration status: $(echo "$CLICKUP_RESULT" | head -1)"
fi
echo ""

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ ALL TESTS COMPLETE!                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  - FIX 1 (Artifacts): Check artifacts_debug.png and results above"
echo "  - FIX 2 (Smart Delivery): Check /tmp/ files and ClickUp task"
echo ""
echo "Debug files:"
echo "  - artifacts_debug.png (screenshot during artifact detection)"
echo "  - /tmp/artifacts_result.json (artifact detection output)"
echo "  - /tmp/test_fibonacci.py (downloaded artifact)"
echo "  - /tmp/async.md (custom file delivery)"
echo "  - /tmp/claude_response_*.md (auto-saved long responses)"
