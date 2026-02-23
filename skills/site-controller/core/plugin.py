#!/usr/bin/env python3
"""
Site Controller - Plugin System
Base class for site-specific plugins
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class SitePlugin(ABC):
    """Base class for site-specific plugins"""

    def __init__(self, browser_engine, plugin_dir: Path):
        self.browser = browser_engine
        self.plugin_dir = plugin_dir
        self.selectors = self._load_selectors()
        self.config = self._load_config()

    def _load_selectors(self) -> Dict[str, Any]:
        """Load selector mappings from selectors.json"""
        selector_file = self.plugin_dir / "selectors.json"
        if selector_file.exists():
            with open(selector_file, 'r') as f:
                return json.load(f)
        return {}

    def _load_config(self) -> Dict[str, Any]:
        """Load plugin configuration"""
        config_file = self.plugin_dir / "config.json"
        if config_file.exists():
            with open(config_file, 'r') as f:
                return json.load(f)
        return {}

    @abstractmethod
    async def initialize(self):
        """Initialize plugin (e.g., navigate to site, check login)"""
        pass

    @abstractmethod
    def get_commands(self) -> Dict[str, callable]:
        """Return dict of available commands {name: function}"""
        pass

    async def ensure_logged_in(self) -> bool:
        """Check if logged in, return status"""
        login_selector = self.selectors.get('auth', {}).get('logged_in_indicator')
        if login_selector:
            return await self.browser.is_logged_in(login_selector)
        return True  # Assume logged in if no selector defined

    def get_selector(self, *path) -> Optional[str]:
        """Get selector from nested path (e.g., 'chat', 'input')"""
        value = self.selectors
        for key in path:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value if isinstance(value, str) else None
