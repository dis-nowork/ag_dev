# Constraints & Rules

Rules that all agents must follow.

## Do
- Use the existing TerminalManager for all process spawning
- Emit events for state changes to keep UI synchronized
- Store metadata using terminalManager.setMetadata()
- Implement quality gates for autonomous workflows
- Add learnings to PROGRESS.md for future reference
- Use proper error handling and timeouts
- Follow the CommonJS module format (require/module.exports)

## Don't
- Don't modify server.js structure - only ADD routes
- Don't change existing working terminal-manager.js methods
- Don't use ES modules (import/export) in server code
- Don't create infinite loops without proper exit conditions
- Don't spawn terminals without proper cleanup handlers
- Don't skip the PRD generation step for complex tasks
- Don't run quality gates on every iteration if expensive

## Ralph Loop Specific
- Always output "TASK_COMPLETE" when finishing a story
- Keep individual tasks small (completable in one context)
- Use git commits with "ralph-{storyId}" format
- Limit iterations to prevent runaway processes
- Implement proper pause/resume/stop controls