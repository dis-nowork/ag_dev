---
name: ag-dev
description: Multi-agent software development orchestration. Spawns specialized Claude Code CLI agents (analyst, architect, dev, qa, devops, pm, po) in tmux sessions to build software through coordinated workflows — from greenfield projects to brownfield discovery. Use when asked to build, plan, or analyze a software project with multiple agents.
---

# AG Dev — Multi-Agent Development Orchestration

Orchestrate software development using specialized Claude Code CLI agents running in tmux sessions. You (OpenClaw main session) are the orchestrator.

## Architecture

```
OpenClaw (you = orchestrator)
  ├── tmux socket: /tmp/agdev.sock
  │   ├── agent-analyst   → Claude Code with analyst persona
  │   ├── agent-architect  → Claude Code with architect persona
  │   ├── agent-dev        → Claude Code with dev persona
  │   ├── agent-qa         → Claude Code with qa persona
  │   ├── agent-devops     → Claude Code with devops persona
  │   ├── agent-pm         → Claude Code with pm persona
  │   └── agent-po         → Claude Code with po persona
  └── handoff/             → shared context files between agents
```

## Quick Start

### 1. Receive the project

```bash
# Clone if URL
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

Read the workflow file in `{skillDir}/workflows/` for the full sequence.

### 3. Initialize tmux infrastructure

```bash
SOCKET="/tmp/agdev.sock"
PROJECT_DIR="/path/to/project"
HANDOFF_DIR="$PROJECT_DIR/.agdev/handoff"
mkdir -p "$HANDOFF_DIR"

# Create the setup script and run it
bash {skillDir}/scripts/setup-agents.sh "$SOCKET" "$PROJECT_DIR"
```

### 4. Run agents in sequence

For each step in the workflow, dispatch the appropriate agent:

```bash
SOCKET="/tmp/agdev.sock"
AGENT="agent-analyst"  # or agent-architect, agent-dev, etc.

# Send a task to an agent
tmux -S "$SOCKET" send-keys -t "$AGENT" \
  "Read the project brief request in .agdev/handoff/current-task.md and produce the output specified there." Enter

# Monitor progress
tmux -S "$SOCKET" capture-pane -p -J -t "$AGENT" -S -200

# Check if done (look for the $ prompt returning)
tmux -S "$SOCKET" capture-pane -p -t "$AGENT" -S -5 | grep -q '\\$'
```

## How to Dispatch an Agent

### Step-by-step for each workflow phase:

1. **Write the task file** — Save instructions + context to `$HANDOFF_DIR/current-task.md`:
   ```markdown
   # Task: Create Project Brief
   
   ## Context
   [paste relevant info: user request, previous agent output, etc.]
   
   ## Instructions
   [what this agent should do]
   
   ## Output
   Save result to: .agdev/handoff/project-brief.md
   ```

2. **Send to agent**:
   ```bash
   tmux -S "$SOCKET" send-keys -t agent-analyst \
     "Read .agdev/handoff/current-task.md and execute the task described there. Save output as specified." Enter
   ```

3. **Wait for completion** — Poll until the shell prompt returns:
   ```bash
   while ! tmux -S "$SOCKET" capture-pane -p -t agent-analyst -S -3 | grep -qE '^\$|^❯'; do
     sleep 10
   done
   ```

4. **Read the output** — The agent saved its output to the handoff directory. Read it and prepare the next agent's task.

5. **Repeat** for the next agent in the workflow sequence.

## Context Handoff

Agents share context through files in `$PROJECT_DIR/.agdev/handoff/`:

```
.agdev/handoff/
├── current-task.md          # Current task instructions (overwritten each step)
├── project-brief.md         # analyst output
├── prd.md                   # pm output
├── architecture.md          # architect output
├── front-end-spec.md        # architect/ux output
├── story-N.md               # current story
├── qa-review.md             # qa output
└── workflow-state.json      # tracks current phase/step
```

### Workflow State Tracking

Maintain state in `.agdev/handoff/workflow-state.json`:
```json
{
  "workflow": "greenfield-fullstack",
  "currentPhase": 1,
  "currentStep": "analyst",
  "completedSteps": ["devops-bootstrap"],
  "startedAt": "2026-02-15T03:00:00Z"
}
```

## Agent Personas

Each agent runs Claude Code with a CLAUDE.md file that defines its persona. The persona files are in `{skillDir}/agents/`. When setting up, the setup script copies the appropriate CLAUDE.md into each agent's working context.

### Available Agents

| Agent | Name | Role |
|-------|------|------|
| analyst | Atlas | Business analysis, discovery, research |
| architect | Aria | System design, architecture decisions |
| dev | Dex | Implementation, coding, testing |
| qa | Quinn | Quality review, test architecture |
| devops | Gage | CI/CD, repo management, deploy |
| pm | Morgan | PRD creation, product strategy |
| po | Pax | Backlog, story refinement, validation |

## Workflow Execution Patterns

### Pattern A: Sequential (most workflows)

```
analyst → pm → architect → po (validate) → dev → qa → dev (fix) → done
```

The orchestrator runs each agent one at a time, passing handoff files.

### Pattern B: Parallel phases (brownfield-discovery)

Some phases can run in parallel. Use separate tmux sessions:

```bash
# Start parallel agents
tmux -S "$SOCKET" send-keys -t agent-architect "..." Enter
tmux -S "$SOCKET" send-keys -t agent-analyst "..." Enter

# Wait for both
for agent in agent-architect agent-analyst; do
  while ! tmux -S "$SOCKET" capture-pane -p -t "$agent" -S -3 | grep -qE '^\$'; do
    sleep 10
  done
done
```

### Pattern C: Loop (qa-loop)

```
qa reviews → if REJECT → dev fixes → qa reviews again → repeat until APPROVE or max iterations
```

## Cleanup

```bash
bash {skillDir}/scripts/cleanup.sh "$SOCKET"
```

## Tips

- Each Claude Code session has its own context window — keep tasks focused
- Use `--print` flag on Claude Code for non-interactive single-shot tasks
- For long tasks, the agent will keep working; just poll for the prompt to return
- If an agent gets stuck, send `Ctrl+C` then retry: `tmux -S "$SOCKET" send-keys -t agent-dev C-c`
- All agent output goes to the handoff directory so the next agent can read it
