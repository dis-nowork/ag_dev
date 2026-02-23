#!/usr/bin/env python3
"""Test artifacts using Python API (single session)"""

import sys
import time
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from openclaw_site_controller import ClaudeController

print("="*60)
print("TESTING ARTIFACTS WITH PYTHON API")
print("="*60)

# Initialize controller (keeps browser open)
claude = ClaudeController(headless=False)

# Step 1: Ask for artifact
print("\n1️⃣  Asking Claude to create artifact...")
response = claude.ask("Create a simple Python hello world script. Put it in an artifact panel on the right side.")
print(f"   Response: {response[:100]}...")

# Step 2: Wait for artifact to render
print("\n2️⃣  Waiting for artifact to render...")
time.sleep(8)

# Step 3: Get artifacts (same session)
print("\n3️⃣  Getting artifacts...")
artifacts = claude.get_artifacts()
print(f"   Result: {artifacts}")

if isinstance(artifacts, list) and len(artifacts) > 0:
    print(f"\n✅ SUCCESS! Found {len(artifacts)} artifact(s)")

    for i, art in enumerate(artifacts):
        print(f"\n   Artifact {i}:")
        print(f"      Language: {art.get('language')}")
        print(f"      Size: {art.get('size')} chars")
        print(f"      Preview: {art.get('preview', '')[:50]}...")

    # Step 4: Download first artifact
    print("\n4️⃣  Downloading first artifact...")
    result = claude.download_artifact(0, "/tmp/test_hello.py")
    print(f"   Result: {result}")

    if result.get('status') == 'success':
        print(f"\n✅ ARTIFACT DOWNLOADED!")
        print(f"   Path: {result.get('path')}")

        # Show content
        with open(result['path']) as f:
            content = f.read()
            print(f"\n   Content ({len(content)} chars):")
            print("   " + "-"*50)
            print("   " + "\n   ".join(content.split('\n')[:10]))
            print("   " + "-"*50)
else:
    print("\n⚠️  No artifacts found")
    print("   Claude may not have created an artifact panel")
    print("   Or selectors need further adjustment")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
