# Changelog - Site Controller

All notable changes to this project.

---

## [2.0.4] - 2026-02-22

### 🏗️ CRITICAL: Architectural Fix - Auto-Extract Artifacts

#### Problem Solved
**Before:** Commands ran in separate processes → `get-artifacts` always saw homepage (empty)
**After:** `ask` auto-extracts artifacts in SAME session → always works!

#### Implementation

**Auto-Extraction in ask()**
```python
async def ask(question):
    # 1. Send message
    # 2. Get response
    # 3. Auto-extract artifacts (SAME SESSION!) ✅
    # 4. Download to ./last_artifacts/
    # 5. Return response + artifact info
```

**New Response Format**
```json
{
  "response": "Here's a Python function...",
  "artifacts": [
    {
      "index": 0,
      "type": "code_block",
      "language": "python",
      "file": "./last_artifacts/artifact_0.py",
      "size": 250
    }
  ]
}
```

**Benefits**
- ✅ ONE command does everything: `ask` → auto-extracts → saves
- ✅ Always works (same session = sees the chat)
- ✅ No need for separate `get-artifacts` command
- ✅ Simpler workflow for users and OpenClaw
- ✅ Files ready immediately in `./last_artifacts/`

#### Usage

**Before (Broken):**
```bash
DISPLAY=:0 ./site-cli claude ask "Write Python code"
DISPLAY=:0 ./site-cli claude get-artifacts  # ❌ Sees homepage, finds nothing
```

**After (Works!):**
```bash
DISPLAY=:0 ./site-cli claude ask "Write Python fibonacci"
# ✅ Auto-extracts and saves to ./last_artifacts/artifact_0.py
ls ./last_artifacts/
cat ./last_artifacts/artifact_0.py
```

#### Files Created

- `./last_artifacts/` - Auto-created directory
- `artifact_N.{ext}` - Code artifacts with correct extension
- `document_N.md` - Text artifacts as markdown

#### CLI Output Enhanced

Shows artifacts clearly:
```
Here's a Python function...

============================================================
📦 2 artifact(s) extracted:
============================================================
  [0] python - code_block
      File: ./last_artifacts/artifact_0.py
      Size: 250 chars
  [1] python - code_block
      File: ./last_artifacts/artifact_1.py
      Size: 120 chars
============================================================
```

#### Python API Updated

```python
result = claude.ask("Write Python code")

if isinstance(result, dict) and 'artifacts' in result:
    print(result['response'])
    for art in result['artifacts']:
        # File already saved!
        with open(art['file']) as f:
            code = f.read()
            telegram_bot.send_document(user_id, f)
```

#### Tests
- `test-architectural-fix.sh` - Complete validation
- Tests single command, multiple artifacts, file creation

---

## [2.0.3] - 2026-02-22

### 🎯 Complete Artifact Extraction: Code Blocks + Text Documents

#### Added - Multi-Strategy Artifact Extraction

**New Methods**
- `extract_code_blocks()` - Extract inline code from chat messages
- `extract_text_artifacts()` - Extract text documents from sidebar (essays, docs)

**3-Strategy Extraction Pipeline**
```
1. Visual Code Artifacts → Sidebar code panels
2. Text Artifacts → Sidebar documents (converted to markdown)
3. Code Blocks Fallback → Inline ```python blocks
```

**Automatic Language Detection**
- Extracts from `class="language-X"` attribute
- 30+ language → extension mappings
- Falls back to `.txt` if unknown

**Text Artifact → Markdown Conversion**
- h1 → `# Title`
- h2 → `## Section`
- h3 → `### Subsection`
- p → paragraph text
- li → `- list item`
- Auto-saves as `.md`

**Selectors Used**
```
Code blocks:
├── div[data-is-streaming='false'] pre code
├── [data-testid='assistant-message'] pre code
├── pre code[class*='language-']
└── pre code (generic)

Text artifacts:
├── div[data-testid='artifact-content']
├── div[class*='artifact'] .prose
├── div[class*='artifact-panel']
└── aside[class*='artifact']
```

**Enhanced Extension Map**
- Added: php, ruby, swift, kotlin, scala, r, matlab, perl, lua
- Total: 30+ language mappings
- Default: `.txt` for unknown

#### Updated
- `get_artifacts()` - Now tries 3 strategies automatically
- `download_artifact()` - Works with all artifact types
- Navigation fix - Doesn't reset to homepage between commands

#### Examples

**Code Block Extraction:**
```bash
DISPLAY=:0 ./site-cli claude ask "Write a Python function to reverse a string"
sleep 8
DISPLAY=:0 ./site-cli claude get-artifacts
# Output: [0] python - code_block (150 chars)

DISPLAY=:0 ./site-cli claude download-artifact 0 /tmp/reverse.py
cat /tmp/reverse.py
```

**Text Document Extraction:**
```bash
DISPLAY=:0 ./site-cli claude ask "Write a 500 word essay about AI as an artifact"
sleep 10
DISPLAY=:0 ./site-cli claude get-artifacts
# Output: [0] markdown - text_artifact (2500 chars)

DISPLAY=:0 ./site-cli claude download-artifact 0 /tmp/essay.md
```

**Working Example:**
See `WORKING_EXAMPLE_CODE_BLOCKS.py` for complete integration

---

## [2.0.2] - 2026-02-22

### 🎯 Dual Critical Fixes: Artifacts + Smart Delivery

#### FIX 1 - Artifact Detection 🔧

**Fixed**
- **Artifact selectors updated** - Outdated selectors causing 0 artifacts found
- Updated `selectors.json` with current Claude.ai DOM structure
- Multi-selector fallback in `get_artifacts()` method
- Debug screenshot auto-saved as `artifacts_debug.png`
- Detailed logging of found elements and selectors used

**New Selectors**
```json
{
  "artifact_panel": "div[data-testid='artifact'], div[class*='artifact']",
  "all_artifacts": "div[data-testid='artifact']",
  "artifact_code_block": "div[data-testid='artifact'] pre code"
}
```

**Selector Priority Chain**
1. `div[data-testid='artifact']` (primary)
2. `div[class*='artifact']` (class-based fallback)
3. `pre code[class*='language-']` (code block fallback)
4. `pre code` (generic code)
5. `[data-testid*='artifact']` (wildcard)

#### FIX 2 - Smart Delivery System 🚀

**Added**
- **Intelligent response delivery** based on size and destination
- `deliver_response()` method with conditional logic
- **ClickUp integration** - direct task creation
- **File auto-save** for long responses (>500 chars)
- Timeout increased to 300s for complex queries

**Smart Delivery Logic**
- `len < 500` → Returns string directly
- `len >= 500` + no output → Auto-saves to `/tmp/claude_response_{timestamp}.md`
- `--output file:<path>` → Saves to specified path
- `--output clickup:<list_id>` → Creates ClickUp task with content

**ClickUp Integration**
- Token: Configured in `save_to_clickup()` method
- API: `POST /api/v2/list/{list_id}/task`
- Returns: Task URL for direct access
- Markdown support in task description

**New Methods**
- `deliver_response(response, output)` - Smart routing
- `save_to_clickup(content, title, list_id)` - ClickUp API
- `research(topic, save_to)` - Research + smart save
- `ask(question, output)` - Updated with output param

**CLI Updates**
- `--output=TYPE` flag support
- Passed to `ask` and `research` commands
- Format: `--output file:/path/to/file` or `--output clickup:LIST_ID`

**Python API Updates**
- `ask(question, output=None)` - Returns string, dict, or ClickUp URL
- `research(topic, save_to=None)` - New convenience method
- Auto JSON parsing for structured responses

#### Dependencies Added
- `requests>=2.31.0` - For ClickUp API calls

#### Tests
- `test-both-fixes.sh` - Comprehensive test suite (8 tests)
- Tests artifacts detection, download, and all delivery methods
- Validates ClickUp integration with real API calls

---

## [2.0.1] - 2026-02-22

### 🔧 Critical Fix: Response Extraction

#### Fixed
- **Response Extraction Bug** - `ask` command now returns Claude's actual response, not the question
- Updated selector from `[data-testid="assistant-message"]` (doesn't exist) to `[data-is-streaming="false"]`
- Extraction now gets last `<p>` tag from response container, filtering out thinking process
- Verified with automated test suite

#### Technical Details
- Claude.ai structure: `[data-is-streaming="false"]` contains both thinking + final answer
- Solution: Extract last `<p>` child element OR split by "Done" marker
- Fallback logic for edge cases

#### Tests Added
- `inspect-selectors.py` - DOM structure inspection tool
- `inspect-response-structure.py` - Response parsing analysis
- `test-response-fix.sh` - Automated validation (2 test cases)

---

## [2.0.0] - 2026-02-22

### 🎉 Major Release: Claude Plugin Complete Implementation

#### Added - Chat Operations
- `create-chat` - Create new chat
- `send-message` - Send message
- `get-response` - Get last response
- `ask` - Combined send + get response
- `list-chats` - List recent chats
- `search-chats` - Search in chat history
- `get-chat` - Get specific chat content

#### Added - Projects
- `create-project` - Create new project
- `list-projects` - List all projects
- `open-project` - Open specific project
- `ask-in-project` - Ask within project context

#### Added - File Upload
- `upload-file` - Upload PDF, images, code files
- Supported formats: .pdf, .txt, .csv, .py, .js, .html, .png, .jpg

#### Added - Artifacts (CRITICAL Feature) ⭐
- `get-artifacts` - List all artifacts in current chat
- `download-artifact` - Download specific artifact with auto-detection
- `download-all-artifacts` - Download all artifacts at once
- Auto-detection of language/file type
- Auto-extension mapping (python→.py, javascript→.js, etc.)
- Extraction from DOM code blocks

#### Added - Model Selection
- `switch-model` - Switch between Opus/Sonnet/Haiku
- `get-model` - Get currently selected model

#### Added - Authentication
- `login` - Interactive manual login helper
- Persistent session management

#### Updated - Selectors
- Expanded `selectors.json` with complete UI mapping
- Added artifact-specific selectors
- Added project management selectors
- Added file upload selectors
- Added model selector mappings

#### Updated - OpenClaw Integration
- Enhanced `ClaudeController` class with all new commands
- Added `search_chats()` method
- Added `get_chat()` method
- Added `open_project()` method
- Added `ask_in_project()` method
- Added `upload_file()` method
- Added `get_artifacts()` method (returns list of dicts)
- Added `download_artifact()` method
- Added `download_all_artifacts()` method
- Added `switch_model()` method
- Added `get_model()` method

#### Added - Examples & Tests
- `OPENCLAW_TELEGRAM_EXAMPLE.py` - Complete integration examples
- `test-complete-flow.sh` - Automated test script
- `QUICK_REFERENCE.md` - Quick command reference

#### Documentation
- Updated `plugins/claude/README.md` with all commands
- Added artifact extraction workflow documentation
- Added OpenClaw integration patterns
- Added Telegram bot integration examples

---

## [1.1.0] - 2026-02-22

### DNS Fix & Headless Mode Investigation

#### Fixed
- DNS resolution error (`ERR_NAME_NOT_RESOLVED`)
- Added `--disable-features=NetworkService` flag
- Added `--enable-features=NetworkServiceInProcess` flag
- Added `DISPLAY` environment variable support
- Removed conflicting `add_init_script()` that caused DNS issues

#### Changed
- Updated `core/browser.py` with DNS fixes
- Simplified launch arguments for better compatibility
- Improved anti-detection configuration

#### Added
- `test-browser.py` - Direct browser test
- `test-persistent.py` - Persistent context test
- `test-headless-login.py` - Headless mode test
- `DNS_FIX_SUMMARY.md` - DNS fix documentation
- `HEADLESS_LIMITATIONS.md` - Headless mode limitations

#### Discovered
- Claude.ai blocks response generation in headless mode
- Headed mode required for full functionality
- Documented workarounds and limitations

---

## [1.0.0] - 2026-02-22

### Initial Release

#### Added - Framework
- Core browser engine with Patchright
- Plugin system architecture
- CLI interface (`site-cli`)
- Profile management for persistent sessions

#### Added - Claude Plugin (Basic)
- Basic chat functionality
- Simple artifact detection
- Project creation (basic)
- Screenshot capability

#### Added - Infrastructure
- `core/browser.py` - Browser engine
- `core/plugin.py` - Plugin base class
- `site-cli` - Main CLI entry point
- `plugins/_template/` - Plugin template
- `openclaw_site_controller.py` - Python wrapper

#### Added - Documentation
- `README.md` - Main documentation
- `PROJECT_OVERVIEW.md` - Architecture overview
- `MAPPING_PROCESS.md` - How to add new sites
- `IMPLEMENTATION_NOTES.md` - Technical notes

#### Added - Utilities
- `install.sh` - Installation script
- `quick-start.sh` - First-time setup
- `.gitignore` - Git configuration

---

## Upgrade Guide

### From 1.x to 2.0

**New Features Available:**
- 15+ new commands in Claude plugin
- Complete artifact extraction workflow
- File upload capability
- Full project management
- Model switching

**Breaking Changes:**
- None - all previous commands still work

**Recommended Actions:**
1. Review new commands: `./site-cli claude` (shows all commands)
2. Read `plugins/claude/README.md` for full guide
3. Try artifact workflow: See `QUICK_REFERENCE.md`
4. Update OpenClaw integrations to use new features

**Example Migration:**

```python
# Old way (1.x)
claude = ClaudeController()
response = claude.ask("Generate code")
# No way to get the code artifact

# New way (2.0)
claude = ClaudeController(headless=False)
response = claude.ask("Generate code as artifact")
time.sleep(8)
artifacts = claude.get_artifacts()
claude.download_artifact(0, "output.py")
# Now you have the code in output.py!
```

---

## Compatibility

- **Python:** 3.8+
- **OS:** Linux (X11 required for DISPLAY)
- **Patchright:** 1.56.0
- **Playwright:** 1.56.0

---

## Contributors

- Claudio OS Team
- Built for OpenClaw autonomous agent framework

---

## Links

- Repository: `/home/agdev/ag_dev/skills/site-controller`
- Documentation: `README.md`
- Issues: Report bugs in implementation notes

---

**Latest Version:** 2.0.0 (2026-02-22)
