"""
Cost tracking and guardrails for CLAUDE_CAPABILITIES.

Pilar 3: Guardrails de Custo
- Estimates cost BEFORE execution
- Asks confirmation for expensive operations
- Tracks spending in real-time
- Reports per-session and total costs
"""

import json
import os
from datetime import datetime
from pathlib import Path

# Cost database: price per unit operation (USD)
COST_DB = {
    # Image generation
    "gemini_imagen": 0.04,
    "dalle3_standard_1024": 0.04,
    "dalle3_hd_1024": 0.08,
    "dalle3_standard_1792": 0.08,
    "dalle3_hd_1792": 0.12,
    "pexels": 0.00,
    # Video generation (future)
    "kling_5s": 0.35,
    "kling_10s": 0.70,
    "runway_4s": 0.50,
    # Audio/TTS
    "elevenlabs_1000chars": 0.30,
    "elevenlabs": 0.30,       # Per 1000 chars alias
    "xtts_runpod": 0.02,
    "xtts_local": 0.00,
    "edge_tts": 0.00,
    # Text generation (per ~500 token generation)
    "gemini_flash_text": 0.002,
    "gemini_pro_text": 0.005,
    "openai_4o_mini_text": 0.002,
    # Deployment
    "cloudflare_pages": 0.00,
    "vercel_deploy": 0.00,
    # RunPod GPU tasks
    "runpod_xtts": 0.02,
    "runpod_sd": 0.01,
    "runpod_whisper": 0.01,
    "runpod_upscale": 0.01,
    "runpod_rmbg": 0.01,
    # Video
    "kling_fal": 0.45,        # ~5s video via Fal.ai
    "pexels_video": 0.00,
}


class CostTracker:
    """Tracks costs across operations with persistence."""

    def __init__(self, state_dir: str | Path | None = None):
        if state_dir is None:
            state_dir = Path(__file__).parent.parent / ".state"
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.state_dir / "cost_log.json"
        self._entries = None
        self._session_start = datetime.now().isoformat()

    @property
    def entries(self) -> list[dict]:
        if self._entries is None:
            self._entries = self._load()
        return self._entries

    def _load(self) -> list[dict]:
        if self.log_file.exists():
            try:
                with open(self.log_file, encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save(self):
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(self.entries, f, indent=2, ensure_ascii=False)

    def estimate(self, operation: str, count: int = 1) -> float:
        """Estimate cost before execution."""
        unit_cost = COST_DB.get(operation, 0.0)
        return round(unit_cost * count, 4)

    def check_budget(self, operation: str, count: int, limit: float) -> dict:
        """Check if operation fits within budget limit."""
        estimated = self.estimate(operation, count)
        within_budget = estimated <= limit
        return {
            "operation": operation,
            "count": count,
            "estimated_cost": estimated,
            "budget_limit": limit,
            "within_budget": within_budget,
            "message": (
                f"${estimated:.2f} (within ${limit:.2f} budget)"
                if within_budget
                else f"${estimated:.2f} exceeds ${limit:.2f} budget!"
            ),
        }

    def add(self, operation: str, cost: float, details: str = ""):
        """Record a cost entry."""
        self.entries.append({
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "cost": round(cost, 4),
            "details": details,
        })
        self._save()

    def total(self) -> float:
        """Total cost across all time."""
        return round(sum(e["cost"] for e in self.entries), 4)

    def today_total(self) -> float:
        """Total cost for today."""
        today = datetime.now().date().isoformat()
        return round(
            sum(e["cost"] for e in self.entries if e["timestamp"].startswith(today)),
            4,
        )

    def summary(self) -> str:
        """Human-readable cost summary."""
        return f"Today: ${self.today_total():.2f} | All-time: ${self.total():.2f}"

    def last_n(self, n: int = 5) -> list[dict]:
        """Return last N cost entries."""
        return self.entries[-n:]

    def add_custom(self, operation: str, cost: float, details: str = ""):
        """Convenience alias for add(). Used by lib modules."""
        self.add(operation, cost, details)

    def get_session_cost(self) -> float:
        """Total cost for the current session (since this tracker was created)."""
        return round(
            sum(
                e["cost"]
                for e in self.entries
                if e["timestamp"] >= self._session_start
            ),
            4,
        )
