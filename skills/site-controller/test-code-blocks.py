#!/usr/bin/env python3
"""Test code block extraction as artifact fallback"""

import sys
import time
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from openclaw_site_controller import ClaudeController

print("="*70)
print("TESTING CODE BLOCK EXTRACTION (ARTIFACT FALLBACK)")
print("="*70)

# Initialize controller
claude = ClaudeController(headless=False)

# Test 1: Ask for code (Claude will likely put in code block, not artifact)
print("\n1️⃣  Asking Claude for code (may use code block instead of artifact)...")
response = claude.ask("Write a Python function to reverse a string. Just give me the code.")
print(f"   Response: {response[:100]}...")

# Wait for rendering
print("\n2️⃣  Waiting for response to fully render...")
time.sleep(8)

# Get artifacts/code blocks
print("\n3️⃣  Extracting artifacts/code blocks...")
artifacts = claude.get_artifacts()

if isinstance(artifacts, list) and len(artifacts) > 0:
    print(f"\n✅ SUCCESS! Found {len(artifacts)} item(s)")

    for i, art in enumerate(artifacts):
        print(f"\n   Item {i}:")
        print(f"      Type: {art.get('type')}")
        print(f"      Language: {art.get('language')}")
        print(f"      Size: {art.get('size')} chars")
        print(f"      Preview: {art.get('preview', '')[:60]}...")

    # Download first item
    print("\n4️⃣  Downloading first item...")
    result = claude.download_artifact(0, "/tmp/test_reverse_string.py")

    if result.get('status') == 'success':
        print(f"\n✅ DOWNLOAD SUCCESSFUL!")
        print(f"   Path: {result.get('path')}")
        print(f"   Language: {result.get('language')}")
        print(f"   Size: {result.get('size')} chars")

        # Show content
        with open(result['path']) as f:
            content = f.read()
            print(f"\n   Content:")
            print("   " + "="*60)
            for line in content.split('\n'):
                print(f"   {line}")
            print("   " + "="*60)

        print("\n✅ CODE BLOCK EXTRACTION WORKING!")
    else:
        print(f"\n❌ Download failed: {result}")

else:
    print("\n❌ No artifacts or code blocks found")
    print(f"   Result: {artifacts}")

print("\n" + "="*70)
print("TEST COMPLETE")
print("="*70)
