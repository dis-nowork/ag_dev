const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// --- Core modules ---
const TerminalManager = require('./terminal-manager');
const StateManager = require('./state');
const Orchestrator = require('./orchestrator');
const SquadManager = require('./squad-manager');
const RalphLoop = require('./ralph-loop');
const SuperSkillRegistry = require('../superskills/registry');
const AgentGraph = require('./agent-graph');
const { createRuntime } = require('./runtimes/runtime-factory');
const MemorySystem = require('./memory-system');
const EventEmitter = require('events');

// --- Config ---
const baseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
const config = {
  ...baseConfig,
  server: {
    ...baseConfig.server,
    port: process.env.AG_DEV_PORT ? parseInt(process.env.AG_DEV_PORT) : baseConfig.server.port,
    host: process.env.AG_DEV_HOST || baseConfig.server.host
  },
  data: {
    ...baseConfig.data,
    dir: process.env.AG_DEV_DATA_DIR || baseConfig.data.dir
  }
};

const app = express();
const port = config.server.port;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Initialize components ---
const terminalManager = new TerminalManager(config.terminals);
const stateManager = new StateManager();

const ralphLoop = new RalphLoop(terminalManager, {
  projectRoot: config.projectRoot || path.join(__dirname, '..'),
  qualityCommands: config.qualityCommands || [],
  onEvent: (type, data) => broadcast('ralph_' + type, data)
});

const superskillRegistry = new SuperSkillRegistry(path.join(__dirname, '..', 'superskills'));

const runtimeCallbacks = {
  onEvent: (event) => broadcast('runtime_event', event),
  onAgentReply: (sessionKey, reply) => broadcast('agent_reply', { sessionKey, reply }),
  onLifecycleEvent: (event) => broadcast('lifecycle_event', event)
};

const runtime = createRuntime(config, runtimeCallbacks);
runtime.connect().then(connected => {
  if (connected) console.log('  ✅ Runtime connected successfully');
  else console.log('  ℹ Runtime running in standalone mode');
}).catch(error => {
  console.log(`  ⚠ Runtime connection failed: ${error.message}`);
});

module.exports.runtime = runtime;

// Initialize orchestrator with runtime support
const orchestrator = new Orchestrator(terminalManager, stateManager, config, runtime);
const squadManager = new SquadManager(orchestrator);

const agentGraph = new AgentGraph(path.join(__dirname, '../data/graph'));
agentGraph.autoSave(30000);

const memorySystem = new MemorySystem(config.memory?.baseDir || './memory');

// --- SSE ---
const sseClients = new Set();

function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

// --- Workflow events ---
const workflowEventEmitter = new EventEmitter();
orchestrator.setEventEmitter(workflowEventEmitter);
workflowEventEmitter.on('workflow_event', (event) => broadcast('workflow_event', event));

// --- Terminal events ---
terminalManager.on('data', (id, data) => broadcast('terminal_data', { id, data }));
terminalManager.on('exit', (id, code) => broadcast('terminal_exit', { id, code }));

// --- Dependencies for routes ---
const deps = {
  terminalManager, stateManager, orchestrator, squadManager,
  ralphLoop, superskillRegistry, agentGraph, runtime, memorySystem,
  sseClients, broadcast, config
};

// --- Mount routes ---
// Create route handlers once, mount under both /api/ and /api/v1/
const routeModules = {
  terminals: require('./routes/terminals')(deps),
  agents: require('./routes/agents')(deps),
  workflows: require('./routes/workflows')(deps),
  squads: require('./routes/squads')(deps),
  ralph: require('./routes/ralph')(deps),
  context: require('./routes/context')(deps),
  graph: require('./routes/graph')(deps),
  superskills: require('./routes/superskills')(deps),
  runtime: require('./routes/runtime')(deps),
  memory: require('./routes/memory')(deps),
};

for (const [name, handler] of Object.entries(routeModules)) {
  app.use(`/api/${name}`, handler);      // backward compat
  app.use(`/api/v1/${name}`, handler);   // versioned
}

app.use('/', require('./routes/system')(deps));

// --- Static UI ---
const uiDistPath = path.join(__dirname, '../ui-dist');
if (fs.existsSync(uiDistPath)) {
  app.use(express.static(uiDistPath));
}

// --- Global error handling middleware (must be last) ---
const { errorHandler } = require('./middleware/error-handler');
app.use(errorHandler);

// --- Process error handlers ---
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.stack || error.message);
  // Log but don't crash - let the server continue running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't crash - let the server continue running
});

// --- Start server ---
app.listen(port, config.server.host, () => {
  console.log(`🚀 AG Dev server running on http://${config.server.host}:${port}`);
});
