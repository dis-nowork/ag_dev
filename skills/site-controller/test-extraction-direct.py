#!/usr/bin/env python3
"""Test extraction logic directly in same session"""

import asyncio
import sys
import re
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from core.browser import BrowserEngine

async def main():
    browser = BrowserEngine(profile_name="claude", headless=False)
    await browser.start()
    page = browser.page

    # Navigate
    await browser.navigate("https://claude.ai")
    await asyncio.sleep(3)

    # Send message
    print("📤 Asking for code...")
    await page.fill("div[contenteditable='true']", "Write a Python function to calculate factorial")
    await page.press("div[contenteditable='true']", "Enter")

    # Wait
    print("⏳ Waiting for response...")
    await asyncio.sleep(10)

    print("\n" + "="*60)
    print("TESTING CODE BLOCK EXTRACTION LOGIC")
    print("="*60)

    # ==== SAME LOGIC AS get_artifacts() ====

    artifact_list = []

    # Strategy 1: Visual artifacts
    print("\n🔍 Strategy 1: Visual artifacts...")
    visual_selectors = [
        "div[data-testid='artifact']",
        "div[class*='artifact']",
        "[data-testid*='artifact']"
    ]

    for selector in visual_selectors:
        found = await page.query_selector_all(selector)
        print(f"   {selector}: {len(found)}")
        if len(found) > 0:
            print("   ✅ Found visual artifacts!")
            break

    # Strategy 2: Code blocks
    print("\n🔍 Strategy 2: Code blocks...")
    code_blocks = await page.query_selector_all('pre code')
    print(f"   Found {len(code_blocks)} <pre><code> elements")

    for idx, code_block in enumerate(code_blocks):
        class_attr = await code_block.get_attribute('class') or ""
        language = "text"

        match = re.search(r'language-(\w+)', class_attr)
        if match:
            language = match.group(1)

        content = await code_block.text_content()

        # Filter
        if not content or len(content.strip()) < 10:
            print(f"   [SKIP] Block {idx}: too small ({len(content)} chars)")
            continue

        if content.strip().startswith("Say only") or content.strip().startswith("Create"):
            print(f"   [SKIP] Block {idx}: looks like user input")
            continue

        # Add to list
        artifact_list.append({
            'index': idx,
            'language': language,
            'size': len(content),
            'preview': content[:100],
            'type': 'code_block'
        })

        print(f"   ✅ [ADD] Block {idx}: {language} ({len(content)} chars)")

    # Results
    print(f"\n📊 RESULTS:")
    print(f"   Total found: {len(artifact_list)}")

    for art in artifact_list:
        print(f"\n   [{art['index']}] {art['language']} ({art['size']} chars)")
        print(f"       Type: {art['type']}")
        print(f"       Preview: {art['preview']}")

    if len(artifact_list) > 0:
        print("\n✅ CODE BLOCK EXTRACTION LOGIC WORKING!")
    else:
        print("\n❌ No artifacts found")

    print("\n" + "="*60)
    await asyncio.sleep(10)
    await browser.stop()

if __name__ == "__main__":
    asyncio.run(main())
