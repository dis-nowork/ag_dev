#!/usr/bin/env python3
"""
image-gen CLI — Entry point for CLAUDE_CAPABILITIES image generation.

Implements all 6 pillars:
  1. Prompt Engineering  — auto-enhances vague prompts
  2. Composition         — (handled by SKILL.md orchestration)
  3. Cost Guardrails     — --budget flag, estimates before execution
  4. Iteration Loop      — --iterate flag adjusts previous generation
  5. Fallback Chain      — gemini → dalle → pexels (transparent)
  6. Dry-Run             — --dry-run shows what WOULD happen

Usage:
  # Dry-run (preview prompt + cost)
  python generate.py --prompt "foto do cafe" --dry-run

  # Generate image
  python generate.py --prompt "foto do cafe" --output output/cafe.png

  # Iterate on previous generation
  python generate.py --iterate "fundo mais escuro" --output output/cafe_v2.png

  # Force specific provider
  python generate.py --prompt "foto do cafe" --provider dalle --output output/cafe.png
"""

import argparse
import json
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from claude_capabilities.image import enhance_prompt, generate_image, load_last_state
from claude_capabilities.cost import CostTracker


def handle_iterate(adjustment: str, output_path: str, dry_run: bool, budget: float, provider: str) -> dict:
    """
    Pilar 4: Iteration Loop.
    Load previous state, apply adjustment, regenerate.
    """
    last = load_last_state()
    if not last:
        return {
            "error": "no_previous_generation",
            "message": "No previous generation found. Use --prompt first.",
        }

    original = last["original_prompt"]
    style = last.get("style", "auto")

    # Build adjusted prompt by appending the modification
    adjusted_prompt = f"{original}, {adjustment}"

    print(f"[iterate] Original: {original}")
    print(f"[iterate] Adjustment: {adjustment}")
    print(f"[iterate] New prompt: {adjusted_prompt}")

    return generate_image(
        prompt=adjusted_prompt,
        output_path=output_path,
        style=style,
        dry_run=dry_run,
        preferred_provider=provider,
        budget_limit=budget,
    )


def main():
    parser = argparse.ArgumentParser(
        description="CLAUDE_CAPABILITIES image-gen: Intelligence layer for image generation"
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--prompt", type=str, help="Image description (any language)")
    group.add_argument("--iterate", type=str, help="Adjustment to apply to previous generation")

    parser.add_argument("--output", type=str, default="output/generated.png",
                        help="Output file path (default: output/generated.png)")
    parser.add_argument("--style", type=str, default="auto",
                        choices=["auto", "product", "hero", "lifestyle", "flat_lay",
                                 "portrait", "food", "minimal", "default"],
                        help="Image style (default: auto-detect)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview prompt and cost without generating")
    parser.add_argument("--budget", type=float, default=1.0,
                        help="Maximum cost in USD (default: $1.00)")
    parser.add_argument("--provider", type=str, default="auto",
                        choices=["auto", "gemini", "dalle", "pexels"],
                        help="Preferred provider (default: auto with fallback)")

    args = parser.parse_args()

    # Route to iterate or generate
    if args.iterate:
        result = handle_iterate(
            adjustment=args.iterate,
            output_path=args.output,
            dry_run=args.dry_run,
            budget=args.budget,
            provider=args.provider,
        )
    else:
        result = generate_image(
            prompt=args.prompt,
            output_path=args.output,
            style=args.style,
            dry_run=args.dry_run,
            preferred_provider=args.provider,
            budget_limit=args.budget,
        )

    # Output result as JSON
    print("\n" + "=" * 60)
    print("RESULT:")
    print("=" * 60)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Exit code based on result
    if "error" in result:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
