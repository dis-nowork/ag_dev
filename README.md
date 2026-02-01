# AG Dev — Multi-Agent Development Armor

> A suit, not a brain. Wraps around your AI assistant to give it Iron Man-level development power with full visual control.

## What is this?

AG Dev is a **development command center** that fuses:

- **AIOS** (Synkra) — Multi-agent workflow framework with 12 specialized agents
- **Clawdbot** — AI assistant engine with session management, tool execution, and multi-agent routing
- **Command Center UI** — Real-time visual interface for orchestrating everything

When your AI assistant activates AG Dev on a project, you get:

1. **Kanban-style agent board** — See all agents working across 4 development phases
2. **Per-agent control** — Click any agent to see what it's doing, pause it, redirect it, or chat with it directly
3. **Floating command chat** — Talk to the orchestrator from any view
4. **Live document editing** — View and edit all project artifacts in real-time
5. **Git integration** — Commit, view history, manage branches visually

## Architecture

```
┌─────────────────────────────────────────────────┐
│              COMMAND CENTER (React)              │
│  Kanban │ Agent Panels │ Chat │ Docs │ Git      │
└──────────────────┬──────────────────────────────┘
                   │ HTTP + SSE
┌──────────────────┴──────────────────────────────┐
│              AG DEV SERVER (Node.js)             │
│  Agent State │ Chat Router │ File API │ Git API  │
└──────┬───────────────┬──────────────────────────┘
       │               │
┌──────┴──────┐ ┌──────┴──────────────────────────┐
│ AIOS Core   │ │ Clawdbot/AI Engine               │
│ Agents      │ │ sessions_spawn / sessions_send    │
│ Workflows   │ │ exec / tools / skills            │
│ Tasks       │ │ Model inference                   │
│ Templates   │ │ Multi-agent routing               │
└─────────────┘ └──────────────────────────────────┘
```

## Quick Start

```bash
# Clone into your project
npx ag-dev init

# Or manually
git clone https://github.com/kml-einerd/ag_dev.git .ag-dev
node .ag-dev/server.js
```

## Philosophy

Built on Elliot Jaques' cognitive levels framework:
- **The AI operates at Level 5-6** — systemic complexity, parallel processing
- **The human operates as commander** — strategic direction, quality control
- **The interface bridges the gap** — making complex orchestration tangible

---

*Built by Claudio (AI) & KML — 2026*
