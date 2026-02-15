# System Overview

```
                     AG Dev Multi-Agent Development Platform
                            ┌─────────────────────┐
                            │       UI Layer      │
                            │  React+Vite+TS     │
                            │    9 Components     │
                            └──────────┬──────────┘
                                       │ HTTP/SSE
                            ┌──────────▼──────────┐
                            │    Express Server   │
                            │     (Monolithic)    │
                            │   1,241 lines       │
                            └──────────┬──────────┘
                                       │
          ┌────────────────┬───────────┼───────────┬────────────────┐
          │                │           │           │                │
    ┌─────▼─────┐  ┌───────▼───┐ ┌────▼─────┐ ┌──▼──────┐ ┌───────▼────┐
    │ Terminal  │  │Orchestrator│ │Temporal  │ │ Memory  │ │SuperSkills │
    │ Manager   │  │   Engine   │ │  Graph   │ │ System  │ │ Registry   │
    │ 356 lines │  │ 758 lines  │ │533 lines │ │146 lines│ │ 31 skills  │
    └───────────┘  └─────┬──────┘ └──────────┘ └─────────┘ └────────────┘
                         │
              ┌──────────▼──────────┐
              │   Squad Manager     │
              │   Workflow Engine   │
              │   Ralph Loop        │
              └─────────────────────┘
```

**Project Stats:**
- **Server**: 6,220 lines across 15 modules
- **UI**: 2,591 lines across 13 files
- **SuperSkills**: 31 pre-built tools in 6 categories
- **Core**: Agent definitions, templates, workflows
- **Dependencies**: Minimal (Express, node-pty, Zustand, React)
