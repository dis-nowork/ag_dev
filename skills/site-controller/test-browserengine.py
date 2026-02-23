#!/usr/bin/env python3
"""Test BrowserEngine class directly"""

import asyncio
import sys
from pathlib import Path

# Add site-controller to path
sys.path.insert(0, str(Path(__file__).parent))

from core.browser import BrowserEngine

async def test():
    print("Testing BrowserEngine...")

    async with BrowserEngine(profile_name='debug-test', headless=False) as browser:
        print(f"✅ Browser started")
        print(f"   Profile: {browser.profile_dir}")

        print("\n🌐 Navigating to Claude.ai...")
        await browser.navigate('https://claude.ai')

        url = browser.get_current_url()
        print(f"✅ Navigation successful!")
        print(f"   Current URL: {url}")

        await browser.screenshot('/tmp/test-browserengine.png')
        print(f"✅ Screenshot saved")

        print("\n✅ Test complete!")

if __name__ == "__main__":
    asyncio.run(test())
