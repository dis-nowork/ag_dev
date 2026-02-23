# Site Controller

**Universal CLI for web automation** - Control any website through terminal commands using persistent browser sessions.

---

## 🎯 What is This?

A framework that turns websites into CLI tools. Instead of clicking through UIs, you run commands:

```bash
# Control Claude.ai
site-cli claude ask "Explain quantum physics"

# Control Gmail
site-cli gmail send "user@example.com" "Hello" "Message body"

# Control any site you map
site-cli linkedin post "Check out my new project!"
```

**Built for OpenClaw agents** to use web platforms programmatically.

---

## 🏗️ Architecture

```
site-controller/
├── core/                          # Generic framework
│   ├── browser.py                # Patchright browser engine
│   └── plugin.py                 # Plugin base class
│
├── plugins/                       # Site-specific plugins
│   ├── claude/                   # Claude.ai plugin
│   │   ├── commands.py          # CLI commands
│   │   ├── selectors.json       # UI mappings
│   │   └── config.json
│   │
│   └── _template/                # Template for new plugins
│
├── profiles/                      # Browser profiles (persistent login)
│   ├── claude/                   # Profile for Claude.ai
│   └── gmail/                    # Profile for Gmail
│
├── guides/
│   └── MAPPING_PROCESS.md        # How to add new sites
│
└── site-cli                       # Main CLI entry point
```

---

## 🚀 Installation

### 1. Dependencies

```bash
cd ~/ag_dev/skills/site-controller
pip install playwright patchright
playwright install chromium
```

### 2. Make CLI executable

```bash
chmod +x site-cli
```

### 3. Add to PATH (optional)

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$HOME/ag_dev/skills/site-controller:$PATH"

# Then use globally:
site-cli claude ask "Hello"
```

---

## 📖 Usage

### Basic Command Format

```bash
site-cli <site> <command> [args...] [options]
```

**Options:**
- `--headless` - Run in background (no visible browser)
- `--profile=NAME` - Use specific profile (default: site name)

---

## 🎮 Claude.ai Plugin

Full control of Claude.ai interface.

### First Time Setup (Login)

```bash
# Open browser to login (headed mode)
site-cli claude current-url

# Login to Claude.ai in the browser that opens
# Close browser when done
# Session is now saved!
```

### Commands

```bash
# Ask a question (send + get response)
site-cli claude ask "What is the capital of France?"

# Create new chat
site-cli claude create-chat

# Send message
site-cli claude send-message "Explain async/await"

# Get last response
site-cli claude get-response

# List chat history
site-cli claude list-chats

# Create project
site-cli claude create-project "My Project"

# List projects
site-cli claude list-projects

# Get artifacts in current chat
site-cli claude get-artifacts

# Download artifact
site-cli claude download-artifact /path/to/save.txt

# Screenshot
site-cli claude screenshot output.png

# Get current URL
site-cli claude current-url
```

### Examples

```bash
# Ask in headed mode (see browser)
site-cli claude ask "Write a Python fibonacci function"

# Ask in headless (background)
site-cli claude ask "What is 2+2?" --headless

# Create chat and ask multiple questions
site-cli claude create-chat
site-cli claude ask "First question"
site-cli claude ask "Follow-up question"

# Use different profile
site-cli claude ask "Hello" --profile=work-account
```

---

## 🔌 Adding New Sites

See **[guides/MAPPING_PROCESS.md](guides/MAPPING_PROCESS.md)** for detailed process.

**Quick version:**

1. **Copy template:**
```bash
cp -r plugins/_template plugins/gmail
```

2. **Map selectors** (use Chrome DevTools):
```json
{
  "site_url": "https://mail.google.com",
  "auth": {
    "logged_in_indicator": "[role='navigation']"
  },
  "compose": {
    "compose_button": "[aria-label='Compose']",
    "to_field": "input[name='to']",
    "subject_field": "input[name='subjectbox']",
    "body_field": "[aria-label='Message Body']",
    "send_button": "[aria-label='Send']"
  }
}
```

3. **Implement commands:**
```python
class Plugin(SitePlugin):
    def get_commands(self):
        return {
            'send': self.send_email,
        }

    async def send_email(self, to, subject, body):
        await self.browser.click(self.get_selector('compose', 'compose_button'))
        await self.browser.fill(self.get_selector('compose', 'to_field'), to)
        # ... etc
```

4. **Test:**
```bash
site-cli gmail send "user@example.com" "Hi" "Hello"
```

**Time to add new site:** ~30 minutes

---

## 🔐 Profile Management

Each site gets its own isolated browser profile with persistent cookies.

### Profile Locations

```
profiles/
├── claude/           # Claude.ai session
├── gmail/            # Gmail session
└── custom-profile/   # Custom profile
```

### Using Profiles

```bash
# Default: uses site name as profile
site-cli claude ask "Hello"  # Uses profiles/claude/

# Custom profile
site-cli claude ask "Hello" --profile=work-account  # Uses profiles/work-account/

# Multiple accounts for same site
site-cli claude ask "Q1" --profile=personal
site-cli claude ask "Q2" --profile=work
```

### Reset Profile (Logout)

```bash
rm -rf profiles/claude/
site-cli claude current-url  # Login again
```

---

## 🔧 Browser Engine

Uses **Patchright** (anti-detection fork of Playwright).

**Features:**
- ✅ Uses Chromium from `~/.cache/ms-playwright/`
- ✅ Anti-bot evasion (removes webdriver flags)
- ✅ Persistent profiles (cookies saved)
- ✅ Headless and headed modes
- ✅ Screenshot capture
- ✅ File downloads
- ✅ JavaScript execution

**Available in commands.py:**

```python
# Browser methods
await self.browser.navigate(url)
await self.browser.click(selector)
await self.browser.fill(selector, value)
await self.browser.wait_for(selector)
await self.browser.extract_text(selector)
await self.browser.screenshot(path)
# ... see core/browser.py for all methods
```

---

## 🔗 OpenClaw Integration

Use from OpenClaw agent skills:

```python
# In your OpenClaw skill
import subprocess
import json

def ask_claude(question: str) -> str:
    """Ask Claude.ai via CLI"""
    result = subprocess.run(
        ['site-cli', 'claude', 'ask', question, '--headless'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

# Use it
answer = ask_claude("What is Python async?")
```

**Or create wrapper:**

```python
# openclaw_wrapper.py
class SiteController:
    def __init__(self, site: str, headless: bool = True):
        self.site = site
        self.headless = headless

    def run(self, command: str, *args) -> str:
        cmd = ['site-cli', self.site, command, *args]
        if self.headless:
            cmd.append('--headless')

        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.stdout

# Usage in OpenClaw
claude = SiteController('claude')
response = claude.run('ask', 'Hello!')
```

---

## 🐛 Troubleshooting

### "Plugin not found"

```bash
# Check available plugins
ls -la plugins/

# Verify plugin structure
ls plugins/claude/
# Should have: commands.py, selectors.json, config.json
```

### "Authentication required"

```bash
# Login manually (headed mode)
site-cli claude current-url

# Browser opens -> login -> close
# Try again in headless
site-cli claude current-url --headless
```

### "Element not found" errors

**Selectors may have changed.**

1. Open DevTools on the site
2. Inspect the element
3. Update `plugins/SITE/selectors.json`
4. Test again

### "Profile already in use"

```bash
# Kill any running browser
pkill -f chrome

# Or use different profile
site-cli claude ask "Q" --profile=another
```

---

## 📊 Plugin Development Workflow

```bash
# 1. Create plugin from template
cp -r plugins/_template plugins/mysite

# 2. Map selectors using DevTools
# Edit plugins/mysite/selectors.json

# 3. Implement commands
# Edit plugins/mysite/commands.py

# 4. Test in headed mode
site-cli mysite test-command

# 5. Debug selectors if needed
site-cli mysite test-command  # Watch browser

# 6. Deploy headless
site-cli mysite test-command --headless
```

---

## 🎓 Learning Path

1. **Use Claude plugin** - Get familiar with CLI
2. **Read MAPPING_PROCESS.md** - Understand the workflow
3. **Map a simple site** - Try Wikipedia or GitHub
4. **Map a complex site** - Gmail, Twitter, LinkedIn
5. **Integrate with OpenClaw** - Automate with agents

---

## 📚 Documentation

- **[guides/MAPPING_PROCESS.md](guides/MAPPING_PROCESS.md)** - How to add new sites
- **[plugins/claude/README.md](plugins/claude/README.md)** - Claude plugin docs
- **[core/browser.py](core/browser.py)** - Browser engine API
- **[core/plugin.py](core/plugin.py)** - Plugin base class

---

## 🛡️ Security

**Profiles contain cookies/credentials!**

```bash
# Profiles are stored in plaintext
ls -la profiles/claude/

# Protect them
chmod 700 profiles/
chmod 700 profiles/*/

# Don't commit profiles to git
echo "profiles/*/" >> .gitignore
```

---

## 🎯 Use Cases

### For OpenClaw Agents

```python
# Ask Claude for help
answer = site_controller('claude', 'ask', 'How to implement X?')

# Send emails
site_controller('gmail', 'send', recipient, subject, body)

# Post on social media
site_controller('linkedin', 'post', 'Check out my project!')

# Research
results = site_controller('perplexity', 'search', 'AI trends 2026')
```

### For Power Users

```bash
# Batch operations
for question in questions.txt; do
  site-cli claude ask "$question" --headless
done

# Scheduled tasks (cron)
0 9 * * * site-cli gmail check-inbox --headless >> daily-emails.txt

# CI/CD integration
site-cli claude ask "Review this code: $(cat main.py)"
```

---

## 🚀 Future Enhancements

- [ ] REST API server (HTTP endpoints for plugins)
- [ ] Multi-profile concurrency (run multiple browsers in parallel)
- [ ] Auto-healing selectors (AI detects UI changes)
- [ ] Visual selector recorder (point-and-click mapping)
- [ ] Session manager (list, switch, delete profiles)
- [ ] Plugin marketplace (share plugins with community)

---

## 📜 License

Part of Claudio OS ecosystem. Internal use.

---

## 🆘 Support

**Issues?**

1. Check logs (browser errors appear in terminal)
2. Test in headed mode (watch what browser does)
3. Verify selectors in DevTools
4. Update `selectors.json` if site UI changed

**Questions?**

- Read guides/MAPPING_PROCESS.md
- Check plugin READMEs
- Inspect existing plugins as examples

---

**Built for autonomous agents to control the web** 🤖
