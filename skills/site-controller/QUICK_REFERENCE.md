# Site Controller - Quick Reference

**Version:** 2.0
**Last Updated:** 2026-02-22

---

## 🚀 Most Common Commands

### Login (First Time)
```bash
cd ~/ag_dev/skills/site-controller
DISPLAY=:0 ./site-cli claude login
```

### Ask Claude
```bash
DISPLAY=:0 ./site-cli claude ask "Your question here"
```

### Generate Code + Download
```bash
# 1. Ask for artifact
DISPLAY=:0 ./site-cli claude ask "Create Python web scraper as artifact"

# 2. Wait for response, then download
DISPLAY=:0 ./site-cli claude get-artifacts
DISPLAY=:0 ./site-cli claude download-artifact 0 scraper.py
```

---

## 📋 Command Cheat Sheet

| Task | Command |
|------|---------|
| Login | `./site-cli claude login` |
| Ask question | `./site-cli claude ask "question"` |
| New chat | `./site-cli claude create-chat` |
| List chats | `./site-cli claude list-chats` |
| Create project | `./site-cli claude create-project "Name"` |
| List projects | `./site-cli claude list-projects` |
| Upload file | `./site-cli claude upload-file file.pdf` |
| Get artifacts | `./site-cli claude get-artifacts` |
| Download artifact | `./site-cli claude download-artifact 0 out.py` |
| Switch model | `./site-cli claude switch-model opus` |
| Screenshot | `./site-cli claude screenshot pic.png` |

**Always use:** `DISPLAY=:0` before commands!

---

## 🐍 Python Quick Start

```python
from openclaw_site_controller import ClaudeController

# Initialize
claude = ClaudeController(headless=False)

# Ask and get artifacts
response = claude.ask("Create Flask app as artifact")
artifacts = claude.get_artifacts()
claude.download_artifact(0, "app.py")

# Now app.py is ready to use or send via Telegram
```

---

## 🎯 Workflows

### Workflow 1: Code Generation
```bash
DISPLAY=:0 ./site-cli claude ask "Create [your code] as artifact"
# Wait for response
DISPLAY=:0 ./site-cli claude download-all-artifacts ./output/
ls output/
```

### Workflow 2: Document Analysis
```bash
DISPLAY=:0 ./site-cli claude upload-file document.pdf
DISPLAY=:0 ./site-cli claude ask "Summarize this document"
```

### Workflow 3: Project-based Work
```bash
DISPLAY=:0 ./site-cli claude create-project "My Analysis"
DISPLAY=:0 ./site-cli claude upload-file data.csv
DISPLAY=:0 ./site-cli claude ask-in-project "My Analysis" "Analyze this data"
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not logged in" | Run `./site-cli claude login` |
| No artifacts found | Wait longer after asking, then try `get-artifacts` |
| Headless not working | Use headed mode: remove `--headless` |
| DISPLAY error | Add `DISPLAY=:0` before command |
| Slow responses | Normal - Claude takes time to generate |

---

## 📚 Full Documentation

- Complete README: `README.md`
- Claude plugin guide: `plugins/claude/README.md`
- OpenClaw integration: `OPENCLAW_TELEGRAM_EXAMPLE.py`
- Architecture: `PROJECT_OVERVIEW.md`
- Mapping process: `guides/MAPPING_PROCESS.md`

---

## 🧪 Test Your Setup

```bash
cd ~/ag_dev/skills/site-controller
./test-complete-flow.sh
```

Expected: Creates `test_artifacts/fibonacci.py`

---

**Quick Reference v2.0** | [Full Documentation](README.md)
