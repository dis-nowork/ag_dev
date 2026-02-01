/**
 * AG Dev Server — The Armor Engine
 * 
 * This isn't just an API server. It's the bridge between:
 * - The Command Center UI (what the human sees)
 * - AIOS agents (the specialized workers)
 * - Clawdbot/AI engine (the brain that operates them)
 * 
 * The server manages:
 * 1. Agent state (status, checklist, progress, output)
 * 2. Real-time updates via SSE
 * 3. Chat routing (main + per-agent)
 * 4. File/document operations
 * 5. Git operations
 * 6. Workflow orchestration state
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const app = express();

// ─── Config ───
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
let config = { port: 80, projectRoot: path.join(__dirname, '..', '..'), name: 'AG Dev' };
try { if (fs.existsSync(CONFIG_PATH)) config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; } catch(e) {}

const PORT = process.env.PORT || config.port;
const PROJECT_ROOT = config.projectRoot;
const CORE_DIR = path.join(__dirname, '..', 'core');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve React build
const uiDist = path.join(__dirname, '..', 'ui-dist');
const uiPublic = path.join(__dirname, 'public');
const staticDir = fs.existsSync(uiDist) ? uiDist : uiPublic;
app.use(express.static(staticDir));

// ═══════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════
const STATE_FILE = path.join(__dirname, 'state.json');
let state = {
  agents: {},
  chat: { messages: [] },
  agentChats: {},
  workflow: { currentPhase: 0, started: null },
  timeline: [] // Event log
};

function loadState() {
  try { if (fs.existsSync(STATE_FILE)) state = { ...state, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) }; } catch(e) {}
}
function saveState() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); } catch(e) {}
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
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function broadcast(type, data) {
  const msg = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  clients.forEach(c => { try { c.write(msg); } catch(e) {} });
}

// ═══════════════════════════════════════
// PROJECT INFO
// ═══════════════════════════════════════
app.get('/api/project', (req, res) => {
  try {
    const gitLog = execSync('git log --oneline -30', { cwd: PROJECT_ROOT, timeout: 5000 }).toString().trim().split('\n');
    const branch = execSync('git branch --show-current', { cwd: PROJECT_ROOT, timeout: 5000 }).toString().trim();
    const status = execSync('git status --porcelain', { cwd: PROJECT_ROOT, timeout: 5000 }).toString().trim();
    const changedFiles = status ? status.split('\n').length : 0;
    res.json({ name: config.name, branch, commits: gitLog, changedFiles, projectRoot: PROJECT_ROOT });
  } catch (e) {
    res.json({ name: config.name, branch: 'unknown', commits: [], changedFiles: 0, projectRoot: PROJECT_ROOT });
  }
});

// ═══════════════════════════════════════
// AGENTS — List, state, control
// ═══════════════════════════════════════
app.get('/api/agents', (req, res) => {
  const agentsDir = path.join(CORE_DIR, 'agents');
  const agents = [];
  if (fs.existsSync(agentsDir)) {
    fs.readdirSync(agentsDir).forEach(f => {
      if (!f.endsWith('.md')) return;
      const content = fs.readFileSync(path.join(agentsDir, f), 'utf8');
      const id = f.replace('.md', '');
      const nm = content.match(/name:\s*(.+)/);
      const tt = content.match(/title:\s*(.+)/);
      const ic = content.match(/icon:\s*(.+)/);
      agents.push({
        id,
        name: nm ? nm[1].trim() : id,
        title: tt ? tt[1].trim() : '',
        icon: ic ? ic[1].trim() : '🤖',
        state: state.agents[id] || { status: 'idle', currentTask: null, checklist: [], progress: 0 }
      });
    });
  }
  res.json({ agents });
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
  const fp = path.join(CORE_DIR, 'agents', `${req.params.id}.md`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.json({ content: fs.readFileSync(fp, 'utf8') });
});

// ═══════════════════════════════════════
// CHAT — Main + per-agent
// ═══════════════════════════════════════
app.get('/api/chat', (req, res) => {
  res.json({ messages: (state.chat?.messages || []).slice(-200) });
});

app.post('/api/chat', (req, res) => {
  const msg = { id: Date.now(), from: 'human', text: req.body.message, time: new Date().toISOString() };
  if (!state.chat) state.chat = { messages: [] };
  state.chat.messages.push(msg);
  saveState();
  broadcast('chat', { message: msg });
  logEvent('chat_message', { from: 'human', preview: msg.text.slice(0, 50) });
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
      const stat = fs.statSync(path.join(dir, f));
      docs.push({
        name: f, category: cat,
        path: path.join(dir, f),
        relativePath: `${cat}/${f}`,
        size: stat.size, modified: stat.mtime
      });
    });
  };
  
  // Project docs
  scan(path.join(PROJECT_ROOT, 'docs'), 'docs');
  scan(path.join(PROJECT_ROOT, 'brainstorm'), 'brainstorm');
  ['stories', 'prd', 'architecture', 'guides'].forEach(s => 
    scan(path.join(PROJECT_ROOT, 'docs', s), `docs/${s}`)
  );
  
  // AIOS core docs
  scan(path.join(CORE_DIR, 'workflows'), 'workflows');
  
  res.json({ docs });
});

app.get('/api/docs/read', (req, res) => {
  const fp = req.query.path;
  if (!fp) return res.status(400).json({ error: 'No path' });
  try { res.json({ content: fs.readFileSync(fp, 'utf8'), path: fp }); }
  catch(e) { res.status(404).json({ error: 'Not found' }); }
});

app.post('/api/docs/save', (req, res) => {
  const { path: fp, content } = req.body;
  if (!fp) return res.status(400).json({ error: 'No path' });
  try {
    fs.writeFileSync(fp, content, 'utf8');
    logEvent('doc_saved', { path: fp });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════
// FILE TREE
// ═══════════════════════════════════════
app.get('/api/tree', (req, res) => {
  const getTree = (dir, depth = 0, maxDepth = 3) => {
    if (depth >= maxDepth || !fs.existsSync(dir)) return [];
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
        return { name: e.name, type: 'file', path: fp, size: fs.statSync(fp).size };
      });
  };
  res.json({ tree: getTree(PROJECT_ROOT) });
});

// ═══════════════════════════════════════
// GIT
// ═══════════════════════════════════════
app.post('/api/git/commit', (req, res) => {
  try {
    execSync('git add -A', { cwd: PROJECT_ROOT, timeout: 10000 });
    const r = execSync(`git commit -m "${req.body.message.replace(/"/g, '\\"')}"`, { cwd: PROJECT_ROOT, timeout: 10000 }).toString();
    logEvent('git_commit', { message: req.body.message });
    res.json({ success: true, result: r });
  } catch(e) { res.json({ success: false, error: e.message }); }
});

app.get('/api/git/status', (req, res) => {
  try {
    const status = execSync('git status --porcelain', { cwd: PROJECT_ROOT, timeout: 5000 }).toString();
    res.json({ files: status.trim().split('\n').filter(Boolean) });
  } catch(e) { res.json({ files: [] }); }
});

// ═══════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════
app.get('/api/timeline', (req, res) => {
  res.json({ events: (state.timeline || []).slice(-100) });
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
        workflows.push({ name: f.replace(/\.(yaml|yml)$/, ''), file: f,
          content: fs.readFileSync(path.join(wfDir, f), 'utf8') });
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
        teams.push({ name: f.replace(/\.(yaml|yml)$/, ''), file: f,
          content: fs.readFileSync(path.join(teamsDir, f), 'utf8') });
      }
    });
  }
  res.json({ teams });
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
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

// ═══════════════════════════════════════
// SPA FALLBACK
// ═══════════════════════════════════════
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  next();
});

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔═══════════════════════════════════════════╗`);
  console.log(`  ║      AG DEV — Command Center Online       ║`);
  console.log(`  ╠═══════════════════════════════════════════╣`);
  console.log(`  ║  URL:     http://0.0.0.0:${PORT}`);
  console.log(`  ║  Project: ${config.name}`);
  console.log(`  ║  Root:    ${PROJECT_ROOT}`);
  console.log(`  ║  Agents:  ${fs.readdirSync(path.join(CORE_DIR, 'agents')).filter(f => f.endsWith('.md')).length}`);
  console.log(`  ╚═══════════════════════════════════════════╝\n`);
});
