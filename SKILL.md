---
name: ag-dev
description: Multi-agent software development orchestration. Spawns specialized Claude Code CLI agents (analyst, architect, dev, qa, devops, pm, po, content-writer, data-engineer, scrum-master, seo-analyst, ux) in tmux sessions to build software through coordinated workflows — from greenfield projects to brownfield discovery. Includes 31 SuperSkills for automated tasks. Use when asked to build, plan, or analyze a software project with multiple agents.
---

# AG Dev — Multi-Agent Development Orchestration

Orchestrate software development using specialized Claude Code CLI agents running in tmux sessions. You (OpenClaw main session) are the orchestrator.

## Architecture

```
OpenClaw (you = orchestrator)
  ├── tmux socket: /tmp/agdev.sock
  │   ├── agent-analyst       → Business analysis, discovery, research
  │   ├── agent-architect     → System design, architecture decisions
  │   ├── agent-dev           → Implementation, coding, testing
  │   ├── agent-qa            → Quality review, test architecture
  │   ├── agent-devops        → CI/CD, repo management, deploy
  │   ├── agent-pm            → PRD creation, product strategy
  │   ├── agent-po            → Backlog, story refinement, validation
  │   ├── agent-content-writer → Copy, docs, blog posts, marketing
  │   ├── agent-data-engineer → DB schemas, migrations, queries, RLS
  │   ├── agent-scrum-master  → Stories, epics, agile facilitation
  │   ├── agent-seo-analyst   → SEO, web perf, digital marketing
  │   └── agent-ux            → UX/UI design, design systems
  └── handoff/                → shared context files between agents
```

## Quick Start

### 1. Receive the project

```bash
git clone <REPO_URL> /tmp/agdev-project
# Or use existing path
PROJECT_DIR="/path/to/project"
```

### 2. Choose workflow

| Scenario | Workflow |
|----------|----------|
| New full-stack app | `greenfield-fullstack` |
| New API/service | `greenfield-service` |
| New frontend/UI | `greenfield-ui` |
| Feature in existing project | `brownfield-fullstack` |
| Audit existing codebase | `brownfield-discovery` |
| QA review loop | `qa-loop` |
| Requirements → spec | `spec-pipeline` |
| Code review (multi-agent) | `code-review` |

Read the workflow file in `{skillDir}/workflows/` for the full sequence.

### 3. Initialize tmux infrastructure

```bash
SOCKET="/tmp/agdev.sock"
PROJECT_DIR="/path/to/project"

# Setup all 12 agents (default) or specify which ones
bash {skillDir}/scripts/setup-agents.sh "$SOCKET" "$PROJECT_DIR"

# Or specific agents only
bash {skillDir}/scripts/setup-agents.sh "$SOCKET" "$PROJECT_DIR" analyst architect dev qa
```

### 4. Run agents in sequence

```bash
# Dispatch a task to an agent (interactive Claude Code session)
bash {skillDir}/scripts/dispatch-agent.sh "$SOCKET" analyst "$PROJECT_DIR" "Analyze the codebase and create a project brief"

# Monitor progress
tmux -S "$SOCKET" capture-pane -p -J -t agent-analyst -S -200

# Check if done (look for the $ prompt returning)
tmux -S "$SOCKET" capture-pane -p -t agent-analyst -S -5 | grep -q '\\$'
```

## All 12 Agents

| Agent | Name | Role | Specialty |
|-------|------|------|-----------|
| analyst | Atlas | Business Analyst | Discovery, research, competitive analysis |
| architect | Aria | System Architect | System design, tech decisions, patterns |
| dev | Dex | Developer | Implementation, coding, unit tests |
| qa | Quinn | QA Engineer | Quality review, test architecture, audits |
| devops | Gage | DevOps Engineer | CI/CD, infra, deploy, repo management |
| pm | Morgan | Product Manager | PRD creation, product strategy, roadmaps |
| po | Pax | Product Owner | Backlog, story refinement, acceptance |
| content-writer | Sage | Content Writer | Copy, docs, blog posts, marketing, SNP-integrated |
| data-engineer | Dara | Data Engineer | DB schemas, migrations, queries, RLS |
| scrum-master | River | Scrum Master | Stories, epics, agile facilitation |
| seo-analyst | Pixel | SEO Analyst | SEO audits, keyword research, growth engineering |
| ux | Uma | UX/UI Designer | User research, design systems, components |

## Squads (Pre-configured Teams)

| Squad | Agents | Use Case |
|-------|--------|----------|
| backend-api | analyst, architect, dev, data-engineer, qa, devops | Backend API development |
| frontend-ui | analyst, architect, dev, ux, qa | Frontend/UI development |
| fullstack-dev | analyst, architect, dev, qa, devops, pm, po | Full-stack projects |
| content-marketing | content-writer, seo-analyst, ux | Content & marketing |
| devops-infra | devops, architect, qa | Infrastructure & CI/CD |

Squad configs are in `{skillDir}/squads/`.

## 31 SuperSkills

Automated task runners in `{skillDir}/superskills/`. Run via `node {skillDir}/superskills/runner.js <superskill-name>`.

### Analyzers (6)
| SuperSkill | Description |
|-----------|-------------|
| code-complexity | Analyze code complexity metrics |
| csv-summarizer | Summarize CSV data |
| dep-graph | Generate dependency graphs |
| git-stats | Git repository statistics |
| security-scan | Security vulnerability scanning |
| temporal-analysis | Temporal code analysis |

### Builders (6)
| SuperSkill | Description |
|-----------|-------------|
| docx-builder | Generate DOCX documents |
| file-organize | Organize project files |
| image-enhance | Enhance images |
| pdf-builder | Generate PDF documents |
| static-site | Build static sites |
| xlsx-builder | Generate Excel spreadsheets |

### Connectors (4)
| SuperSkill | Description |
|-----------|-------------|
| postgres-query | Query PostgreSQL databases |
| reddit-fetch | Fetch Reddit content |
| video-download | Download videos |
| webhook-fire | Fire webhooks |

### Generators (6)
| SuperSkill | Description |
|-----------|-------------|
| api-scaffold | Scaffold API projects |
| changelog-gen | Generate changelogs |
| dockerfile-gen | Generate Dockerfiles |
| domain-brainstorm | Brainstorm domain names |
| readme-gen | Generate README files |
| schema-to-types | Convert schemas to types |

### Transformers (7)
| SuperSkill | Description |
|-----------|-------------|
| article-extractor | Extract articles from URLs |
| csv-to-json | Convert CSV to JSON |
| html-to-md | Convert HTML to Markdown |
| invoice-parser | Parse invoices |
| json-to-form | Convert JSON to forms |
| md-to-slides | Convert Markdown to slides |
| text-upper | Transform text to uppercase |

### Validators (2)
| SuperSkill | Description |
|-----------|-------------|
| lint-fix | Lint and auto-fix code |
| webapp-test | Test web applications |

## Context Handoff

Agents share context through files in `$PROJECT_DIR/.agdev/handoff/`:

```
.agdev/handoff/
├── current-task.md          # Current task instructions
├── project-brief.md         # analyst output
├── prd.md                   # pm output
├── architecture.md          # architect output
├── front-end-spec.md        # architect/ux output
├── story-N.md               # current story
├── qa-review.md             # qa output
└── workflow-state.json      # tracks current phase/step
```

## Workflow Execution Patterns

### Pattern A: Sequential (most workflows)
```
analyst → pm → architect → po (validate) → dev → qa → dev (fix) → done
```

### Pattern B: Parallel phases (brownfield-discovery)
```bash
tmux -S "$SOCKET" send-keys -t agent-architect "..." Enter
tmux -S "$SOCKET" send-keys -t agent-analyst "..." Enter
# Wait for both
```

### Pattern C: Loop (qa-loop)
```
qa reviews → if REJECT → dev fixes → qa reviews again → repeat until APPROVE
```

## Cleanup

```bash
bash {skillDir}/scripts/cleanup.sh "$SOCKET"
```

## Quality Gates

AG Dev enforces quality at every step:

1. **PO Validation** — Before dev starts, PO validates all artifacts for consistency
2. **QA Review** — After every dev implementation, QA reviews (APPROVE/REJECT cycle)
3. **Code Review workflow** — Multi-agent review (architect + QA + security) for critical code
4. **Max 5 QA iterations** — If QA rejects 5 times, escalate to human
5. **DevOps is the ONLY agent that pushes** — No direct pushes from dev agents

## SNP Integration (Synaptic Brain Engine)

For content-related tasks, agents can activate the SNP skill to leverage 734+ professional micro-decisions:

```bash
# Search relevant synapses
bash skills/snp/scripts/search.sh "topic" "content-formats"

# Compile briefing
bash skills/snp/scripts/compile.sh "content-formats" "task description" "context"

# Evaluate output
bash skills/snp/scripts/evaluate.sh "output text" "content-formats"
```

**Agents that should use SNP:** content-writer (Sage), seo-analyst (Pixel), and any agent producing user-facing content.

## Tips

- Each Claude Code session has its own context window — keep tasks focused
- Agents run interactively in tmux for full Claude Code capabilities
- For long tasks, poll for the prompt to return
- If an agent gets stuck: `tmux -S "$SOCKET" send-keys -t agent-dev C-c`
- All agent output goes to the handoff directory for the next agent
