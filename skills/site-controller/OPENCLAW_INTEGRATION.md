# OpenClaw Integration Guide

How to use Site Controller from OpenClaw agents.

---

## 🎯 Overview

Site Controller provides CLI tools for controlling websites. OpenClaw agents can call these CLI tools to interact with web platforms.

**Flow:**
```
OpenClaw Agent
    ↓
Execute site-cli command
    ↓
Site Controller (browser automation)
    ↓
Website (Claude.ai, Gmail, etc.)
    ↓
Return result to agent
```

---

## 🔌 Method 1: Direct CLI Execution

### Python subprocess

```python
import subprocess
import json

def ask_claude(question: str) -> str:
    """Ask Claude.ai a question"""
    result = subprocess.run(
        [
            '/home/agdev/ag_dev/skills/site-controller/site-cli',
            'claude',
            'ask',
            question,
            '--headless'
        ],
        capture_output=True,
        text=True,
        timeout=120
    )

    if result.returncode == 0:
        return result.stdout.strip()
    else:
        raise Exception(f"Error: {result.stderr}")


# Usage in OpenClaw skill
answer = ask_claude("What is the capital of France?")
print(answer)
```

### Bash wrapper

```bash
#!/bin/bash
# openclaw-claude-ask.sh

QUESTION="$1"
cd ~/ag_dev/skills/site-controller
./site-cli claude ask "$QUESTION" --headless
```

```python
# From OpenClaw
result = subprocess.run(['openclaw-claude-ask.sh', 'Hello!'], capture_output=True)
```

---

## 🔌 Method 2: Python Wrapper Class

Create reusable wrapper for OpenClaw skills:

```python
# ~/ag_dev/skills/openclaw_site_controller.py

import subprocess
from pathlib import Path
from typing import List, Optional

SITE_CLI = Path.home() / "ag_dev/skills/site-controller/site-cli"


class SiteController:
    """OpenClaw wrapper for Site Controller"""

    def __init__(self, site: str, headless: bool = True, profile: Optional[str] = None):
        self.site = site
        self.headless = headless
        self.profile = profile or site

    def _run(self, command: str, *args, timeout: int = 120) -> str:
        """Execute site-cli command"""
        cmd = [str(SITE_CLI), self.site, command, *args]

        if self.headless:
            cmd.append('--headless')

        cmd.append(f'--profile={self.profile}')

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        if result.returncode != 0:
            raise Exception(f"Command failed: {result.stderr}")

        return result.stdout.strip()

    def run_json(self, command: str, *args, timeout: int = 120) -> dict:
        """Execute command and parse JSON response"""
        import json
        output = self._run(command, *args, timeout=timeout)
        try:
            return json.loads(output)
        except:
            return {"output": output}


class ClaudeController(SiteController):
    """Claude.ai specific controller"""

    def __init__(self, headless: bool = True):
        super().__init__('claude', headless=headless)

    def ask(self, question: str) -> str:
        """Ask Claude and get response"""
        return self._run('ask', question, timeout=180)

    def create_chat(self):
        """Create new chat"""
        return self.run_json('create-chat')

    def send_message(self, message: str):
        """Send message"""
        return self.run_json('send-message', message)

    def list_chats(self) -> List[str]:
        """Get chat history"""
        output = self._run('list-chats')
        return output.split('\n') if output else []

    def create_project(self, name: str):
        """Create project"""
        return self.run_json('create-project', name)

    def screenshot(self, path: str):
        """Take screenshot"""
        return self.run_json('screenshot', path)


# Usage in OpenClaw skill
claude = ClaudeController(headless=True)

# Ask question
answer = claude.ask("Explain quantum computing")
print(answer)

# Manage chats
claude.create_chat()
claude.send_message("Hello!")

# List history
chats = claude.list_chats()
for chat in chats[:5]:
    print(f"- {chat}")
```

---

## 🔌 Method 3: MCP-style Server (Future)

Create a persistent server that OpenClaw can connect to:

```python
# server.py (future enhancement)
from flask import Flask, request, jsonify
from openclaw_site_controller import SiteController

app = Flask(__name__)

@app.route('/claude/ask', methods=['POST'])
def claude_ask():
    question = request.json['question']
    controller = SiteController('claude')
    answer = controller._run('ask', question)
    return jsonify({'answer': answer})

@app.route('/gmail/send', methods=['POST'])
def gmail_send():
    data = request.json
    controller = SiteController('gmail')
    result = controller._run('send', data['to'], data['subject'], data['body'])
    return jsonify({'status': 'success'})

# Run: python server.py
```

```python
# OpenClaw uses HTTP
import requests

response = requests.post('http://localhost:5000/claude/ask', json={
    'question': 'Hello!'
})
print(response.json()['answer'])
```

---

## 📝 Example OpenClaw Skills

### Skill 1: Claude Research Assistant

```python
# skills/claude_research.py

from openclaw_site_controller import ClaudeController

def research_topic(topic: str) -> str:
    """
    Research a topic using Claude.ai

    Usage from OpenClaw:
        result = research_topic("quantum computing")
    """
    claude = ClaudeController(headless=True)

    # Create new chat for research
    claude.create_chat()

    # Ask research question
    prompt = f"Research and summarize the following topic in detail: {topic}"
    response = claude.ask(prompt)

    return response


# OpenClaw agent calls
result = research_topic("AI trends in 2026")
```

### Skill 2: Multi-Site Orchestration

```python
# skills/multi_site_query.py

from openclaw_site_controller import ClaudeController, SiteController

def cross_platform_research(question: str) -> dict:
    """
    Ask the same question across multiple AI platforms
    """
    claude = ClaudeController(headless=True)
    perplexity = SiteController('perplexity', headless=True)

    results = {}

    # Ask Claude
    try:
        results['claude'] = claude.ask(question)
    except Exception as e:
        results['claude'] = f"Error: {e}"

    # Ask Perplexity
    try:
        results['perplexity'] = perplexity._run('search', question)
    except Exception as e:
        results['perplexity'] = f"Error: {e}"

    return results


# Usage
answers = cross_platform_research("What are the latest AI developments?")
print("Claude:", answers['claude'])
print("Perplexity:", answers['perplexity'])
```

### Skill 3: Automated Documentation

```python
# skills/generate_docs.py

from openclaw_site_controller import ClaudeController
from pathlib import Path

def generate_documentation(code_file: str, output_file: str):
    """
    Generate documentation for code using Claude
    """
    claude = ClaudeController(headless=True)

    # Read code
    code = Path(code_file).read_text()

    # Ask Claude to document
    prompt = f"""Generate comprehensive documentation for this code:

```python
{code}
```

Include:
- Overview
- Function descriptions
- Parameters
- Return values
- Examples
"""

    documentation = claude.ask(prompt)

    # Save documentation
    Path(output_file).write_text(documentation)

    return documentation


# OpenClaw calls
generate_documentation('main.py', 'docs/main.md')
```

---

## 🛠️ OpenClaw Skill Template

Generic template for any Site Controller plugin:

```python
# skills/site_controller_skill.py

import subprocess
from pathlib import Path

SITE_CLI = Path.home() / "ag_dev/skills/site-controller/site-cli"


def execute_site_command(site: str, command: str, *args, headless=True, profile=None):
    """
    Generic Site Controller executor for OpenClaw

    Args:
        site: Plugin name (claude, gmail, etc.)
        command: Command to execute
        *args: Command arguments
        headless: Run in background
        profile: Browser profile to use

    Returns:
        Command output
    """
    cmd = [str(SITE_CLI), site, command, *args]

    if headless:
        cmd.append('--headless')

    if profile:
        cmd.append(f'--profile={profile}')

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=120
    )

    if result.returncode != 0:
        raise Exception(f"Command failed: {result.stderr}")

    return result.stdout.strip()


# Usage examples
answer = execute_site_command('claude', 'ask', 'Hello!')
chats = execute_site_command('claude', 'list-chats')
screenshot = execute_site_command('claude', 'screenshot', 'output.png')
```

---

## 🔄 Async Execution (Non-blocking)

For long-running commands, use async:

```python
import asyncio
import subprocess

async def ask_claude_async(question: str) -> str:
    """Ask Claude without blocking OpenClaw agent"""
    process = await asyncio.create_subprocess_exec(
        '/home/agdev/ag_dev/skills/site-controller/site-cli',
        'claude',
        'ask',
        question,
        '--headless',
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        raise Exception(stderr.decode())

    return stdout.decode().strip()


# Usage in async OpenClaw context
async def main():
    # Ask multiple questions in parallel
    questions = [
        "What is Python?",
        "What is JavaScript?",
        "What is Rust?"
    ]

    results = await asyncio.gather(*[
        ask_claude_async(q) for q in questions
    ])

    for q, a in zip(questions, results):
        print(f"Q: {q}\nA: {a}\n")

asyncio.run(main())
```

---

## 🎯 Best Practices

### 1. Always use headless mode in production

```python
# Good
claude = ClaudeController(headless=True)

# Bad (for automation)
claude = ClaudeController(headless=False)  # Opens visible browser
```

### 2. Handle errors gracefully

```python
try:
    answer = claude.ask(question)
except subprocess.TimeoutExpired:
    answer = "Request timed out"
except Exception as e:
    answer = f"Error: {e}"
```

### 3. Use profiles for multi-account

```python
# Work account
claude_work = ClaudeController(headless=True)
# Override default profile
claude_work.profile = 'work-account'

# Personal account
claude_personal = ClaudeController(headless=True)
claude_personal.profile = 'personal'
```

### 4. Cache responses when possible

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def ask_claude_cached(question: str) -> str:
    """Cache Claude responses to avoid duplicate queries"""
    claude = ClaudeController(headless=True)
    return claude.ask(question)
```

---

## 📊 Monitoring from OpenClaw

Track Site Controller usage:

```python
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('site-controller')

def ask_claude_monitored(question: str) -> str:
    """Ask Claude with monitoring"""
    start = time.time()

    try:
        claude = ClaudeController(headless=True)
        answer = claude.ask(question)

        duration = time.time() - start
        logger.info(f"Claude query succeeded in {duration:.2f}s")

        return answer

    except Exception as e:
        duration = time.time() - start
        logger.error(f"Claude query failed after {duration:.2f}s: {e}")
        raise
```

---

## 🔐 Security Considerations

### Don't pass sensitive data in CLI args

```python
# Bad - visible in process list
subprocess.run(['site-cli', 'gmail', 'send', 'user@example.com', 'SECRET_PASSWORD'])

# Good - use files or environment
with open('/tmp/email_body.txt', 'w') as f:
    f.write(sensitive_content)

subprocess.run(['site-cli', 'gmail', 'send-from-file', '/tmp/email_body.txt'])
os.remove('/tmp/email_body.txt')
```

### Validate inputs

```python
def ask_claude_safe(question: str) -> str:
    """Validate input before execution"""
    if len(question) > 10000:
        raise ValueError("Question too long")

    if any(char in question for char in ['`', '$', '$(', '|']):
        raise ValueError("Invalid characters in question")

    return ClaudeController().ask(question)
```

---

## 📚 Complete Example: OpenClaw Task Automation

```python
# openclaw_automation.py

from openclaw_site_controller import ClaudeController, SiteController
from pathlib import Path
import json

class OpenClawWebAutomation:
    """Complete automation suite for OpenClaw"""

    def __init__(self):
        self.claude = ClaudeController(headless=True)
        self.gmail = SiteController('gmail', headless=True)

    def research_and_report(self, topic: str, output_file: str):
        """Research topic and generate report"""
        # Research with Claude
        research = self.claude.ask(f"Research and summarize: {topic}")

        # Create formatted report
        report = f"""# Research Report: {topic}

## Summary
{research}

## Generated
{Path(__file__).name}
"""

        # Save report
        Path(output_file).write_text(report)

        # Take screenshot of Claude
        self.claude.screenshot('research-screenshot.png')

        return report

    def code_review_workflow(self, code_file: str):
        """Review code and send results"""
        code = Path(code_file).read_text()

        # Ask Claude to review
        review = self.claude.ask(f"Review this code:\n\n```\n{code}\n```")

        # Create result
        result = {
            'file': code_file,
            'review': review,
            'timestamp': str(Path(code_file).stat().st_mtime)
        }

        return result


# Usage in OpenClaw agent
automation = OpenClawWebAutomation()

# Task 1: Research
report = automation.research_and_report(
    "AI trends in 2026",
    "reports/ai-trends.md"
)

# Task 2: Code review
review = automation.code_review_workflow("main.py")
print(json.dumps(review, indent=2))
```

---

## 🎓 Summary

**Integration Methods:**
1. Direct subprocess calls (simple)
2. Python wrapper classes (recommended)
3. MCP-style server (future)

**Best for OpenClaw:**
- Use wrapper classes
- Always headless=True
- Handle errors
- Monitor performance
- Validate inputs

**Next Steps:**
1. Copy `openclaw_site_controller.py` to your skills directory
2. Create wrapper skills for your use cases
3. Test in OpenClaw environment
4. Deploy in production

---

**Ready to automate!** 🚀
