#!/usr/bin/env python3
"""
CLAUDE_CAPABILITIES CLI.

Usage:
  capabilities status                    # Show what's available
  capabilities init                      # Create .env and CLAUDE.md in current project
  capabilities image --prompt "cafe"     # Generate image
  capabilities copy --prompt "headline"  # Generate copy
  capabilities tts --text "Ola mundo"    # Generate speech
  capabilities cost                      # Show cost summary
"""

import argparse
import json
import os
import shutil
import sys
from pathlib import Path


def cmd_status(args):
    """Show available capabilities and their status."""
    from claude_capabilities.keys import get_optional
    from claude_capabilities.cost import CostTracker

    print("\n" + "=" * 60)
    print("CLAUDE_CAPABILITIES - Status")
    print("=" * 60)

    # Check API keys
    keys = {
        "GOOGLE_API_KEY_GEMINI": "Image (Imagen 4) + Text (Gemini)",
        "OPENAI_API_KEY": "Image (DALL-E 3) + Text (GPT) fallback",
        "PEXELS_API_KEY": "Stock images/video (free)",
        "ELEVENLABS_API_KEY": "TTS premium",
        "RUNPOD_API_KEY": "GPU tasks (XTTS, SD, Whisper)",
        "FAL_KEY": "Video (Kling)",
        "CLOUDFLARE_API_TOKEN": "Deploy (Pages)",
    }

    print("\nAPI Keys:")
    for key, desc in keys.items():
        status = "SET" if get_optional(key) else "NOT SET"
        icon = "+" if status == "SET" else "-"
        print(f"  [{icon}] {key}: {desc}")

    # Check capabilities
    print("\nCapabilities:")
    caps = [
        ("image-gen", "GOOGLE_API_KEY_GEMINI", "Generates professional images"),
        ("copywriter", "GOOGLE_API_KEY_GEMINI", "Generates high-conversion copy"),
        ("tts", None, "Text-to-speech (Edge TTS is free)"),
        ("video-gen", "FAL_KEY", "Video from image or text"),
        ("deploy-page", "CLOUDFLARE_API_TOKEN", "Deploy HTML to live URL"),
        ("content-pack", "GOOGLE_API_KEY_GEMINI", "Image + Copy + Hashtags"),
    ]

    for name, required_key, desc in caps:
        if required_key is None:
            available = True
        else:
            available = get_optional(required_key) is not None
        icon = "+" if available else "-"
        status = "READY" if available else f"needs {required_key}"
        print(f"  [{icon}] {name}: {desc} ({status})")

    # Cost summary
    tracker = CostTracker()
    print(f"\nCosts: {tracker.summary()}")
    print("=" * 60 + "\n")


def cmd_init(args):
    """Initialize CLAUDE_CAPABILITIES in the current project."""
    project_dir = Path.cwd()

    # Create .env.example
    env_example = project_dir / ".env.example"
    if not env_example.exists():
        pkg_dir = Path(__file__).parent
        src_env = pkg_dir.parent / ".env.example"
        if src_env.exists():
            shutil.copy2(src_env, env_example)
            print(f"  Created: {env_example}")
        else:
            # Generate from known keys
            content = """# CLAUDE_CAPABILITIES - API Keys
# Fill in the keys for the capabilities you want to use.

# Image Generation (at least one)
GOOGLE_API_KEY_GEMINI=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
PEXELS_API_KEY=your_pexels_api_key

# Text-to-Speech
ELEVENLABS_API_KEY=your_elevenlabs_key

# Video Generation
FAL_KEY=your_fal_ai_key

# Deployment
CLOUDFLARE_API_TOKEN=your_cloudflare_token
"""
            with open(env_example, "w") as f:
                f.write(content)
            print(f"  Created: {env_example}")
    else:
        print(f"  Exists:  {env_example}")

    # Create .env if not exists
    env_file = project_dir / ".env"
    if not env_file.exists():
        shutil.copy2(env_example, env_file)
        print(f"  Created: {env_file} (copy your keys here)")
    else:
        print(f"  Exists:  {env_file}")

    # Create CLAUDE.md reference
    claude_md = project_dir / "CLAUDE.md"
    if not claude_md.exists():
        pkg_dir = Path(__file__).parent
        src_claude = pkg_dir.parent / "CLAUDE.md"
        if src_claude.exists():
            shutil.copy2(src_claude, claude_md)
            print(f"  Created: {claude_md}")
        else:
            content = """# CLAUDE_CAPABILITIES

This project uses claude-capabilities.
Run `capabilities status` to see available capabilities.
Run `capabilities --help` for usage.
"""
            with open(claude_md, "w") as f:
                f.write(content)
            print(f"  Created: {claude_md}")
    else:
        print(f"  Exists:  {claude_md}")

    # Ensure .state/ and output/ exist
    for d in [".state", "output"]:
        p = project_dir / d
        p.mkdir(exist_ok=True)
        print(f"  Dir:     {p}/")

    # Add to .gitignore
    gitignore = project_dir / ".gitignore"
    entries_to_add = [".env", ".state/", "output/", "__pycache__/"]
    existing = ""
    if gitignore.exists():
        with open(gitignore) as f:
            existing = f.read()

    added = []
    with open(gitignore, "a") as f:
        for entry in entries_to_add:
            if entry not in existing:
                f.write(f"\n{entry}")
                added.append(entry)

    if added:
        print(f"  Updated: .gitignore (+{', '.join(added)})")

    print("\nDone. Configure your API keys in .env and run `capabilities status`.")


def cmd_cost(args):
    """Show cost tracking information."""
    from claude_capabilities.cost import CostTracker

    tracker = CostTracker()

    print("\n" + "=" * 60)
    print("Cost Tracking")
    print("=" * 60)
    print(f"\n{tracker.summary()}")

    recent = tracker.last_n(10)
    if recent:
        print(f"\nLast {len(recent)} operations:")
        for entry in recent:
            ts = entry["timestamp"][:16].replace("T", " ")
            print(f"  {ts}  ${entry['cost']:.4f}  {entry['operation']}  {entry.get('details', '')[:50]}")
    else:
        print("\nNo operations recorded yet.")

    print("=" * 60 + "\n")


def cmd_image(args):
    """Generate an image."""
    from claude_capabilities.image import generate_image

    result = generate_image(
        prompt=args.prompt,
        output_path=args.output or "output/generated.png",
        style=args.style or "auto",
        dry_run=args.dry_run,
        budget_limit=args.budget,
    )

    if args.dry_run:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif result.get("error"):
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"Image saved: {result.get('path')}")
        print(f"Cost: ${result.get('cost', 0):.4f}")


def cmd_copy(args):
    """Generate copy."""
    from claude_capabilities.text import generate_copy

    result = generate_copy(
        user_input=args.prompt,
        copy_type=args.type or "description",
        tone=args.tone or "autoridade",
        platform=args.platform,
        dry_run=args.dry_run,
    )

    if args.dry_run:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif result.get("error"):
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)
    else:
        print(result.get("copy", ""))


def cmd_tts(args):
    """Generate speech."""
    from claude_capabilities.audio import generate_speech

    result = generate_speech(
        text=args.text,
        output_path=args.output or "output/audio.mp3",
        voice_style=args.style or "narrator",
        dry_run=args.dry_run,
    )

    if args.dry_run:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif result.get("error"):
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"Audio saved: {result.get('path')}")
        print(f"Cost: ${result.get('cost', 0):.4f}")


def main():
    parser = argparse.ArgumentParser(
        prog="capabilities",
        description="CLAUDE_CAPABILITIES - Intelligence layer for AI agents",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # status
    subparsers.add_parser("status", help="Show available capabilities")

    # init
    subparsers.add_parser("init", help="Initialize in current project")

    # cost
    subparsers.add_parser("cost", help="Show cost tracking")

    # image
    p_image = subparsers.add_parser("image", help="Generate image")
    p_image.add_argument("--prompt", "-p", required=True, help="Image description")
    p_image.add_argument("--output", "-o", help="Output path")
    p_image.add_argument("--style", "-s", help="Style (auto, food, product, hero, portrait, lifestyle)")
    p_image.add_argument("--dry-run", action="store_true", help="Preview without generating")
    p_image.add_argument("--budget", type=float, default=1.0, help="Budget limit in USD")

    # copy
    p_copy = subparsers.add_parser("copy", help="Generate copy")
    p_copy.add_argument("--prompt", "-p", required=True, help="What to write")
    p_copy.add_argument("--type", "-t", help="Copy type (headline, cta, description, social_post, ad_copy, bio)")
    p_copy.add_argument("--tone", help="Tone (urgente, autoridade, casual, inspiracional, provocativo)")
    p_copy.add_argument("--platform", help="Platform (instagram, linkedin, twitter, facebook)")
    p_copy.add_argument("--dry-run", action="store_true", help="Preview without generating")

    # tts
    p_tts = subparsers.add_parser("tts", help="Generate speech")
    p_tts.add_argument("--text", "-t", required=True, help="Text to speak")
    p_tts.add_argument("--output", "-o", help="Output path")
    p_tts.add_argument("--style", "-s", help="Voice style (narrator, energetic, calm, conversational, urgent)")
    p_tts.add_argument("--dry-run", action="store_true", help="Preview without generating")

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        return

    commands = {
        "status": cmd_status,
        "init": cmd_init,
        "cost": cmd_cost,
        "image": cmd_image,
        "copy": cmd_copy,
        "tts": cmd_tts,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
