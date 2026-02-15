# Module Quality Matrix

| Module | Lines | Dependencies | Quality | Notes |
|--------|-------|-------------|---------|-------|
| **server.js** | 1241 | 10+ | ⚠️ Poor | Monolithic, needs breaking up |
| **orchestrator.js** | 758 | 5 | 🔶 Fair | Good logic, but complex workflows |
| **temporal-graph.js** | 533 | 2 | 🔶 Fair | Over-engineered for current needs |
| **terminal-manager.js** | 356 | 3 | ✅ Good | Clean PTY abstraction |
| **squad-manager.js** | 363 | 2 | ✅ Good | Well-structured squad logic |
| **workflow-engine.js** | 591 | 3 | 🔶 Fair | Complex state management |
| **agent-graph.js** | 629 | 3 | 🔶 Fair | Good idea, needs simplification |
| **ralph-loop.js** | 389 | 2 | ✅ Good | Focused responsibility |
| **state.js** | 254 | 1 | ✅ Good | Clean state management |
| **memory-system.js** | 146 | 1 | ✅ Good | Simple, effective |
| **store.ts** | 284 | 1 | ⚠️ Poor | Becoming bloated, needs splitting |
| **superskills/registry.js** | 481 | 2 | 🔶 Fair | Good discovery, needs sandboxing |

**Legend**: ✅ Good | 🔶 Fair | ⚠️ Poor
