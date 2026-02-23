#!/usr/bin/env python3
"""
Template Plugin - Copy this to create new site plugins
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.plugin import SitePlugin


class Plugin(SitePlugin):
    """Template plugin - rename this class"""

    async def initialize(self):
        """Navigate to site and verify login"""
        await self.browser.navigate(self.selectors['site_url'])

        # Check if logged in
        is_logged_in = await self.ensure_logged_in()
        if not is_logged_in:
            print("⚠️  Not logged in")
            print("   Run without --headless to login manually")
            raise Exception("Authentication required")

    def get_commands(self):
        """Return available commands"""
        return {
            'example-command': self.example_command,
            'another-command': self.another_command,
        }

    async def example_command(self, arg1: str):
        """Example command implementation"""
        try:
            # Use selectors from selectors.json
            selector = self.get_selector('main_actions', 'input_field')

            # Use browser methods
            await self.browser.fill(selector, arg1)
            await self.browser.click(self.get_selector('main_actions', 'submit_button'))

            # Extract result
            result = await self.browser.extract_text(
                self.get_selector('main_actions', 'result_container')
            )

            print(f"✅ Command executed successfully")
            return {"status": "success", "result": result}

        except Exception as e:
            print(f"❌ Command failed: {e}")
            return {"status": "error", "error": str(e)}

    async def another_command(self):
        """Another example command"""
        print("✅ Another command executed")
        return {"status": "success"}
