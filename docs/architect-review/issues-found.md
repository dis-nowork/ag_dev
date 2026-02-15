# Issues Found

## Critical Architecture Issues

1. **🔥 Monolithic Server File (P0)**
   - `server.js`: 1,241 lines containing ALL route handlers
   - Mixes terminal management, orchestration, superskills, memory, temporal graph APIs
   - **Impact**: Extremely difficult to maintain, test, and extend
   - **Risk**: Changes in one area can break others; single point of failure

2. **🔥 Circular Dependency Risk (P0)**
   - `orchestrator.js` depends on `terminal-manager.js`
   - `terminal-manager.js` events feed back to orchestrator
   - `agent-graph.js` tracks terminal events but also called by server
   - **Impact**: Module loading order matters; refactoring becomes dangerous

3. **🔥 Inconsistent API Naming (P0)**
   - `/api/superskills` vs `/api/graph` vs `/api/ralph` vs `/api/context`
   - Some use `/api/workflows/:name/start` others `/api/workflows/:name/execute`
   - No clear REST conventions
   - **Impact**: Developer confusion, API surface area hard to document

4. **🔥 Missing Error Boundaries (P0)**
   - No centralized error handling in Express middleware
   - UI has no error boundaries for component failures
   - **Impact**: One bad superskill can crash entire server

## Structural Improvements Needed

1. **Module Separation Issues (P1)**
   - `server.js` should only handle routing, not business logic
   - API controllers mixed with route definitions
   - No clear separation of concerns between layers

2. **State Management Fragmentation (P1)**
   - `state.js` (server-side state)
   - `store.ts` (client-side Zustand)
   - Ralph has its own state in `ralph-loop.js`
   - **Impact**: State synchronization bugs, hard to debug

3. **Temporal Graph Over-Engineering (P1)**
   - 533-line complex graph system for agent tracking
   - May be premature optimization for current needs
   - **Question**: Is this complexity justified by current usage?

4. **SuperSkills Security Concerns (P1)**
   - Uses `child_process.spawn` for execution
   - No sandboxing or resource limits
   - Input validation exists but execution is unrestricted
   - **Impact**: Security vulnerability for production use

5. **UI Component Coupling (P1)**
   - `store.ts` is 284 lines - shows state is becoming bloated
   - Components directly import global store instead of prop drilling
   - **Impact**: Hard to test components in isolation

## Optimization Opportunities

1. **Bundle Size Issues (P2)**
   - No lazy loading of components
   - All superskill schemas loaded upfront
   - Large Zustand store loaded on initial page load

2. **SSE Event Flooding (P2)**
   - Terminal data events broadcast to all connected clients
   - No client-side filtering
   - Could scale poorly with many terminals

3. **Memory Leaks Potential (P2)**
   - Terminal buffers stored indefinitely in memory
   - Temporal graph edges never pruned
   - **Impact**: Memory usage grows over time
