# AG Dev v3 — OpenClaw Edition

Multi-agent software development orchestration system. 14 Claude Code CLI agents, 9 workflows, 5 squads, 8 workers, 31 SuperSkills — running as an OpenClaw Skill.

> **Full documentation:** See [`skills/ag-dev/README.md`](skills/ag-dev/README.md)
> **Skill definition:** See [`skills/ag-dev/SKILL.md`](skills/ag-dev/SKILL.md)

## Quick Start

```bash
# Auto-decide: worker, single agent, or parallel
bash skills/ag-dev/scripts/claudio-dispatch.sh "Build a REST API with auth" /tmp/my-project

# Force parallel (multiple agents)
bash skills/ag-dev/scripts/claudio-dispatch.sh "Build full SaaS app" /tmp/project --force-parallel

# Dry run (see plan without executing)
bash skills/ag-dev/scripts/claudio-dispatch.sh "Build app" /tmp/project --dry-run
```

## Architecture

```
Task → Classifier (0 tokens) → Worker (simple) or Agent (complex)
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

## Branch

- `v3-openclaw` — Current active branch (OpenClaw Skill format)
- `main` — Legacy (Node.js server, deprecated)
