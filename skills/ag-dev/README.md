# ⚡ AG Dev V3 — Multi-Agent Development Orchestration (OpenClaw Edition)

Multi-agent software development platform. 12 specialized AI agents, 7 workflows, 5 squads, 31 SuperSkills — orchestrated via OpenClaw/Claude Code CLI + tmux.

## What Changed in V3

**V1** = Prototype.  
**V2** = Web platform (Express + React + PTY terminals), orchestrated via Clawdbot/Telegram.  
**V3** = **OpenClaw native.** No server, no UI. The orchestrator IS Claude Code running via OpenClaw, dispatching agents via tmux sessions.

### Why?
- Simpler: no Express server, no React UI, no node-pty dependencies
- Cheaper: no always-on server process
- More powerful: Claude Code CLI has full system access, no API limitations
- Native: runs as an OpenClaw skill, integrates with all other skills

## Architecture

```
OpenClaw (orchestrator = Claude Code main session)
  └── tmux socket: /tmp/agdev.sock
      ├── agent-analyst    → Atlas: Business analysis, discovery
      ├── agent-architect   → Aria: System design, architecture
      ├── agent-dev         → Dex: Implementation, coding, testing
      ├── agent-qa          → Quinn: Quality review, test architecture
      ├── agent-devops      → Gage: CI/CD, repo management, deploy
      ├── agent-pm          → Morgan: PRD, product strategy
      ├── agent-po          → Pax: Backlog, validation
      ├── agent-ux          → Uma: UX/UI design
      ├── agent-data        → Dara: Database, schemas
      ├── agent-sm          → River: Scrum master, stories
      ├── agent-content     → Content writer
      └── agent-seo         → SEO analyst
```

## Quick Start

```bash
# Initialize agents for a project
bash scripts/setup-agents.sh /tmp/agdev.sock /path/to/project

# Dispatch a task
bash scripts/dispatch-agent.sh /tmp/agdev.sock analyst /path/to/project "Create project brief"

# Monitor
tmux -S /tmp/agdev.sock capture-pane -p -J -t agent-analyst -S -200

# Cleanup
bash scripts/cleanup.sh /tmp/agdev.sock
```

📖 Full orchestration guide: [SKILL.md](SKILL.md)

## Structure

```
ag_dev/
├── SKILL.md              # Main orchestration guide (read this first)
├── README.md             # This file
├── config.json           # Configuration
├── agents/               # Agent personas (CLAUDE.md per agent)
│   ├── analyst/
│   ├── architect/
│   ├── dev/
│   ├── qa/
│   ├── devops/
│   ├── pm/
│   ├── po/
│   ├── ux/
│   ├── data-engineer/
│   ├── scrum-master/
│   ├── content-writer/
│   └── seo-analyst/
├── workflows/            # YAML workflow definitions
│   ├── greenfield-fullstack.yaml
│   ├── greenfield-service.yaml
│   ├── greenfield-ui.yaml
│   ├── brownfield-fullstack.yaml
│   ├── brownfield-discovery.yaml
│   ├── qa-loop.yaml
│   └── spec-pipeline.yaml
├── squads/               # Pre-configured team compositions
├── superskills/          # 31 built-in agent capabilities
├── memory/               # 3-tier memory (hot/warm/cold)
├── scripts/              # Setup, dispatch, cleanup scripts
└── docs/                 # System docs, retrospectives, roadmap
```

## Agents (12)

| Agent | Name | Specialty |
|-------|------|-----------|
| analyst | Atlas | Market research, discovery, brainstorming |
| architect | Aria | System design, architecture, tech evaluation |
| dev | Dex | Implementation, testing, refactoring |
| qa | Quinn | Quality review, test architecture, risk analysis |
| devops | Gage | CI/CD, releases, infrastructure |
| pm | Morgan | PRD creation, product strategy |
| po | Pax | Backlog, story validation, process |
| ux | Uma | UX/UI design, design systems |
| data-engineer | Dara | Database, schemas, migrations |
| scrum-master | River | Story creation, sprint planning |
| content-writer | — | Blog posts, docs, marketing copy |
| seo-analyst | — | SEO optimization, analytics |

## Workflows (7)

| Workflow | Use When |
|----------|----------|
| greenfield-fullstack | Building a new full-stack app from scratch |
| greenfield-service | Building a new API or backend service |
| greenfield-ui | Building a new frontend/UI |
| brownfield-fullstack | Adding features to existing app |
| brownfield-discovery | Auditing/analyzing existing codebase |
| qa-loop | Iterative review → fix → review cycle |
| spec-pipeline | Turning informal requirements into specs |

## Key Concepts

### Memory System (3-Tier)
- **Hot** — Current session context (JSON files)
- **Warm** — Recent learnings and patterns (JSONL append-only)
- **Cold** — Historical archive (archived from warm)

### Quality Gates
Every agent output goes through validation before the next agent starts. The flow is enforced, not suggested.

### Context Handoff
Agents communicate through files in `.agdev/handoff/`. No direct agent-to-agent communication — the orchestrator manages all handoffs.

## Documentation

| Doc | Content |
|-----|---------|
| [SYSTEM-XRAY.md](docs/SYSTEM-XRAY.md) | Complete V2 system dissection |
| [V3-ROADMAP.md](docs/V3-ROADMAP.md) | V3 vision and planned features |
| [AG_DEV_RETROSPECTIVE.md](docs/AG_DEV_RETROSPECTIVE.md) | Honest analysis of what worked/failed |
| [AG_DEV_GAPS_ANALYSIS.md](docs/AG_DEV_GAPS_ANALYSIS.md) | What was missing, what needs to exist |
| [AG_DEV_V2_BLUEPRINT.md](docs/AG_DEV_V2_BLUEPRINT.md) | V2 design blueprint |

## License

Private repository. All rights reserved.
