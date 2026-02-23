#!/usr/bin/env python3
"""Test Patchright browser with DNS fixes"""

import asyncio
import os
from patchright.async_api import async_playwright

async def test():
    print("Starting Patchright...")

    env = os.environ.copy()
    env['DISPLAY'] = env.get('DISPLAY', ':0')

    async with async_playwright() as p:
        print("Launching browser...")

        browser = await p.chromium.launch(
            headless=False,
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-features=NetworkService',
                '--enable-features=NetworkServiceInProcess',
                '--ignore-certificate-errors',
            ],
            env=env
        )

        print("Browser launched!")

        page = await browser.new_page()
        print("New page created")

        print("Navigating to Google...")
        await page.goto('https://www.google.com', timeout=30000)

        print(f"Success! URL: {page.url}")
        print(f"Title: {await page.title()}")

        await page.screenshot(path='test-screenshot.png')
        print("Screenshot saved: test-screenshot.png")

        await browser.close()
        print("Test complete!")

if __name__ == "__main__":
    asyncio.run(test())
