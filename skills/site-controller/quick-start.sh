#!/bin/bash
# Quick Start - Test Site Controller

echo "🚀 Site Controller Quick Start"
echo "==============================="
echo ""

cd ~/ag_dev/skills/site-controller

echo "Test 1: Check CLI"
echo "-----------------"
./site-cli
echo ""

echo "Test 2: Login to Claude.ai"
echo "--------------------------"
echo "Browser will open. Please:"
echo "1. Login to Claude.ai in the browser"
echo "2. Press ENTER in terminal (DON'T close browser)"
echo ""
read -p "Press ENTER to start login..."

DISPLAY=:0 ./site-cli claude login

echo ""
echo "Test 3: Verify session (headless)"
echo "----------------------------------"
./site-cli claude current-url --headless
echo ""

echo "Test 4: Ask Claude a question"
echo "-----------------------------"
./site-cli claude ask "Say hello in one sentence" --headless
echo ""

echo "==============================="
echo "✅ Quick Start Complete!"
echo ""
echo "You can now:"
echo "  - ./site-cli claude ask 'your question' --headless"
echo "  - ./site-cli claude create-chat"
echo "  - ./site-cli claude list-chats"
echo ""
echo "See README.md for all commands"
echo "==============================="
