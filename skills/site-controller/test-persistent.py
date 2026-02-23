#!/usr/bin/env python3
"""Test Patchright with persistent context"""

import asyncio
import os
from pathlib import Path
from patchright.async_api import async_playwright

async def test():
    print("Starting Patchright with persistent context...")

    profile_dir = Path(__file__).parent / "profiles" / "test"
    profile_dir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    env['DISPLAY'] = env.get('DISPLAY', ':0')

    async with async_playwright() as p:
        print(f"Launching persistent context at {profile_dir}...")

        context = await p.chromium.launch_persistent_context(
            str(profile_dir),
            headless=False,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-features=NetworkService',
                '--enable-features=NetworkServiceInProcess',
                '--ignore-certificate-errors',
                '--disable-blink-features=AutomationControlled',
            ],
            env=env,
            viewport={'width': 1920, 'height': 1080},
        )

        print("Context launched!")

        page = context.pages[0] if context.pages else await context.new_page()
        print("Page ready")

        print("Navigating to Claude.ai...")
        await page.goto('https://claude.ai', timeout=60000, wait_until='domcontentloaded')

        print(f"Success! URL: {page.url}")
        print(f"Title: {await page.title()}")

        await page.screenshot(path='claude-test.png')
        print("Screenshot saved: claude-test.png")

        await context.close()
        print("Test complete!")

if __name__ == "__main__":
    asyncio.run(test())
