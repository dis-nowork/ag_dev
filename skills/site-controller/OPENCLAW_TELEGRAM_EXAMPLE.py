#!/usr/bin/env python3
"""
Complete Example: OpenClaw + Site Controller + Telegram Bot

This shows how to:
1. Receive request via Telegram
2. Use Claude to generate code
3. Extract artifacts
4. Send back to user via Telegram
"""

import sys
import time
from pathlib import Path

# Add site-controller to path
sys.path.insert(0, '/home/agdev/ag_dev/skills/site-controller')

from openclaw_site_controller import ClaudeController


class ClaudeCodeGenerator:
    """OpenClaw skill for generating code with Claude"""

    def __init__(self):
        # Use headed mode (Claude blocks headless)
        self.claude = ClaudeController(headless=False)

    def generate_code(self, prompt: str, output_dir: str = "./generated") -> dict:
        """
        Generate code with Claude and download artifacts

        Args:
            prompt: What to ask Claude to create
            output_dir: Where to save generated files

        Returns:
            {
                "status": "success|error",
                "response": "Claude's text response",
                "files": ["path/to/file1.py", "path/to/file2.js", ...],
                "artifacts": [{"index": 0, "language": "python", ...}, ...]
            }
        """
        result = {
            "status": "pending",
            "response": "",
            "files": [],
            "artifacts": []
        }

        try:
            # Step 1: Ask Claude to create code as artifact
            print(f"🤖 Asking Claude: {prompt}")
            enhanced_prompt = f"{prompt}. Create it as an artifact with proper documentation."

            response = self.claude.ask(enhanced_prompt)
            result["response"] = response

            print(f"✅ Claude responded ({len(response)} chars)")

            # Step 2: Wait for artifacts to fully render in browser
            print("⏳ Waiting for artifacts to render...")
            time.sleep(8)  # Give time for artifact panel to appear

            # Step 3: Get list of artifacts
            print("📋 Getting artifacts...")
            artifacts = self.claude.get_artifacts()

            if isinstance(artifacts, list) and len(artifacts) > 0:
                result["artifacts"] = artifacts
                print(f"✅ Found {len(artifacts)} artifacts")

                # Step 4: Download all artifacts
                print(f"💾 Downloading to {output_dir}...")
                download_result = self.claude.download_all_artifacts(output_dir)

                if isinstance(download_result, dict) and download_result.get('status') == 'success':
                    result["files"] = download_result.get('files', [])
                    result["status"] = "success"
                    print(f"✅ Downloaded {len(result['files'])} files")
                else:
                    print("⚠️  Download failed or returned unexpected result")
                    # Try downloading individually
                    for art in artifacts:
                        idx = art['index']
                        lang = art['language']
                        filepath = f"{output_dir}/artifact_{idx}_{lang}"

                        try:
                            artifact_result = self.claude.download_artifact(idx, filepath)
                            if isinstance(artifact_result, dict) and artifact_result.get('status') == 'success':
                                result["files"].append(artifact_result['path'])
                        except Exception as e:
                            print(f"   ❌ Failed to download artifact {idx}: {e}")

                    if len(result["files"]) > 0:
                        result["status"] = "success"
            else:
                print("⚠️  No artifacts found")
                print("   Claude may not have created code artifacts")
                result["status"] = "no_artifacts"

        except Exception as e:
            print(f"❌ Error: {e}")
            result["status"] = "error"
            result["error"] = str(e)

        return result


# ========== Example Integration with Telegram Bot ==========

def telegram_bot_example():
    """
    Simulated Telegram bot integration

    In real OpenClaw, this would be triggered by Telegram message
    """

    # Simulate receiving message from Telegram
    user_id = "123456789"
    user_message = "Create a Python web scraper that extracts news article titles from a website"

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║         OPENCLAW + CLAUDE + TELEGRAM INTEGRATION                 ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    print(f"\n📱 Telegram User {user_id}: {user_message}\n")

    # Step 1: Generate code with Claude
    generator = ClaudeCodeGenerator()
    result = generator.generate_code(
        prompt=user_message,
        output_dir=f"./generated/{user_id}"
    )

    # Step 2: Process result
    if result["status"] == "success":
        print("\n" + "="*60)
        print("✅ CODE GENERATION SUCCESSFUL")
        print("="*60)

        print(f"\n📝 Claude's Response:")
        print(result["response"][:200] + "..." if len(result["response"]) > 200 else result["response"])

        print(f"\n📦 Generated Files ({len(result['files'])}):")
        for filepath in result["files"]:
            path = Path(filepath)
            print(f"   • {path.name} ({path.stat().st_size} bytes)")

        # Step 3: Send files back via Telegram
        print(f"\n📤 Sending files to Telegram user {user_id}...")

        for filepath in result["files"]:
            # In real implementation:
            # telegram_bot.send_document(
            #     chat_id=user_id,
            #     document=open(filepath, 'rb'),
            #     caption=f"Generated: {Path(filepath).name}"
            # )

            print(f"   ✅ Sent: {Path(filepath).name}")

        print("\n✅ Complete workflow executed successfully!")

    elif result["status"] == "no_artifacts":
        print("\n⚠️  Claude responded but didn't create code artifacts")
        print("   Sending text response instead...")

        # Send text response via Telegram
        # telegram_bot.send_message(user_id, result["response"])

        print(f"   ✅ Sent text response ({len(result['response'])} chars)")

    else:
        print(f"\n❌ Generation failed: {result.get('error', 'Unknown error')}")

        # Send error message to user
        # telegram_bot.send_message(user_id, "Sorry, I couldn't generate the code. Please try again.")

        print("   ✅ Sent error message to user")


# ========== OpenClaw Skill Interface ==========

def openclaw_skill_generate_code(prompt: str, user_id: str = "default") -> dict:
    """
    OpenClaw skill: Generate code with Claude

    Usage in OpenClaw:
        result = openclaw_skill_generate_code(
            "Create a FastAPI hello world app",
            user_id="telegram_123456"
        )

        for file in result['files']:
            telegram_bot.send_document(chat_id, open(file, 'rb'))
    """
    generator = ClaudeCodeGenerator()
    return generator.generate_code(
        prompt=prompt,
        output_dir=f"./openclaw_generated/{user_id}"
    )


# ========== Advanced: Multi-step Workflow ==========

def advanced_workflow_example():
    """
    Advanced example with multiple steps:
    1. Upload requirements file
    2. Ask Claude to analyze
    3. Ask Claude to implement features
    4. Download all artifacts
    """

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║              ADVANCED MULTI-STEP WORKFLOW                        ║")
    print("╚══════════════════════════════════════════════════════════════════╝\n")

    claude = ClaudeController(headless=False)

    # Step 1: Create new chat
    print("1. Creating new chat...")
    claude.create_chat()
    time.sleep(2)

    # Step 2: Upload requirements file (if exists)
    requirements_file = "./requirements.txt"
    if Path(requirements_file).exists():
        print(f"2. Uploading {requirements_file}...")
        claude.upload_file(requirements_file)
        time.sleep(2)

        # Step 3: Ask Claude to analyze
        print("3. Asking Claude to analyze requirements...")
        analysis = claude.ask("Analyze this requirements file and list the main dependencies and their purposes.")
        print(f"   Analysis received ({len(analysis)} chars)")
        time.sleep(5)

    # Step 4: Ask Claude to implement
    print("4. Asking Claude to implement features...")
    prompt = """Based on the requirements, create a complete Python application with:
    1. Main application file
    2. Configuration module
    3. Helper utilities
    Create all as artifacts."""

    response = claude.ask(prompt)
    print(f"   Response received ({len(response)} chars)")
    time.sleep(8)

    # Step 5: Download all artifacts
    print("5. Downloading all generated artifacts...")
    artifacts = claude.get_artifacts()
    print(f"   Found {len(artifacts)} artifacts")

    claude.download_all_artifacts("./multi_step_output")

    print("\n✅ Advanced workflow complete!")
    print("   Check ./multi_step_output/ for generated files")


# ========== Main Execution ==========

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="OpenClaw + Claude + Telegram Example")
    parser.add_argument(
        '--mode',
        choices=['simple', 'telegram', 'advanced'],
        default='simple',
        help='Which example to run'
    )
    parser.add_argument(
        '--prompt',
        type=str,
        help='Custom prompt for simple mode'
    )

    args = parser.parse_args()

    if args.mode == 'simple':
        prompt = args.prompt or "Create a Python function to calculate factorial"
        generator = ClaudeCodeGenerator()
        result = generator.generate_code(prompt)

        if result["status"] == "success":
            print(f"\n✅ Generated {len(result['files'])} files")
            for f in result['files']:
                print(f"   • {f}")
        else:
            print(f"\n❌ Failed: {result.get('error', 'Unknown error')}")

    elif args.mode == 'telegram':
        telegram_bot_example()

    elif args.mode == 'advanced':
        advanced_workflow_example()
