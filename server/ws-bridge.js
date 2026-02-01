/**
 * WebSocket Bridge — Connects AG Dev to Clawdbot Gateway
 * 
 * This is the nervous system. It bridges:
 * - AG Dev UI (HTTP + SSE) ←→ Clawdbot Gateway (WebSocket)
 * 
 * When a user sends a chat message or agent command through the UI,
 * this bridge forwards it to Clawdbot which actually executes it.
 * 
 * When Clawdbot produces output (agent replies, tool results),
 * this bridge pushes it back to the UI via SSE.
 */

const WebSocket = require('ws');
const { execSync } = require('child_process');

class ClawdbotBridge {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || 'ws://127.0.0.1:18789';
    this.token = options.token || this._detectToken();
    this.ws = null;
    this.connected = false;
    this.onEvent = options.onEvent || (() => {});
    this.onAgentReply = options.onAgentReply || (() => {});
    this.reconnectTimer = null;
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  _detectToken() {
    try {
      const config = JSON.parse(execSync('cat ~/.clawdbot/clawdbot.json 2>/dev/null || echo "{}"').toString());
      return config.gateway?.auth?.token || process.env.CLAWDBOT_GATEWAY_TOKEN || null;
    } catch { return null; }
  }

  connect() {
    if (this.ws) this.ws.close();
    
    try {
      this.ws = new WebSocket(this.gatewayUrl);
    } catch(e) {
      console.log('  ⚠ Clawdbot Gateway not available (standalone mode)');
      return;
    }

    this.ws.on('open', () => {
      // Send connect frame
      const connectFrame = {
        type: 'req',
        id: this._nextId(),
        method: 'connect',
        params: {
          role: 'client',
          clientType: 'ag-dev',
          clientVersion: '1.0.0',
          ...(this.token ? { auth: { token: this.token } } : {})
        }
      };
      this.ws.send(JSON.stringify(connectFrame));
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this._handleMessage(msg);
      } catch {}
    });

    this.ws.on('close', () => {
      this.connected = false;
      this.onEvent({ type: 'bridge_disconnected' });
      // Reconnect after 5s
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', () => {
      // Silent - will reconnect
    });
  }

  _nextId() {
    return `agdev-${++this.requestId}`;
  }

  _handleMessage(msg) {
    if (msg.type === 'res') {
      // Response to our request
      if (msg.id && msg.id.startsWith('agdev-connect')) {
        this.connected = true;
        this.onEvent({ type: 'bridge_connected' });
        console.log('  ✓ Connected to Clawdbot Gateway');
      }
      
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        pending.resolve(msg);
        this.pendingRequests.delete(msg.id);
      }
    }

    if (msg.type === 'event') {
      this.onEvent(msg);
      
      // Agent streaming events
      if (msg.event === 'agent') {
        const payload = msg.payload || {};
        if (payload.stream === 'assistant' && payload.delta) {
          this.onAgentReply({ type: 'delta', text: payload.delta, sessionKey: payload.sessionKey });
        }
        if (payload.stream === 'lifecycle' && payload.phase === 'end') {
          this.onAgentReply({ type: 'complete', sessionKey: payload.sessionKey, summary: payload.summary });
        }
      }
    }
  }

  // Send a message to Clawdbot agent (main session)
  async sendMessage(message) {
    if (!this.connected || !this.ws) return { error: 'Not connected to Clawdbot' };
    
    const id = this._nextId();
    const frame = {
      type: 'req',
      id,
      method: 'agent',
      params: { message, sessionKey: 'main' }
    };

    return new Promise((resolve) => {
      this.pendingRequests.set(id, { resolve, time: Date.now() });
      this.ws.send(JSON.stringify(frame));
      // Timeout after 120s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({ error: 'Timeout' });
        }
      }, 120000);
    });
  }

  // Send to a specific session (e.g., sub-agent)
  async sendToSession(sessionKey, message) {
    if (!this.connected || !this.ws) return { error: 'Not connected' };
    
    const id = this._nextId();
    const frame = {
      type: 'req', id,
      method: 'agent',
      params: { message, sessionKey }
    };
    
    return new Promise((resolve) => {
      this.pendingRequests.set(id, { resolve, time: Date.now() });
      this.ws.send(JSON.stringify(frame));
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({ error: 'Timeout' });
        }
      }, 120000);
    });
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}

module.exports = { ClawdbotBridge };
