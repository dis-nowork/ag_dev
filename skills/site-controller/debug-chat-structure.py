#!/usr/bin/env python3
"""Debug: Inspect chat page structure after Claude responds"""

import asyncio
import sys
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from core.browser import BrowserEngine

async def main():
    browser = BrowserEngine(profile_name="claude", headless=False)
    await browser.start()
    page = browser.page

    # Navigate to Claude.ai
    await browser.navigate("https://claude.ai")
    await asyncio.sleep(3)

    # Send simple code request
    print("📤 Sending message...")
    await page.fill("div[contenteditable='true']", "Write a Python hello world in one line")
    await page.press("div[contenteditable='true']", "Enter")

    # Wait for response
    print("⏳ Waiting for response...")
    await asyncio.sleep(10)

    print("\n" + "="*60)
    print("INSPECTING PAGE STRUCTURE")
    print("="*60)

    # Get URL
    url = page.url
    print(f"\n📍 Current URL: {url}")

    # Look for ALL pre/code elements
    print("\n🔍 ALL <pre> elements:")
    all_pre = await page.query_selector_all('pre')
    print(f"   Found {len(all_pre)} <pre> elements")

    for i, pre in enumerate(all_pre):
        inner_html = await pre.inner_html()
        text = await pre.text_content()
        print(f"\n   PRE {i}:")
        print(f"      HTML length: {len(inner_html)} chars")
        print(f"      Text length: {len(text)} chars")
        print(f"      Text preview: {text[:100]}")

    print("\n\n🔍 ALL <code> elements:")
    all_code = await page.query_selector_all('code')
    print(f"   Found {len(all_code)} <code> elements")

    for i, code in enumerate(all_code):
        class_attr = await code.get_attribute('class')
        text = await code.text_content()
        parent = await code.evaluate('el => el.parentElement.tagName')

        print(f"\n   CODE {i}:")
        print(f"      Parent: {parent}")
        print(f"      Class: {class_attr}")
        print(f"      Text length: {len(text)} chars")
        print(f"      Text preview: {text[:80]}")

    print("\n\n🔍 <pre><code> combinations:")
    pre_code = await page.query_selector_all('pre code')
    print(f"   Found {len(pre_code)} <pre><code> elements")

    for i, code in enumerate(pre_code):
        class_attr = await code.get_attribute('class')
        text = await code.text_content()

        print(f"\n   PRE>CODE {i}:")
        print(f"      Class: {class_attr}")
        print(f"      Length: {len(text)} chars")
        print(f"      Content: {text}")

    # Take screenshot
    print("\n\n📸 Taking screenshot...")
    await page.screenshot(path='debug_chat_structure.png')
    print("   Saved: debug_chat_structure.png")

    print("\n" + "="*60)
    print("Keeping browser open for 20 seconds for manual inspection...")
    print("="*60)

    await asyncio.sleep(20)
    await browser.stop()

if __name__ == "__main__":
    asyncio.run(main())
