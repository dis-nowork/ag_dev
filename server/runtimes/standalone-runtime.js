/**
 * StandaloneRuntime — In-memory runtime for demo/testing
 * 
 * No real AI. Tracks agents in local state.
 * Always connected. Good for UI development and testing
 * when no Clawdbot Gateway is available.
 */

const { AgentRuntime } = require('./index');

class StandaloneRuntime extends AgentRuntime {
  constructor(options = {}) {
    super();
    this.name = 'standalone';
    this.capabilities = ['spawn', 'pause'];
    this.connected = true;

    this._sessions = new Map();   // sessionKey -> { agentId, status, messages[], task }
    this._subscriptions = new Map(); // sessionKey -> Set<callback>
    this._sessionCounter = 0;
  }

  async connect() {
    this.connected = true;
    return true;
  }

  disconnect() {
    this.connected = false;
    this._sessions.clear();
    this._subscriptions.clear();
  }

  async spawnAgent(agentId, config = {}) {
    const sessionKey = `standalone-${agentId}-${++this._sessionCounter}`;
    const session = {
      key: sessionKey,
      agentId,
      status: 'working',
      task: config.task || 'Awaiting instructions.',
      label: config.label || `ag-dev:${agentId}`,
      model: config.model || 'standalone',
      messages: [],
      createdAt: new Date().toISOString(),
    };

    this._sessions.set(sessionKey, session);

    // Emit a fake lifecycle event
    this._emit(sessionKey, {
      event: 'session.spawned',
      payload: { sessionKey, agentId, status: 'working' },
    });

    return { ok: true, sessionKey, session };
  }

  async sendToAgent(sessionKey, message) {
    const session = this._sessions.get(sessionKey);
    if (!session) {
      return { ok: false, error: `Session not found: ${sessionKey}` };
    }

    session.messages.push({
      role: 'human',
      text: message,
      time: new Date().toISOString(),
    });

    // Emit event
    this._emit(sessionKey, {
      event: 'session.message',
      payload: { sessionKey, role: 'human', text: message },
    });

    // Simulate a bot response after a short delay
    const response = `[standalone] Received: "${message.slice(0, 100)}"`;
    session.messages.push({
      role: 'assistant',
      text: response,
      time: new Date().toISOString(),
    });

    this._emit(sessionKey, {
      event: 'session.message',
      payload: { sessionKey, role: 'assistant', text: response },
    });

    return { ok: true, result: { text: response } };
  }

  async pauseAgent(sessionKey) {
    const session = this._sessions.get(sessionKey);
    if (session) {
      session.status = 'paused';
      this._emit(sessionKey, {
        event: 'session.paused',
        payload: { sessionKey },
      });
    }
    return { ok: true };
  }

  async resumeAgent(sessionKey) {
    const session = this._sessions.get(sessionKey);
    if (session) {
      session.status = 'working';
      this._emit(sessionKey, {
        event: 'session.resumed',
        payload: { sessionKey },
      });
    }
    return { ok: true };
  }

  async getAgentHistory(sessionKey) {
    const session = this._sessions.get(sessionKey);
    if (!session) {
      return { ok: false, messages: [], error: 'Session not found' };
    }
    return { ok: true, messages: session.messages };
  }

  async listSessions() {
    const sessions = [];
    for (const [key, session] of this._sessions) {
      sessions.push({
        key,
        agentId: session.agentId,
        status: session.status,
        label: session.label,
        model: session.model,
        messageCount: session.messages.length,
        createdAt: session.createdAt,
      });
    }
    return { ok: true, sessions };
  }

  subscribeToAgent(sessionKey, callback) {
    if (!this._subscriptions.has(sessionKey)) {
      this._subscriptions.set(sessionKey, new Set());
    }
    this._subscriptions.get(sessionKey).add(callback);

    return () => {
      const subs = this._subscriptions.get(sessionKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this._subscriptions.delete(sessionKey);
      }
    };
  }

  getStatus() {
    return {
      connected: this.connected,
      name: this.name,
      capabilities: this.capabilities,
      sessionCount: this._sessions.size,
      info: { mode: 'standalone', note: 'No real AI — local state only' },
    };
  }

  // Internal: emit event to subscribers
  _emit(sessionKey, eventData) {
    const subs = this._subscriptions.get(sessionKey);
    if (subs) {
      subs.forEach(cb => {
        try { cb(eventData); } catch {}
      });
    }
  }
}

module.exports = { StandaloneRuntime };
