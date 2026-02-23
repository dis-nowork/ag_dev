# Headless Mode Limitations

**Date:** 2026-02-22
**Status:** Known Issue

---

## Problem

Claude.ai appears to block response generation when running in headless mode, even with valid authenticated sessions.

### Symptoms

- ✅ Navigation works
- ✅ Authentication works
- ✅ Message sending works
- ❌ Claude does NOT generate responses

### Test Results

```bash
# Headless mode
./site-cli claude ask "What is 2+2?" --headless
# Result: Message sent but no response from Claude (waits indefinitely)

# Headed mode (visible browser)
./site-cli claude ask "What is 2+2?"
# Result: Works perfectly, gets response
```

---

## Root Cause

Claude.ai likely uses additional client-side checks beyond cookies/sessions to detect automation:

1. **Timing analysis**: Headless browsers may have different timing profiles
2. **Canvas fingerprinting**: Different rendering in headless
3. **WebGL detection**: Headless may lack GPU rendering
4. **Behavior patterns**: Lack of mouse movement, scrolling, etc.

Even with Patchright's anti-detection, Claude.ai appears to have sophisticated headless detection.

---

## Workaround

### Option 1: Use Headed Mode (Recommended)

```bash
# Works perfectly
DISPLAY=:0 ./site-cli claude ask "Your question"
```

**Pros:**
- Full functionality
- Reliable responses
- Can monitor visually

**Cons:**
- Requires X11 display
- Visible window (can minimize)

### Option 2: Use Claude API Instead

For headless automation, use Claude's official API:

```python
import anthropic

client = anthropic.Anthropic(api_key="your-key")
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "What is 2+2?"}]
)
print(message.content)
```

**Pros:**
- Fully headless
- Reliable
- Official support

**Cons:**
- Costs money (usage-based)
- Requires API key

### Option 3: Background Mode with Xvfb

Run headed mode in virtual framebuffer (headless X11):

```bash
# Install Xvfb
sudo apt install xvfb

# Run with virtual display
xvfb-run --auto-servernum ./site-cli claude ask "Question"
```

**Status:** Not tested yet

---

## Recommendation

**For OpenClaw Integration:**

Use **headed mode** by default for Site Controller:

```python
# openclaw_site_controller.py
class ClaudeController(SiteController):
    def __init__(self, headless: bool = False):  # Default to headed
        super().__init__('claude', headless=headless)
```

**Usage:**
```python
from openclaw_site_controller import ClaudeController

# Headed mode (works)
claude = ClaudeController(headless=False)
answer = claude.ask("What is Python?")

# Headless mode (limited - login/navigation only)
claude_headless = ClaudeController(headless=True)
url = claude_headless.current_url()  # Works
# answer = claude_headless.ask("...")  # Does NOT work
```

---

## What Works in Headless

| Feature | Headless | Headed |
|---------|----------|--------|
| Navigation | ✅ | ✅ |
| Login | ✅ | ✅ |
| Session persistence | ✅ | ✅ |
| current-url | ✅ | ✅ |
| list-chats | ❓ | ✅ |
| list-projects | ❓ | ✅ |
| screenshot | ✅ | ✅ |
| **ask** (get response) | ❌ | ✅ |
| **send-message** | ✅ (send only) | ✅ |
| **get-response** | ❌ | ✅ |

---

## Future Investigation

Potential solutions to explore:

1. **Puppeteer Stealth**: Port additional evasion techniques
2. **Mouse/Keyboard simulation**: Add random movements
3. **Timing delays**: Match human interaction patterns
4. **Multiple requests**: Test if first request unlocks subsequent ones
5. **Different models**: Test if Pro vs Free accounts behave differently

---

## Conclusion

**For now, use headed mode for interactive Claude.ai commands.**

Site Controller is still valuable for:
- Session management (login once, use forever)
- Visual monitoring of automation
- Minimized window background operation
- Other sites that work in headless (Gmail, etc.)

---

**Updated:** 2026-02-22
**Tested with:** Patchright 1.56.0, Claude.ai Free Tier
