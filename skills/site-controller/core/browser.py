#!/usr/bin/env python3
"""
Site Controller - Generic Browser Engine
Uses Patchright Chromium for anti-bot evasion
"""

import asyncio
import os
from pathlib import Path
from typing import Optional, Dict, Any
from patchright.async_api import async_playwright, BrowserContext, Page

# Use Patchright's Chromium
PROFILES_DIR = Path(__file__).parent.parent / "profiles"
PROFILES_DIR.mkdir(exist_ok=True)


class BrowserEngine:
    """Generic browser controller with profile isolation"""

    def __init__(self, profile_name: str = "default", headless: bool = False):
        self.profile_name = profile_name
        self.profile_dir = PROFILES_DIR / profile_name
        self.headless = headless
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.playwright = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()

    async def start(self):
        """Initialize browser with anti-bot evasion"""
        self.profile_dir.mkdir(exist_ok=True)
        self.playwright = await async_playwright().start()

        # Anti-bot configuration + DNS fix
        launch_args = [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-features=NetworkService',  # DNS fix - disable modern network stack
            '--enable-features=NetworkServiceInProcess',  # DNS fix - use in-process network
            '--ignore-certificate-errors',
            '--disable-blink-features=AutomationControlled',
        ]

        # Additional anti-detection for headless mode
        if self.headless:
            launch_args.extend([
                '--window-size=1920,1080',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
            ])

        # Launch persistent context with Patchright's Chromium
        env = os.environ.copy()
        env['DISPLAY'] = env.get('DISPLAY', ':0')  # DNS fix

        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=str(self.profile_dir),
            headless=self.headless,
            args=launch_args,
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/New_York',
            env=env,
        )

        # Anti-detection scripts (disabled - may cause DNS issues)
        # await self.context.add_init_script("""
        #     Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        #     Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
        #     Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
        #     window.chrome = {runtime: {}};
        # """)

        # Get or create page
        if len(self.context.pages) > 0:
            self.page = self.context.pages[0]
        else:
            self.page = await self.context.new_page()

        self.page.set_default_timeout(30000)

    async def stop(self):
        """Clean shutdown"""
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()

    async def navigate(self, url: str, timeout: int = 60000):
        """Navigate to URL"""
        await self.page.goto(url, wait_until='domcontentloaded', timeout=timeout)

    async def click(self, selector: str, timeout: int = 10000):
        """Click element"""
        await self.page.click(selector, timeout=timeout)

    async def fill(self, selector: str, value: str, timeout: int = 10000):
        """Fill input field"""
        await self.page.fill(selector, value, timeout=timeout)

    async def press(self, selector: str, key: str):
        """Press keyboard key on element"""
        await self.page.press(selector, key)

    async def wait_for(self, selector: str, timeout: int = 10000, state: str = 'visible'):
        """Wait for element to be in state"""
        await self.page.wait_for_selector(selector, timeout=timeout, state=state)

    async def extract_text(self, selector: str, timeout: int = 10000) -> str:
        """Extract text from element"""
        element = await self.page.wait_for_selector(selector, timeout=timeout)
        return await element.text_content() if element else ""

    async def extract_all_text(self, selector: str) -> list:
        """Extract text from all matching elements"""
        elements = await self.page.query_selector_all(selector)
        return [await elem.text_content() for elem in elements]

    async def extract_attribute(self, selector: str, attribute: str, timeout: int = 10000) -> str:
        """Extract attribute from element"""
        element = await self.page.wait_for_selector(selector, timeout=timeout)
        return await element.get_attribute(attribute) if element else ""

    async def screenshot(self, path: str, full_page: bool = False):
        """Take screenshot"""
        await self.page.screenshot(path=path, full_page=full_page)

    async def wait_seconds(self, seconds: float):
        """Wait for specified seconds"""
        await asyncio.sleep(seconds)

    async def evaluate(self, script: str) -> Any:
        """Execute JavaScript"""
        return await self.page.evaluate(script)

    async def download_file(self, trigger_selector: str, download_path: str) -> str:
        """Click download trigger and save file"""
        async with self.page.expect_download() as download_info:
            await self.page.click(trigger_selector)
        download = await download_info.value
        await download.save_as(download_path)
        return download_path

    def get_current_url(self) -> str:
        """Get current page URL"""
        return self.page.url

    async def is_logged_in(self, logged_in_selector: str) -> bool:
        """Check if logged in by looking for a selector that only appears when authenticated"""
        try:
            await self.page.wait_for_selector(logged_in_selector, timeout=15000)
            return True
        except:
            return False
