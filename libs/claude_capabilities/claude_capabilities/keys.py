"""
Secure API key management for CLAUDE_CAPABILITIES.

Priority:
  1. Environment variables (already set)
  2. .env file (local development)
  3. Clear error with instructions
"""

import os
from pathlib import Path

_loaded = False


def _load_dotenv():
    """Load .env file into environment (once)."""
    global _loaded
    if _loaded:
        return
    _loaded = True

    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return

    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ.setdefault(key, value)


def get(key_name: str) -> str:
    """Get required API key. Raises if not found."""
    _load_dotenv()
    value = os.environ.get(key_name)
    if not value:
        raise EnvironmentError(
            f"API key '{key_name}' not found.\n"
            f"Set it as environment variable or add to .env file.\n"
            f"See .env.example for reference."
        )
    return value


def get_optional(key_name: str) -> str | None:
    """Get API key if available, None otherwise."""
    _load_dotenv()
    return os.environ.get(key_name)


def available(*key_names: str) -> list[str]:
    """Return which of the given keys are available."""
    _load_dotenv()
    return [k for k in key_names if os.environ.get(k)]
