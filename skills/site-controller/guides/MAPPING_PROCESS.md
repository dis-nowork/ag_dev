# Site Mapping Process

**Goal**: Create a new plugin to control any website through CLI commands.

This guide shows you how to map a website's UI and create a plugin in ~30 minutes.

---

## 📋 Overview

**Process Steps:**
1. **Inspect** - Use DevTools to find UI element selectors
2. **Map** - Document selectors in `selectors.json`
3. **Code** - Implement commands in `commands.py`
4. **Test** - Verify in headed mode
5. **Deploy** - Use headless for automation

---

## 🔍 Step 1: Inspection

### Open Chrome DevTools

1. Visit the target website in Chrome
2. Press `F12` to open DevTools
3. Click the "Select Element" tool (Ctrl+Shift+C)
4. Click on UI elements you want to automate

### Find Stable Selectors

**Selector Priority (best to worst):**

1. ✅ **Data attributes**: `[data-testid='submit-button']`
2. ✅ **IDs**: `#search-input`
3. ✅ **Unique classes**: `.unique-component-class`
4. ✅ **Text content**: `button:has-text('Submit')`
5. ⚠️  **Role + label**: `[role='button'][aria-label='Search']`
6. ❌ **Generated classes**: `.css-1x2y3z4` (breaks on updates)
7. ❌ **nth-child**: `.container > div:nth-child(3)` (fragile)

### Testing Selectors in Console

```javascript
// Test single selector
document.querySelector('YOUR_SELECTOR')

// Test multiple matches
document.querySelectorAll('YOUR_SELECTOR')

// Should highlight the element you want
document.querySelector('YOUR_SELECTOR').style.border = '3px solid red'
```

### Example: Mapping Gmail Compose

**Objective**: Automate sending an email

**Elements to find:**
- Compose button
- To field
- Subject field
- Body field
- Send button

**Inspection process:**

```
1. Click compose button → DevTools shows:
   <div role="button" aria-label="Compose">

   Selector: [aria-label="Compose"]
   Alternative: button:has-text("Compose")

2. Click "To" field → DevTools shows:
   <input name="to" type="email">

   Selector: input[name="to"]

3. Subject field:
   <input name="subjectbox">

   Selector: input[name="subjectbox"]

4. Body field:
   <div contenteditable="true" aria-label="Message Body">

   Selector: [aria-label="Message Body"]

5. Send button:
   <div role="button" aria-label="Send">

   Selector: [role="button"][aria-label="Send"]
```

---

## 📝 Step 2: Create selectors.json

Create a structured JSON file mapping logical actions to selectors.

**Template:**

```json
{
  "site_url": "https://your-site.com",

  "auth": {
    "login_url": "https://your-site.com/login",
    "logged_in_indicator": "SELECTOR_THAT_APPEARS_WHEN_LOGGED_IN"
  },

  "section_name": {
    "element_name": "CSS_SELECTOR",
    "another_element": "CSS_SELECTOR"
  }
}
```

**Gmail Example:**

```json
{
  "site_url": "https://mail.google.com",

  "auth": {
    "login_url": "https://accounts.google.com",
    "logged_in_indicator": "[role='navigation']"
  },

  "compose": {
    "compose_button": "[aria-label='Compose']",
    "to_field": "input[name='to']",
    "subject_field": "input[name='subjectbox']",
    "body_field": "[aria-label='Message Body']",
    "send_button": "[role='button'][aria-label='Send']"
  },

  "inbox": {
    "email_list": "[role='main'] tr",
    "email_subject": "span.bog",
    "unread_count": "[aria-label*='unread']"
  }
}
```

---

## 💻 Step 3: Implement commands.py

Create plugin commands that use your selectors.

### Basic Structure

```python
#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.plugin import SitePlugin


class Plugin(SitePlugin):

    async def initialize(self):
        """Navigate and check login"""
        await self.browser.navigate(self.selectors['site_url'])

        if not await self.ensure_logged_in():
            raise Exception("Authentication required")

    def get_commands(self):
        """Map command names to functions"""
        return {
            'send-email': self.send_email,
            'check-inbox': self.check_inbox,
        }

    async def send_email(self, to: str, subject: str, body: str):
        """Send an email"""
        # Get selectors
        compose_btn = self.get_selector('compose', 'compose_button')
        to_field = self.get_selector('compose', 'to_field')
        subject_field = self.get_selector('compose', 'subject_field')
        body_field = self.get_selector('compose', 'body_field')
        send_btn = self.get_selector('compose', 'send_button')

        # Execute actions
        await self.browser.click(compose_btn)
        await self.browser.fill(to_field, to)
        await self.browser.fill(subject_field, subject)
        await self.browser.fill(body_field, body)
        await self.browser.click(send_btn)

        print(f"✅ Email sent to {to}")
        return {"status": "success"}

    async def check_inbox(self):
        """List inbox emails"""
        subjects = await self.browser.extract_all_text(
            self.get_selector('inbox', 'email_subject')
        )
        return subjects
```

### Available Browser Methods

```python
# Navigation
await self.browser.navigate(url)

# Interactions
await self.browser.click(selector)
await self.browser.fill(selector, value)
await self.browser.press(selector, key)  # e.g., 'Enter', 'Escape'

# Waiting
await self.browser.wait_for(selector, timeout=10000, state='visible')
await self.browser.wait_seconds(2)

# Extraction
text = await self.browser.extract_text(selector)
texts = await self.browser.extract_all_text(selector)
attr = await self.browser.extract_attribute(selector, 'href')

# Utilities
await self.browser.screenshot(path, full_page=True)
url = self.browser.get_current_url()
is_logged = await self.browser.is_logged_in(selector)

# Downloads
path = await self.browser.download_file(trigger_selector, save_path)

# JavaScript
result = await self.browser.evaluate("return document.title")
```

---

## 🧪 Step 4: Testing

### Test in Headed Mode (visible browser)

```bash
# Create plugin directory
mkdir -p ~/ag_dev/skills/site-controller/plugins/gmail
cd ~/ag_dev/skills/site-controller/plugins/gmail

# Add selectors.json, config.json, commands.py

# Test without headless
site-cli gmail send-email "test@example.com" "Subject" "Body"
```

**Watch the browser:**
- Does it click the right elements?
- Are selectors stable?
- Any timing issues?

### Common Issues

**Element not found**
→ Selector changed or page didn't load
→ Add wait: `await self.browser.wait_for(selector)`

**Click doesn't work**
→ Element hidden or covered
→ Try scrolling: `await self.browser.evaluate("element.scrollIntoView()")`

**Timing issues**
→ Page loading slowly
→ Add delays: `await self.browser.wait_seconds(2)`

### Refinement Loop

1. Run command in headed mode
2. Watch for failures
3. Update selectors in `selectors.json`
4. Test again
5. Repeat until stable

---

## 🚀 Step 5: Deploy

Once stable in headed mode, use headless:

```bash
site-cli gmail send-email "to@example.com" "Hi" "Message" --headless
```

**First run:** Login manually (headed), then cookies persist for headless runs.

---

## 📦 Plugin Structure Checklist

```
plugins/your-site/
├── selectors.json    ✅ UI element mappings
├── config.json       ✅ Plugin metadata
├── commands.py       ✅ Command implementations
└── README.md         ✅ Usage documentation
```

### selectors.json
- [ ] Site URL
- [ ] Login indicator
- [ ] All interactive elements mapped
- [ ] Selectors tested in DevTools

### commands.py
- [ ] Plugin class inherits SitePlugin
- [ ] initialize() navigates to site
- [ ] get_commands() returns command dict
- [ ] Each command has error handling
- [ ] Print success/error messages

### config.json
- [ ] Name and description
- [ ] Capabilities list
- [ ] Timeouts configured

---

## 🎯 Real-World Example: Twitter Plugin

**Goal**: Create plugin to post tweets, like, retweet.

### 1. Inspection

Open Twitter, find selectors:

```
New tweet button: [aria-label="Tweet"]
Tweet text box: [aria-label="Tweet text"]
Tweet button: [data-testid="tweetButtonInline"]
Like button: [data-testid="like"]
Retweet button: [data-testid="retweet"]
```

### 2. selectors.json

```json
{
  "site_url": "https://twitter.com/home",
  "auth": {
    "logged_in_indicator": "[aria-label='Tweet']"
  },
  "compose": {
    "new_tweet_button": "[aria-label='Tweet']",
    "text_box": "[aria-label='Tweet text']",
    "tweet_button": "[data-testid='tweetButtonInline']"
  },
  "actions": {
    "like_button": "[data-testid='like']",
    "retweet_button": "[data-testid='retweet']"
  }
}
```

### 3. commands.py

```python
class Plugin(SitePlugin):

    def get_commands(self):
        return {
            'post-tweet': self.post_tweet,
            'like-last': self.like_last,
        }

    async def post_tweet(self, text: str):
        await self.browser.click(self.get_selector('compose', 'new_tweet_button'))
        await self.browser.fill(self.get_selector('compose', 'text_box'), text)
        await self.browser.click(self.get_selector('compose', 'tweet_button'))
        print(f"✅ Tweet posted")
        return {"status": "success"}
```

### 4. Test

```bash
site-cli twitter post-tweet "Hello from automation!"
```

### 5. Use

```bash
site-cli twitter post-tweet "My automated tweet" --headless
```

---

## 🛠️ Advanced Techniques

### Handle Dynamic Content

```python
# Wait for element to appear
await self.browser.wait_for(selector, timeout=10000)

# Wait for multiple possible selectors
try:
    await self.browser.wait_for(selector1, timeout=5000)
except:
    await self.browser.wait_for(selector2, timeout=5000)
```

### Extract Structured Data

```python
# Get all tweet texts
tweets = await self.browser.extract_all_text("[data-testid='tweetText']")

# Get links from elements
links = []
for selector in await self.browser.page.query_selector_all("a.tweet-link"):
    href = await selector.get_attribute('href')
    links.append(href)
```

### Handle File Uploads

```python
# Set file input
await self.browser.page.set_input_files("input[type='file']", "/path/to/file.png")
```

### Execute Custom JavaScript

```python
# Scroll to bottom
await self.browser.evaluate("window.scrollTo(0, document.body.scrollHeight)")

# Get computed style
color = await self.browser.evaluate("getComputedStyle(document.querySelector('.element')).color")
```

---

## 📊 Selector Debugging Workflow

```bash
# 1. Open browser manually
site-cli your-site current-url

# 2. Open DevTools, test selector in console:
document.querySelector('YOUR_SELECTOR')

# 3. Update selectors.json

# 4. Test command
site-cli your-site test-command

# 5. Repeat until working
```

---

## ✅ Validation Checklist

Before considering a plugin "done":

- [ ] Tested all commands in headed mode
- [ ] All selectors stable (don't break on refresh)
- [ ] Login persists in headless mode
- [ ] Error messages are clear
- [ ] README.md documents all commands
- [ ] No hardcoded waits > 5 seconds (use wait_for instead)

---

## 🎓 Conclusion

**You now know how to:**
1. Inspect any website's UI
2. Extract stable selectors
3. Map them in JSON
4. Implement CLI commands
5. Test and deploy

**Time to map a site:** ~30 minutes
**Time to implement commands:** ~1-2 hours
**Result:** Full CLI control of any web platform

---

## 📚 References

- [Playwright Selectors](https://playwright.dev/docs/selectors)
- [CSS Selector Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)

---

**Next:** Start mapping your first site! Copy `plugins/_template/` and follow this guide.
