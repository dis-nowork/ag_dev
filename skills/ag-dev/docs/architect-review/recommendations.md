# Recommendations (Prioritized)

## 1. [P0] Break Up Monolithic Server
**Time Estimate**: 2-3 days

Split `server.js` into proper MVC structure:
```
server/
├── app.js              # Express app setup, middleware
├── routes/
│   ├── terminals.js    # Terminal management routes
│   ├── superskills.js  # SuperSkill routes
│   ├── workflows.js    # Workflow routes
│   ├── graph.js        # Temporal graph routes
│   └── context.js      # Project context routes
├── controllers/
│   ├── TerminalController.js
│   ├── WorkflowController.js
│   └── ...
└── middleware/
    ├── errorHandler.js
    └── validation.js
```

## 2. [P0] Standardize API Design
**Time Estimate**: 1-2 days

Establish REST conventions:
```javascript
// Standardized patterns:
GET    /api/terminals           # List all
POST   /api/terminals           # Create new
GET    /api/terminals/:id       # Get specific
PUT    /api/terminals/:id       # Update specific
DELETE /api/terminals/:id       # Delete specific

// Actions (non-REST):
POST   /api/terminals/:id/actions/write
POST   /api/terminals/:id/actions/resize
POST   /api/workflows/:id/actions/start
```

## 3. [P0] Add Comprehensive Error Handling
**Time Estimate**: 1 day

```javascript
// Add to app.js
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.isOperational) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
  } else {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});
```

Add React error boundaries for UI components.

## 4. [P1] Refactor Dependency Structure
**Time Estimate**: 2 days

Create clear dependency hierarchy:
```
Core Layer:     terminal-manager, state, config
Service Layer:  orchestrator, memory-system, temporal-graph
API Layer:      routes, controllers
UI Layer:       React components
```

## 5. [P1] Implement SuperSkills Sandboxing
**Time Estimate**: 3-4 days

Replace direct `child_process.spawn` with:
- Docker containers for execution
- Resource limits (memory, CPU, time)
- Network isolation
- File system restrictions

## 6. [P1] Simplify State Management
**Time Estimate**: 2 days

- Consolidate server-side state into single source
- Use Redux Toolkit for client state (better than growing Zustand)
- Implement proper state sync via WebSocket

## 7. [P2] Add Performance Optimizations
**Time Estimate**: 1-2 days

- Lazy load UI components with `React.lazy`
- Add terminal output pagination
- Implement client-side SSE filtering
- Add temporal graph data pruning

## 8. [P2] Improve TypeScript Coverage
**Time Estimate**: 1 day

- Add TypeScript to server-side modules
- Improve type safety in UI store
- Add API response type definitions
