# Parallel Full-Stack Workflow

Multi-agent parallel execution for full-stack projects. Decomposes a spec into independent tasks, dispatches N agents simultaneously, reviews each branch, and merges approved work.

## When to Use

- Full-stack projects with multiple independent features
- Refactors touching separate modules
- Any project where tasks don't have sequential dependencies

## Architecture

```
spec-to-tasks.sh        → Decompose spec into N parallel tasks (JSON)
parallel-dispatch.sh     → Spawn N agents, each on own branch
auto-review.sh (×N)     → QA reviews each branch (max 3 iterations)
run-ci-local.sh (×N)    → Run CI via act on approved branches
merge-reviewed.sh       → Merge all approved branches to main
```

## Quick Start (One Command)

```bash
SOCKET="/tmp/agdev.sock"
PROJECT="/path/to/project"
SPEC="/path/to/spec.md"

# Full pipeline: spec → tasks → parallel agents → review → CI → merge
bash {skillDir}/scripts/task-runner.sh "$PROJECT" "$SPEC" "$SOCKET"
```

## Step-by-Step

### 1. Write a project spec

```markdown
# My Project Spec

## Features
1. User authentication (email/password + OAuth)
2. Dashboard with charts (React + recharts)
3. REST API for CRUD operations
4. Database schema (PostgreSQL + Prisma)
```

### 2. Generate task list

```bash
bash {skillDir}/scripts/spec-to-tasks.sh spec.md tasks.json "$PROJECT"
cat tasks.json  # Review the decomposition
```

### 3. Dispatch all agents in parallel

```bash
bash {skillDir}/scripts/parallel-dispatch.sh "$PROJECT" tasks.json "$SOCKET"
# Each agent works on its own branch simultaneously
```

### 4. Review each branch

```bash
# Auto-review with QA agent (up to 3 fix iterations)
for branch in feature/task-1 feature/task-2 feature/task-3; do
  bash {skillDir}/scripts/auto-review.sh "$PROJECT" "$branch" "$SOCKET" 3
done
```

### 5. Run CI and merge

```bash
bash {skillDir}/scripts/run-ci-local.sh "$PROJECT"
bash {skillDir}/scripts/merge-reviewed.sh "$PROJECT" "$SOCKET" feature/task-1 feature/task-2
```

## Task List Format

```json
[
  {
    "id": "task-1",
    "agent": "dev",
    "prompt": "Implement user authentication with email/password...",
    "branch": "feature/task-1-auth",
    "priority": 1,
    "estimated_minutes": 20
  },
  {
    "id": "task-2",
    "agent": "dev",
    "prompt": "Build dashboard with React and recharts...",
    "branch": "feature/task-2-dashboard",
    "priority": 1,
    "estimated_minutes": 15
  }
]
```

## Notion Integration

If `~/.config/notion/api_key` exists, task-runner.sh automatically:
- Creates a Notion page per task in the Tasks DB
- Updates status: In Progress → Approved/Rejected

## Monitoring

```bash
# List all parallel sessions
tmux -S /tmp/agdev.sock list-sessions

# Watch a specific agent
tmux -S /tmp/agdev.sock attach -t parallel-task-1

# Check status files
ls -la $PROJECT/.agdev/parallel-status/
cat $PROJECT/.agdev/parallel-status/task-1.status
```

## Failure Handling

- **Agent timeout (1h)**: Task marked as incomplete in summary
- **QA rejects 3×**: Branch marked as rejected, human escalation
- **Merge conflict**: Branch skipped, reported in summary
- **CI failure**: Reported but doesn't block other merges
