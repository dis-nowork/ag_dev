---
name: hookify
description: Create custom hooks to prevent unwanted behaviors using regex pattern matching in markdown configuration files. Use when user wants to create rules that block or warn about dangerous commands, debug code in production, sensitive file edits, or any other unwanted behavior patterns. Can analyze conversations to identify behaviors automatically or create explicit rules from user instructions.
---

# Hookify - Custom Behavior Rules

Create custom hooks to prevent unwanted behaviors through markdown configuration with regex patterns.

## Overview

Hookify creates behavior rules stored as markdown files in `.claude/` directory. Rules use YAML frontmatter for configuration and markdown body for warning messages.

## Creating Rules

### Method 1: Explicit Rule (with arguments)
```bash
/hookify Warn me when I use rm -rf commands
```

Creates `.claude/hookify.warn-rm.local.md` automatically.

### Method 2: Analyze Conversation (without arguments)
```bash
/hookify
```

Analyzes recent conversation to find behaviors user corrected or was frustrated by.

## Rule Structure

```markdown
---
name: rule-name
enabled: true
event: bash|file|stop|prompt|all
pattern: regex_pattern
action: warn|block
conditions: (optional)
  - field: field_name
    operator: regex_match|contains|equals
    pattern: pattern_to_match
---

**Warning Message Title**
Detailed warning message body.
```

## Event Types

| Event | Triggers On | Available Fields |
|-------|-------------|------------------|
| `bash` | Bash commands | `command` |
| `file` | File edits | `file_path`, `new_text`, `old_text` |
| `stop` | Claude stops | - |
| `prompt` | User prompts | `user_prompt` |
| `all` | All events | Event-specific |

## Action Types

| Action | Behavior |
|--------|----------|
| `warn` | Shows warning, allows operation (default) |
| `block` | Prevents operation from executing |

## Example Rules

### Block Dangerous Commands
```markdown
---
name: block-dangerous-rm
enabled: true
event: bash
pattern: rm\s+-rf|dd\s+if=|mkfs|format
action: block
---

**Destructive operation detected!**
This command can cause data loss. Operation blocked.
```

### Warn About Debug Code
```markdown
---
name: warn-debug-code
enabled: true
event: file
pattern: console\.log\(|debugger;|print\(
action: warn
---

**Debug code detected**
Remove debugging statements before committing.
```

### Sensitive Files with Conditions
```markdown
---
name: warn-sensitive-files
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.env$|credentials|secrets
  - field: new_text
    operator: contains
    pattern: KEY
---

**Sensitive file edit detected!**
Ensure credentials are not hardcoded and file is in .gitignore.
```

## Operators

| Operator | Description |
|----------|-------------|
| `regex_match` | Pattern must match |
| `contains` | String contains pattern |
| `equals` | Exact string match |
| `not_contains` | String must NOT contain |
| `starts_with` | String starts with pattern |
| `ends_with` | String ends with pattern |

## Regex Pattern Examples

| Pattern | Matches |
|---------|---------|
| `rm\s+-rf` | rm -rf commands |
| `console\.log\(` | console.log( calls |
| `(eval\|exec)\(` | eval( or exec( |
| `\.env$` | Files ending in .env |
| `chmod\s+777` | chmod 777 |

## Management

Rules are stored in `.claude/hookify.*.local.md` files:
- Enable/disable: Edit file and set `enabled: true/false`
- Delete: Remove the file
- Rules take effect immediately, no restart needed
