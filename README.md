# ⚡ AG Dev - Multi-Agent Development Orchestration Platform

**A modern web-based platform for orchestrating and visualizing multiple AI development agents working in parallel. Built for scalable, collaborative AI-driven development workflows.**

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)
```bash
cd /root/clawd/ag_dev
npm run docker:build
npm run docker:run
```

### Option 2: npm scripts
```bash
cd /root/clawd/ag_dev
npm install
npm start
```

### Option 3: Enhanced startup script
```bash
cd /root/clawd/ag_dev
./scripts/start.sh
```

**Access:** http://localhost:3456  
**Health Check:** http://localhost:3456/health

## 📦 Project Overview

AG Dev is a **Multi-Agent Development Orchestration Platform** that provides:

- **Real-time terminal multiplexing** for multiple AI agents
- **Web-based interface** for managing development workflows  
- **Specialized AI agents** for different development roles
- **SuperSkills system** for extensible AI capabilities
- **Temporal graph tracking** of agent interactions
- **Production-ready deployment** with Docker support

## 🏗️ Architecture Overview

```
┌─────────────────┐    SSE     ┌─────────────────┐
│   Web UI        │◄──────────►│   Express       │
│   (Vite/React)  │            │   Server        │
└─────────────────┘            └─────────┬───────┘
                                         │
                               ┌─────────▼───────┐
                               │ Terminal Manager │
                               │    (node-pty)   │
                               └─────────┬───────┘
                                         │
                         ┌───────────────┼───────────────┐
                         │               │               │
                    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
                    │ Agent 1 │    │ Agent 2 │    │ Agent N │
                    │  (PTY)  │    │  (PTY)  │    │  (PTY)  │
                    └─────────┘    └─────────┘    └─────────┘
```

### Core Components

- **Terminal Manager**: PTY-based process spawning with `node-pty`
- **Agent System**: 12+ specialized AI agents (Analyst, Architect, Developer, QA, DevOps, etc.)
- **Workflow Engine**: YAML-defined workflows for coordinated multi-agent tasks
- **SuperSkills Registry**: Extensible skill system for AI capabilities
- **Real-time Communication**: Server-Sent Events (SSE) for live updates
- **State Management**: Centralized state with metrics and event tracking

## 📋 Features

### ✅ Core Capabilities
- **Multi-Agent Terminal Management**: Spawn and manage multiple AI agents in separate PTY processes
- **Real-time Output Streaming**: Live terminal output with ANSI color support
- **Interactive Input**: Send commands and interact with running processes
- **Process Lifecycle Management**: Start, stop, resize, and monitor agent processes
- **Workflow Orchestration**: YAML-defined multi-agent workflows
- **Health Monitoring**: Built-in health checks and system metrics

### ✅ Agent Types Supported

1. **Claude Code CLI**: Direct integration with Claude's development CLI
2. **Specialized AI Agents**: Pre-configured agents for specific development roles
3. **Custom Commands**: Any CLI tool or interactive process

### ✅ API Endpoints

#### System
- `GET /health` — Health check with system metrics
- `GET /api/state` — System state
- `GET /api/metrics` — Performance metrics
- `GET /api/events` — SSE stream for real-time updates

#### Terminal Management  
- `GET /api/terminals` — List active terminals
- `POST /api/terminals` — Create new terminal/agent
- `POST /api/terminals/:id/write` — Send input to terminal
- `DELETE /api/terminals/:id` — Terminate terminal
- `GET /api/terminals/:id/buffer` — Get output buffer

#### Agents & Workflows
- `GET /api/agents` — List available agent definitions
- `GET /api/workflows` — List workflow definitions
- `POST /api/workflows/:name/start` — Start workflow execution

## 🔧 SuperSkills System

SuperSkills are extensible AI capabilities that enhance agent functionality:

### Available Commands
```bash
# List all available superskills
npm run superskills:list

# Run a specific superskill
npm run superskills <skill-name> [args...]

# Get superskills statistics
npm run superskills:stats
```

### Creating Custom SuperSkills
SuperSkills are modular capabilities stored in `./superskills/` directory. Each skill includes:
- Skill definition and metadata
- Implementation logic
- Integration with the agent system

## 🐳 Docker Deployment

### Production Setup
```bash
# Build the Docker image
npm run docker:build

# Run with docker-compose
npm run docker:run

# Manual Docker run
docker run -p 3456:3456 -v ./data:/app/data ag-dev
```

### Configuration
Environment variables for deployment:
- `AG_DEV_PORT` — Server port (default: 3456)
- `AG_DEV_HOST` — Server host (default: 0.0.0.0)  
- `AG_DEV_DATA_DIR` — Data directory path (default: ./data)
- `NODE_ENV` — Environment mode (production/development)

## 🛠️ Tech Stack

### Backend
- **Node.js 22+** — Runtime environment
- **Express.js** — Web framework
- **node-pty** — Pseudo-terminal for process management
- **Server-Sent Events** — Real-time communication
- **js-yaml** — Workflow definition parsing
- **uuid** — Unique identifiers

### Frontend
- **Vite** — Build tool and development server
- **React** — UI framework
- **Real-time Terminal UI** — ANSI color support
- **Responsive Design** — Dark theme optimized for development

### Infrastructure
- **Docker** — Containerization
- **Docker Compose** — Multi-service orchestration
- **Health Checks** — Production monitoring
- **Persistent Storage** — Data and project context volumes

## 📊 Development

### Available Scripts
```bash
npm start              # Start production server
npm run dev            # Start with file watching
npm run build          # Build UI for production
npm run build:ui       # Build UI only
npm run docker:build   # Build Docker image
npm run docker:run     # Run with docker-compose
npm run superskills    # Run superskills system
```

### Directory Structure
```
/root/clawd/ag_dev/
├── server/              # Express server and API
│   ├── server.js        # Main server entry point
│   ├── terminal-manager.js  # PTY management
│   ├── orchestrator.js  # Agent coordination
│   └── package.json     # Server dependencies
├── core/
│   ├── agents/          # Agent definitions (.md)
│   └── workflows/       # Workflow definitions (.yaml)
├── superskills/         # Extensible skill system
├── ui/                  # Frontend source
├── ui-dist/             # Built frontend assets
├── project-context/     # Project context files
├── data/                # Persistent data storage
├── config.json          # Configuration
├── Dockerfile           # Container definition
├── docker-compose.yml   # Multi-service setup
└── scripts/             # Utility scripts
```

## 🚦 System Requirements

- **Node.js 18+** (Node.js 22+ recommended)
- **Linux/macOS** (PTY support required)
- **4GB+ RAM** (for multiple agent processes)
- **Docker** (for containerized deployment)

## 🔍 Monitoring & Health

### Health Check Endpoint
```bash
curl http://localhost:3456/health
```

Response includes:
- System uptime
- Memory usage
- Active superskills count  
- Number of running agents
- Service status

### System Metrics
Access real-time metrics via:
- `GET /api/metrics` — Performance data
- `GET /api/state` — System state
- SSE stream at `/api/events` — Live updates

## 📸 Screenshots

The web interface provides:
- **Terminal Grid View**: Multiple agent terminals in responsive layout
- **Real-time Status**: Live indicators for each agent (🟢 running / 🔴 stopped / 🟡 paused)
- **Interactive Controls**: Start, stop, and manage agents through UI
- **Dark Theme**: Terminal-inspired design optimized for development
- **ANSI Color Support**: Full terminal color rendering

## 🚀 Production Deployment

1. **Build and deploy with Docker:**
   ```bash
   npm run docker:build
   npm run docker:run
   ```

2. **Configure environment variables** in your deployment platform
3. **Set up reverse proxy** (nginx/Apache) if needed
4. **Monitor health endpoint** for uptime monitoring
5. **Configure persistent storage** for data directory

## ✅ Status: Production Ready

**Fully functional features:**
- ✅ Multi-agent terminal management
- ✅ Real-time web interface  
- ✅ Docker containerization
- ✅ Health monitoring
- ✅ SuperSkills extensibility
- ✅ Workflow orchestration
- ✅ Production deployment ready

**Quick Start:** `cd /root/clawd/ag_dev && npm run docker:run`  
**Access:** http://localhost:3456

The platform is production-ready for AI-driven collaborative development! 🚀