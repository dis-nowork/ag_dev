#!/usr/bin/env python3
"""
OpenClaw Site Controller Wrapper
Provides Python API for Site Controller CLI
"""

import subprocess
from pathlib import Path
from typing import List, Optional
import json


SITE_CLI = Path(__file__).parent / "site-cli"


class SiteController:
    """Generic Site Controller wrapper for OpenClaw"""

    def __init__(self, site: str, headless: bool = True, profile: Optional[str] = None):
        self.site = site
        self.headless = headless
        self.profile = profile or site

    def _run(self, command: str, *args, timeout: int = 120, output: str = None) -> str:
        """Execute site-cli command"""
        cmd = [str(SITE_CLI), self.site, command, *args]

        if self.headless:
            cmd.append('--headless')

        cmd.append(f'--profile={self.profile}')

        if output:
            cmd.append(f'--output={output}')

        env = {"DISPLAY": ":0"}
        env.update(__import__('os').environ)
        result = subprocess.run(
            cmd,
            capture_output=True,
            env=env,
            text=True,
            timeout=timeout
        )

        if result.returncode != 0:
            raise Exception(f"Command failed: {result.stderr}")

        return result.stdout.strip()

    def run_json(self, command: str, *args, timeout: int = 120) -> dict:
        """Execute command and parse JSON response"""
        output = self._run(command, *args, timeout=timeout)
        try:
            return json.loads(output)
        except:
            return {"output": output}


class ClaudeController(SiteController):
    """Claude.ai specific controller for OpenClaw - Full Feature Support"""

    def __init__(self, headless: bool = False, profile: str = "claude"):
        super().__init__('claude', headless=headless, profile=profile)

    # ========== Basic Chat ==========

    def ask(self, question: str, output: str = None):
        """
        Ask Claude and get response with AUTO artifact extraction

        Args:
            question: Question to ask
            output: Optional - None (auto), "file:<path>", or "clickup:<list_id>"

        Returns:
            - String: for short responses without artifacts
            - Dict: {"response": "...", "artifacts": [{...}]} if artifacts found
            - Dict: {"type": "file", "path": "..."} for long responses
        """
        result = self._run('ask', question, timeout=300, output=output)

        # Try to parse as JSON (artifacts, file delivery, etc)
        try:
            parsed = json.loads(result)

            # If artifacts were auto-extracted, return the structured response
            if isinstance(parsed, dict) and 'artifacts' in parsed:
                return parsed

            return parsed
        except:
            # Plain text response
            return result

    def research(self, topic: str, save_to: str = None):
        """
        Research topic with Claude and save intelligently

        Args:
            topic: Research topic/question
            save_to: Optional - "file:<path>", "clickup:<list_id>", or None (auto)

        Returns:
            Intelligent delivery based on response size
        """
        return self._run('research', topic, timeout=300, output=save_to)

    def create_chat(self):
        """Create new chat"""
        return self.run_json('create-chat')

    def send_message(self, message: str):
        """Send message"""
        return self.run_json('send-message', message)

    def get_response(self):
        """Get last response"""
        return self.run_json('get-response', timeout=180)

    def list_chats(self) -> List[str]:
        """Get chat history"""
        output = self._run('list-chats')
        if output.startswith('['):
            return json.loads(output)
        return [line.strip('- ') for line in output.split('\n') if line.strip()]

    def search_chats(self, query: str) -> List[str]:
        """Search in chat history"""
        output = self._run('search-chats', query)
        if output.startswith('['):
            return json.loads(output)
        return [line.strip('- ') for line in output.split('\n') if line.strip()]

    def get_chat(self, chat_id: str):
        """Get specific chat content"""
        return self.run_json('get-chat', chat_id)

    # ========== Projects ==========

    def create_project(self, name: str):
        """Create project"""
        return self.run_json('create-project', name)

    def list_projects(self) -> List[str]:
        """List projects"""
        output = self._run('list-projects')
        if output.startswith('['):
            return json.loads(output)
        return [line.strip('- ') for line in output.split('\n') if line.strip()]

    def open_project(self, name: str):
        """Open specific project"""
        return self.run_json('open-project', name)

    def ask_in_project(self, project_name: str, message: str):
        """Ask question within project context"""
        return self._run('ask-in-project', project_name, message, timeout=180)

    # ========== File Upload ==========

    def upload_file(self, filepath: str):
        """Upload file (PDF, image, code)"""
        return self.run_json('upload-file', filepath)

    # ========== Artifacts (CRITICAL) ==========

    def get_artifacts(self) -> List[dict]:
        """Get artifacts from current chat"""
        output = self._run('get-artifacts')
        if output.startswith('['):
            return json.loads(output)
        return []

    def download_artifact(self, index: int, output_path: str):
        """Download specific artifact"""
        return self.run_json('download-artifact', str(index), output_path)

    def download_all_artifacts(self, output_dir: str):
        """Download all artifacts in current chat"""
        return self.run_json('download-all-artifacts', output_dir)

    # ========== Model Selection ==========

    def switch_model(self, model: str):
        """Switch model (opus/sonnet/haiku)"""
        return self.run_json('switch-model', model)

    def get_model(self) -> str:
        """Get current model"""
        return self._run('get-model')

    # ========== Utilities ==========

    def screenshot(self, path: str = "screenshot.png"):
        """Take screenshot"""
        return self.run_json('screenshot', path)

    def current_url(self) -> str:
        """Get current URL"""
        return self._run('current-url')


# Convenience functions for quick usage
def ask_claude(question: str, headless: bool = True) -> str:
    """Quick function to ask Claude a question"""
    claude = ClaudeController(headless=headless)
    return claude.ask(question)


def claude_research(topic: str, headless: bool = True) -> str:
    """Research a topic with Claude"""
    claude = ClaudeController(headless=headless)
    prompt = f"Research and provide a comprehensive summary of: {topic}"
    return claude.ask(prompt)


if __name__ == "__main__":
    # Demo
    print("OpenClaw Site Controller Demo")
    print("=" * 50)

    # Test Claude
    print("\nTesting Claude.ai integration...")
    claude = ClaudeController(headless=True)

    print("\n1. Asking Claude a question...")
    answer = claude.ask("Say hello in one sentence")
    print(f"   Answer: {answer}")

    print("\n2. Listing chats...")
    chats = claude.list_chats()
    print(f"   Found {len(chats)} chats")

    print("\n3. Current URL...")
    url = claude.current_url()
    print(f"   URL: {url}")

    print("\n✅ Demo complete!")
