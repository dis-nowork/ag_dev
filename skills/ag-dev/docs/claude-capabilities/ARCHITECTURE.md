# Architecture: Claude Code + CLAUDE_CAPABILITIES

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                  │
│            "Create a 30-second UGC video for my product"             │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        CLAUDE CODE                                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Intent Recognition                          │  │
│  │  • Parse user request                                          │  │
│  │  • Identify: production task (video)                           │  │
│  │  • Match: ugc-video skill                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Skill Loading                               │  │
│  │  • Read: skills/ugc-video/SKILL.md                            │  │
│  │  • Parse: workflow steps                                       │  │
│  │  • Validate: required APIs available                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Execution                                   │  │
│  │  • Fork context (isolation)                                    │  │
│  │  • Run scripts sequentially                                    │  │
│  │  • Handle errors, retry logic                                  │  │
│  │  • Collect outputs                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │                                        │
│                              ▼                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Delivery                                    │  │
│  │  • Return output path/URL                                      │  │
│  │  • Clean up temp files                                         │  │
│  │  • Restore main context                                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Incrementality Model

CLAUDE_CAPABILITIES follows an incremental enhancement model. Each layer builds on the previous:

### Layer 0: Claude Code Native

```
┌─────────────────────────────────────┐
│           NATIVE TOOLS              │
├─────────────────────────────────────┤
│ • Bash (exec)     Execute commands  │
│ • Read            Read files        │
│ • Write           Create files      │
│ • Edit            Modify files      │
│ • WebSearch       Search internet   │
│ • WebFetch        Fetch URLs        │
└─────────────────────────────────────┘
```

### Layer 1: Skill Instructions

```
┌─────────────────────────────────────┐
│          SKILL.md FILES             │
├─────────────────────────────────────┤
│ • Specialized knowledge             │
│ • Step-by-step workflows            │
│ • Best practices                    │
│ • Error handling patterns           │
│                                     │
│ Uses: Layer 0 tools                 │
└─────────────────────────────────────┘
```

### Layer 2: Helper Scripts

```
┌─────────────────────────────────────┐
│         scripts/*.py                │
├─────────────────────────────────────┤
│ • API integrations                  │
│ • Complex logic encapsulation       │
│ • Reusable components               │
│ • Parallel execution                │
│                                     │
│ Uses: Layer 0 (Bash) + APIs         │
└─────────────────────────────────────┘
```

### Layer 3: Shared Libraries

```
┌─────────────────────────────────────┐
│            lib/*.py                 │
├─────────────────────────────────────┤
│ • API clients (image, video, audio) │
│ • Key management                    │
│ • Common utilities                  │
│ • Cross-skill functionality         │
│                                     │
│ Uses: Layer 2 scripts               │
└─────────────────────────────────────┘
```

### Full Stack

```
        ┌─────────────────────┐
        │   User Request      │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   Claude Code       │
        │   (Native Tools)    │  Layer 0
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    SKILL.md         │
        │   (Instructions)    │  Layer 1
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    scripts/         │
        │   (Execution)       │  Layer 2
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │     lib/            │
        │   (Libraries)       │  Layer 3
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │   External APIs     │
        │ (Imagen, Kling...)  │  External
        └─────────────────────┘
```

---

## Agent Team Integration

When Claude Code's native agent teams are available, CLAUDE_CAPABILITIES becomes a shared resource:

### Single Agent Mode (Current)

```
┌─────────────────────────────────────────┐
│              Claude Code                 │
│  ┌───────────────────────────────────┐  │
│  │         Main Session              │  │
│  │                                   │  │
│  │  User ──► Skill ──► Output       │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Agent Team Mode (Future)

```
┌─────────────────────────────────────────────────────────────────┐
│                       Claude Agent Team                          │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Planner  │    │  Coder   │    │ Designer │    │ Reviewer │  │
│  │  Agent   │    │  Agent   │    │  Agent   │    │  Agent   │  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘  │
│       │               │               │               │         │
│       └───────────────┴───────────────┴───────────────┘         │
│                               │                                  │
│                               ▼                                  │
│       ┌─────────────────────────────────────────────────┐       │
│       │            CLAUDE_CAPABILITIES                   │       │
│       │                                                  │       │
│       │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │       │
│       │  │ image   │ │ video   │ │  tts    │ │deploy │ │       │
│       │  └─────────┘ └─────────┘ └─────────┘ └───────┘ │       │
│       │                                                  │       │
│       │  Shared resource for all agents                 │       │
│       └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Skill Invocation

Each agent can invoke skills independently:

```python
# Planner Agent
"We need product images for the landing page"
    └──► Delegates to Designer Agent

# Designer Agent  
"Generating images using image-gen skill"
    └──► Runs: skills/image-gen/SKILL.md
    └──► Output: /output/product_001.png

# Coder Agent
"Integrating images into HTML"
    └──► Uses output from Designer Agent
    └──► Runs: skills/landing-page/SKILL.md

# Reviewer Agent
"Validating final output"
    └──► Checks image quality, page accessibility
```

---

## Context Management

### Fork Pattern

Skills use forked context to maintain isolation:

```
Main Context                    Forked Context
┌─────────────────────┐        ┌─────────────────────┐
│ • Conversation      │        │ • Skill instructions│
│ • User preferences  │   ──►  │ • Execution state   │
│ • Project context   │        │ • Temp variables    │
└─────────────────────┘        └─────────────────────┘
         │                              │
         │                              │
         │         On Complete          │
         │◄─────────────────────────────┤
         │     (Only output returned)   │
         │                              │
         ▼                              ▼
┌─────────────────────┐        ┌─────────────────────┐
│ • Original context  │        │    [Discarded]      │
│ • + Output path     │        │                     │
└─────────────────────┘        └─────────────────────┘
```

### Memory Efficiency

```
Without Fork:
┌────────────────────────────────────────┐
│ Context grows with each skill          │
│ execution, eventually hitting limits   │
│                                        │
│ [Conv][Skill1][Skill2][Skill3]...      │
│ ────────────────────────────────►      │
│                          Context Limit │
└────────────────────────────────────────┘

With Fork:
┌────────────────────────────────────────┐
│ Context stays clean, only outputs      │
│ are retained                           │
│                                        │
│ [Conv][Out1][Out2][Out3]...            │
│ ─────────────►                         │
│               Plenty of room           │
└────────────────────────────────────────┘
```

---

## Error Handling

### Retry Logic

```
Script Execution
       │
       ▼
   ┌───────┐
   │ Try 1 │────► Success ────► Continue
   └───┬───┘
       │ Fail
       ▼
   ┌───────┐
   │ Try 2 │────► Success ────► Continue
   └───┬───┘
       │ Fail
       ▼
   ┌───────┐
   │ Try 3 │────► Success ────► Continue
   └───┬───┘
       │ Fail
       ▼
   ┌────────────┐
   │ Fallback   │────► Alternative API/Method
   └─────┬──────┘
         │ Fail
         ▼
   ┌────────────┐
   │ Report     │────► User notified
   │ Failure    │      with details
   └────────────┘
```

### Graceful Degradation

```
Primary API (Imagen 3)
       │
       ▼ Fail?
       │
Secondary API (DALL-E 3)
       │
       ▼ Fail?
       │
Local Fallback (Placeholder)
       │
       ▼
Output with warning
```

---

## Security Model

### API Key Management

```
┌─────────────────────────────────────────┐
│              .env file                   │
│  (gitignored, local only)               │
├─────────────────────────────────────────┤
│ GOOGLE_API_KEY=xxx                      │
│ FAL_KEY=xxx                             │
│ ELEVENLABS_API_KEY=xxx                  │
│ CLOUDFLARE_API_TOKEN=xxx                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│            lib/keys.py                   │
│  (safe accessor with fallbacks)         │
├─────────────────────────────────────────┤
│ def get(key_name):                      │
│     1. Check environment                │
│     2. Check .env file                  │
│     3. Check Secret Manager             │
│     4. Raise clear error                │
└─────────────────────────────────────────┘
```

### Execution Sandbox

Scripts run with limited scope:
- No network access except allowed APIs
- No filesystem access outside project
- Timeout limits on all operations

---

## Performance Considerations

### Parallel Execution

When possible, skills execute independent steps in parallel:

```
Sequential:                    Parallel:
┌───────┐                     ┌───────┐
│ Step1 │ 10s                 │ Step1 │ 10s
└───┬───┘                     ├───────┤
    │                         │ Step2 │ 10s    Total: 20s
┌───▼───┐                     ├───────┤        (vs 40s)
│ Step2 │ 10s                 │ Step3 │ 10s
└───┬───┘                     ├───────┤
    │                         │ Step4 │ 10s
┌───▼───┐                     └───────┘
│ Step3 │ 10s
└───┬───┘
    │
┌───▼───┐
│ Step4 │ 10s
└───────┘
Total: 40s
```

### Caching

```
┌─────────────────────────────────────────┐
│              Cache Layer                 │
├─────────────────────────────────────────┤
│ • Generated images (by prompt hash)     │
│ • API responses (TTL-based)             │
│ • Compiled assets                       │
│                                         │
│ Location: .cache/                       │
│ Invalidation: Manual or TTL             │
└─────────────────────────────────────────┘
```

---

*This architecture enables production capabilities while maintaining Claude Code's simplicity and reliability.*
