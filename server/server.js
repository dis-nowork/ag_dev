const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const TerminalManager = require('./terminal-manager');
const StateManager = require('./state');
const Orchestrator = require('./orchestrator');
const SquadManager = require('./squad-manager');
const RalphLoop = require('./ralph-loop');
const SuperSkillRegistry = require('../superskills/registry');
const AgentGraph = require('./agent-graph');

// Load config with environment variable overrides
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

// Middleware
app.use(cors());
app.use(express.json());

// Initialize components
const terminalManager = new TerminalManager(config.terminals);
const stateManager = new StateManager();
const orchestrator = new Orchestrator(terminalManager, stateManager, config);
const squadManager = new SquadManager(orchestrator);

// Initialize Ralph Loop
const ralphLoop = new RalphLoop(terminalManager, {
  projectRoot: config.projectRoot || path.join(__dirname, '..'),
  qualityCommands: config.qualityCommands || [],
  onEvent: (type, data) => broadcast('ralph_' + type, data)
});

// Initialize SuperSkill Registry
const superskillRegistry = new SuperSkillRegistry(path.join(__dirname, '..', 'superskills'));

// Initialize Agent Graph for temporal tracking
const agentGraph = new AgentGraph(path.join(__dirname, '../data/graph'));
agentGraph.autoSave(30000); // Save every 30 seconds

// SSE clients
const sseClients = new Set();

// Event emitter for workflow events
const EventEmitter = require('events');
const workflowEventEmitter = new EventEmitter();
orchestrator.setEventEmitter(workflowEventEmitter);

// Handle workflow events for SSE broadcasting
workflowEventEmitter.on('workflow_event', (event) => {
  broadcast('workflow_event', event);
});

/**
 * Server-Sent Events endpoint
 */
app.get('/api/events', (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Add client to set
  sseClients.add(res);
  
  // Send initial state
  res.write(`data: ${JSON.stringify({ 
    type: 'init', 
    data: stateManager.getState() 
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(res);
  });

  req.on('aborted', () => {
    sseClients.delete(res);
  });
});

/**
 * Broadcast to all SSE clients
 */
function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  
  for (const client of sseClients) {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      // Client disconnected, remove it
      sseClients.delete(client);
    }
  }
}

/**
 * Process orchestrator chat messages with simple rule-based responses
 */
function processOrchestratorChat(message) {
  const activeWorkflow = orchestrator.getWorkflowExecutionState();
  const activeSquads = squadManager.getActiveSquads();
  const terminals = terminalManager.list();
  
  // Status queries
  if (message.includes('status') || message.includes('como tá') || message.includes('estado')) {
    const squadStats = squadManager.getStats();
    const status = {
      activeTerminals: terminals.length,
      activeSquads: activeSquads.length,
      totalActiveAgents: squadStats.totalActiveAgents,
      totalActiveTerminals: squadStats.totalActiveTerminals,
      workflowRunning: activeWorkflow?.status === 'running',
      workflowName: activeWorkflow?.name || null,
      agentBreakdown: squadStats.agentBreakdown
    };
    
    let response = `📊 Status do Sistema:\n`;
    response += `• Terminais ativos: ${status.activeTerminals}\n`;
    response += `• Squads ativos: ${status.activeSquads}\n`;
    response += `• Agents únicos: ${status.totalActiveAgents}\n`;
    response += `• Terminais de squads: ${status.totalActiveTerminals}\n`;
    
    if (Object.keys(status.agentBreakdown).length > 0) {
      response += `• Breakdown: `;
      const breakdown = Object.entries(status.agentBreakdown)
        .map(([agent, count]) => `${agent}×${count}`)
        .join(', ');
      response += breakdown + '\n';
    }
    
    if (status.workflowRunning) {
      response += `• Workflow ativo: ${status.workflowName}\n`;
    } else {
      response += `• Nenhum workflow ativo\n`;
    }
    
    return response;
  }
  
  // Start workflow
  const startMatch = message.match(/start\s+(\S+)/);
  if (startMatch) {
    const workflowName = startMatch[1];
    const workflows = orchestrator.getWorkflows();
    const workflowExists = workflows.find(w => w.name === workflowName);
    
    if (workflowExists) {
      return `Para iniciar o workflow "${workflowName}", use:\nPOST /api/workflows/${workflowName}/execute\ncom {"task": "sua tarefa aqui"}`;
    } else {
      const availableWorkflows = workflows.map(w => w.name).join(', ');
      return `Workflow "${workflowName}" não encontrado. Disponíveis: ${availableWorkflows}`;
    }
  }
  
  // Stop/pause commands
  if (message.includes('stop') || message.includes('pause') || message.includes('parar')) {
    if (activeWorkflow?.status === 'running') {
      return `Para parar o workflow ativo "${activeWorkflow.name}", use:\nPOST /api/workflows/active/stop`;
    } else if (terminals.length > 0) {
      return `Para parar todos os terminais, use:\nDELETE /api/terminals/{id} para cada terminal`;
    } else {
      return `Nada está executando no momento.`;
    }
  }
  
  // Spawn agent
  const spawnMatch = message.match(/spawn\s+(\S+)\s+(.+)/);
  if (spawnMatch) {
    const agentName = spawnMatch[1];
    const task = spawnMatch[2];
    const agents = orchestrator.getAgentDefinitions();
    const agentExists = agents.find(a => a.name === agentName);
    
    if (agentExists) {
      return `Para spawnar o agente "${agentName}", use:\nPOST /api/terminals\ncom {"type": "agent", "name": "${agentName}", "task": "${task}"}`;
    } else {
      const availableAgents = agents.map(a => a.name).join(', ');
      return `Agente "${agentName}" não encontrado. Disponíveis: ${availableAgents}`;
    }
  }
  
  // Default suggestions
  const suggestions = [
    '• "status" - ver estado do sistema',
    '• "start {workflow}" - iniciar workflow',
    '• "stop" - parar execução ativa',
    '• "spawn {agente} {tarefa}" - criar agente específico'
  ];
  
  const availableWorkflows = orchestrator.getWorkflows().map(w => w.name).slice(0, 3).join(', ');
  const availableSquads = squadManager.listSquads().map(s => s.name).slice(0, 3).join(', ');
  
  return `🤖 Orquestrador AG Dev

Comandos disponíveis:
${suggestions.join('\n')}

💡 Recursos especiais:
• Múltiplos devs: Squads spawnam 2+ devs automaticamente
• API múltipla: count=1-4 no POST /api/terminals
• Trabalho paralelo: Agentes colaboram automaticamente

Workflows: ${availableWorkflows}
Squads: ${availableSquads}

Para mais detalhes, consulte a documentação da API.`;
}

// Terminal Manager Event Handlers
terminalManager.on('spawn', (data) => {
  broadcast('terminal_spawn', data);
  
  // Track agent spawning in temporal graph
  if (data.id) {
    const metadata = terminalManager.getMetadata(data.id) || {};
    agentGraph.agentSpawned(data.id, {
      ...metadata,
      pid: data.pid,
      spawned: Date.now()
    });
  }
});

terminalManager.on('data', (data) => {
  broadcast('terminal_data', data);
});

terminalManager.on('exit', (data) => {
  broadcast('terminal_exit', data);
  orchestrator.handleAgentEvent('exit', data);
  
  // Track agent stopping in temporal graph
  if (data.id) {
    agentGraph.agentStopped(data.id);
  }
});

terminalManager.on('error', (data) => {
  broadcast('terminal_error', data);
  orchestrator.handleAgentEvent('error', data);
});

terminalManager.on('kill', (data) => {
  broadcast('terminal_kill', data);
  
  // Track agent stopping in temporal graph
  if (data.id) {
    agentGraph.agentStopped(data.id);
  }
});

terminalManager.on('resize', (data) => {
  broadcast('terminal_resize', data);
});

// API Routes

/**
 * Get terminals list
 */
app.get('/api/terminals', (req, res) => {
  try {
    const terminals = terminalManager.list();
    res.json(terminals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create new terminal(s) - supports multiple instances
 */
app.post('/api/terminals', async (req, res) => {
  try {
    const { type, name, command, args, task, env, cwd, cols, rows, count = 1 } = req.body;
    
    // Validate count
    const spawnCount = Math.min(Math.max(parseInt(count) || 1, 1), 4);
    const terminals = [];
    
    for (let i = 1; i <= spawnCount; i++) {
      let terminal;
      let terminalName = name;
      
      // Add number suffix for multiple instances
      if (spawnCount > 1) {
        terminalName = `${name || type} #${i}`;
      }
      
      switch (type) {
        case 'claude':
          if (!task) {
            return res.status(400).json({ error: 'Task is required for Claude agent' });
          }
          terminal = terminalManager.spawnClaudeAgent(task, { env, cwd, cols, rows });
          terminal.name = terminalName || 'Claude Code';
          terminal.type = 'claude';
          terminal.task = task;
          break;
          
        case 'agent':
          if (!name || !task) {
            return res.status(400).json({ error: 'Agent name and task are required' });
          }
          
          // Contextualize task for multiple instances
          let contextualizedTask = task;
          if (spawnCount > 1) {
            contextualizedTask = `${task}\n\n[Instance ${i} of ${spawnCount}] You are working in parallel with other ${name} agents. Coordinate and divide the work efficiently.`;
          }
          
          terminal = await orchestrator.spawnAgent(name, contextualizedTask, { env, cwd, cols, rows });
          terminal.name = terminalName;
          terminal.type = 'agent';
          terminal.task = contextualizedTask;
          terminal.instance = i;
          terminal.totalInstances = spawnCount;
          break;
          
        case 'custom':
          if (!command) {
            return res.status(400).json({ error: 'Command is required for custom terminal' });
          }
          terminal = await orchestrator.spawnCustomCommand(
            terminalName || command, 
            command, 
            args || [], 
            { env, cwd, cols, rows }
          );
          terminal.name = terminalName || command;
          terminal.type = 'custom';
          terminal.instance = i;
          terminal.totalInstances = spawnCount;
          break;
          
        default:
          return res.status(400).json({ error: 'Invalid terminal type' });
      }
      
      // Store metadata for list endpoint
      terminalManager.setMetadata(terminal.id, { 
        name: terminal.name, 
        type: terminal.type,
        task: terminal.task,
        instance: terminal.instance,
        totalInstances: terminal.totalInstances
      });
      
      terminals.push(terminal);
    }
    
    // Return single terminal for count=1, array for count>1
    res.json(spawnCount === 1 ? terminals[0] : terminals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Write to terminal
 */
app.post('/api/terminals/:id/write', (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }
    
    terminalManager.write(id, data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resize terminal
 */
app.post('/api/terminals/:id/resize', (req, res) => {
  try {
    const { id } = req.params;
    const { cols, rows } = req.body;
    
    if (!cols || !rows) {
      return res.status(400).json({ error: 'Cols and rows are required' });
    }
    
    terminalManager.resize(id, cols, rows);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Kill terminal
 */
app.delete('/api/terminals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { signal } = req.query;
    
    terminalManager.kill(id, signal);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get terminal buffer
 */
app.get('/api/terminals/:id/buffer', (req, res) => {
  try {
    const { id } = req.params;
    const { lines } = req.query;
    
    const buffer = terminalManager.getBuffer(id, lines ? parseInt(lines) : 100);
    res.json({ buffer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available agent definitions
 */
app.get('/api/agents', (req, res) => {
  try {
    const agents = orchestrator.getAgentDefinitions();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available workflows
 */
app.get('/api/workflows', (req, res) => {
  try {
    const workflows = orchestrator.getWorkflows();
    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active workflow execution state
 */
app.get('/api/workflows/active', (req, res) => {
  try {
    const execution = orchestrator.getWorkflowExecutionState();
    res.json(execution || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop active workflow execution
 */
app.post('/api/workflows/active/stop', (req, res) => {
  try {
    const execution = orchestrator.stopWorkflowExecution();
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start workflow
 */
app.post('/api/workflows/:name/start', async (req, res) => {
  try {
    const { name } = req.params;
    const { context } = req.body;
    
    const workflow = await orchestrator.startWorkflow(name, context || {});
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop workflow
 */
app.post('/api/workflows/:id/stop', (req, res) => {
  try {
    const { id } = req.params;
    
    const workflow = orchestrator.stopWorkflow(id);
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get system state
 */
app.get('/api/state', (req, res) => {
  try {
    const state = stateManager.getState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint for deployment monitoring
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    superskills: superskillRegistry.getStats().total,
    agents: Object.keys(terminalManager.terminals || {}).length
  });
});

/**
 * Get system metrics
 */
app.get('/api/metrics', (req, res) => {
  try {
    const metrics = stateManager.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pause all agents
 */
app.post('/api/system/pause-all', (req, res) => {
  try {
    stateManager.pauseAll();
    broadcast('system_pause_all', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resume all agents
 */
app.post('/api/system/resume-all', (req, res) => {
  try {
    stateManager.resumeAll();
    broadcast('system_resume_all', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute workflow with enhanced monitoring
 */
app.post('/api/workflows/:name/execute', async (req, res) => {
  try {
    const { name } = req.params;
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const execution = await orchestrator.executeWorkflow(name, task);
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes have been reorganized above

/**
 * Orchestrator Chat API
 */
app.post('/api/chat', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const response = processOrchestratorChat(message.toLowerCase().trim());
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available squads
 */
app.get('/api/squads', async (req, res) => {
  try {
    const squads = squadManager.listSquads();
    const stats = squadManager.getStats();
    res.json({ squads, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get active squads
 */
app.get('/api/squads/active', (req, res) => {
  try {
    const activeSquads = squadManager.getActiveSquads();
    res.json(activeSquads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create dynamic squad
 */
app.post('/api/squads', (req, res) => {
  try {
    const squad = squadManager.createSquad(req.body);
    res.status(201).json(squad);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Activate squad
 */
app.post('/api/squads/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { task, options, devCount } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    // Merge devCount into options
    const squadOptions = { 
      ...(options || {}),
      devCount: devCount || options?.devCount || 2 // Default 2 devs
    };
    
    const result = await squadManager.activateSquad(id, task, squadOptions);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Deactivate squad
 */
app.delete('/api/squads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await squadManager.deactivateSquad(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes have been reorganized above

/**
 * Get specific squad info
 */
app.get('/api/squads/:id', (req, res) => {
  try {
    const { id } = req.params;
    const squad = squadManager.getSquad(id);
    
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    const activeInstance = squadManager.getActiveSquad(id);
    res.json({ squad, active: activeInstance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Duplicate squad route removed - reorganized above

/**
 * Ralph Loop API Routes
 */

// Load or generate PRD
app.post('/api/ralph/prd', (req, res) => {
  try {
    const { description, prd, name } = req.body;
    if (prd) {
      ralphLoop.loadPRD(prd);
    } else if (description) {
      ralphLoop.generatePRD(description, { name });
    } else {
      return res.status(400).json({ error: 'Provide description or prd object' });
    }
    res.json({ ok: true, prd: ralphLoop.getState().prd });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start ralph loop
app.post('/api/ralph/start', async (req, res) => {
  try {
    const result = await ralphLoop.start();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause ralph loop
app.post('/api/ralph/pause', (req, res) => {
  try {
    ralphLoop.pause();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume ralph loop
app.post('/api/ralph/resume', async (req, res) => {
  try {
    const result = await ralphLoop.resume();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop ralph loop
app.post('/api/ralph/stop', (req, res) => {
  try {
    ralphLoop.stop();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ralph state
app.get('/api/ralph/state', (req, res) => {
  try {
    res.json(ralphLoop.getState());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════
// PROJECT CONTEXT API
// ═══════════════════════════════════

const CONTEXT_DIR = path.join(__dirname, '..', 'project-context');

// Ensure project-context directory exists
if (!fs.existsSync(CONTEXT_DIR)) {
  fs.mkdirSync(CONTEXT_DIR, { recursive: true });
}

// Get all context files
app.get('/api/context', (req, res) => {
  try {
    const files = {};
    if (fs.existsSync(CONTEXT_DIR)) {
      const entries = fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'));
      for (const entry of entries) {
        files[entry] = fs.readFileSync(path.join(CONTEXT_DIR, entry), 'utf-8');
      }
    }
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific context file
app.get('/api/context/:filename', (req, res) => {
  try {
    const filePath = path.join(CONTEXT_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ filename: req.params.filename, content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update context file
app.put('/api/context/:filename', (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Only allow .md files for safety
    const filename = req.params.filename;
    if (!filename.endsWith('.md')) {
      return res.status(400).json({ error: 'Only .md files allowed' });
    }
    
    const filePath = path.join(CONTEXT_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    
    broadcast('context_updated', { filename });
    res.json({ ok: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new context file
app.post('/api/context', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !filename.endsWith('.md')) {
      return res.status(400).json({ error: 'Filename (ending in .md) is required' });
    }
    
    const filePath = path.join(CONTEXT_DIR, filename);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'File already exists. Use PUT to update.' });
    }
    
    fs.writeFileSync(filePath, content || '', 'utf-8');
    res.json({ ok: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════
// TEMPORAL GRAPH API
// ═══════════════════════════════════

/**
 * Get active agents with metrics
 */
app.get('/api/graph/agents', (req, res) => {
  try {
    const { time } = req.query;
    const timestamp = time ? parseInt(time) : Date.now();
    const agents = agentGraph.getActiveAgents(timestamp);
    
    // Add productivity metrics for each agent
    const agentsWithMetrics = agents.map(agent => ({
      ...agent,
      productivity: agentGraph.getAgentProductivity(agent.agentId)
    }));
    
    res.json(agentsWithMetrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get activity timeline with time buckets
 */
app.get('/api/graph/timeline', (req, res) => {
  try {
    const { t0, t1, bucket } = req.query;
    
    if (!t0 || !t1) {
      return res.status(400).json({ error: 't0 and t1 parameters are required' });
    }
    
    const bucketMs = bucket ? parseInt(bucket) : 60000; // Default 1 minute buckets
    const timeline = agentGraph.getTimelineData(parseInt(t0), parseInt(t1), bucketMs);
    
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get activity heatmap (hour x day matrix)
 */
app.get('/api/graph/heatmap', (req, res) => {
  try {
    const { t0, t1 } = req.query;
    
    if (!t0 || !t1) {
      return res.status(400).json({ error: 't0 and t1 parameters are required' });
    }
    
    const heatmap = agentGraph.getHeatmapData(parseInt(t0), parseInt(t1));
    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get network visualization data
 */
app.get('/api/graph/network', (req, res) => {
  try {
    const { time } = req.query;
    const timestamp = time ? parseInt(time) : Date.now();
    const network = agentGraph.getNetworkData(timestamp);
    
    res.json(network);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get project pulse metrics
 */
app.get('/api/graph/pulse', (req, res) => {
  try {
    const { window } = req.query;
    let timeWindow;
    
    if (window) {
      const windowMs = parseInt(window);
      timeWindow = {
        from: Date.now() - windowMs,
        to: Date.now()
      };
    }
    
    const pulse = agentGraph.getProjectPulse(timeWindow);
    res.json(pulse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get specific agent analytics
 */
app.get('/api/graph/agent/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { window } = req.query;
    
    let timeWindow;
    if (window) {
      const windowMs = parseInt(window);
      timeWindow = {
        from: Date.now() - windowMs,
        to: Date.now()
      };
    }
    
    const activity = agentGraph.getAgentActivity(id, timeWindow);
    const productivity = agentGraph.getAgentProductivity(id);
    
    res.json({
      agentId: id,
      activity,
      productivity,
      currentConnections: agentGraph.graph.nodeDegreeAt(id)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get hot files analysis
 */
app.get('/api/graph/files', (req, res) => {
  try {
    const { window } = req.query;
    
    let timeWindow;
    if (window) {
      const windowMs = parseInt(window);
      timeWindow = {
        from: Date.now() - windowMs,
        to: Date.now()
      };
    }
    
    const hotFiles = agentGraph.getHotFiles(timeWindow);
    res.json(hotFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get overall graph stats
 */
app.get('/api/graph/stats', (req, res) => {
  try {
    const stats = agentGraph.getStats();
    const bottlenecks = agentGraph.getBottlenecks();
    const teamDynamics = agentGraph.getTeamDynamics();
    
    res.json({
      ...stats,
      bottlenecks,
      teamDynamics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Record manual interaction/event
 */
app.post('/api/graph/events', (req, res) => {
  try {
    const { type, from, to, data } = req.body;
    
    if (!type || !from) {
      return res.status(400).json({ error: 'type and from are required' });
    }
    
    let result;
    switch (type) {
      case 'task_assignment':
        if (!to) return res.status(400).json({ error: 'to is required for task assignments' });
        result = agentGraph.taskAssigned(from, to, data);
        break;
      case 'message_exchange':
        if (!to) return res.status(400).json({ error: 'to is required for message exchanges' });
        result = agentGraph.messageExchanged(from, to, data);
        break;
      case 'file_modification':
        if (!to) return res.status(400).json({ error: 'to (filePath) is required for file modifications' });
        result = agentGraph.fileModified(from, to, data);
        break;
      case 'task_completion':
        if (!data?.taskId) return res.status(400).json({ error: 'data.taskId is required for task completions' });
        result = agentGraph.taskCompleted(from, data.taskId, data);
        break;
      default:
        return res.status(400).json({ error: 'Invalid event type' });
    }
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════
// SUPERSKILL API
// ═══════════════════════════════════

/**
 * List all SuperSkills
 */
app.get('/api/superskills', (req, res) => {
  try {
    const superskills = superskillRegistry.list();
    res.json(superskills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search SuperSkills
 */
app.get('/api/superskills/search', (req, res) => {
  try {
    const { q: query, tags } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const tagList = tags ? tags.split(',').map(t => t.trim()) : [];
    const results = superskillRegistry.search(query, tagList);
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get SuperSkill registry stats (must be before :name route)
 */
app.get('/api/superskills/stats', (req, res) => {
  try {
    const stats = superskillRegistry.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get specific SuperSkill
 */
app.get('/api/superskills/:name', (req, res) => {
  try {
    const { name } = req.params;
    const superskill = superskillRegistry.get(name);
    
    if (!superskill) {
      return res.status(404).json({ error: `SuperSkill '${name}' not found` });
    }
    
    res.json(superskill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Execute SuperSkill
 */
app.post('/api/superskills/:name/run', async (req, res) => {
  try {
    const { name } = req.params;
    const input = req.body;
    const { timeout } = req.query;
    
    const superskill = superskillRegistry.get(name);
    if (!superskill) {
      return res.status(404).json({ error: `SuperSkill '${name}' not found` });
    }
    
    const options = {};
    if (timeout) {
      const timeoutNum = parseInt(timeout);
      if (timeoutNum > 0) {
        options.timeout = timeoutNum;
      }
    }
    
    const result = await superskillRegistry.run(name, input, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═══════════════════════════════════
// MEMORY API
// ═══════════════════════════════════

const MemorySystem = require('./memory-system');
const memory = new MemorySystem();

// Memory API
app.get('/api/memory/stats', (req, res) => {
  res.json(memory.getStats());
});

app.get('/api/memory/agent/:agentId', (req, res) => {
  const context = memory.getAgentContext(req.params.agentId);
  res.json(context);
});

app.post('/api/memory/record', (req, res) => {
  const { agentId, type, data } = req.body;
  if (!agentId || !type) {
    return res.status(400).json({ error: 'agentId and type required' });
  }
  memory.record(agentId, type, data || {});
  res.json({ ok: true });
});

app.post('/api/memory/fold/:agentId', (req, res) => {
  const summary = memory.fold(req.params.agentId);
  res.json({ ok: true, summary });
});

/**
 * Serve static files from ui-dist
 */
app.use(express.static(path.join(__dirname, '../ui-dist')));

/**
 * Root route
 */
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '../ui-dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'UI not built. Run npm run build first.' });
  }
});

/**
 * Centralized Error Handler Middleware
 */
app.use((err, req, res, next) => {
  console.error('[AG Dev Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    await terminalManager.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
app.listen(port, () => {
  console.log(`🚀 AG Dev server running on http://localhost:${port}`);
  console.log(`📡 SSE events available at http://localhost:${port}/api/events`);
});

module.exports = app;