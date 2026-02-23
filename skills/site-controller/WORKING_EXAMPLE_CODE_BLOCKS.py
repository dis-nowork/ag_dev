#!/usr/bin/env python3
"""
✅ WORKING EXAMPLE: Code Block Extraction

This demonstrates the CORRECT way to extract code blocks from Claude:
- Keep browser session open (don't close between operations)
- Ask for code
- Wait for response
- Extract code blocks (automatic fallback from visual artifacts)
- Download to files

Perfect for:
- OpenClaw Telegram bot integration
- Automated code generation pipelines
- Research and documentation workflows
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.browser import BrowserEngine
from plugins.claude.commands import Plugin

async def main():
    print("="*70)
    print("✅ WORKING EXAMPLE: Code Block Extraction from Claude.ai")
    print("="*70)

    # Initialize browser (stays open for entire session)
    browser = BrowserEngine(profile_name="claude", headless=False)
    await browser.start()

    # Initialize Claude plugin
    plugin_dir = Path(__file__).parent / "plugins" / "claude"
    claude = Plugin(browser, plugin_dir)

    # Check login
    is_logged_in = await claude.ensure_logged_in()
    if not is_logged_in:
        print("\n❌ Not logged in. Run: ./site-cli claude login")
        await browser.stop()
        return

    print("\n✅ Logged in to Claude.ai")

    # ==================================================================
    # STEP 1: Ask Claude for code
    # ==================================================================
    print("\n" + "-"*70)
    print("STEP 1: Asking Claude for code")
    print("-"*70)

    question = "Create a Python class for a simple TODO list with add, remove, and list methods"
    print(f"Question: {question}")

    response = await claude.ask(question)
    print(f"\nClaude's response: {response[:200]}...")

    # ==================================================================
    # STEP 2: Wait for code to render
    # ==================================================================
    print("\n" + "-"*70)
    print("STEP 2: Waiting for code blocks to fully render")
    print("-"*70)

    await asyncio.sleep(8)  # Give time for code blocks to appear
    print("✅ Wait complete")

    # ==================================================================
    # STEP 3: Extract code blocks (automatic fallback)
    # ==================================================================
    print("\n" + "-"*70)
    print("STEP 3: Extracting code blocks")
    print("-"*70)

    artifacts = await claude.get_artifacts()

    if not artifacts or len(artifacts) == 0:
        print("❌ No code blocks found")
        await browser.stop()
        return

    print(f"✅ Found {len(artifacts)} code block(s)!")

    for art in artifacts:
        print(f"\n  [{art['index']}] {art['language']} - {art['type']}")
        print(f"      Size: {art['size']} chars")
        print(f"      Preview: {art['preview'][:60]}...")

    # ==================================================================
    # STEP 4: Download code blocks to files
    # ==================================================================
    print("\n" + "-"*70)
    print("STEP 4: Downloading code blocks to files")
    print("-"*70)

    output_dir = Path("/tmp/claude_generated")
    output_dir.mkdir(exist_ok=True)

    for i in range(len(artifacts)):
        output_path = output_dir / f"code_block_{i}.py"

        result = await claude.download_artifact(i, str(output_path))

        if result.get('status') == 'success':
            print(f"\n✅ Downloaded block {i}:")
            print(f"   Path: {result['path']}")
            print(f"   Language: {result['language']}")
            print(f"   Size: {result['size']} chars")

            # Show content
            with open(result['path']) as f:
                content = f.read()
                print(f"\n   Content:")
                print("   " + "="*60)
                for line in content.split('\n')[:15]:  # First 15 lines
                    print(f"   {line}")
                if content.count('\n') > 15:
                    print(f"   ... ({content.count('\n') - 15} more lines)")
                print("   " + "="*60)

    # ==================================================================
    # STEP 5: Optional - Use in OpenClaw/Telegram workflow
    # ==================================================================
    print("\n" + "-"*70)
    print("STEP 5: Integration Example")
    print("-"*70)

    print("""
For OpenClaw Telegram bot integration:

1. Keep this browser session open
2. Receive request via Telegram
3. Call: response = await claude.ask(user_request)
4. Wait: await asyncio.sleep(8)
5. Extract: artifacts = await claude.get_artifacts()
6. Download: await claude.download_artifact(0, output_path)
7. Send file via Telegram: bot.send_document(chat_id, open(output_path, 'rb'))

Example integration:
    artifacts = await claude.get_artifacts()
    for i, art in enumerate(artifacts):
        filepath = f"/tmp/artifact_{i}_{art['language']}"
        result = await claude.download_artifact(i, filepath)
        telegram_bot.send_document(user_chat_id, open(filepath, 'rb'))
""")

    # ==================================================================
    # Cleanup
    # ==================================================================
    print("\n" + "="*70)
    print("✅ EXAMPLE COMPLETE!")
    print(f"   Files saved to: {output_dir}")
    print(f"   Generated files: {list(output_dir.glob('*'))}")
    print("="*70)

    await browser.stop()

if __name__ == "__main__":
    asyncio.run(main())
