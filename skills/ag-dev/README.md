# AG Dev V3 — Multi-Agent Development Orchestration

Multi-agent software development system running as an OpenClaw Skill. 14 specialized Claude Code CLI agents, 9 workflows, 5 squads, 8 workers, 31 SuperSkills — orchestrated via tmux.

## How It Works

```
Task → Classifier (0 tokens) → Worker (simple) or Agent (complex)
                                         ↓
                                   Gate Evaluator (between agents)
                                         ↓
                                   Evolution Engine (learn & improve)
```

1. **Task Classifier** scores complexity deterministically (zero LLM tokens)
2. **Workers** handle simple tasks (lint, test, build, git) instantly
3. **Agents** handle complex tasks via Claude Code CLI in tmux sessions
4. **Gate Evaluator** validates handoffs between agents (zero LLM)
5. **Evolution Engine** detects patterns and auto-generates new workers

## Quick Start

```bash
# Auto-decide: worker, single agent, or parallel multi-agent
bash scripts/claudio-dispatch.sh "Build a REST API with auth" /tmp/my-project

# Force parallel (decomposes into subtasks, runs multiple agents)
bash scripts/claudio-dispatch.sh "Build full SaaS app" /tmp/project --force-parallel

# Force single agent
bash scripts/claudio-dispatch.sh "Fix the login bug" /tmp/project --force-single

# Dry run (see classification + plan without executing)
bash scripts/claudio-dispatch.sh "Build app" /tmp/project --dry-run
```

### Manual Agent Control

```bash
# Set up tmux sessions for agents
bash scripts/setup-agents.sh /tmp/agdev.sock /path/to/project

# Dispatch a single agent
bash scripts/dispatch-agent.sh /tmp/agdev.sock dev /path/to/project "Implement user auth"

# Monitor agent output
tmux -S /tmp/agdev.sock capture-pane -p -J -t agent-dev -S -200

# Tear down
bash scripts/cleanup.sh /tmp/agdev.sock
```

## Agents (14)

| Agent | Name | Role |
|-------|------|------|
| analyst | Atlas | Business analysis, discovery, competitive research |
| architect | Aria | System design, architecture, API contracts |
| dev | Dex | Implementation, testing, refactoring |
| qa | Quinn | Quality review, test architecture, gate decisions |
| devops | Gage | CI/CD, releases, deploy (only agent that pushes) |
| pm | Morgan | PRD creation, product strategy, KPIs |
| po | Pax | Backlog validation, acceptance criteria |
| ux | Uma | UX/UI design, design systems, Tambo AI |
| data-engineer | Dara | Database schemas, migrations, RLS policies |
| scrum-master | River | Story creation, sprint planning |
| content-writer | Sage | Copywriting (AIDA/PAS/BAB), SEO content |
| seo-analyst | Pixel | Technical SEO audits, keyword research |
| prompt-engineer | Prism | Prompt optimization for image/video/audio/copy |
| cost-analyst | Ledger | Budget tracking, cost estimation per operation |

## Workflows (9)

| Workflow | Use Case |
|----------|----------|
| greenfield-fullstack | New full-stack app from scratch |
| greenfield-service | New API/backend service |
| greenfield-ui | New frontend/UI |
| brownfield-fullstack | Adding features to existing app |
| brownfield-discovery | Auditing/analyzing existing codebase |
| qa-loop | Iterative review/fix/review cycle |
| spec-pipeline | Requirements to specs |
| code-review | Multi-agent code review |
| parallel-fullstack | Spec decompose, parallel agents, auto-review, merge |

## Squads (5)

| Squad | Agents | Default Workflow |
|-------|--------|-----------------|
| backend-api | analyst, architect, dev, data-engineer, qa, devops | greenfield-service |
| frontend-ui | analyst, architect, ux, dev, qa | greenfield-ui |
| fullstack-dev | analyst, architect, dev, qa, devops, pm, po | greenfield-fullstack |
| content-marketing | content-writer, seo-analyst, ux | spec-pipeline |
| devops-infra | devops, architect, qa | brownfield-fullstack |

## Workers (8)

Deterministic shell scripts — zero LLM tokens:

| Worker | Triggers |
|--------|----------|
| lint-fix | lint, eslint, fix lint |
| test-runner | test, run tests, vitest, jest, pytest |
| build-check | build, compile, type-check, tsc |
| git-ops | commit, push, branch, merge, git |
| dep-install | install, npm install, pip install |
| file-scaffold | scaffold, generate, boilerplate, template |
| format-code | format, prettier, black, fmt |
| image-optimize | optimize image, compress image, webp |

## Key Scripts

| Script | Purpose |
|--------|---------|
| `claudio-dispatch.sh` | Main dispatcher: classify, route, execute, gate, evolve |
| `task-classifier.sh` | Deterministic complexity scoring (simple/medium/complex) |
| `gate-evaluator.sh` | Validates handoffs between agents (APPROVED/NEEDS_REVISION/BLOCKED) |
| `evolution-engine.sh` | Detects patterns, generates workers, scans gaps |
| `dispatch-logger.sh` | Concurrency-safe logging with flock |
| `dispatch-agent.sh` | Spawns single agent in tmux via Claude Code CLI |
| `parallel-dispatch.sh` | Manages parallel agent execution with git worktrees |
| `spec-to-tasks.sh` | Decomposes specs into task list JSON |
| `auto-review.sh` | QA agent iterative review loop |
| `task-runner.sh` | Full pipeline: decompose, dispatch, review, CI, merge |
| `gotchas.sh` | Context-aware warnings/lessons learned |

## Architecture

```
ag-dev/
├── agents/           14 agent personas (CLAUDE.md each)
├── checklists/       Pre/post-development, QA review
├── config.json       Central configuration
├── dashboard/        HTML status dashboard
├── docs/             System docs, retrospectives, roadmap
├── engines/          Python engines (arsenal, creative, intelligence, memory, dashboard)
├── libs/             claude_capabilities (image/video/audio/copy/deploy), json-render
├── memory/           3-tier: hot (session), warm (learnings), cold (archive)
├── scripts/          All orchestration scripts
├── skills/           Sub-skills (content-pack, copy-squad, image-gen, tts, etc.)
├── squads/           5 pre-configured team compositions
├── superskills/      31 SuperSkills (analyzers, builders, connectors, generators, transformers, validators)
├── workers/          8 deterministic workers + registry.json
└── workflows/        9 workflow definitions
```

## Philosophy (AIOS)

- **80% deterministic, 20% reasoning** — Workers handle simple tasks at zero cost
- **Gate-enforced quality** — No handoff without validation, no LLM in gates
- **Self-evolution** — Monitor execution patterns, auto-generate workers from proven patterns
- **Context handoff via files** — Agents communicate through `.agdev/handoff/`, orchestrator manages flow

## License

Private repository. All rights reserved.
