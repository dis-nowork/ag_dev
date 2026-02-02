# Technology Stack

Define your tech stack and conventions here.
Agents will follow these standards.

## Languages & Frameworks
- **Node.js v22+** - Server runtime
- **JavaScript (CommonJS)** - Primary language
- **Express.js** - Web server framework
- **node-pty** - Terminal/PTY management
- **WebSockets/SSE** - Real-time communication

## Conventions
- Use CommonJS require() syntax, not ES modules
- Prefer async/await over Promises
- Emit events for all significant state changes
- Always handle errors gracefully with try-catch
- Use UUID v4 for unique identifiers

## Project Structure
```
ag_dev/
├── server/              # Core server components
│   ├── server.js        # Main Express server + API routes
│   ├── ralph-loop.js    # Autonomous development loop engine
│   ├── terminal-manager.js # PTY terminal management
│   ├── orchestrator.js  # Agent orchestration
│   └── squad-manager.js # Multi-agent coordination
├── project-context/     # Shared agent context
├── ui/                  # React frontend
└── core/                # Agent definitions & workflows
```