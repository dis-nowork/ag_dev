# Claude.ai Plugin - Complete Interface Control

**Version:** 2.0
**Status:** Production Ready ✅
**Mode:** Headed (headless mode limited due to Claude.ai detection)

---

## 🎯 Features

This plugin provides **COMPLETE** control of Claude.ai's web interface:

- ✅ Chat operations (ask, send, get response)
- ✅ Project management (create, list, open, ask in project)
- ✅ File upload (PDF, images, code)
- ✅ **Artifact extraction** (download generated code/documents)
- ✅ Chat history (list, search, get specific chat)
- ✅ Model selection (Opus, Sonnet, Haiku)
- ✅ Authentication management

---

## 🚀 Quick Start

### 1. First Time Setup

```bash
cd ~/ag_dev/skills/site-controller

# Login once
DISPLAY=:0 ./site-cli claude login
# Browser opens → login → press ENTER
```

### 2. Basic Usage

```bash
# Ask a question
DISPLAY=:0 ./site-cli claude ask "Explain async programming"

# Create new chat
DISPLAY=:0 ./site-cli claude create-chat

# List recent chats
DISPLAY=:0 ./site-cli claude list-chats
```

---

## 📋 All Commands

### Authentication

```bash
# Manual login (first time)
./site-cli claude login
```

### Basic Chat

```bash
# Create new chat
./site-cli claude create-chat

# Send message
./site-cli claude send-message "Your message here"

# Get last response
./site-cli claude get-response

# Ask (send + get response in one command)
./site-cli claude ask "Your question here"

# List recent chats
./site-cli claude list-chats

# Search chats
./site-cli claude search-chats "keyword"

# Get specific chat content
./site-cli claude get-chat <chat-id>
```

### Projects

```bash
# Create new project
./site-cli claude create-project "My Project Name"

# List all projects
./site-cli claude list-projects

# Open specific project
./site-cli claude open-project "Project Name"

# Ask question within project context
./site-cli claude ask-in-project "My Project" "Your question"
```

### File Upload

```bash
# Upload file before asking
./site-cli claude upload-file /path/to/file.pdf

# Supported formats:
# - Documents: .pdf, .txt, .csv
# - Code: .py, .js, .html, .css
# - Images: .png, .jpg, .jpeg
```

### Artifacts (CRITICAL for Code/Document Extraction)

```bash
# List all artifacts in current chat
./site-cli claude get-artifacts

# Download specific artifact
./site-cli claude download-artifact 0 output/filename

# Download all artifacts
./site-cli claude download-all-artifacts output_directory/
```

**Artifact Flow Example:**

```bash
# 1. Ask Claude to create code
./site-cli claude ask "Write a Python web scraper as an artifact"

# 2. Wait for response, then get artifacts
./site-cli claude get-artifacts
# Output shows: [0] python (345 chars)

# 3. Download the artifact
./site-cli claude download-artifact 0 scraper
# Saves as: scraper.py (extension auto-detected)

# 4. Use the file
python scraper.py
```

### Model Selection

```bash
# Get current model
./site-cli claude get-model

# Switch model
./site-cli claude switch-model opus
./site-cli claude switch-model sonnet
./site-cli claude switch-model haiku
```

### Utilities

```bash
# Take screenshot
./site-cli claude screenshot output.png

# Get current URL
./site-cli claude current-url
```

---

## 🎬 Complete Workflow Example

```bash
cd ~/ag_dev/skills/site-controller

# 1. Create a project
DISPLAY=:0 ./site-cli claude create-project "Web Automation Tools"

# 2. Upload a requirements file
DISPLAY=:0 ./site-cli claude upload-file requirements.txt

# 3. Ask Claude to analyze and create code
DISPLAY=:0 ./site-cli claude ask "Based on this requirements file, create a Python script that implements the main features. Use artifacts."

# 4. Wait for response, then download artifacts
DISPLAY=:0 ./site-cli claude get-artifacts
DISPLAY=:0 ./site-cli claude download-all-artifacts ./generated_code/

# 5. Verify generated files
ls -la generated_code/
cat generated_code/artifact_0_python.py
```

---

## 🐍 OpenClaw Integration

### Basic Usage

```python
from openclaw_site_controller import ClaudeController

# Initialize (headed mode - works fully)
claude = ClaudeController(headless=False)

# Ask questions
answer = claude.ask("What is asyncio in Python?")
print(answer)

# Manage chats
claude.create_chat()
chats = claude.list_chats()

# Projects
claude.create_project("My Analysis Project")
projects = claude.list_projects()
```

### Advanced: Artifact Workflow

```python
import json
from openclaw_site_controller import SiteController

claude = SiteController('claude', headless=False)

# 1. Ask Claude to create code
claude._run('ask', "Create a FastAPI hello world app as an artifact")

# Wait for response
import time
time.sleep(10)

# 2. Get artifacts
artifacts_json = claude._run('get-artifacts')
artifacts = json.loads(artifacts_json) if artifacts_json.startswith('[') else []

print(f"Found {len(artifacts)} artifacts")

# 3. Download first artifact
if len(artifacts) > 0:
    result = claude._run('download-artifact', '0', 'app.py')
    print(f"Downloaded to: {result}")

# 4. Send file via Telegram (example)
# telegram_bot.send_document(chat_id, open('app.py', 'rb'))
```

### Complete Integration Example

```python
#!/usr/bin/env python3
"""OpenClaw skill: Claude Code Generator"""

from openclaw_site_controller import ClaudeController
import json

def generate_code_with_claude(prompt: str, output_dir: str = "./generated"):
    """
    Ask Claude to generate code and download artifacts

    Returns: List of generated file paths
    """
    claude = ClaudeController(headless=False)

    # Ask Claude to create code
    response = claude.ask(f"{prompt} Create it as an artifact.")
    print(f"Claude response: {response[:100]}...")

    # Wait for artifacts to render
    import time
    time.sleep(5)

    # Download all artifacts
    result = claude._run('download-all-artifacts', output_dir)

    # Parse result
    if isinstance(result, str) and result.startswith('{'):
        result_data = json.loads(result)
        if result_data.get('status') == 'success':
            files = result_data.get('files', [])
            print(f"\n✅ Generated {len(files)} files:")
            for f in files:
                print(f"   - {f}")
            return files

    return []

# Usage from OpenClaw
if __name__ == "__main__":
    files = generate_code_with_claude(
        "Create a Python web scraper for news articles",
        "./scrapers"
    )

    # Files are now ready to use or send via Telegram
    for f in files:
        print(f"Ready: {f}")
```

---

## 🔧 Configuration

### Selectors

All UI selectors are in `selectors.json`. Update if Claude.ai changes their interface.

**Key selectors:**
- `chat.input`: Message input field
- `artifacts.all_artifacts`: Code blocks containing artifacts
- `projects.create_project_button`: Project creation button

### Timeouts

Default timeout: 30 seconds
Ask command timeout: 180 seconds (Claude responses can be long)

---

## 🐛 Troubleshooting

### "Not logged in"

```bash
# Re-run login
DISPLAY=:0 ./site-cli claude login
```

### Artifacts not found

**Issue:** `get-artifacts` returns empty list

**Solutions:**
1. Wait longer after asking (artifacts take time to render)
2. Check if Claude actually created an artifact (look in browser)
3. Update selectors if Claude.ai UI changed

### Headless mode not working

**Expected:** Claude.ai blocks responses in headless mode

**Solution:** Use headed mode (remove `--headless` flag)

```bash
# Works
DISPLAY=:0 ./site-cli claude ask "Question"

# Doesn't work (no response)
./site-cli claude ask "Question" --headless
```

### Upload file fails

**Check:**
1. File exists and path is correct
2. File type is supported
3. File size is within Claude.ai limits

---

## 📊 Command Reference

| Command | Arguments | Description | Example |
|---------|-----------|-------------|---------|
| `login` | - | Manual login helper | `./site-cli claude login` |
| `ask` | `<question>` | Ask and get response | `./site-cli claude ask "Hello"` |
| `create-chat` | - | New chat | `./site-cli claude create-chat` |
| `send-message` | `<message>` | Send message | `./site-cli claude send-message "Hi"` |
| `get-response` | - | Get last response | `./site-cli claude get-response` |
| `list-chats` | - | Recent chats | `./site-cli claude list-chats` |
| `search-chats` | `<query>` | Search chats | `./site-cli claude search-chats "code"` |
| `get-chat` | `<chat-id>` | Get chat content | `./site-cli claude get-chat abc123` |
| `create-project` | `<name>` | New project | `./site-cli claude create-project "AI Tools"` |
| `list-projects` | - | All projects | `./site-cli claude list-projects` |
| `open-project` | `<name>` | Open project | `./site-cli claude open-project "AI Tools"` |
| `ask-in-project` | `<project> <msg>` | Ask in project | `./site-cli claude ask-in-project "AI" "Q"` |
| `upload-file` | `<filepath>` | Upload file | `./site-cli claude upload-file doc.pdf` |
| `get-artifacts` | - | List artifacts | `./site-cli claude get-artifacts` |
| `download-artifact` | `<index> <path>` | Download artifact | `./site-cli claude download-artifact 0 out.py` |
| `download-all-artifacts` | `<dir>` | Download all | `./site-cli claude download-all-artifacts ./out` |
| `switch-model` | `<model>` | Change model | `./site-cli claude switch-model opus` |
| `get-model` | - | Current model | `./site-cli claude get-model` |
| `screenshot` | `<path>` | Take screenshot | `./site-cli claude screenshot pic.png` |
| `current-url` | - | Get URL | `./site-cli claude current-url` |

---

## 🎓 Best Practices

1. **Always use DISPLAY=:0** for headed mode on Linux X11
2. **Wait after asking** before getting artifacts (responses take time)
3. **Specify full paths** for file operations
4. **Check artifact list** before downloading (use `get-artifacts` first)
5. **Use projects** for organizing related work
6. **Monitor browser** first time you try a new command (don't use headless)

---

## 📚 Resources

- Main README: `../../README.md`
- Selectors configuration: `./selectors.json`
- OpenClaw integration: `../../openclaw_site_controller.py`
- Test script: `../../test-complete-flow.sh`

---

**Version 2.0 - Full Feature Support** 🚀
**Last Updated:** 2026-02-22
