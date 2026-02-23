#!/usr/bin/env python3
"""Inspect the exact structure of Claude's response"""

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

    # Send a simple message
    await page.fill("div[contenteditable='true']", "Say only: HELLO")
    await page.press("div[contenteditable='true']", "Enter")

    # Wait for response
    print("⏳ Waiting for response...")
    await asyncio.sleep(10)

    print("\n" + "="*60)
    print("ANALYZING RESPONSE STRUCTURE")
    print("="*60)

    # Get the streaming element
    streaming = await page.query_selector('[data-is-streaming="false"]')

    if streaming:
        # Get all child elements
        children = await streaming.query_selector_all('*')
        print(f"\n📦 Found streaming element with {len(children)} children")

        # Get inner HTML to see structure
        inner_html = await streaming.inner_html()
        print(f"\n📄 Inner HTML length: {len(inner_html)} chars")
        print("\n--- First 500 chars ---")
        print(inner_html[:500])

        # Try to find specific elements
        print("\n\n🔍 Looking for specific child elements...")

        # Look for paragraphs
        paragraphs = await streaming.query_selector_all('p')
        print(f"   <p> tags: {len(paragraphs)}")
        for i, p in enumerate(paragraphs):
            text = await p.text_content()
            print(f"      P{i}: {text[:100]}")

        # Look for divs
        divs = await streaming.query_selector_all('div')
        print(f"   <div> tags: {len(divs)}")

        # Look for elements with specific classes/attributes
        thinking_elements = await streaming.query_selector_all('[class*="thinking"], [class*="Thinking"]')
        print(f"   'thinking' class elements: {len(thinking_elements)}")

        # Get all text nodes
        full_text = await streaming.text_content()
        print(f"\n📝 Full text content ({len(full_text)} chars):")
        print(full_text)

        # Try to find the actual answer part
        if "Done" in full_text:
            parts = full_text.split("Done")
            print(f"\n✂️  Text split by 'Done':")
            for i, part in enumerate(parts):
                print(f"   Part {i}: {part[:100]}...")

            if len(parts) > 1:
                answer = parts[-1].strip()
                print(f"\n✅ Extracted answer: '{answer}'")

    print("\n" + "="*60)
    await asyncio.sleep(20)
    await browser.stop()

if __name__ == "__main__":
    asyncio.run(main())
