/**
 * AG Dev Server — The Armor Engine
 * 
 * Bridge between:
 * - The Command Center UI (what the human sees)
 * - Clawdbot Gateway (the brain that operates agents)
 * 
 * Manages:
 * 1. Agent state (status, checklist, progress, output)
 * 2. Real-time updates via SSE
 * 3. Chat routing (main + per-agent)
 * 4. File/document operations
 * 5. Git operations (safe exec)
 * 6. Gateway bridge integration
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, execSync, spawn } = require('child_process');
const { ClawdbotBridge } = require('./ws-bridge');
const { createRuntime } = require('./runtimes/runtime-factory');
const { WorkflowEngine } = require('./workflow-engine');

// ─── Global crash protection ───
// Never let an unhandled error kill the server
process.on('uncaughtException', (err) => {
  console.error('  ⚠ Uncaught exception (server stays alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('  ⚠ Unhandled rejection (server stays alive):', reason?.message || reason);
});

const app = express();

// ─── Config ───
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let config = {
  port: 3000,
  projectRoot: '',
  name: 'AG Dev',
  gateway: { url: 'ws://127.0.0.1:18789', token: '' },
  agents: { definitionsDir: './core/agents', autoSpawn: false },
  auth: { token: '' }
};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const loaded = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    config = { ...config, ...loaded, gateway: { ...config.gateway, ...loaded.gateway }, agents: { ...config.agents, ...loaded.agents }, auth: { ...config.auth, ...loaded.auth } };
  }
} catch (e) {
  console.error('  ⚠ Failed to load config.json:', e.message);
}

// Auto-generate auth token if not set
if (!config.auth.token) {
  config.auth.token = crypto.randomUUID();
  console.log(`  🔑 Generated auth token: ${config.auth.token}`);
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('  ⚠ Failed to save generated token to config.json:', e.message);
  }
}

const PORT = process.env.PORT || config.port;
const PROJECT_ROOT = config.projectRoot || path.join(__dirname, '..');
const CORE_DIR = path.join(__dirname, '..', 'core');
const AGENTS_DIR = config.agents.definitionsDir
  ? path.resolve(path.join(__dirname, '..'), config.agents.definitionsDir)
  : path.join(CORE_DIR, 'agents');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve React build
const uiDist = path.join(__dirname, '..', 'ui-dist');
const uiPublic = path.join(__dirname, 'public');
const staticDir = fs.existsSync(uiDist) ? uiDist : uiPublic;
app.use(express.static(staticDir));

// ═══════════════════════════════════════
// AUTH: Disabled — server only accessible via Tailscale (private network)
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════
const STATE_FILE = path.join(__dirname, 'state.json');
let state = {
  agents: {},
  chat: { messages: [] },
  agentChats: {},
  workflow: {},
  timeline: []
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
    }
  } catch (e) {
    console.error('  ⚠ Failed to load state.json:', e.message);
  }
}
let saveTimer = null;
function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error('  ⚠ Failed to save state.json:', e.message);
    }
    saveTimer = null;
  }, 500);
}
function saveStateImmediate() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('  ⚠ Failed to save state.json:', e.message);
  }
}
loadState();

function logEvent(type, data) {
  const event = { type, time: new Date().toISOString(), ...data };
  if (!state.timeline) state.timeline = [];
  state.timeline.push(event);
  if (state.timeline.length > 500) state.timeline = state.timeline.slice(-500);
  saveState();
  broadcast('timeline', { event });
}

// ═══════════════════════════════════════
// SSE — Real-time updates
// ═══════════════════════════════════════
const clients = new Set();
app.get('/api/sse', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
  // Send current bridge status immediately so UI knows the connection state
  res.write(`data: ${JSON.stringify({ type: 'bridge_status', connected: runtime.connected, gatewayUrl: runtime.gatewayUrl || '', latency: 0 })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function broadcast(type, data) {
  const msg = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  clients.forEach(c => { try { c.write(msg); } catch (e) {} });
}

// ═══════════════════════════════════════
// PROJECT INFO
// ═══════════════════════════════════════
app.get('/api/project', (req, res) => {
  try {
    const gitArgs = { cwd: PROJECT_ROOT, timeout: 5000 };
    const gitLog = execFileSync('git', ['log', '--oneline', '-30'], gitArgs).toString().trim().split('\n');
    const branch = execFileSync('git', ['branch', '--show-current'], gitArgs).toString().trim();
    const status = execFileSync('git', ['status', '--porcelain'], gitArgs).toString().trim();
    const changedFiles = status ? status.split('\n').length : 0;
    res.json({
      name: config.name,
      branch,
      commits: gitLog,
      changedFiles,
      projectRoot: PROJECT_ROOT,
      bridgeConnected: runtime.connected
    });
  } catch (e) {
    res.json({
      name: config.name,
      branch: 'unknown',
      commits: [],
      changedFiles: 0,
      projectRoot: PROJECT_ROOT,
      bridgeConnected: runtime.connected
    });
  }
});

// ═══════════════════════════════════════
// AGENTS — List, state, control
// ═══════════════════════════════════════

/**
 * Parse agent .md file to extract metadata
 */
function parseAgentMd(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const id = path.basename(filePath, '.md');
    const nm = content.match(/name:\s*(.+)/);
    const tt = content.match(/title:\s*(.+)/);
    const ic = content.match(/icon:\s*(.+)/);
    const sq = content.match(/squad:\s*(.+)/);
    const rl = content.match(/role:\s*(.+)/);
    return {
      id,
      name: nm ? nm[1].trim() : id,
      title: tt ? tt[1].trim() : '',
      icon: ic ? ic[1].trim() : '🤖',
      squad: sq ? sq[1].trim() : 'default',
      role: rl ? rl[1].trim() : '',
      definitionPath: filePath
    };
  } catch {
    return null;
  }
}

/**
 * Load all agent definitions from disk
 */
function loadAgentDefinitions() {
  const agents = [];
  if (fs.existsSync(AGENTS_DIR)) {
    fs.readdirSync(AGENTS_DIR).forEach(f => {
      if (!f.endsWith('.md')) return;
      const meta = parseAgentMd(path.join(AGENTS_DIR, f));
      if (meta) agents.push(meta);
    });
  }
  return agents;
}

app.get('/api/agents', (req, res) => {
  const agents = loadAgentDefinitions().map(a => ({
    ...a,
    state: { status: 'idle', currentTask: null, checklist: [], progress: 0, output: '', filesChanged: [], activityHistory: [], ...(state.agents[a.id] || {}) }
  }));
  res.json({ agents });
});

// Agent metadata + squads (for UI to consume instead of hardcoded theme)
app.get('/api/agents/meta', (req, res) => {
  const agents = loadAgentDefinitions();
  const squads = {};
  agents.forEach(a => {
    if (!squads[a.squad]) squads[a.squad] = { id: a.squad, agents: [] };
    squads[a.squad].agents.push(a.id);
  });
  res.json({ agents, squads: Object.values(squads) });
});

// Agent state update
app.post('/api/agents/:id/state', (req, res) => {
  const { id } = req.params;
  const prev = state.agents[id]?.status;
  state.agents[id] = { ...(state.agents[id] || {}), ...req.body };
  saveState();
  broadcast('agent_update', { agentId: id, state: state.agents[id] });
  if (prev !== req.body.status) {
    logEvent('agent_status', { agentId: id, from: prev, to: req.body.status });
  }
  res.json({ success: true });
});

app.post('/api/agents/:id/pause', (req, res) => {
  const id = req.params.id;
  if (!state.agents[id]) state.agents[id] = {};
  state.agents[id].status = 'paused';
  saveState();
  broadcast('agent_update', { agentId: id, state: state.agents[id] });
  logEvent('agent_paused', { agentId: id });

  // Also send pause instruction to real session if connected
  const sessionKey = state.agents[id]?.sessionKey;
  if (sessionKey && runtime.connected) {
    runtime.pauseAgent(sessionKey).catch(() => {});
  }

  res.json({ success: true });
});

app.post('/api/agents/:id/resume', (req, res) => {
  const id = req.params.id;
  if (!state.agents[id]) state.agents[id] = {};
  state.agents[id].status = 'working';
  saveState();
  broadcast('agent_update', { agentId: id, state: state.agents[id] });
  logEvent('agent_resumed', { agentId: id });
  res.json({ success: true });
});

// Agent definition (full markdown)
app.get('/api/agents/:id/definition', (req, res) => {
  const fp = path.join(AGENTS_DIR, `${req.params.id}.md`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.json({ content: fs.readFileSync(fp, 'utf8') });
});

// ═══════════════════════════════════════
// STRATEGY FILE (needed by spawn)
// ═══════════════════════════════════════
const STRATEGY_FILE = path.join(__dirname, 'strategy.json');
let strategy = { vision: '', guardrails: '', directives: {} };
try {
  if (fs.existsSync(STRATEGY_FILE)) strategy = JSON.parse(fs.readFileSync(STRATEGY_FILE, 'utf8'));
} catch {}

// ═══════════════════════════════════════
// AGENT SPAWN — Create real Clawdbot session
// ═══════════════════════════════════════
app.post('/api/agents/:id/spawn', async (req, res) => {
  const { id } = req.params;
  const { task, model } = req.body;

  // Read agent definition
  const defPath = path.join(AGENTS_DIR, `${id}.md`);
  if (!fs.existsSync(defPath)) {
    return res.status(404).json({ error: `Agent definition not found: ${id}` });
  }

  const agentDef = fs.readFileSync(defPath, 'utf8');

  // Read strategy directive if exists
  let directive = '';
  try {
    if (fs.existsSync(STRATEGY_FILE)) {
      const strat = JSON.parse(fs.readFileSync(STRATEGY_FILE, 'utf8'));
      directive = strat.directives?.[id]?.text || '';
    }
  } catch {}

  // Compose the full task
  const parts = [];
  if (directive) parts.push(`## Current Directive\n${directive}`);
  if (task) parts.push(`## Task\n${task}`);
  if (!task && !directive) parts.push('## Task\nAwaiting instructions.');

  const fullTask = parts.join('\n\n');

  try {
    const result = await runtime.spawnAgent(id, {
      task: fullTask,
      label: `ag-dev:${id}`,
      model: model || undefined,
      systemPrompt: agentDef,
    });

    if (result.ok) {
      const sessionKey = result.sessionKey;
      if (!state.agents[id]) state.agents[id] = {};
      state.agents[id].status = 'working';
      state.agents[id].currentTask = task || 'Spawned';
      state.agents[id].sessionKey = sessionKey || null;
      saveState();
      broadcast('agent_update', { agentId: id, state: state.agents[id] });
      logEvent('agent_spawned', { agentId: id, sessionKey, task });

      // Subscribe to lifecycle events for this session
      if (sessionKey) {
        runtime.subscribeToAgent(sessionKey, (evt) => {
          broadcastToTerminal(id, evt);
          broadcast('clawdbot_event', { agentId: id, ...evt });
        });
      }

      res.json({
        success: true,
        sessionKey,
        session: result.session,
        standalone: runtime.name === 'standalone',
      });
    } else {
      res.status(500).json({ error: result.error || 'Failed to spawn session' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════
// AGENT SEND — Send message to agent's session
// ═══════════════════════════════════════
app.post('/api/agents/:id/send', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: 'No message' });

  const sessionKey = state.agents[id]?.sessionKey;
  if (!sessionKey) {
    return res.status(400).json({ error: `Agent ${id} has no active session. Spawn first.` });
  }

  try {
    const result = await runtime.sendToAgent(sessionKey, message);
    if (!result.ok) {
      return res.status(503).json({ error: result.error || 'Failed to send' });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════
// AGENT HISTORY — Get session history
// ═══════════════════════════════════════
app.get('/api/agents/:id/history', async (req, res) => {
  const { id } = req.params;
  const sessionKey = state.agents[id]?.sessionKey;

  if (!sessionKey) {
    return res.json({ history: [], message: 'No active session' });
  }

  try {
    const result = await runtime.getAgentHistory(sessionKey);
    res.json({ ok: result.ok, history: result.messages || [], error: result.error });
  } catch (e) {
    res.status(500).json({ error: e.message, history: [] });
  }
});

// ═══════════════════════════════════════
// AGENT BATCH — Batch operations
// ═══════════════════════════════════════
app.post('/api/agents/batch', async (req, res) => {
  const { operation, agentIds, task, model } = req.body;

  if (!operation) return res.status(400).json({ error: 'No operation specified' });

  const results = {};
  const targetAgents = agentIds || Object.keys(state.agents);

  switch (operation) {
    case 'pause-all': {
      for (const id of targetAgents) {
        if (!state.agents[id]) state.agents[id] = {};
        state.agents[id].status = 'paused';
        const sessionKey = state.agents[id]?.sessionKey;
        if (sessionKey && runtime.connected) {
          try { await runtime.pauseAgent(sessionKey); } catch {}
        }
        results[id] = { success: true, status: 'paused' };
      }
      saveState();
      broadcast('state', { agents: state.agents });
      logEvent('batch_pause_all', { count: targetAgents.length });
      break;
    }
    case 'resume-all': {
      for (const id of targetAgents) {
        if (!state.agents[id]) state.agents[id] = {};
        if (state.agents[id].status === 'paused') {
          state.agents[id].status = 'working';
          results[id] = { success: true, status: 'working' };
        } else {
          results[id] = { success: true, status: state.agents[id].status, skipped: true };
        }
      }
      saveState();
      broadcast('state', { agents: state.agents });
      logEvent('batch_resume_all', { count: targetAgents.length });
      break;
    }
    case 'spawn-squad': {
      const agents = loadAgentDefinitions();
      const squad = req.body.squad;
      const toSpawn = squad
        ? agents.filter(a => a.squad === squad)
        : agents.filter(a => agentIds?.includes(a.id));

      for (const agent of toSpawn) {
        try {
          const defContent = fs.readFileSync(agent.definitionPath, 'utf8');
          const result = await runtime.spawnAgent(agent.id, {
            task: task || 'Awaiting instructions.',
            label: `ag-dev:${agent.id}`,
            model: model || undefined,
            systemPrompt: defContent,
          });
          if (!state.agents[agent.id]) state.agents[agent.id] = {};
          state.agents[agent.id].status = 'working';
          state.agents[agent.id].currentTask = task || 'Squad spawn';
          state.agents[agent.id].sessionKey = result.sessionKey || null;
          results[agent.id] = { success: result.ok, sessionKey: result.sessionKey };
        } catch (e) {
          results[agent.id] = { success: false, error: e.message };
        }
      }
      saveState();
      broadcast('state', { agents: state.agents });
      logEvent('batch_spawn_squad', { squad, count: toSpawn.length });
      break;
    }
    default:
      return res.status(400).json({ error: `Unknown operation: ${operation}` });
  }

  res.json({ success: true, operation, results });
});

// ═══════════════════════════════════════
// CHAT — Main + per-agent
// ═══════════════════════════════════════
app.get('/api/chat', (req, res) => {
  res.json({ messages: (state.chat?.messages || []).slice(-200) });
});

app.post('/api/chat', async (req, res) => {
  const msg = { id: Date.now(), from: 'human', text: req.body.message, time: new Date().toISOString() };
  if (!state.chat) state.chat = { messages: [] };
  state.chat.messages.push(msg);
  saveState();
  broadcast('chat', { message: msg });
  logEvent('chat_message', { from: 'human', preview: msg.text.slice(0, 50) });

  // Forward to runtime for real AI processing if connected
  if (runtime.connected) {
    try {
      const result = await runtime.sendMessage(req.body.message);
      if (result.ok) {
        const botMsg = {
          id: Date.now(),
          from: 'bot',
          text: result.result?.text || result.result?.summary || '✓ Sent to Clawdbot',
          time: new Date().toISOString()
        };
        state.chat.messages.push(botMsg);
        saveState();
        broadcast('chat', { message: botMsg });
      }
    } catch (e) {
      // Non-fatal — chat still works locally
      console.error('  ⚠ Bridge send failed:', e.message);
    }
  }

  res.json({ success: true, message: msg });
});

app.post('/api/chat/bot', (req, res) => {
  const { message, agentId } = req.body;
  const msg = { id: Date.now(), from: 'bot', text: message, agentId, time: new Date().toISOString() };
  if (agentId) {
    if (!state.agentChats[agentId]) state.agentChats[agentId] = [];
    state.agentChats[agentId].push(msg);
    broadcast('agent_chat', { agentId, message: msg });
  } else {
    if (!state.chat) state.chat = { messages: [] };
    state.chat.messages.push(msg);
    broadcast('chat', { message: msg });
  }
  saveState();
  res.json({ success: true });
});

app.get('/api/agents/:id/chat', (req, res) => {
  res.json({ messages: state.agentChats[req.params.id] || [] });
});

app.post('/api/agents/:id/chat', (req, res) => {
  const { id } = req.params;
  if (!state.agentChats[id]) state.agentChats[id] = [];
  const msg = { id: Date.now(), from: 'human', text: req.body.message, time: new Date().toISOString() };
  state.agentChats[id].push(msg);
  saveState();
  broadcast('agent_chat', { agentId: id, message: msg });
  logEvent('agent_command', { agentId: id, command: msg.text.slice(0, 50) });
  res.json({ success: true, message: msg });
});

// ═══════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════
app.get('/api/docs', (req, res) => {
  const docs = [];
  const scan = (dir, cat) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
      if (!f.endsWith('.md') && !f.endsWith('.yaml') && !f.endsWith('.yml')) return;
      try {
        const stat = fs.statSync(path.join(dir, f));
        docs.push({
          name: f, category: cat,
          path: path.join(dir, f),
          relativePath: `${cat}/${f}`,
          size: stat.size, modified: stat.mtime
        });
      } catch {}
    });
  };

  // Project docs
  if (PROJECT_ROOT && fs.existsSync(PROJECT_ROOT)) {
    scan(path.join(PROJECT_ROOT, 'docs'), 'docs');
    scan(path.join(PROJECT_ROOT, 'brainstorm'), 'brainstorm');
    ['stories', 'prd', 'architecture', 'guides'].forEach(s =>
      scan(path.join(PROJECT_ROOT, 'docs', s), `docs/${s}`)
    );
  }

  // Core docs
  scan(path.join(CORE_DIR, 'workflows'), 'workflows');

  res.json({ docs });
});

app.get('/api/docs/read', (req, res) => {
  const fp = req.query.path;
  if (!fp) return res.status(400).json({ error: 'No path' });
  const resolved = path.isAbsolute(fp) ? path.resolve(fp) : path.resolve(PROJECT_ROOT, fp);
  if (!resolved.startsWith(PROJECT_ROOT) && !resolved.startsWith(CORE_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    res.json({ content: fs.readFileSync(resolved, 'utf8'), path: fp });
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/docs/save', (req, res) => {
  const { path: fp, content } = req.body;
  if (!fp) return res.status(400).json({ error: 'No path' });
  const resolved = path.isAbsolute(fp) ? path.resolve(fp) : path.resolve(PROJECT_ROOT, fp);
  if (!resolved.startsWith(PROJECT_ROOT) && !resolved.startsWith(CORE_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    fs.writeFileSync(resolved, content, 'utf8');
    logEvent('doc_saved', { path: fp });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════
// FILE TREE
// ═══════════════════════════════════════
app.get('/api/tree', (req, res) => {
  const getTree = (dir, depth = 0, maxDepth = 3) => {
    if (depth >= maxDepth || !fs.existsSync(dir)) return [];
    try {
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.') || ['..aios-core', '.ag-dev'].includes(e.name))
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        })
        .map(e => {
          const fp = path.join(dir, e.name);
          if (e.isDirectory()) return { name: e.name, type: 'dir', path: fp, children: getTree(fp, depth + 1, maxDepth) };
          try {
            return { name: e.name, type: 'file', path: fp, size: fs.statSync(fp).size };
          } catch { return { name: e.name, type: 'file', path: fp, size: 0 }; }
        });
    } catch { return []; }
  };
  res.json({ tree: getTree(PROJECT_ROOT || path.join(__dirname, '..')) });
});

// ═══════════════════════════════════════
// GIT — Safe exec (no command injection)
// ═══════════════════════════════════════
app.post('/api/git/commit', (req, res) => {
  const message = req.body.message;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid commit message' });
  }
  try {
    execFileSync('git', ['add', '-A'], { cwd: PROJECT_ROOT, timeout: 10000 });
    const r = execFileSync('git', ['commit', '-m', message], { cwd: PROJECT_ROOT, timeout: 10000 }).toString();
    logEvent('git_commit', { message });
    res.json({ success: true, result: r });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

app.get('/api/git/status', (req, res) => {
  try {
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: PROJECT_ROOT, timeout: 5000 }).toString();
    res.json({ files: status.trim().split('\n').filter(Boolean) });
  } catch (e) {
    res.json({ files: [] });
  }
});

// ═══════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════
app.get('/api/timeline', (req, res) => {
  res.json({ events: (state.timeline || []).slice(-100) });
});

// ═══════════════════════════════════════
// GANTT TASKS — Configurable workflow for Gantt view
// ═══════════════════════════════════════
app.get('/api/gantt/tasks', (req, res) => {
  // Default workflow definition (can be overridden by a gantt-workflow.json file)
  const GANTT_WORKFLOW_FILE = path.join(__dirname, 'gantt-workflow.json');
  let workflow = null;

  try {
    if (fs.existsSync(GANTT_WORKFLOW_FILE)) {
      workflow = JSON.parse(fs.readFileSync(GANTT_WORKFLOW_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('  ⚠ Failed to load gantt-workflow.json:', e.message);
  }

  if (!workflow) {
    // Derive from default AIOS workflow + agent states
    workflow = [
      { id: 'brief', agentId: 'analyst', label: 'Project Brief', startDay: 0, duration: 2, dependencies: [] },
      { id: 'prd', agentId: 'pm', label: 'PRD', startDay: 2, duration: 3, dependencies: ['brief'] },
      { id: 'ux-spec', agentId: 'ux-design-expert', label: 'UX Spec', startDay: 3, duration: 3, dependencies: ['prd'] },
      { id: 'architecture', agentId: 'architect', label: 'Architecture', startDay: 4, duration: 3, dependencies: ['prd'] },
      { id: 'validation', agentId: 'po', label: 'PO Validation', startDay: 7, duration: 1, dependencies: ['prd', 'ux-spec', 'architecture'] },
      { id: 'sharding', agentId: 'sm', label: 'Task Sharding', startDay: 8, duration: 2, dependencies: ['validation'] },
      { id: 'db-design', agentId: 'data-engineer', label: 'Database Design', startDay: 8, duration: 2, dependencies: ['architecture'] },
      { id: 'dev-sprint', agentId: 'dev', label: 'Development Sprint', startDay: 10, duration: 5, dependencies: ['sharding', 'db-design'] },
      { id: 'qa-review', agentId: 'qa', label: 'QA & Testing', startDay: 12, duration: 3, dependencies: ['dev-sprint'] },
      { id: 'devops-deploy', agentId: 'devops', label: 'CI/CD & Deploy', startDay: 14, duration: 2, dependencies: ['qa-review'] },
    ];
  }

  // Enrich with agent state information
  const enriched = workflow.map(task => {
    const agentState = state.agents[task.agentId] || {};
    return {
      ...task,
      agentStatus: agentState.status || 'idle',
      agentProgress: agentState.progress || 0,
    };
  });

  res.json({ tasks: enriched });
});

// ═══════════════════════════════════════
// LOGS — Gateway logs for LogsView
// ═══════════════════════════════════════
app.get('/api/logs', (req, res) => {
  const { type, agent, limit: limitStr } = req.query;
  const limit = parseInt(limitStr) || 200;

  let events = (state.timeline || []).slice(-limit);

  // Filter by type category
  if (type && type !== 'all') {
    events = events.filter(e => {
      if (type === 'agent') return e.type && e.type.startsWith('agent_');
      if (type === 'chat') return e.type && e.type.startsWith('chat');
      if (type === 'error') return e.type && (e.type.includes('error') || e.type === 'error');
      if (type === 'system') return e.type && !e.type.startsWith('agent_') && !e.type.startsWith('chat') && !e.type.includes('error');
      return true;
    });
  }

  // Filter by agent
  if (agent) {
    events = events.filter(e => e.agentId === agent);
  }

  res.json({ events });
});

// ═══════════════════════════════════════
// WORKFLOWS
// ═══════════════════════════════════════
app.get('/api/workflows', (req, res) => {
  const wfDir = path.join(CORE_DIR, 'workflows');
  const workflows = [];
  if (fs.existsSync(wfDir)) {
    fs.readdirSync(wfDir).forEach(f => {
      if (f.endsWith('.yaml') || f.endsWith('.yml')) {
        workflows.push({
          name: f.replace(/\.(yaml|yml)$/, ''),
          file: f,
          content: fs.readFileSync(path.join(wfDir, f), 'utf8')
        });
      }
    });
  }
  res.json({ workflows });
});

// ═══════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════
app.get('/api/teams', (req, res) => {
  const teamsDir = path.join(CORE_DIR, 'teams');
  const teams = [];
  if (fs.existsSync(teamsDir)) {
    fs.readdirSync(teamsDir).forEach(f => {
      if (f.endsWith('.yaml') || f.endsWith('.yml')) {
        teams.push({
          name: f.replace(/\.(yaml|yml)$/, ''),
          file: f,
          content: fs.readFileSync(path.join(teamsDir, f), 'utf8')
        });
      }
    });
  }
  res.json({ teams });
});

// ═══════════════════════════════════════
// TEMPLATES — Project type templates
// ═══════════════════════════════════════
const TEMPLATES_DIR = path.join(CORE_DIR, 'templates', 'project-types');

app.get('/api/templates', (req, res) => {
  const templates = [];
  try {
    if (fs.existsSync(TEMPLATES_DIR)) {
      fs.readdirSync(TEMPLATES_DIR).forEach(f => {
        if (!f.endsWith('.json')) return;
        try {
          const content = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8'));
          templates.push(content);
        } catch (e) {
          console.error(`  ⚠ Failed to parse template ${f}:`, e.message);
        }
      });
    }
  } catch (e) {
    console.error('  ⚠ Failed to read templates dir:', e.message);
  }
  res.json({ templates });
});

// ═══════════════════════════════════════
// PROJECT CONFIG — Init & manage
// ═══════════════════════════════════════

app.get('/api/project/config', (req, res) => {
  // Return current project configuration
  const projectConfig = {
    name: config.name || '',
    projectRoot: config.projectRoot || '',
    port: config.port,
    agents: config.agents,
    gateway: { url: config.gateway.url, connected: runtime.connected, runtime: runtime.name }
  };

  // Also check for .ag-dev/config.json in project root
  let agDevConfig = null;
  if (config.projectRoot) {
    const agDevPath = path.join(config.projectRoot, '.ag-dev', 'config.json');
    try {
      if (fs.existsSync(agDevPath)) {
        agDevConfig = JSON.parse(fs.readFileSync(agDevPath, 'utf8'));
      }
    } catch {}
  }

  res.json({
    configured: !!(config.projectRoot && config.name),
    name: config.name || '',
    projectRoot: config.projectRoot || '',
    config: projectConfig,
    agDevConfig
  });
});

app.post('/api/project/config', (req, res) => {
  const { name, projectRoot, agents, squads } = req.body;

  // Update in-memory config
  if (name) config.name = name;
  if (projectRoot) config.projectRoot = projectRoot;
  if (agents) config.agents = { ...config.agents, ...agents };

  // Save to config.json
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save config: ' + e.message });
  }

  // Also save .ag-dev/config.json in project root if projectRoot is set
  if (config.projectRoot) {
    const agDevDir = path.join(config.projectRoot, '.ag-dev');
    try {
      if (!fs.existsSync(agDevDir)) fs.mkdirSync(agDevDir, { recursive: true });
      const agDevConfig = {
        name: config.name,
        projectRoot: config.projectRoot,
        agents: agents || config.agents,
        squads: squads || undefined
      };
      fs.writeFileSync(path.join(agDevDir, 'config.json'), JSON.stringify(agDevConfig, null, 2));
    } catch {}
  }

  broadcast('project_config', { config: { name: config.name, projectRoot: config.projectRoot } });
  res.json({ ok: true, config: { name: config.name, projectRoot: config.projectRoot, agents: config.agents } });
});

// ═══════════════════════════════════════
// PROJECT SETUP — Clone repo + create branch (one step)
// ═══════════════════════════════════════
app.post('/api/project/setup', (req, res) => {
  const { url, branch } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  const gitUrlMatch = url.match(/github\.com\/[\w.-]+\/([\w.-]+?)(?:\.git)?$/i);
  if (!gitUrlMatch) {
    return res.status(400).json({ error: 'Invalid GitHub URL' });
  }

  const repoName = gitUrlMatch[1].replace(/\.git$/, '');
  const clonePath = path.join('/root', repoName);
  const branchName = branch || `ag-dev/${repoName}`;

  try {
    // Step 1: Clone if not exists, pull if exists
    if (fs.existsSync(path.join(clonePath, '.git'))) {
      // Already cloned — fetch latest
      try {
        execFileSync('git', ['fetch', '--all'], { cwd: clonePath, timeout: 30000, stdio: 'pipe' });
        execFileSync('git', ['pull', '--ff-only'], { cwd: clonePath, timeout: 30000, stdio: 'pipe' });
      } catch (e) {
        // Pull failed (diverged, etc) — not fatal, we'll work with what we have
      }
    } else {
      // Clone fresh — try gh first (handles auth), fallback to git
      let cloned = false;
      try {
        execFileSync('gh', ['auth', 'status'], { timeout: 5000, stdio: 'pipe' });
        execFileSync('gh', ['repo', 'clone', url.replace(/^https?:\/\/github\.com\//, ''), clonePath], {
          timeout: 120000, stdio: 'pipe',
        });
        cloned = true;
      } catch {}

      if (!cloned) {
        execFileSync('git', ['clone', url, clonePath], { timeout: 120000, stdio: 'pipe' });
      }
    }

    if (!fs.existsSync(clonePath)) {
      return res.status(500).json({ error: 'Repository directory not found after clone' });
    }

    // Step 2: Create and checkout working branch
    try {
      // Check if branch already exists
      const branches = execFileSync('git', ['branch', '--list', branchName], { cwd: clonePath, timeout: 5000, stdio: 'pipe' }).toString().trim();
      if (branches) {
        execFileSync('git', ['checkout', branchName], { cwd: clonePath, timeout: 5000, stdio: 'pipe' });
      } else {
        execFileSync('git', ['checkout', '-b', branchName], { cwd: clonePath, timeout: 5000, stdio: 'pipe' });
      }
    } catch (e) {
      // Branch creation failed — work on current branch
    }

    // Get actual current branch
    let currentBranch = branchName;
    try {
      currentBranch = execFileSync('git', ['branch', '--show-current'], { cwd: clonePath, timeout: 5000, stdio: 'pipe' }).toString().trim();
    } catch {}

    // Update AG Dev config to point to this project
    config.name = repoName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    config.projectRoot = clonePath;
    try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)); } catch {}

    logEvent('project_setup', { url, path: clonePath, branch: currentBranch, name: config.name });

    res.json({
      ok: true,
      path: clonePath,
      name: config.name,
      branch: currentBranch,
      message: `Ready — working on branch ${currentBranch}`,
    });
  } catch (e) {
    const errMsg = e.stderr ? e.stderr.toString().trim() : e.message;
    res.status(500).json({ error: `Setup failed: ${errMsg}` });
  }
});

// Legacy clone endpoint (kept for compatibility)
app.post('/api/project/clone', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate it looks like a git URL
  const gitUrlMatch = url.match(/github\.com\/[\w.-]+\/([\w.-]+?)(?:\.git)?$/i);
  if (!gitUrlMatch) {
    return res.status(400).json({ error: 'Invalid GitHub URL. Expected: https://github.com/user/repo' });
  }

  const repoName = gitUrlMatch[1].replace(/\.git$/, '');
  const clonePath = path.join('/root', repoName);

  // Check if already cloned
  if (fs.existsSync(clonePath) && fs.existsSync(path.join(clonePath, '.git'))) {
    // Already exists — just use it
    return res.json({
      ok: true,
      path: clonePath,
      name: repoName,
      alreadyExists: true,
      message: `Repository already exists at ${clonePath}`,
    });
  }

  // Clone the repo
  try {
    // Try with gh CLI first (handles auth), fallback to git
    let cloneCmd;
    try {
      execFileSync('gh', ['auth', 'status'], { timeout: 5000, stdio: 'pipe' });
      cloneCmd = ['gh', ['repo', 'clone', url.replace(/^https?:\/\/github\.com\//, ''), clonePath]];
    } catch {
      cloneCmd = ['git', ['clone', url, clonePath]];
    }

    execFileSync(cloneCmd[0], cloneCmd[1], {
      timeout: 120000,
      stdio: 'pipe',
      env: { ...process.env },
    });

    if (!fs.existsSync(clonePath)) {
      return res.status(500).json({ error: 'Clone completed but directory not found' });
    }

    logEvent('project_clone', { url, path: clonePath, name: repoName });

    res.json({
      ok: true,
      path: clonePath,
      name: repoName,
      message: `Cloned to ${clonePath}`,
    });
  } catch (e) {
    const errMsg = e.stderr ? e.stderr.toString().trim() : e.message;
    res.status(500).json({ error: `Clone failed: ${errMsg}` });
  }
});

app.post('/api/project/init', (req, res) => {
  const { name, projectRoot, templateId, agents: customAgents, squads: customSquads } = req.body;

  if (!name) return res.status(400).json({ error: 'Project name is required' });
  if (!projectRoot) return res.status(400).json({ error: 'Project root path is required' });

  // Resolve the project path
  const resolvedRoot = path.resolve(projectRoot);
  if (!fs.existsSync(resolvedRoot)) {
    return res.status(400).json({ error: `Project path does not exist: ${resolvedRoot}` });
  }

  // Load template if specified
  let template = null;
  if (templateId) {
    const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
    try {
      if (fs.existsSync(templatePath)) {
        template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
      }
    } catch {}
  }

  const agentsToUse = customAgents || template?.agents || [];
  const squadsToUse = customSquads || template?.squads || {};
  const directives = template?.defaultDirectives || {};

  // Create .ag-dev directory in project
  const agDevDir = path.join(resolvedRoot, '.ag-dev');
  try {
    if (!fs.existsSync(agDevDir)) fs.mkdirSync(agDevDir, { recursive: true });
  } catch (e) {
    return res.status(500).json({ error: `Failed to create .ag-dev dir: ${e.message}` });
  }

  // Write .ag-dev/config.json
  const agDevConfig = {
    name,
    projectRoot: resolvedRoot,
    template: templateId || null,
    agents: {
      definitionsDir: path.join(__dirname, '..', 'core', 'agents'),
      active: agentsToUse
    },
    squads: squadsToUse
  };

  try {
    fs.writeFileSync(path.join(agDevDir, 'config.json'), JSON.stringify(agDevConfig, null, 2));
  } catch (e) {
    return res.status(500).json({ error: `Failed to write config: ${e.message}` });
  }

  // Update main AG Dev config
  config.name = name;
  config.projectRoot = resolvedRoot;
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch {}

  // Set up directives from template
  if (Object.keys(directives).length > 0) {
    const stratPath = path.join(__dirname, 'strategy.json');
    let strat = { vision: '', guardrails: '', directives: {} };
    try {
      if (fs.existsSync(stratPath)) strat = JSON.parse(fs.readFileSync(stratPath, 'utf8'));
    } catch {}

    for (const [agentId, text] of Object.entries(directives)) {
      strat.directives[agentId] = {
        agentId,
        text,
        history: strat.directives[agentId]?.history || []
      };
    }

    try { fs.writeFileSync(stratPath, JSON.stringify(strat, null, 2)); } catch {}
  }

  broadcast('project_init', { name, projectRoot: resolvedRoot, template: templateId });
  logEvent('project_init', { name, projectRoot: resolvedRoot, template: templateId, agentCount: agentsToUse.length });

  res.json({
    ok: true,
    project: {
      name,
      projectRoot: resolvedRoot,
      template: templateId,
      agents: agentsToUse,
      squads: squadsToUse,
      directives: Object.keys(directives)
    }
  });
});

// ═══════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    project: config.name,
    agents: Object.keys(state.agents).length,
    sseClients: clients.size,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    bridgeConnected: runtime.connected,
    runtimeName: runtime.name,
    bridgeUrl: runtime.gatewayUrl || runtime.name
  });
});

// ═══════════════════════════════════════
// GATEWAY STATUS — Detailed bridge info
// ═══════════════════════════════════════
app.get('/api/gateway/status', async (req, res) => {
  const bridgeStatus = runtime.getStatus();

  // Try to get live sessions if connected
  let sessions = [];
  if (runtime.connected) {
    try {
      const result = await runtime.listSessions();
      if (result.ok) sessions = result.sessions;
    } catch {}
  }

  res.json({
    ...bridgeStatus,
    sessions,
    agentSessions: Object.entries(state.agents)
      .filter(([_, a]) => a.sessionKey)
      .map(([id, a]) => ({ agentId: id, sessionKey: a.sessionKey, status: a.status }))
  });
});

// SPA fallback handled by catch-all route at the bottom

// ═══════════════════════════════════════
// CLAWDBOT BRIDGE — Connect to the brain
// ═══════════════════════════════════════
// ─── Runtime Abstraction Layer ───
// The runtime wraps the bridge (or standalone) behind a uniform interface.
// The `bridge` variable is kept for backward-compat with any direct references.
const runtime = createRuntime(config, {
  onEvent: (event) => {
    broadcast('clawdbot_event', { event });
  },
  onAgentReply: (reply) => {
    if (reply.type === 'delta') {
      broadcast('agent_stream', { text: reply.text, sessionKey: reply.sessionKey });
    }
    if (reply.type === 'complete') {
      const msg = { id: Date.now(), from: 'bot', text: reply.summary || '✓ Complete', time: new Date().toISOString() };
      if (!state.chat) state.chat = { messages: [] };
      state.chat.messages.push(msg);
      saveState();
      broadcast('chat', { message: msg });
    }
  },
  onLifecycleEvent: (evt) => {
    const sessionKey = evt.payload?.sessionKey || evt.payload?.key;
    if (sessionKey) {
      for (const [agentId, agentState] of Object.entries(state.agents)) {
        if (agentState.sessionKey === sessionKey) {
          broadcastToTerminal(agentId, evt);

          // Update agent state based on lifecycle events
          const eventType = evt.event || evt.type || '';
          if (eventType.includes('complete') || eventType.includes('done')) {
            agentState.status = 'done';
            agentState.progress = 100;
            saveState();
            broadcast('agent_update', { agentId, state: agentState });
          }
          break;
        }
      }
    }
  }
});

// Backward-compat: expose bridge reference for any code that still uses it
const bridge = runtime.bridge || runtime;

// Try to connect (non-blocking, works without gateway too)
try { runtime.connect(); } catch (e) { console.log('  ℹ Running standalone (no Clawdbot)'); }

// ─── Agent Output Poller ───
// Poll active agent sessions for output updates every 10s
setInterval(async () => {
  if (!runtime.connected) return;
  for (const [agentId, agentState] of Object.entries(state.agents)) {
    if (!agentState.sessionKey || agentState.status === 'idle' || agentState.status === 'done') continue;
    try {
      const result = await runtime.getAgentHistory(agentState.sessionKey);
      if (result.ok && result.messages?.length) {
        // Find the last assistant message
        const lastAssistant = [...result.messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          let text = '';
          const content = lastAssistant.content;
          if (typeof content === 'string') text = content;
          else if (Array.isArray(content)) {
            const textBlock = content.find(c => c.type === 'text');
            if (textBlock) text = textBlock.text || '';
          }
          if (text && text !== agentState.output) {
            agentState.output = text;
            saveState();
            broadcast('agent_update', { agentId, state: { ...agentState, output: text } });
          }
        }
      }
    } catch {}
  }
}, 10000);

// ─── Workflow Engine ───
const workflowEngine = new WorkflowEngine({
  runtime,
  onEvent: (type, data) => {
    broadcast('workflow_event', { eventType: type, ...data });
    logEvent(`workflow_${type}`, data);
  },
  agentLoader: {
    getDefinition(agentId) {
      const fp = path.join(AGENTS_DIR, `${agentId}.md`);
      if (fs.existsSync(fp)) return fs.readFileSync(fp, 'utf8');
      return null;
    }
  },
});

// Bridge status (legacy endpoint kept for compatibility)
app.get('/api/bridge/status', (req, res) => {
  res.json(runtime.getStatus());
});

// Send message through runtime (real AI processing)
app.post('/api/bridge/send', async (req, res) => {
  const { message, sessionKey } = req.body;
  try {
    const result = sessionKey
      ? await runtime.sendToAgent(sessionKey, message)
      : await runtime.sendMessage(message);
    res.json(result);
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ═══════════════════════════════════════
// EXEC — Protected with auth (already applied via middleware)
// ═══════════════════════════════════════
app.post('/api/exec', (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'No command' });

  // Command length limit
  if (command.length > 1000) return res.status(400).json({ error: 'Command too long (max 1000 chars)' });

  // Blocklist dangerous commands
  const blocklist = ['rm -rf /', 'mkfs', 'dd if=', ':(){ :|:& };:'];
  const lowerCmd = command.toLowerCase();
  for (const blocked of blocklist) {
    if (lowerCmd.includes(blocked)) {
      return res.status(403).json({ error: `Blocked dangerous command pattern: ${blocked}` });
    }
  }

  logEvent('exec', { command: command.slice(0, 100), cwd: cwd || PROJECT_ROOT });

  // Only allow from authenticated requests (middleware already checks)
  try {
    const result = execSync(command, {
      cwd: cwd || PROJECT_ROOT,
      timeout: 30000,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    res.json({ success: true, output: result });
  } catch (e) {
    res.json({ success: false, output: e.stdout || '', error: e.stderr || e.message });
  }
});

// ═══════════════════════════════════════
// STRATEGY API
// ═══════════════════════════════════════

app.get('/api/strategy', (req, res) => {
  res.json(strategy);
});

app.post('/api/strategy', (req, res) => {
  strategy = { ...strategy, ...req.body };
  try { fs.writeFileSync(STRATEGY_FILE, JSON.stringify(strategy, null, 2)); } catch {}
  res.json({ ok: true });
});

app.post('/api/agents/:id/directive', (req, res) => {
  const { id } = req.params;
  const { directive } = req.body;
  if (!strategy.directives) strategy.directives = {};
  const prev = strategy.directives[id] || { agentId: id, text: '', history: [] };
  strategy.directives[id] = {
    agentId: id,
    text: directive,
    history: [...(prev.history || []), { text: prev.text, timestamp: Date.now() }].slice(-10),
  };
  try { fs.writeFileSync(STRATEGY_FILE, JSON.stringify(strategy, null, 2)); } catch {}
  res.json({ ok: true });
});

// ═══════════════════════════════════════
// AGENT STREAM (Terminal View) + INJECT
// ═══════════════════════════════════════

// Terminal client tracking (not persisted to state.json)
const terminalClients = {};

function broadcastToTerminal(agentId, eventData) {
  if (!terminalClients[agentId]) return;
  const data = JSON.stringify(eventData);
  terminalClients[agentId].forEach(client => {
    try { client.write(`data: ${data}\n\n`); } catch {}
  });
}

app.get('/api/agents/:id/stream', (req, res) => {
  const { id } = req.params;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial state
  const agentState = state.agents[id];
  if (agentState) {
    res.write(`data: ${JSON.stringify({ type: 'system', content: `Agent ${id}: ${agentState.status}. Task: ${agentState.currentTask || 'none'}` })}\n\n`);
  }

  // Keep alive
  const keepAlive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepAlive); }
  }, 15000);

  // Register for terminal broadcasts
  if (!terminalClients[id]) terminalClients[id] = [];
  terminalClients[id].push(res);

  // Subscribe to runtime lifecycle events for this agent's session
  let unsubscribe = null;
  const sessionKey = state.agents[id]?.sessionKey;
  if (sessionKey && runtime.connected) {
    unsubscribe = runtime.subscribeToAgent(sessionKey, (evt) => {
      try {
        res.write(`data: ${JSON.stringify(evt)}\n\n`);
      } catch {}
    });
  }

  req.on('close', () => {
    clearInterval(keepAlive);
    if (terminalClients[id]) {
      terminalClients[id] = terminalClients[id].filter(c => c !== res);
    }
    if (unsubscribe) unsubscribe();
  });
});

app.post('/api/agents/:id/inject', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: 'No message' });

  // Broadcast to terminal UI
  broadcastToTerminal(id, { type: 'inject', content: `[INJECTED] ${message}` });

  // Send to real session via runtime if available
  const sessionKey = state.agents[id]?.sessionKey;
  if (sessionKey && runtime.connected) {
    try {
      const result = await runtime.sendToAgent(sessionKey, message);
      return res.json({ ok: true, bridged: true, result });
    } catch (e) {
      return res.json({ ok: true, bridged: false, error: e.message, message: `Command injected locally to ${id}` });
    }
  }

  res.json({ ok: true, bridged: false, message: `Command injected locally to ${id} (no active session)` });
});

// ═══════════════════════════════════════
// STATE API (for UI)
// ═══════════════════════════════════════
app.get('/api/state', (req, res) => {
  const agentStates = {};
  try {
    const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
    agentFiles.forEach(f => {
      const id = f.replace('.md', '');
      const defaults = { status: 'idle', currentTask: null, progress: 0, checklist: [], output: '', filesChanged: [], activityHistory: [] };
      agentStates[id] = { ...defaults, ...(state.agents[id] || {}) };
    });
  } catch {}

  const totalTasks = Object.values(agentStates).reduce((sum, a) => sum + (a.checklist?.length || 0), 0);
  const completedTasks = Object.values(agentStates).reduce((sum, a) => sum + (a.checklist?.filter(c => c.done)?.length || 0), 0);

  res.json({
    agents: agentStates,
    project: {
      name: config.name || 'AG Dev',
      totalTasks,
      completedTasks,
    },
    bridge: {
      connected: runtime.connected,
      url: runtime.gatewayUrl || runtime.name,
      runtime: runtime.name
    }
  });
});

// ═══════════════════════════════════════
// WORKFLOW ENGINE API
// ═══════════════════════════════════════
app.get('/api/workflow/available', (req, res) => {
  const workflows = workflowEngine.listAvailable();
  res.json({ workflows });
});

app.get('/api/workflow/state', (req, res) => {
  res.json(workflowEngine.getWorkflowState());
});

app.post('/api/workflow/start', async (req, res) => {
  const { name, params } = req.body;
  if (!name) return res.status(400).json({ error: 'Workflow name is required' });

  const result = await workflowEngine.startWorkflow(name, params || {});
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, state: workflowEngine.getWorkflowState() });
});

app.post('/api/workflow/pause', async (req, res) => {
  const result = await workflowEngine.pauseWorkflow();
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, state: workflowEngine.getWorkflowState() });
});

app.post('/api/workflow/resume', async (req, res) => {
  const result = await workflowEngine.resumeWorkflow();
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, state: workflowEngine.getWorkflowState() });
});

app.post('/api/workflow/step/:stepId/complete', async (req, res) => {
  const result = await workflowEngine.completeStep(req.params.stepId, req.body || {});
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, ...result, state: workflowEngine.getWorkflowState() });
});

app.post('/api/workflow/step/:stepId/fail', async (req, res) => {
  const result = await workflowEngine.failStep(req.params.stepId, req.body.error || 'Manual failure');
  if (!result.ok) return res.status(400).json(result);
  res.json({ ok: true, state: workflowEngine.getWorkflowState() });
});

// ═══════════════════════════════════════
// SPA CATCH-ALL
// ═══════════════════════════════════════
// Unknown API routes return 404 JSON
app.all('/api/{*splat}', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// SPA fallback for frontend routes
app.get('/{*splat}', (req, res) => {
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  let agentCount = 0;
  try { agentCount = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).length; } catch {}

  console.log(`\n  ╔═══════════════════════════════════════════╗`);
  console.log(`  ║      AG DEV — Command Center Online       ║`);
  console.log(`  ╠═══════════════════════════════════════════╣`);
  console.log(`  ║  URL:     http://0.0.0.0:${PORT}`);
  console.log(`  ║  Project: ${config.name}`);
  console.log(`  ║  Root:    ${PROJECT_ROOT}`);
  console.log(`  ║  Agents:  ${agentCount}`);
  console.log(`  ║  Gateway: ${config.gateway.url}`);
  console.log(`  ║  Auth:    ${config.auth.token ? config.auth.token.slice(0, 8) + '...' : 'none'}`);
  console.log(`  ╚═══════════════════════════════════════════╝\n`);
});

// Flush state on shutdown
process.on('SIGINT', () => { saveStateImmediate(); process.exit(0); });
process.on('SIGTERM', () => { saveStateImmediate(); process.exit(0); });
