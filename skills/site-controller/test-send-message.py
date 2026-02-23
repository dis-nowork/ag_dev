#!/usr/bin/env python3
"""Test sending a message to Claude"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from core.browser import BrowserEngine

async def test():
    print("Testing message send in headless mode...")

    async with BrowserEngine(profile_name='claude', headless=True) as browser:
        print("✅ Browser started")

        print("🌐 Navigating to Claude.ai...")
        await browser.navigate('https://claude.ai/new')
        await browser.wait_seconds(3)

        # Find input
        input_selector = "div[contenteditable='true']"
        print(f"\n🔍 Looking for input: {input_selector}")

        try:
            await browser.wait_for(input_selector, timeout=10000)
            print("✅ Input found!")

            # Type message
            message = "Say hello in one sentence"
            print(f"\n✍️  Typing: {message}")
            await browser.fill(input_selector, message)
            print("✅ Message typed!")

            await browser.wait_seconds(1)

            # Press Enter to send
            print("\n📤 Sending (pressing Enter)...")
            await browser.press(input_selector, 'Enter')
            print("✅ Sent!")

            # Wait for response
            print("\n⏳ Waiting for response (10 seconds)...")
            await browser.wait_seconds(10)

            # Try to find response
            response_selectors = [
                "div.font-claude-message",
                "[data-testid*='message']",
                ".prose",
                "main p",
            ]

            for sel in response_selectors:
                try:
                    text = await browser.extract_text(sel, timeout=2000)
                    if text and len(text.strip()) > 10:
                        print(f"\n✅ Response found with selector: {sel}")
                        print(f"📝 Text: {text[:200]}")
                        break
                except:
                    print(f"❌ Not found: {sel}")

            # Screenshot
            await browser.screenshot('/tmp/message-test.png')
            print("\n📸 Screenshot saved: /tmp/message-test.png")

        except Exception as e:
            print(f"❌ Error: {e}")
            await browser.screenshot('/tmp/error-test.png')

if __name__ == "__main__":
    asyncio.run(test())
