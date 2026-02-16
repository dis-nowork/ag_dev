> *Migrated from claudio-motor (v1) — reference document*

# AG Dev — Design Specification
## A Multi-Agent Development Command Center
### Designed by a Council of Level 5-6 Thinkers

**Version:** 0.1 — Foundation Document  
**Purpose:** A visual interface wrapping Clawdbot that gives a human developer Iron Man suit-level powers through 12 specialized AI agents.  
**Design Method:** Synthesis of seven expert perspectives into a buildable specification.

---

## Table of Contents

1. [The Panel](#the-panel)
2. [Perspective 1: Anthropic — Constitutional Oversight](#1-anthropic--constitutional-oversight)
3. [Perspective 2: Bret Victor — Direct Manipulation](#2-bret-victor--direct-manipulation)
4. [Perspective 3: Edward Tufte — Information Density](#3-edward-tufte--information-density)
5. [Perspective 4: Dieter Rams — Radical Simplicity](#4-dieter-rams--radical-simplicity)
6. [Perspective 5: Don Norman — Cognitive Architecture](#5-don-norman--cognitive-architecture)
7. [Perspective 6: Level 6 Systems Thinker](#6-level-6-systems-thinker--meta-architecture)
8. [Perspective 7: Linear × Vercel × Figma](#7-linear--vercel--figma--modern-craft)
9. [Unified Design Specification](#unified-design-specification)
10. [The Five Screens](#the-five-screens)
11. [What Makes This Level 5-6](#what-makes-this-level-5-6)

---

## The Panel

| Seat | Thinker | Contribution Domain | Core Question |
|------|---------|-------------------|---------------|
| 1 | Anthropic (Constitutional AI) | Oversight & trust | How does the human stay meaningfully in control? |
| 2 | Bret Victor | Direct manipulation | How do you *touch* the abstract? |
| 3 | Edward Tufte | Information design | How do you show 12 agents without lying? |
| 4 | Dieter Rams | Industrial design | What do you *remove*? |
| 5 | Don Norman | Cognitive psychology | How does the user think about this? |
| 6 | Level 6 Systems Thinker | Meta-architecture | How does the UI become a thinking tool? |
| 7 | Linear/Vercel/Figma team | Modern product craft | How do you ship this so people love it? |

---

## 1. Anthropic — Constitutional Oversight

### Core Principles

Anthropic's design philosophy centers on **human oversight of AI systems** — not as a limitation but as the mechanism that makes powerful AI *usable*. From Constitutional AI, three principles transfer directly:

1. **Transparency of reasoning** — Every agent action should expose *why*, not just *what*
2. **Hierarchical oversight** — The human sets intent; agents execute within bounded authority
3. **Corrigibility** — Any agent can be interrupted, redirected, or rolled back at any time without losing work
4. **Honest uncertainty** — Agents must surface what they *don't know* and where they're making assumptions

### Specific UI/UX Recommendations

**The Authority Gradient Panel:**
A persistent left-rail element showing the current delegation hierarchy:

```
┌─────────────────────────────┐
│  🧑 YOU (full authority)     │
│  ├── Orchestrator Agent      │
│  │   ├── Coder Agent    ●●●  │
│  │   ├── Reviewer Agent ●○○  │
│  │   └── Tester Agent   ●●○  │
│  ├── Research Agent      ●●● │
│  └── [paused agents dim]     │
│                              │
│  ◉ Override Mode: OFF        │
│  ⚡ Approval Level: AUTO     │
│     ▸ destructive: ASK       │
│     ▸ external: ASK          │
│     ▸ internal: AUTO         │
└─────────────────────────────┘
```

The filled dots (●) represent authority granted. The user can click any dot to expand/restrict an agent's permissions *while it's running*.

**The Constitutional Log:**
Every agent decision that involves judgment (not just execution) gets logged with a one-line rationale. This isn't buried in a debug console — it's a scannable feed:

```
12:04:32  Coder → chose async/await over callbacks (project convention)
12:04:33  Coder → skipped input validation (already handled by caller — see L47)
12:04:35  Reviewer → flagged: no error boundary on API call [AWAITING YOU]
```

Items marked `[AWAITING YOU]` are the only ones requiring human attention. Everything else is informational and scrollable.

**Approval Gates:**
Visual "gates" in the workflow — glowing amber when an agent is waiting for approval, with a one-click approve/reject and a text field for "do it differently":

```
┌─ GATE: Deploy to staging ─────────────────────┐
│                                                │
│  Reviewer says: All tests pass. 2 warnings.    │
│  Tester says: 94% coverage, +2% from baseline  │
│                                                │
│  [✓ Approve]  [✕ Reject]  [✎ Modify]          │
└────────────────────────────────────────────────┘
```

### What's WRONG with Typical Dashboards

"Most AI dashboards treat the human as a spectator watching a movie. The human should be the *director* — not editing every frame, but able to yell 'cut' at any moment and know exactly what they're looking at. Most dashboards show outputs without reasoning, which is like showing a court verdict without the opinion."

### Revolutionary Idea: **The Trust Dial**

A single, prominent control that smoothly adjusts from "check everything" to "full autonomy" — and the interface *morphs* accordingly:

- **At 0% (full oversight):** Every agent action pauses for approval. The UI is dense with detail.
- **At 50% (supervised):** Only destructive, external, or ambiguous actions pause. The UI shows summaries.
- **At 100% (full auto):** Agents run freely. The UI compresses to a progress timeline with anomaly alerts.

The dial position is *per-project* and *per-session*. New projects start lower. As the human builds trust, they slide it up. The system *remembers* your trust level and suggests adjustments: "You've approved 47 consecutive Coder actions — want to auto-approve routine code changes?"

---

## 2. Bret Victor — Direct Manipulation

### Core Principles

From *Inventing on Principle*: "Creators need an immediate connection to what they're creating." From *The Future of Programming*: We should be manipulating *behaviors*, not *text files*.

Applied to AG Dev:

1. **Immediacy** — The gap between intention and result should approach zero
2. **Liveness** — The system is always running, always showing the current state
3. **Direct manipulation** — You don't configure agents with forms; you *move them* with your hands
4. **Visible causality** — When you change something, you *see* what it affects

### Specific UI/UX Recommendations

**The Living Canvas:**
The main workspace isn't a dashboard with fixed panels. It's a 2D canvas (think infinite whiteboard) where agents are *objects* you can spatially arrange. Each agent is a card with a live preview of what it's doing:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│   [Coder]──writes──▶[code diff live preview]     │
│      │                      │                     │
│      │                      ▼                     │
│      │               [Reviewer]──reads──▶[notes]  │
│      │                      │                     │
│      ▼                      ▼                     │
│   [Tester]──runs──▶[test results live]           │
│                                                   │
│   ← drag agents to reorder workflow →             │
│   ← draw lines to create dependencies →          │
└─────────────────────────────────────────────────┘
```

**You rearrange agents by dragging them.** Draw a line from Coder to Reviewer and they become linked — Reviewer gets Coder's output. Delete the line, the dependency breaks. The *spatial layout IS the configuration*.

**Scrubbing Time:**
Bret Victor's signature move. A timeline scrubber at the bottom of the screen lets you *scrub through the history of the entire development session*:

```
◀──────────●──────────────────────────────▶
 10:00    10:15                         NOW
           │
     ┌─────┴─────┐
     │ At 10:15:  │
     │ 3 agents   │
     │ 47 files   │
     │ 2 conflicts│
     └────────────┘
```

Drag the scrubber left and the *entire canvas rewinds* — you see what every agent was doing at that moment. The code, the tests, the reviews — all scrub together. This isn't version control. It's a *time machine for the entire development state*.

**Inline Code Manipulation:**
When viewing code an agent is writing, you don't just read it — you can *edit it live* and the agent incorporates your changes. You see a function, you type in it, and the Coder agent *adapts its plan around your edit*. The code is not a static output; it's a shared document between you and the agent.

### What's WRONG with Typical Dashboards

"Dashboards are *pictures of data*, not *tools for thinking*. You look at a dashboard the way you look at a painting — passively. Every element should be grabbable, scrub-able, changeable. If I can't touch it and see what happens, it's a poster, not a tool."

### Revolutionary Idea: **Intention Sketching**

Instead of typing a task description, you *sketch* on the canvas what you want:
- Draw a box around three files → "refactor these together"
- Draw an arrow from a component to a test file → "add tests for this"
- Circle a section of code and write a note → the agent reads your annotation and acts on it

The sketch becomes the specification. The spatial gesture *is* the command.

---

## 3. Edward Tufte — Information Density

### Core Principles

1. **Data-ink ratio** — Every pixel must earn its place. No chartjunk, no decoration, no chrome that doesn't inform.
2. **Small multiples** — Show 12 agents the same way, side by side, so differences *pop*
3. **Micro/macro readings** — The same display should be readable at a glance AND in detail
4. **Layering and separation** — Use color, position, and whitespace to separate without borders

### Specific UI/UX Recommendations

**The Sparkline Grid:**
Twelve agents shown as a 4×3 grid of sparkline cards. Each card is 200×80px — tiny, dense, information-rich:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Coder    │ │ Reviewer │ │ Tester   │ │ Deployer │
│ ▁▃▅▇▅▃▁ │ │ ▁▁▁▃▇▇▅▁│ │ ▁▁▅▇▇▇▇▅│ │ ▁▁▁▁▁▁▁▁│
│ 142 edits│ │ 7 issues │ │ 94% pass │ │ idle     │
│ auth.ts  │ │ auth.ts  │ │ suite #4 │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Architect│ │ Research │ │ Security │ │ Docs     │
│ ▃▃▅▅▃▁▁▁│ │ ▇▇▅▃▁▁▁▁│ │ ▁▁▁▁▁▃▅▇│ │ ▁▃▃▃▃▃▃▁│
│ planning │ │ 3 sources│ │ scanning │ │ 4 pages  │
│ RFC #2   │ │ OAuth2   │ │ deps.json│ │ API ref  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ DevOps   │ │ Database │ │ Frontend │ │ Debugger │
│ ▁▁▁▁▁▁▁▁│ │ ▅▇▅▃▁▁▁▁│ │ ▁▁▁▃▅▇▇▅│ │ ▁▁▁▁▃▅▇▇│
│ idle     │ │ 2 migr.  │ │ 8 comps  │ │ stack #3 │
│          │ │ users tbl│ │ LoginForm│ │ TypeError│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

The sparklines show activity over the last 30 minutes. You see *rhythm* — which agents are bursting, which are idle, which are ramping up. This is the macro reading: one glance tells you the shape of the whole system.

**Click any card** to expand it to full detail — the micro reading. The grid smoothly reorganizes around the expanded card (no page change, no modal).

**The Data-Ink Discipline:**
- **No borders** between sections — use whitespace (8px gaps)
- **No background colors** for containers — content floats on the surface
- **No legends** — labels are inline
- **No progress bars** — use the sparkline (it shows rate AND history, not just %)
- **Color is reserved for meaning:** red = needs attention, amber = awaiting approval, green = complete, everything else is grayscale
- **Typography does the work:** agent names in 13px semibold, stats in 11px monospace, descriptions in 11px regular

**The Sentence Summary:**
At the very top of the screen, a single sentence describes the entire system state in natural language:

```
8 of 12 agents active · Coder finishing auth module (ETA 3m) · 1 review awaiting you · all tests passing
```

This updates in real-time and serves as the *headline* — the ultimate macro reading.

### What's WRONG with Typical Dashboards

"Dashboards are filled with chartjunk — rounded corners on boxes that contain rounded corners on charts that contain legends that repeat what the title says. Every border, shadow, and gradient is a lie — it adds visual weight without adding information. Most dashboards have a data-ink ratio below 0.3. AG Dev should aim for 0.8+."

### Revolutionary Idea: **The Annotated Commit**

Every git commit AG Dev produces is visualized as a Tufte-style annotated document — the code diff in the center, with marginal annotations showing *which agent wrote each section and why*:

```
  auth.ts                          ANNOTATIONS
  ─────────────────────────────    ──────────────────
+ import { hash } from 'bcrypt'   │ Security: required
+ import { z } from 'zod'         │ Coder: input validation
                                   │
  export async function login(     │
+   input: LoginInput              │ Architect: typed inputs
  ) {                              │
+   const valid = schema.parse()   │ Security: injection guard
+   const user = await db.find()   │ Database: optimized query
+   if (!user) throw new Error()   │ Coder: standard pattern
+   const match = await compare()  │ Security: timing-safe
+   return signJwt(user)           │ Security: reviewed
  }                                │
```

Every line has provenance. You see the *collaboration* embedded in the code.

---

## 4. Dieter Rams — Radical Simplicity

### The 10 Principles Applied to AG Dev

| # | Principle | Application |
|---|-----------|-------------|
| 1 | **Innovative** | This isn't a dashboard — it's a collaborative workspace where you work *with* agents, not watch them |
| 2 | **Useful** | Every element serves a task the developer actually does: write, review, test, deploy, understand |
| 3 | **Aesthetic** | Monochrome base, one accent color (blue), typography-driven hierarchy. Beautiful because it's clear, not because it's decorated |
| 4 | **Understandable** | A new user should grasp the grid in 5 seconds: "those are my agents, that one's busy, that one needs me" |
| 5 | **Unobtrusive** | AG Dev recedes when agents are working and surfaces when decisions are needed |
| 6 | **Honest** | No fake progress bars. No optimistic ETAs. If an agent is stuck, it says "stuck" |
| 7 | **Long-lasting** | Built on primitives (grid, cards, timelines) that won't feel dated in 5 years |
| 8 | **Thorough** | Every edge case considered: What happens when 6 agents need approval simultaneously? (Answer: priority queue with batching) |
| 9 | **Environmentally friendly** | Minimal resource consumption — no animations unless they convey state change, no polling when WebSocket is available |
| 10 | **As little design as possible** | **The north star.** Remove everything that isn't the code, the agents, and the decisions. |

### Specific UI/UX Recommendations

**What Rams Would REMOVE:**
- Agent avatars/icons (names are enough)
- Animated spinners (a pulsing dot is sufficient)
- Sidebar navigation (one surface, zoom in/out)
- Settings pages (progressive disclosure, inline configuration)
- Welcome screens (the tool *is* the tutorial)
- Colored backgrounds for cards (whitespace separates)
- Confirmation dialogs for non-destructive actions (just do it; undo is available)
- Loading states (show stale data with a freshness indicator)

**What Rams Would KEEP:**
- The grid (essential structure)
- The sparklines (maximum info per pixel)
- The trust dial (core interaction)
- The timeline scrubber (essential for understanding)
- The sentence summary (fastest possible comprehension)
- Keyboard shortcuts for everything (power users are the audience)

**The Rams Test:**
For every proposed UI element, ask: "If I remove this, does the user lose the ability to do something?" If yes, keep it. If they merely lose *convenience*, find a way to fold it into something that already exists.

### What's WRONG with Typical Dashboards

"They mistake *completeness* for *usefulness*. They show everything because they can, not because they should. A good tool is one where you could describe every element on screen and why it's there. Most dashboards fail this test for 40% of their pixels."

### Revolutionary Idea: **The Disappearing Interface**

When all agents are working smoothly and no decisions are needed, the UI *fades* to near-transparency — just the sentence summary and subtle sparklines. It's the visual equivalent of "everything's fine, go write code." The moment something needs attention, the relevant section *solidifies* — opacity increases, the element enlarges, perhaps a subtle pulse. The interface breathes with the work.

---

## 5. Don Norman — Cognitive Architecture

### Core Principles

1. **Affordances** — The interface must *suggest* how to use it through its form
2. **Mental models** — The user needs a simple, accurate model of what 12 agents are doing
3. **Feedback** — Every action produces a visible, immediate, proportional response
4. **Mapping** — Controls should spatially and logically correspond to what they affect
5. **Constraints** — Make it hard to do the wrong thing
6. **Error recovery** — Assume errors will happen; make recovery cheap

### Specific UI/UX Recommendations

**The Mental Model: The Workshop**

Norman would insist on a single, coherent metaphor. For AG Dev: **a workshop with specialists**.

The user is the *lead developer* standing in a workshop. Around them are 12 specialists at their workbenches. You can:
- Walk up to any specialist (click/focus an agent) and see what they're doing in detail
- Give instructions to any specialist (natural language or structured commands)
- See the whole workshop at a glance (the grid view)
- Ring a bell and get everyone's attention (broadcast command)

This metaphor informs every interaction:
- Agents have *workbenches* (their expanded view shows their workspace)
- Work passes between agents like handing a document to the next person
- The *floor plan* (grid layout) is spatially stable — agents don't jump around

**Affordances Map:**

| Element | Affordance | Signal |
|---------|-----------|--------|
| Agent card | Clickable (expand) | Subtle hover elevation, cursor change |
| Sparkline | Scrubbable (time detail) | Tooltip follows cursor over sparkline |
| Trust dial | Draggable | Circular knob with tactile detents |
| Approval gate | Actionable | Glowing amber border, pulsing gently |
| Timeline | Scrubbable | Playhead with drag handle |
| Code in expanded view | Editable | Cursor changes to text cursor on hover |
| Agent connections | Drawable | Hovering near an agent edge shows connection points |
| Sentence summary | Clickable segments | Each phrase links to the relevant agent/state |

**Feedback Loops:**

1. **Immediate (< 100ms):** Click an agent → it expands. Type in code → characters appear. Drag trust dial → number updates.
2. **Short (1-5s):** Give an agent a command → you see it acknowledge and start working (streaming tokens or file activity).
3. **Medium (5-60s):** Agent completes a task → card updates, sparkline bumps, dependent agents activate.
4. **Long (minutes):** Full workflow completes → summary appears, commit is prepared, notification if you're in another view.

**Error Recovery:**
- **Every agent action is undoable** for the last 50 actions (not just the last one)
- **Undo is `Cmd+Z`** and it works *across agents* — undo the last thing any agent did
- **Branch-on-undo:** When you undo, the system creates a branch point. You can try a different approach and later compare both branches.

### What's WRONG with Typical Dashboards

"They violate the principle of *natural mapping*. The position of a widget on screen has no relationship to what it controls. Controls are organized by *technical category* (settings, monitoring, deployment) instead of by *task* (write this feature, fix this bug, ship this release). Norman would reorganize the entire interface around user tasks, not system structure."

### Revolutionary Idea: **Progressive Disclosure of Complexity**

The interface has three depth levels, and the user naturally flows between them:

- **Level 1 — The Sentence:** "8 agents active, 1 needs you, all tests passing." Visible always.
- **Level 2 — The Grid:** 12 cards with sparklines. One click from Level 1.
- **Level 3 — The Workbench:** Full detail on one agent's work. One click from Level 2.

You never see more complexity than you need. But the depth is *always one click away*. This matches how human attention works — you have a general awareness (peripheral vision) and focused attention (foveal vision). Level 1 is peripheral. Level 3 is foveal.

---

## 6. Level 6 Systems Thinker — Meta-Architecture

### Core Principles

A Level 6 thinker (in Jaques' Stratified Systems Theory) operates on **20-50 year time horizons** and deals with **whole systems of systems**. They don't design *features* — they design **the conditions under which the right features emerge**.

1. **The UI is a model of the work, and the work is a model of the UI** — they should be isomorphic
2. **Structure shapes behavior** — the information architecture determines what thoughts are possible
3. **Requisite variety** — the interface must have enough complexity to match the system it controls, but no more
4. **Self-reference** — the system should be able to model and improve *itself*

### Specific UI/UX Recommendations

**The Three Planes of Abstraction:**

A Level 6 thinker would structure AG Dev as three co-visible planes:

```
┌─────────────────────────────────────────────┐
│  PLANE 3: INTENT                            │
│  "Build an authentication system with       │
│   OAuth2 and role-based access control"     │
│                                             │
│  ↕ bidirectional influence                  │
├─────────────────────────────────────────────┤
│  PLANE 2: STRUCTURE                         │
│  Agent workflow graph:                      │
│  Architect → Coder → Reviewer → Tester     │
│       ↘ Security ↗        ↘ Deployer       │
│                                             │
│  ↕ bidirectional influence                  │
├─────────────────────────────────────────────┤
│  PLANE 1: MATERIAL                          │
│  Files: auth.ts, auth.test.ts, schema.sql  │
│  Lines changed: 347 | Tests: 23 | Docs: 4  │
└─────────────────────────────────────────────┘
```

The user can work at *any plane* and the others update:
- Edit the intent → agents reconfigure their workflow
- Rearrange the structure → agents replan their tasks
- Edit the code directly → agents notice and adapt

**This is the key insight:** Most tools force you to work bottom-up (write code) or top-down (describe intent). AG Dev lets you work at *whatever level of abstraction matches your current thinking*.

**Pattern Recognition Panel:**

A sidebar that surfaces *meta-patterns* across the current session:

```
PATTERNS DETECTED
─────────────────
⚡ Agent Coder keeps hitting the same auth pattern
   → Suggest extracting to shared middleware?

🔄 Reviewer has flagged similar issues 3x
   → Suggest updating coding standards?

📈 Test coverage correlates with agent pair
   Coder+Tester: 94% | Coder alone: 71%
   → Always pair for critical modules?
```

This is the system *observing itself* and feeding observations back to the human.

**The Isomorphic Structure:**

The file tree, the agent graph, and the intent hierarchy should all be *views of the same underlying model*. Changing one changes the others. The data structure is:

```
Project
  ├── Intent (what)
  │     ├── "Auth system" → spawns agents
  │     └── "Dashboard UI" → spawns agents
  ├── Structure (who)
  │     ├── Agent assignments
  │     └── Dependency graph
  └── Material (how)
        ├── Files
        ├── Tests
        └── Deployments
```

### What's WRONG with Typical Dashboards

"They present *one level of abstraction*. You see either the trees or the forest, never both. A Level 6 system shows you trees, forest, and ecosystem simultaneously — and lets you act at any level. Dashboards are flat. Reality is hierarchical. The tool should match reality's structure."

### Revolutionary Idea: **The Recursive UI**

AG Dev itself is a project that AG Dev can work on. The system contains agents that can modify the system's own interface, workflows, and rules. The meta-pattern: *the tool improves itself*.

Practically: a "meta-agent" that observes how you use AG Dev and suggests UI changes, workflow optimizations, and new agent configurations. After a week of use, your AG Dev looks different from someone else's — it has adapted to *your* thinking patterns.

---

## 7. Linear × Vercel × Figma — Modern Craft

### From Linear: Keyboard-First, Opinionated Defaults

**Core principles:**
- Speed is a feature. Every interaction under 100ms.
- Keyboard shortcuts for *everything*. Mouse-optional.
- Opinionated defaults > infinite configuration.
- Motion is purposeful — things move to show *where they came from* and *where they're going*.

**Specific recommendations:**

**Command Palette (Cmd+K):**
The primary interaction surface. Everything is accessible via search:

```
┌─ AG Dev ─────────────────────────────────┐
│  > _                                      │
│                                           │
│  AGENTS                                   │
│  ◉ Focus on Coder              ⌘1        │
│  ◉ Focus on Reviewer           ⌘2        │
│  ◉ Pause all agents            ⌘⇧P       │
│                                           │
│  ACTIONS                                  │
│  ▸ Assign task to agent...     ⌘⇧A       │
│  ▸ Review pending approvals    ⌘R        │
│  ▸ Open timeline               ⌘T        │
│                                           │
│  RECENT                                   │
│  ○ auth.ts — last edited 2m ago          │
│  ○ RFC: Database schema — by Architect   │
└──────────────────────────────────────────┘
```

**Status cycles** (from Linear's workflow):
Each agent task has a status: `Backlog → In Progress → In Review → Done`
Press a single key to cycle: `Space` advances, `Shift+Space` regresses.

### From Vercel: Developer-Centric Beauty

**Core principles:**
- Dark mode default (developers live here)
- Monospace for code, sans-serif for UI — never mix inappropriately
- Deploy previews → in AG Dev: *branch previews* (see what any agent's branch looks like)
- Real-time logs that are *beautiful*, not just functional

**Specific recommendations:**

**The Agent Console:**
When you expand an agent, its "workbench" includes a real-time log that looks like Vercel's deployment logs:

```
┌─ Coder Agent ─────────────────────────────────┐
│                                                │
│  ● auth.ts                                     │
│  12:04:31  Reading existing auth module...     │
│  12:04:32  Planning: 3 functions to modify     │
│  12:04:33  Writing: hashPassword()      ✓      │
│  12:04:35  Writing: validateToken()     ✓      │
│  12:04:38  Writing: refreshSession()    ...    │
│  12:04:39  ├─ Checking session store API       │
│  12:04:40  └─ Using Redis adapter       ✓      │
│                                                │
│  Files: 3 modified · Lines: +89 -12            │
│  [View Diff]  [View in Editor]  [Instruct]    │
└────────────────────────────────────────────────┘
```

**Instant Previews:**
For frontend agents, show a live preview (iframe) of the component being built. For API agents, show a live curl response. The output is *always visible*, not behind a "run" button.

### From Figma: Multiplayer & Spatial

**Core principles:**
- Multiplayer cursors → show where each agent is "looking" (which file, which line)
- Infinite canvas → the grid is just the default view; zoom out and you see the whole project
- Components & instances → agent configurations are reusable "components"
- Comments in context → notes are attached to specific code/files, not floating

**Specific recommendations:**

**Agent Cursors:**
In the code view, show colored cursors for each active agent, just like Figma shows collaborator cursors:

```
  export async function login(input: LoginInput) {
    const valid = schema.parse(input)
█ Coder                                    █ Security
    const user = await db.findUser(valid.email)
    if (!user) {
█ Reviewer (comment: "add rate limiting here")
      throw new AuthError('Invalid credentials')
    }
```

**The Comment Thread:**
Agents can leave comments on code, just like Figma comments on designs. The Reviewer agent doesn't just produce a report — it leaves inline comments that the Coder agent responds to:

```
  Reviewer → line 14: "This query could be N+1 in the batch case"
    └─ Coder → "Good catch, refactored to use JOIN. See updated diff."
       └─ Reviewer → "Approved ✓"
```

### What's WRONG with Typical Dashboards

"They're designed for *monitoring*, not *doing*. Linear showed that a project management tool can feel like a code editor. Vercel showed that deployment can be beautiful. Figma showed that collaboration can be spatial. AG Dev should feel like *working*, not like *watching*."

### Revolutionary Idea: **The Multiplayer Session**

AG Dev supports *multiple humans* in the same session. Two developers can both see the agents working, both give instructions, both approve actions. Human cursors appear alongside agent cursors. The agent orchestrator resolves conflicts: "Developer A and Developer B gave conflicting instructions for Coder. Showing both for resolution."

---

## Unified Design Specification

### Information Architecture

```
AG Dev
├── Surface Layer (always visible)
│   ├── Sentence Summary (top bar)
│   ├── Trust Dial (top right)
│   └── Notification Badges (inline)
│
├── Grid Layer (default view)
│   ├── 4×3 Agent Sparkline Grid
│   ├── Approval Queue (right edge, only when needed)
│   └── Pattern Panel (left edge, collapsible)
│
├── Workbench Layer (agent detail)
│   ├── Agent Console (real-time log)
│   ├── Live Output (code diff / preview / test results)
│   ├── Agent Conversation (instruct + responses)
│   └── Agent Cursors (in code view)
│
├── Timeline Layer (horizontal, bottom)
│   ├── Session Timeline (scrubble)
│   ├── Commit Points (marked on timeline)
│   └── Branch Points (when undo creates branches)
│
└── Meta Layer (accessible via Cmd+M)
    ├── Three Planes View (Intent / Structure / Material)
    ├── Pattern Recognition
    └── System Self-Model
```

### Key Interaction Patterns

**1. The Glance → Focus → Act Cycle**
```
Glance:  Read the sentence summary (1 second)
Focus:   Notice an amber agent card → click to expand (2 seconds)
Act:     Read the approval gate → approve/reject/modify (5 seconds)
Return:  Click outside or press Esc → back to grid (instant)
```

**2. The Instruct Pattern**
```
Trigger: Press / anywhere (like Slack, Notion)
Target:  Type agent name or "all"
Command: Natural language instruction
Confirm: Enter to send
See:     Agent acknowledges in 500ms, begins work in 2s
```

**3. The Override Pattern**
```
Trigger: See something wrong in agent output
Act:     Click into the code and edit directly
Resolve: Agent detects your edit, pauses, asks "Should I incorporate this?"
Result:  Agent replans around your edit
```

**4. The Scrub Pattern**
```
Trigger: "What happened while I was away?"
Act:     Grab timeline scrubber, drag left
See:     Canvas rewinds — all agents show their state at that time
Find:    A decision point you disagree with
Act:     Right-click → "Redo from here differently"
Result:  System branches and re-executes with new instructions
```

**5. The Zoom Pattern**
```
Level 1: Sentence ("everything's fine")
Level 2: Grid (12 agents, sparklines, states)
Level 3: Workbench (one agent, full detail)
Level 4: Code (specific file, specific line)
Level 5: Token (watch the agent think, token by token)

Navigate: Scroll-zoom or keyboard (1-5 keys)
Each level contains the one below it spatially.
```

### Visual Design Principles

```
TYPOGRAPHY
─────────────────────────────────────
Title:       Inter 16px Semibold
Agent name:  Inter 13px Semibold
Body:        Inter 12px Regular
Code:        JetBrains Mono 12px Regular
Stats:       JetBrains Mono 11px Regular
Micro:       Inter 10px Regular (timestamps, metadata)

COLORS
─────────────────────────────────────
Background:  #0A0A0A (near black)
Surface:     #141414 (cards, panels)
Border:      #1E1E1E (very subtle, used sparingly)
Text:        #ECECEC (primary)
Text dim:    #666666 (secondary)
Accent:      #3B82F6 (blue — interactive elements)
Success:     #22C55E (green — only for "done/passing")
Warning:     #F59E0B (amber — only for "needs attention")
Error:       #EF4444 (red — only for "failed/broken")
Agent active:#3B82F6 dot (blue pulse)
Agent idle:  #666666 dot (dim)

SPACING
─────────────────────────────────────
Base unit:   4px
Card padding: 12px
Card gap:    8px
Section gap: 24px
Page margin: 16px

MOTION
─────────────────────────────────────
Duration:    150ms (micro), 300ms (standard), 500ms (major)
Easing:      cubic-bezier(0.2, 0, 0, 1)
Rule:        Nothing animates unless it communicates state change
             Cards expand: 300ms ease
             Notifications appear: 150ms ease
             Timeline scrub: 0ms (instant, follows cursor)
             Agent state change: 150ms color transition
```

---

## The Five Screens

### Screen 1: The Command Surface (Home)

The primary view. Always the starting point.

```
┌────────────────────────────────────────────────────────────────────────┐
│  AG Dev   8 active · Coder finishing auth (3m) · 1 review pending  ⚙  │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              ◎ Trust  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      ◔ 65%     │
│  │●Coder    │ │●Reviewer │ │●Tester   │ │ Deployer │                 │
│  │ ▁▃▅▇▅▃▁ │ │ ▁▁▁▃▇▇▅▁│ │ ▁▁▅▇▇▇▇▅│ │          │  APPROVALS     │
│  │ auth.ts  │ │ 2 issues │ │ 94% pass │ │ idle     │  ┌────────────┐│
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │⚠ Deploy to ││
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  staging   ││
│  │●Architect│ │ Research │ │●Security │ │●Docs     │  │  [✓] [✕]  ││
│  │ planning │ │ done     │ │ scanning │ │ writing  │  └────────────┘│
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ DevOps   │ │●Database │ │●Frontend │ │●Debugger │                 │
│  │ idle     │ │ 2 migr.  │ │ 8 comps  │ │ stack #3 │                 │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                 │
│                                                                       │
│  / Instruct an agent...                                    ⌘K        │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ◀━━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▶ NOW   │
│  10:00    10:15    10:30    10:45    11:00         ↑ 3 commits        │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 2: The Workbench (Agent Detail)

Clicking any agent card transitions seamlessly to this view.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ← Back to Grid    CODER AGENT    ●Active    auth module    ⌘1       │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                    │                                  │
│  CONSOLE                           │  LIVE OUTPUT                     │
│  ────────────────────────          │  ─────────────────────           │
│  12:04:31 Reading auth module  ✓   │  auth.ts (modified)              │
│  12:04:32 Plan: 3 fn to modify     │                                  │
│  12:04:33 hashPassword()       ✓   │  + import { hash } from 'bcrypt'│
│  12:04:35 validateToken()      ✓   │  + import { z } from 'zod'      │
│  12:04:38 refreshSession()     ... │                                  │
│  12:04:39 ├─ Checking API          │    export async function login(  │
│  12:04:40 └─ Redis adapter     ✓   │  +   input: LoginInput           │
│                                    │    ) {                           │
│  INSTRUCTION                       │  +   const valid = schema.parse( │
│  ────────────────────────          │  +   const user = await db.find( │
│  "Build login with OAuth2 +        │      if (!user) throw new Error( │
│   session management. Use          │  +   const match = await compare │
│   Redis for sessions."             │  +   return signJwt(user)        │
│                                    │    }                             │
│  / Talk to this agent...           │                                  │
│                                    │  +47 -3  ░░░░░░░░██░  72% done  │
│                                    │                                  │
│  DEPENDENCIES                      │  INLINE COMMENTS                 │
│  ──────────────                    │  ──────────────                  │
│  ← Architect (RFC approved)        │  █ Security @ L14: "add salt"   │
│  → Reviewer (waiting)              │    └─ Coder: "using bcrypt      │
│  → Tester (waiting)                │         default 10 rounds"      │
│                                    │    └─ Security: "approved ✓"     │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 3: The Timeline (Session History)

Full-screen timeline view for understanding *what happened over time*.

```
┌────────────────────────────────────────────────────────────────────────┐
│  TIMELINE    Session: auth-feature    Duration: 1h 23m    ⌘T         │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                       │
│  Coder     ░░░██████████░░░████████████████░░░░░░░░░░░░░░░░           │
│  Reviewer  ░░░░░░░░░░░░░████░░░░░░░░░░░░░░████████░░░░░░░░           │
│  Tester    ░░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░░░░░████░░░           │
│  Security  ░░░░░░░██████░░░░░░░░░██████░░░░░░░░░░░░░░░░░░░           │
│  Architect ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│  Database  ░░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│  Frontend  ░░░░░░░░░░░░░░░░░░░░░████████████████████████░░░           │
│  Docs      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████           │
│  Debugger  ░░░░░░░░░░░░░░░░░░█████░░░░░░░░░░░░░░░░░░░░░░░           │
│  DevOps    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░███           │
│  Research  ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│  Deploy    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│            ─────────────────────────────────────────────────           │
│            10:00     10:20      10:40      11:00      11:20           │
│                         ▲                                             │
│                    ┌────┴────────────────────────┐                    │
│                    │ 10:22 — Conflict detected    │                    │
│                    │ Coder vs Security on hashing │                    │
│                    │ Resolved: used bcrypt        │                    │
│                    │ [Jump to this point]         │                    │
│                    └─────────────────────────────┘                    │
│                                                                       │
│  COMMITS  ● initial scaffold  ● auth module  ● tests passing         │
│  YOU      ↑ started session   ↑ approved RFC  ↑ gave feedback  ● now │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 4: The Planes View (Multi-Level Abstraction)

For strategic thinking — seeing intent, structure, and material simultaneously.

```
┌────────────────────────────────────────────────────────────────────────┐
│  PLANES VIEW                                               ⌘M        │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                       │
│  INTENT                                                    [edit]     │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Build authentication system                                 │     │
│  │  ├── OAuth2 provider integration (Google, GitHub)           │     │
│  │  ├── Session management with Redis                          │     │
│  │  ├── Role-based access control (admin, user, viewer)        │     │
│  │  └── Password reset flow                                    │     │
│  │                                         89% complete ▓▓▓▓▓▓▓░│     │
│  └──────────────────────────────────────────────────────────────┘     │
│       ↕ click any intent item to see which agents & files serve it    │
│  STRUCTURE                                                            │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Architect ──→ Coder ──→ Reviewer ──→ Tester                │     │
│  │       ↘ Research    ↗ Security ↗         ↘ Deployer         │     │
│  │            ↘ Database ↗                                      │     │
│  │                                                              │     │
│  │  Bottleneck: Reviewer (2 items queued)                      │     │
│  │  Idle: DevOps, Deployer (waiting for tests)                 │     │
│  └──────────────────────────────────────────────────────────────┘     │
│       ↕ click any agent to see its files and current task             │
│  MATERIAL                                                             │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  src/auth/                                                   │     │
│  │  ├── login.ts          Coder ✓  Reviewer ✓  Tester ✓       │     │
│  │  ├── oauth.ts          Coder ●  Reviewer ○  Tester ○       │     │
│  │  ├── session.ts        Coder ✓  Reviewer ●  Tester ○       │     │
│  │  ├── rbac.ts           Coder ○  Reviewer ○  Tester ○       │     │
│  │  └── reset.ts          Coder ○  Reviewer ○  Tester ○       │     │
│  │                                                              │     │
│  │  ● = in progress  ✓ = done  ○ = pending                    │     │
│  │  14 files · 892 lines · 3 migrations · 23 tests            │     │
│  └──────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 5: The Review Gate (Decision Point)

When the system needs a human decision, this view focuses attention.

```
┌────────────────────────────────────────────────────────────────────────┐
│  DECISION NEEDED                                                      │
│━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                       │
│  Reviewer flagged: Auth module ready for deployment decision          │
│                                                                       │
│  SUMMARY                              │  AGENT OPINIONS               │
│  ──────────                           │  ──────────────               │
│  Files changed: 8                     │  Coder: "Ready. All edge      │
│  Lines: +347 -12                      │   cases handled."             │
│  New dependencies: 2 (bcrypt, zod)    │                               │
│  Test coverage: 94%                   │  Reviewer: "Approved with     │
│  Security scan: passed                │   minor: add rate limiting    │
│  Performance impact: +2ms p99         │   before prod."               │
│                                       │                               │
│  DIFF PREVIEW                         │  Security: "No vulnerabilities│
│  ──────────────                       │   found. bcrypt config is     │
│  auth/login.ts     +47  -3           │   industry standard."         │
│  auth/oauth.ts     +112 -0           │                               │
│  auth/session.ts   +89  -4           │  Tester: "All 23 tests pass.  │
│  auth/rbac.ts      +67  -2           │   Edge cases covered."        │
│  auth/reset.ts     +32  -3           │                               │
│  [View full diff →]                   │  Architect: "Matches RFC.     │
│                                       │   Redis choice is optimal."   │
│                                       │                               │
│  ┌────────────────────────────────────────────────────────────┐       │
│  │                                                            │       │
│  │  [✓ Approve & Deploy]  [✓ Approve, hold deploy]           │       │
│  │  [✎ Request changes: ___________________________]          │       │
│  │  [✕ Reject with reason: ________________________]          │       │
│  │                                                            │       │
│  └────────────────────────────────────────────────────────────┘       │
│                                                                       │
│  Keyboard: Y = approve & deploy  H = approve, hold  E = edit  N = no │
└────────────────────────────────────────────────────────────────────────┘
```

---

## What Makes This Level 5-6

Most developer tools operate at Level 1-3 in Jaques' framework:

| Level | Time Horizon | Thinking | Typical Tool |
|-------|-------------|----------|-------------|
| 1 | < 1 day | Execute procedure | Terminal |
| 2 | 1-3 months | Diagnose & plan | IDE |
| 3 | 1-2 years | Build systems | CI/CD platforms |
| 4 | 2-5 years | Design for ecosystem | Platform SDKs |
| **5** | **5-10 years** | **Shape the field** | **AG Dev** |
| **6** | **10-20+ years** | **Transform the paradigm** | **AG Dev (meta layer)** |

### AG Dev operates at Level 5-6 because:

**1. It doesn't just display — it *thinks with you*.**
The three planes view lets you fluidly move between intent, structure, and material. You're not managing tasks; you're shaping a system of systems. The UI is isomorphic to the problem space.

**2. It has requisite variety.**
Twelve agents with different specializations match the real complexity of software development. The interface has exactly enough complexity to control this — not a single control more (Rams), not a single data point less (Tufte).

**3. It enables temporal reasoning.**
The timeline scrubber makes development *reversible and explorable*. You don't just work forward — you can rewind, branch, compare. This is Level 5 thinking: understanding the trajectory, not just the position.

**4. It is self-referential.**
The meta-agent that observes usage patterns and suggests improvements means the system evolves. It's not a fixed tool — it's a *living system* that adapts to its user. Level 6 thinking is about creating systems that transcend their original design.

**5. The human's role *changes* as they use it.**
At first, the Trust Dial is low and the human is a hands-on supervisor. Over time, they become a strategic director — setting intent, reviewing outcomes, making judgment calls. The tool supports this transition fluidly. This shift from operator to strategist is the hallmark of Level 5-6 work.

**6. It preserves human agency at every level.**
Following Anthropic's constitutional principles: the human can always intervene, always understand why, always override. The agents are powerful but bounded. This isn't automation that replaces the human — it's augmentation that *amplifies* human judgment across a wider problem space than any individual could cover alone.

---

## Implementation Priority

### Phase 1: Foundation (MVP)
1. Agent Grid (sparkline cards) — the command surface
2. Agent Workbench (detail view with console + output)
3. Instruction input (/ command pattern)
4. Basic approval gates

### Phase 2: Power
5. Timeline scrubber with session history
6. Trust Dial with adaptive permissions
7. Command palette (Cmd+K)
8. Keyboard shortcuts for all actions

### Phase 3: Depth
9. Planes View (intent/structure/material)
10. Agent cursors in code view
11. Inline code editing with agent adaptation
12. Pattern Recognition panel

### Phase 4: Transcendence
13. Multiplayer (multiple humans)
14. Intention Sketching (spatial commands)
15. Meta-agent (self-improving UI)
16. Recursive self-modeling

---

## Technical Stack Recommendations

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Canvas/Grid | React + Framer Motion | Smooth 60fps transitions, spatial layout |
| Code Display | Monaco Editor (VS Code core) | Syntax highlighting, multi-cursor, inline editing |
| Real-time | WebSocket (Socket.io) | Agent state streaming, no polling |
| State | Zustand + Immer | Simple, immutable, scrub-friendly state history |
| Timeline | Custom canvas (HTML5 Canvas) | Performance for continuous scrubbing |
| Theming | CSS custom properties | One dark theme, done right |
| Shortcuts | tinykeys | Lightweight, composable key bindings |
| Layout | CSS Grid + Container Queries | Responsive agent grid |

---

*This document is a living specification. It should be updated as AG Dev is built, by both humans and by AG Dev itself.*

**End of Design Specification v0.1**
