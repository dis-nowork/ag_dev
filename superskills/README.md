# SuperSkills — Agent Capabilities Reference

SuperSkills are built-in capabilities that agents can use during their tasks. In V3 (OpenClaw), these are executed as CLI commands or scripts by agents, rather than through a runtime registry.

## Categories

### 🔍 Analyzers
| Skill | Description | Usage |
|-------|-------------|-------|
| code-complexity | Cyclomatic complexity, function counts, hotspots | Analyze code files for complexity metrics |
| csv-summarizer | Statistical summaries of CSV data | Pass CSV file path for analysis |
| dep-graph | Dependency analysis from package.json/requirements.txt | Run in project root |
| git-stats | Repository statistics, activity patterns | Run in git repo |
| security-scan | Secrets, eval(), SQL injection, XSS detection | Scan files/directories |
| temporal-analysis | Timeline data analysis with graph metrics | Pass JSON timeline data |

### 🏗️ Builders
| Skill | Description |
|-------|-------------|
| docx-builder | Generate Word documents from structured data |
| pdf-builder | Convert Markdown → HTML → PDF |
| xlsx-builder | Generate Excel spreadsheets |
| static-site | Markdown directory → static HTML site |
| image-enhance | ImageMagick operations (sharpen, resize, optimize) |
| file-organize | Organize files by type/date/size |

### ⚡ Generators
| Skill | Description |
|-------|-------------|
| api-scaffold | Express REST API scaffolding from entity definitions |
| changelog-gen | Changelogs from conventional git commits |
| dockerfile-gen | Multi-stage Dockerfiles for node/python/ruby |
| readme-gen | Auto-detect stack and generate README |
| schema-to-types | JSON Schema → TypeScript interfaces |
| domain-brainstorm | Domain name generation + DNS availability |

### 🔄 Transformers
| Skill | Description |
|-------|-------------|
| article-extractor | Clean article extraction from HTML/URLs |
| csv-to-json | CSV → JSON with smart type inference |
| html-to-md | HTML → Markdown conversion |
| invoice-parser | Extract structured data from PDF/image invoices |
| json-to-form | JSON Schema → HTML/React form components |
| md-to-slides | Markdown → HTML slideshow with transitions |

### ✅ Validators
| Skill | Description |
|-------|-------------|
| lint-fix | ESLint/Prettier for JS/TS, pattern-based for Python |
| webapp-test | Basic web app functionality testing |

### 🔌 Connectors
| Skill | Description |
|-------|-------------|
| postgres-query | Read-only PostgreSQL queries via psql |
| reddit-fetch | Fetch Reddit posts via JSON API |
| video-download | Download videos via yt-dlp |
| webhook-fire | Fire HTTP webhooks (GET/POST/PUT) |

## How Agents Use SuperSkills

In V3, agents execute these as part of their Claude Code session. The orchestrator should mention relevant capabilities in the task description:

```markdown
# Task: Review code quality

## Available Tools
- Run `node superskills/analyzers/code-complexity/run.js --path ./src` for complexity analysis
- Run `node superskills/validators/lint-fix/run.js --path ./src` for linting
- Run `node superskills/analyzers/security-scan/run.js --path ./src` for security scan
```

The original SuperSkill runners (run.js files) are preserved in this directory and can be executed directly by agents.
