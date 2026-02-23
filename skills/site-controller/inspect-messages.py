#!/usr/bin/env python3
"""Inspect message structure after sending"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from core.browser import BrowserEngine

async def test():
    async with BrowserEngine(profile_name='claude', headless=True) as browser:
        await browser.navigate('https://claude.ai/new')
        await browser.wait_seconds(2)

        # Send message
        input_sel = "div[contenteditable='true']"
        await browser.fill(input_sel, "What is 2+2?")
        await browser.press(input_sel, 'Enter')

        print("⏳ Waiting 15 seconds for Claude response...")
        await browser.wait_seconds(15)

        # Take screenshot
        await browser.screenshot('/tmp/inspect-messages.png')
        print("📸 Screenshot: /tmp/inspect-messages.png")

        # Inspect all messages
        print("\n🔍 Inspecting all message elements...")

        messages = await browser.page.query_selector_all('[data-testid*="message"]')
        print(f"Found {len(messages)} messages")

        for i, msg in enumerate(messages):
            testid = await msg.get_attribute('data-testid')
            text = await msg.text_content()
            print(f"\n{i+1}. testid={testid}")
            print(f"   text={text[:80]}")

        # Try different selectors
        print("\n\n🔍 Testing specific selectors...")

        selectors_to_try = [
            '[data-testid="assistant-message"]',
            '[data-testid*="assistant"]',
            '[data-testid="user-message"]:last-of-type + [data-testid]',
            'main > div > div:last-child',
        ]

        for sel in selectors_to_try:
            try:
                elem = await browser.page.query_selector(sel)
                if elem:
                    text = await elem.text_content()
                    print(f"✅ {sel}")
                    print(f"   → {text[:100]}")
                else:
                    print(f"❌ {sel} - not found")
            except Exception as e:
                print(f"❌ {sel} - error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
