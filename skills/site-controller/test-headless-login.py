#!/usr/bin/env python3
"""Test login detection in headless mode"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from core.browser import BrowserEngine

async def test():
    print("Testing login detection in HEADLESS mode...")

    async with BrowserEngine(profile_name='claude', headless=True) as browser:
        print("✅ Browser started (headless)")

        print("🌐 Navigating to Claude.ai...")
        await browser.navigate('https://claude.ai')

        print("⏳ Waiting for page to load...")
        await browser.wait_seconds(5)

        print(f"📍 Current URL: {browser.get_current_url()}")

        # Test the selector
        selector = "div[contenteditable='true']"
        print(f"\n🔍 Testing selector: {selector}")

        try:
            element = await browser.page.wait_for_selector(selector, timeout=20000)
            if element:
                print(f"✅ FOUND! Element exists")
                text = await element.text_content()
                print(f"   Text: {text[:50] if text else 'empty'}")
            else:
                print(f"❌ NOT FOUND")
        except Exception as e:
            print(f"❌ ERROR: {e}")

        # Take screenshot
        print("\n📸 Taking screenshot...")
        await browser.screenshot('/tmp/headless-test.png')
        print("   Saved: /tmp/headless-test.png")

        # Check page content
        print("\n📄 Page title:")
        title = await browser.page.title()
        print(f"   {title}")

if __name__ == "__main__":
    asyncio.run(test())
