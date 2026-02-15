---
name: ag-dev
description: Multi-agent software development orchestration. Spawns specialized Claude Code CLI agents (analyst, architect, dev, qa, devops, pm, po, ux, data-engineer, scrum-master, content-writer, seo-analyst) in tmux sessions to build software through coordinated workflows — from greenfield projects to brownfield discovery. Use when asked to build, plan, or analyze a software project with multiple agents.
---

# AG Dev V3 — Multi-Agent Development Orchestration (OpenClaw Edition)

Orchestrate software development using specialized Claude Code CLI agents running in tmux sessions. You (OpenClaw main session) are the **orchestrator** — the brain that coordinates all agents.

> **V3 Philosophy:** Agents that collaborate like a real dev team, where each has deep expertise, the orchestrator enforces quality gates, and nothing gets lost in translation. Via tmux + Claude Code CLI instead of Express + React.

---

## Architecture

```
OpenClaw (you = orchestrator)
  ├── tmux socket: /tmp/agdev.sock
  │   ├── agent-analyst    → Atlas: Business analysis, discovery
  │   ├── agent-architect   → Aria: System design, architecture
  │   ├── agent-dev         → Dex: Implementation, coding, testing
  │   ├── agent-qa          → Quinn: Quality review, test architecture
  │   ├── agent-devops      → Gage: CI/CD, repo management, deploy
  │   ├── agent-pm          → Morgan: PRD creation, product strategy
  │   ├── agent-po          → Pax: Backlog, story refinement, validation
  │   ├── agent-ux          → Uma: UX/UI design, design systems
  │   ├── agent-data        → Dara: Database, migrations, schemas
  │   ├── agent-sm          → River: Scrum master, story creation
  │   ├── agent-content     → Content writer, marketing copy
  │   └── agent-seo         → SEO analyst, digital marketing
  ├── handoff/              → shared context files between agents
  └── memory/               → 3-tier memory system (hot/warm/cold)
```

---

## Quick Start

### 1. Receive the project

```bash
# Clone if URL provided
git clone <REPO_URL> /tmp/agdev-project
PROJECT_DIR="/tmp/agdev-project"
# Or use existing path
```

### 2. Choose a workflow

| Scenario | Workflow File | Key Agents |
|----------|--------------|------------|
| New full-stack app | `workflows/greenfield-fullstack.yaml` | analyst → pm → architect → po → dev → qa |
| New API/service | `workflows/greenfield-service.yaml` | analyst → pm → architect → po → dev → qa |
| New frontend/UI | `workflows/greenfield-ui.yaml` | analyst → pm → architect(ux) → po → dev → qa |
| Feature in existing app | `workflows/brownfield-fullstack.yaml` | analyst → pm → architect → dev → qa |
| Audit existing codebase | `workflows/brownfield-discovery.yaml` | architect ∥ analyst → qa → pm |
| QA review loop | `workflows/qa-loop.yaml` | qa ↔ dev (iterate) |
| Requirements → spec | `workflows/spec-pipeline.yaml` | pm → architect → analyst → pm → po |

Read the workflow YAML for the full sequence, conditions, and parallel phases.

### 3. Initialize infrastructure

```bash
SOCKET="/tmp/agdev.sock"
bash scripts/setup-agents.sh "$SOCKET" "$PROJECT_DIR"
```

### 4. Execute workflow phases

For each step, use the dispatch pattern:

```bash
# Write task to handoff
cat > "$PROJECT_DIR/.agdev/handoff/current-task.md" << 'EOF'
# Task: [description]
## Context
[relevant info, previous outputs]
## Instructions
[what this agent should do]
## Output
Save result to: .agdev/handoff/[output-file].md
EOF

# Dispatch to agent
bash scripts/dispatch-agent.sh "$SOCKET" analyst "$PROJECT_DIR" "Execute the task in .agdev/handoff/current-task.md"

# Monitor (poll for completion)
while ! tmux -S "$SOCKET" capture-pane -p -t agent-analyst -S -3 | grep -qE '^\$|^❯'; do
  sleep 10
done

# Read output for next agent
cat "$PROJECT_DIR/.agdev/handoff/[output-file].md"
```

---

## Orchestration Patterns

### Pattern A: Sequential (most workflows)
```
analyst → pm → architect → po → dev → qa → dev (fix) → done
```
Run each agent one at a time. Each reads previous agent's output from handoff/.

### Pattern B: Parallel Phases (brownfield-discovery)
```bash
# Dispatch multiple agents simultaneously
tmux -S "$SOCKET" send-keys -t agent-architect "..." Enter
tmux -S "$SOCKET" send-keys -t agent-analyst "..." Enter
# Wait for ALL to complete before proceeding
```

### Pattern C: Loop with Quality Gate (qa-loop)
```
qa reviews → if REJECT → dev fixes → qa reviews → repeat (max 5 iterations)
if BLOCKED → escalate to human
if APPROVE → done
```

### Pattern D: Conditional Branching (brownfield-fullstack)
```
analyst classifies scope →
  if SINGLE_STORY → skip to dev
  if SMALL_FEATURE → skip to story sharding
  if MAJOR → full workflow
```

### Pattern E: Squad Activation
Activate a pre-configured squad of agents for a task:
```bash
# Read squad config
cat squads/fullstack-dev.json
# Setup only the agents in the squad
bash scripts/setup-agents.sh "$SOCKET" "$PROJECT_DIR" analyst architect dev qa
```

---

## Quality Gates (enforce, don't suggest)

### V3 Principle: The flow is a straitjacket, not a suggestion.

After EVERY agent completes, before proceeding:

1. **Output Validation** — Does the handoff file exist and have substance?
2. **Consistency Check** — Does output align with previous artifacts?
3. **Gate Decision** — PASS / CONCERNS / FAIL / WAIVED

```yaml
quality_gates:
  code_generation:
    - lint_check: auto       # Run linter on generated code
    - type_check: auto       # TypeScript/type validation
    - test_generation: required  # Tests must exist
  architecture:
    - consistency_check: auto    # Cross-reference with PRD
    - pattern_compliance: auto   # Follows chosen patterns
  review:
    - security_scan: auto        # Check for secrets, vulns
    - performance_check: auto    # Basic perf validation
    - human_approval: optional   # Escalate if needed
```

### Auto-QA Hook
After every dev agent completion:
1. Check if tests exist and pass
2. Run linter
3. If visual component: flag for manual review
4. Block commit if critical issues found

---

## Memory System (3-Tier)

### Hot Memory — Current session context
```bash
# Written to memory/hot/*.json
# Used for: current workflow state, active decisions, agent context
echo '{"key":"current-workflow","value":"greenfield-fullstack","updatedAt":1234}' > memory/hot/current-workflow.json
```

### Warm Memory — Recent learnings and patterns
```bash
# Appended to memory/warm/*.jsonl (JSON Lines)
# Used for: patterns learned, decisions made, errors encountered
echo '{"type":"learning","agent":"dev","lesson":"Always run tests before commit","timestamp":1234}' >> memory/warm/agent-dev.jsonl
```

### Cold Memory — Historical archive
```bash
# Archived from warm when session ends
# Used for: historical reference, pattern analysis
cp memory/warm/agent-dev.jsonl memory/cold/agent-dev-2026-02-15.jsonl
```

### Memory Folding (compress context)
When an agent's warm memory grows too large:
1. Extract key events (completions, errors)
2. Extract patterns (learnings)
3. Save compressed summary to hot
4. Archive warm to cold

---

## Context Handoff Protocol

Agents share context through files in `$PROJECT_DIR/.agdev/handoff/`:

```
.agdev/handoff/
├── current-task.md          # Current task (overwritten each step)
├── workflow-state.json      # Tracks phase/step/iteration
├── project-brief.md         # analyst output
├── prd.md                   # pm output
├── architecture.md          # architect output
├── front-end-spec.md        # ux/architect output
├── story-N.md               # sharded stories
├── qa-review.md             # qa output
├── dev-output.md            # dev summary
├── validation-report.md     # po output
└── CONTEXT.md               # Auto-generated project context
```

### Workflow State
```json
{
  "workflow": "greenfield-fullstack",
  "currentPhase": 3,
  "currentStep": "architect",
  "completedSteps": ["devops-bootstrap", "analyst-discovery", "pm-prd"],
  "startedAt": "2026-02-15T03:00:00Z",
  "qualityGates": {
    "analyst-discovery": "PASS",
    "pm-prd": "PASS"
  }
}
```

---

## Agent Capabilities (SuperSkills)

Each agent can leverage these built-in capabilities as part of their tasks:

### Analyzers
- **code-complexity** — Cyclomatic complexity, function counts, hotspots
- **csv-summarizer** — Statistical summaries of CSV data
- **dep-graph** — Dependency analysis (package.json, requirements.txt)
- **git-stats** — Repository statistics, activity patterns, timelines
- **security-scan** — Secrets detection, eval() usage, SQL injection, XSS patterns
- **temporal-analysis** — Timeline data analysis with graph metrics

### Builders
- **docx-builder** — Generate Word documents
- **pdf-builder** — Generate PDFs from markdown
- **xlsx-builder** — Generate Excel spreadsheets
- **static-site** — Convert markdown to static HTML site
- **image-enhance** — ImageMagick operations (sharpen, resize, optimize)
- **file-organize** — Organize files by type/date/size

### Generators
- **api-scaffold** — Express REST API scaffolding from entity definitions
- **changelog-gen** — Changelogs from git history (conventional commits)
- **dockerfile-gen** — Optimized multi-stage Dockerfiles
- **readme-gen** — Auto-detect stack and generate README
- **schema-to-types** — JSON Schema → TypeScript interfaces
- **domain-brainstorm** — Creative domain name generation + DNS check

### Transformers
- **article-extractor** — Clean article extraction from HTML
- **csv-to-json** — CSV → JSON with type inference
- **html-to-md** — HTML → Markdown conversion
- **invoice-parser** — Extract structured data from invoices
- **json-to-form** — JSON Schema → HTML/React forms
- **md-to-slides** — Markdown → HTML slideshow

### Validators
- **lint-fix** — ESLint/Prettier for JS/TS, pattern-based for Python
- **webapp-test** — Basic web app functionality testing

Tell agents about relevant capabilities in their task descriptions. For example, tell @dev to use `lint-fix` after implementation.

---

## Squads (Pre-configured Teams)

| Squad | Agents | Default Workflow | Use When |
|-------|--------|-----------------|----------|
| 🏗️ Full Stack Dev | analyst, architect, dev, qa | greenfield-fullstack | Building complete applications |
| 🔧 Backend API | analyst, architect, dev | greenfield-service | Building APIs/services |
| 🎨 Frontend UI | ux, dev, qa | greenfield-ui | Building UIs/frontends |
| 🚀 DevOps Infra | devops, architect | - | Infrastructure setup |
| ✍️ Content Marketing | content, seo | spec-pipeline | Content creation |

Squad configs are in `squads/*.json`. You can create custom squads dynamically.

---

## Cleanup

```bash
bash scripts/cleanup.sh /tmp/agdev.sock
```

---

## Tips & Lessons Learned

### From the Retrospective (RSB project):
1. **No fix is too small for the system** — Once you bypass the flow for "quick fixes", discipline collapses
2. **The flow must be a straitjacket** — If the orchestrator CAN skip steps, they WILL skip them
3. **Speed without quality is rework in disguise** — Invest in QA upfront
4. **Without visual testing, QA is incomplete** — Reading CSS ≠ seeing the UI
5. **Agents don't communicate** — Use the handoff protocol rigorously. Keep CONTEXT.md updated
6. **Merge is the failure point** — Use file locking (one agent per file), avoid parallel edits on same file
7. **Track everything** — Use workflow-state.json, memory system, and handoff files

### For the Orchestrator (you):
- Keep tasks focused — each Claude Code session has limited context
- Use `--print` for non-interactive single-shot tasks
- If an agent gets stuck: `tmux -S "$SOCKET" send-keys -t agent-dev C-c`
- Poll for completion by checking if shell prompt returns
- All output goes to handoff/ so the next agent can read it
- Record learnings to warm memory after each workflow
