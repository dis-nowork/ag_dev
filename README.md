# AG Dev v3 — OpenClaw Edition

Multi-agent software development orchestration system. Spawns specialized Claude Code CLI agents in tmux sessions to build software through coordinated workflows.

> **Full documentation:** See `skills/ag-dev/README.md`

## Quick Start

```bash
# Auto-decide single vs parallel
bash skills/ag-dev/scripts/claudio-dispatch.sh "Build a REST API with auth" /tmp/my-project

# Force parallel (multiple agents)
bash skills/ag-dev/scripts/claudio-dispatch.sh "Build full SaaS app" /tmp/project --force-parallel

# Force single agent
bash skills/ag-dev/scripts/claudio-dispatch.sh "Fix typo in README" /tmp/project --force-single

# Dry run (see plan without executing)
bash skills/ag-dev/scripts/claudio-dispatch.sh "Build app" /tmp/project --dry-run
```

## Architecture

```
User Task → Task Classifier → Workers (deterministic) or Agents (LLM)
                                    ↓
                              Gate Evaluator (between agents)
                                    ↓
                              Evolution Engine (learn & improve)
```

- **14 Agents**: analyst, architect, dev, qa, devops, pm, po, ux, data-engineer, scrum-master, content-writer, seo-analyst, prompt-engineer, cost-analyst
- **9 Workflows**: greenfield (fullstack/service/ui), brownfield (fullstack/discovery), qa-loop, spec-pipeline, code-review, parallel-fullstack
- **5 Squads**: backend-api, frontend-ui, fullstack-dev, content-marketing, devops-infra
- **8 Workers**: lint-fix, test-runner, build-check, git-ops, dep-install, file-scaffold, format-code, image-optimize
- **31 SuperSkills**: analyzers, builders, connectors, generators, transformers, validators

## Key Scripts

| Script | Purpose |
|--------|---------|
| `claudio-dispatch.sh` | Main dispatcher (auto/single/parallel) |
| `task-classifier.sh` | Deterministic complexity scoring |
| `gate-evaluator.sh` | Validates handoffs between agents |
| `evolution-engine.sh` | Detects patterns, generates workers, scans gaps |
| `dispatch-agent.sh` | Spawns single agent in tmux |
| `parallel-dispatch.sh` | Manages parallel agent execution |
| `spec-to-tasks.sh` | Decomposes specs into task list |
| `gotchas.sh` | Context-aware warnings before execution |

## Philosophy (AIOS)

- **80% deterministic, 20% reasoning** — Workers handle lint/test/build/git with zero tokens
- **Gate evaluator between agents** — Deterministic validation, no LLM in gates
- **Evolution engine** — Monitor patterns → detect automation candidates → auto-generate workers

## Branch

- `v3-openclaw` — Current active branch (OpenClaw Skill format)
- `main` — Legacy (Node.js server, deprecated)
