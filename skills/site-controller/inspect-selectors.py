#!/usr/bin/env python3
"""Inspect Claude.ai page to find correct selectors"""

import asyncio
import sys
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from core.browser import BrowserEngine

async def main():
    browser = BrowserEngine(
        profile_name="claude",
        headless=False
    )

    await browser.start()
    page = browser.page

    # Navigate to Claude.ai
    await browser.navigate("https://claude.ai")
    await asyncio.sleep(3)

    print("\n" + "="*60)
    print("INSPECTING PAGE STRUCTURE")
    print("="*60)

    # Get page URL
    url = page.url
    print(f"\n📍 Current URL: {url}")

    # Look for input field
    print("\n🔍 Looking for input field...")
    inputs = await page.query_selector_all("div[contenteditable='true']")
    print(f"   Found {len(inputs)} contenteditable divs")

    if inputs:
        first_input = inputs[0]
        placeholder = await first_input.get_attribute("placeholder")
        aria_label = await first_input.get_attribute("aria-label")
        data_testid = await first_input.get_attribute("data-testid")
        print(f"   Placeholder: {placeholder}")
        print(f"   Aria-label: {aria_label}")
        print(f"   Data-testid: {data_testid}")

    # Type a test message
    print("\n✍️  Typing test message...")
    await page.fill("div[contenteditable='true']", "Say only: TEST")
    await asyncio.sleep(1)

    # Press Enter to send
    print("📤 Sending message...")
    await page.press("div[contenteditable='true']", "Enter")

    # Wait for page to navigate to chat
    print("⏳ Waiting for response...")
    await asyncio.sleep(8)

    # Check new URL
    new_url = page.url
    print(f"\n📍 New URL: {new_url}")

    # Look for message elements
    print("\n🔍 Looking for message elements...")

    # Try different selectors
    selectors_to_try = [
        "[data-testid='assistant-message']",
        "[data-testid*='message']",
        "div[role='article']",
        "div[class*='message']",
        "[data-is-streaming]",
    ]

    for selector in selectors_to_try:
        elements = await page.query_selector_all(selector)
        print(f"   {selector}: {len(elements)} found")

        if elements and len(elements) > 0:
            # Get attributes of first element
            elem = elements[0]
            testid = await elem.get_attribute("data-testid")
            streaming = await elem.get_attribute("data-is-streaming")
            role = await elem.get_attribute("role")
            text = await elem.text_content()

            print(f"      → data-testid: {testid}")
            print(f"      → data-is-streaming: {streaming}")
            print(f"      → role: {role}")
            print(f"      → text preview: {text[:100] if text else None}...")

    # Get all elements with data-testid
    print("\n🔍 All elements with data-testid attribute:")
    all_with_testid = await page.query_selector_all("[data-testid]")
    testids = set()
    for elem in all_with_testid:
        tid = await elem.get_attribute("data-testid")
        if tid and "message" in tid.lower():
            testids.add(tid)

    for tid in sorted(testids):
        print(f"   • {tid}")

    # Wait for user to inspect
    print("\n" + "="*60)
    print("Browser will stay open for 30 seconds...")
    print("Inspect the page to see the actual structure")
    print("="*60)

    await asyncio.sleep(30)

    await browser.stop()

if __name__ == "__main__":
    asyncio.run(main())
