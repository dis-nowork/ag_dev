#!/usr/bin/env python3
"""Debug selectors - find what's on the page after login"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from core.browser import BrowserEngine

async def test():
    print("Opening Claude.ai with your saved session...")

    async with BrowserEngine(profile_name='claude', headless=False) as browser:
        await browser.navigate('https://claude.ai')
        await browser.wait_seconds(3)

        print("\n" + "="*60)
        print("Testing various selectors...")
        print("="*60)

        # Test various selectors
        selectors = [
            "button:has-text('New Chat')",
            "div[contenteditable='true']",
            "[data-testid*='chat']",
            "button[aria-label*='New']",
            "textarea",
            "input[type='text']",
            ".ProseMirror",
            "[role='textbox']",
            "main",
            "nav",
        ]

        for selector in selectors:
            try:
                element = await browser.page.query_selector(selector)
                if element:
                    print(f"✅ FOUND: {selector}")
                    # Try to get some info
                    text = await element.text_content()
                    if text and len(text.strip()) > 0:
                        print(f"   Text: {text.strip()[:50]}")
                else:
                    print(f"❌ NOT FOUND: {selector}")
            except Exception as e:
                print(f"❌ ERROR: {selector} - {e}")

        print("\n" + "="*60)
        print("Current URL:", browser.get_current_url())
        print("="*60)

        print("\nTaking screenshot for inspection...")
        await browser.screenshot('/tmp/claude-logged-in.png')
        print("Screenshot saved: /tmp/claude-logged-in.png")

        print("\n👉 Press ENTER to close...")
        input()

if __name__ == "__main__":
    asyncio.run(test())
