#!/usr/bin/env python3
"""Test complete artifact flow in one session"""

import sys
import time
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from openclaw_site_controller import ClaudeController

print("="*60)
print("TESTING COMPLETE ARTIFACT WORKFLOW")
print("="*60)

# Initialize controller
claude = ClaudeController(headless=False)

# Step 1: Ask for code with artifact
print("\n1️⃣  Asking Claude to create code artifact...")
response = claude.ask("Write a Python hello world script. Put it in an artifact.")
print(f"   Response: {response[:100]}...")

# Step 2: Wait for artifact to render
print("\n2️⃣  Waiting for artifact to fully render...")
time.sleep(10)

# Step 3: Get artifacts
print("\n3️⃣  Getting artifacts...")
artifacts = claude.get_artifacts()
print(f"   Result: {artifacts}")

if isinstance(artifacts, list):
    print(f"   Found {len(artifacts)} artifacts")
    for art in artifacts:
        print(f"      - Index {art.get('index')}: {art.get('language')}")
else:
    print(f"   No artifacts or error: {type(artifacts)}")

# Step 4: Try screenshot
print("\n4️⃣  Taking screenshot...")
screenshot_result = claude.run_json('screenshot', 'test-artifact-session.png')
print(f"   Screenshot: {screenshot_result}")

print("\n" + "="*60)
print("Test complete")
print("="*60)
