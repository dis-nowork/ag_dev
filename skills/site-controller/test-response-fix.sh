#!/bin/bash
# Test response extraction fix

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║           TEST: Response Extraction Fix                          ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

cd ~/ag_dev/skills/site-controller

echo "Test 1: Simple confirmation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Asking: Say only: CONFIRMED"
echo ""

RESPONSE=$(DISPLAY=:0 ./site-cli claude ask "Say only the word: CONFIRMED" 2>&1 | tail -1)

echo "Response received:"
echo "→ $RESPONSE"
echo ""

# Check if response contains CONFIRMED (not the question)
if echo "$RESPONSE" | grep -q "CONFIRMED"; then
    if echo "$RESPONSE" | grep -q "Say only"; then
        echo "❌ FAILED: Response contains the question text"
        echo "   Bug still present - returning user input instead of Claude response"
        exit 1
    else
        echo "✅ PASSED: Got correct response (CONFIRMED)"
    fi
else
    echo "⚠️  WARNING: Response doesn't contain CONFIRMED"
    echo "   Actual response: $RESPONSE"
fi

echo ""
echo "Test 2: Math question"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Asking: What is 2+2? Answer with only the number."
echo ""

RESPONSE2=$(DISPLAY=:0 ./site-cli claude ask "What is 2+2? Answer with only the number." 2>&1 | tail -1)

echo "Response received:"
echo "→ $RESPONSE2"
echo ""

if echo "$RESPONSE2" | grep -q "What is 2+2"; then
    echo "❌ FAILED: Response contains the question"
    exit 1
else
    echo "✅ PASSED: Response is different from question"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ TESTS PASSED!                              ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
