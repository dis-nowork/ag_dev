/**
 * WebSocket Bridge — Connects AG Dev to Clawdbot Gateway
 * 
 * Implements Gateway Protocol v3 handshake and provides methods for:
 * - Session management (list, spawn, send, history)
 * - Lifecycle event subscriptions
 * - Graceful standalone mode when gateway is unavailable
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ClawdbotBridge {
  constructor(options = {}) {
    this.gatewayUrl = options.gatewayUrl || 'ws://127.0.0.1:18789';
    this.token = options.token || this._detectToken();
    this.ws = null;
    this.connected = false;
    this.gatewayInfo = null; // protocol, policy from hello-ok
    this.onEvent = options.onEvent || (() => {});
    this.onAgentReply = options.onAgentReply || (() => {});
    this.onLifecycleEvent = options.onLifecycleEvent || (() => {});
    this.reconnectTimer = null;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this._sessionSubscriptions = new Map(); // sessionKey -> Set<callback>
    this._connectAttempts = 0;
    this._maxReconnectDelay = 30000;
  }

  _detectToken() {
    try {
      const configPath = path.join(process.env.HOME || '/root', '.clawdbot', 'clawdbot.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.gateway?.auth?.token || process.env.CLAWDBOT_GATEWAY_TOKEN || null;
      }
      return process.env.CLAWDBOT_GATEWAY_TOKEN || null;
    } catch {
      return process.env.CLAWDBOT_GATEWAY_TOKEN || null;
    }
  }

  connect() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }

    try {
      this.ws = new WebSocket(this.gatewayUrl);
    } catch (e) {
      console.log('  ⚠ Clawdbot Gateway not available (standalone mode)');
      this._scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      this._connectAttempts = 0;
      this._sendConnectFrame();
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this._handleMessage(msg);
      } catch (e) {
        console.error('  ⚠ Bridge: failed to parse message:', e.message);
      }
    });

    this.ws.on('close', () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.gatewayInfo = null;
      if (wasConnected) {
        this.onEvent({ type: 'bridge_status', status: 'disconnected' });
        console.log('  ⚠ Disconnected from Clawdbot Gateway');
      }
      this._scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      // Silent on ECONNREFUSED (gateway not running), log others
      if (err.code !== 'ECONNREFUSED') {
        console.error('  ⚠ Bridge WS error:', err.message);
      }
    });
  }

  _sendConnectFrame() {
    const connectFrame = {
      type: 'req',
      id: this._nextId(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          displayName: 'AG Dev',
          version: '1.0.0',
          platform: 'node',
          mode: 'backend'
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.admin'],
        caps: [],
        commands: [],
        permissions: {},
        auth: this.token ? { token: this.token } : {},
        userAgent: 'ag-dev/1.0.0'
      }
    };
    // Register as pending so _handleMessage processes the response
    const reqId = connectFrame.id;
    this.pendingRequests.set(reqId, {
      _isConnect: true,
      resolve: () => {},
    });
    this._send(connectFrame);
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this._connectAttempts++;
    // Exponential backoff: 5s, 10s, 20s, max 30s
    const delay = Math.min(5000 * Math.pow(2, this._connectAttempts - 1), this._maxReconnectDelay);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  _nextId() {
    return `agdev-${++this.requestId}`;
  }

  _send(frame) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(frame));
      return true;
    } catch (e) {
      console.error('  ⚠ Bridge: send failed:', e.message);
      return false;
    }
  }

  _handleMessage(msg) {
    // Handle connect response
    if (msg.type === 'res') {
      const pending = this.pendingRequests.get(msg.id);
      if (pending) {
        if (pending._isConnect) {
          if (msg.ok) {
            this.connected = true;
            this.gatewayInfo = msg.payload || {};
            this.onEvent({ type: 'bridge_status', status: 'connected', info: this.gatewayInfo });
            console.log('  ✓ Connected to Clawdbot Gateway (protocol v' + (this.gatewayInfo.protocol || '?') + ')');
          } else {
            console.error('  ✗ Gateway connect rejected:', msg.error);
            this.onEvent({ type: 'bridge_status', status: 'rejected', error: msg.error });
          }
        }
        pending.resolve(msg);
        this.pendingRequests.delete(msg.id);
      }
      return;
    }

    // Handle events from gateway
    if (msg.type === 'event') {
      this.onEvent(msg);

      const event = msg.event || '';
      const payload = msg.payload || {};

      // Lifecycle events (tool calls, thinking, completion, etc)
      if (event.startsWith('session.') || event.startsWith('agent.') || event.startsWith('lifecycle.')) {
        this.onLifecycleEvent({ event, payload, seq: msg.seq });

        // Notify per-session subscribers
        const sessionKey = payload.sessionKey || payload.key;
        if (sessionKey && this._sessionSubscriptions.has(sessionKey)) {
          this._sessionSubscriptions.get(sessionKey).forEach(cb => {
            try { cb({ event, payload }); } catch {}
          });
        }
      }

      // Exec approval events
      if (event === 'exec.approval.requested') {
        this.onEvent({ type: 'consent_pending', payload });
      }

      return;
    }

    // Handle connect challenge (nonce)
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      // For now we just proceed with connect — challenge signing not implemented
      return;
    }
  }

  // ─── RPC helper ───
  async _rpc(method, params = {}, timeoutMs = 30000) {
    if (!this.connected || !this.ws) {
      return { ok: false, error: 'Not connected to Clawdbot Gateway' };
    }

    const id = this._nextId();
    const frame = { type: 'req', id, method, params };

    return new Promise((resolve) => {
      this.pendingRequests.set(id, { resolve, time: Date.now() });
      this._send(frame);
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve({ ok: false, error: 'Timeout' });
        }
      }, timeoutMs);
    });
  }

  // ─── Session Management ───

  /**
   * List all active sessions from the gateway
   */
  async listSessions() {
    const res = await this._rpc('sessions.list', {});
    if (res.ok) return { ok: true, sessions: res.payload?.sessions || res.payload || [] };
    return { ok: false, error: res.error, sessions: [] };
  }

  /**
   * Spawn a new session (sub-agent)
   * @param {string} task - The task/prompt for the session
   * @param {object} options - { label, model, agentId, channel, systemPrompt, ... }
   */
  async spawnSession(task, options = {}) {
    // Use the 'agent' method which spawns/sends to a sub-agent session

    const params = {
      message: task,
      agentId: options.agentId || undefined,
      sessionKey: options.label || undefined,
      thinking: options.thinking || undefined,
      extraSystemPrompt: options.systemPrompt || undefined,
      idempotencyKey: crypto.randomUUID(),
    };
    const res = await this._rpc('agent', params, 120000);
    if (res.ok) {
      const payload = res.payload || {};
      return { ok: true, session: { key: payload.sessionKey || options.label, ...payload } };
    }
    return { ok: false, error: res.error };
  }

  /**
   * Send a message to a specific session
   * @param {string} key - Session key
   * @param {string} message - Message text
   */
  async sendToSession(key, message) {

    const res = await this._rpc('chat.send', {
      sessionKey: key,
      message,
      idempotencyKey: crypto.randomUUID(),
    }, 120000);
    if (res.ok) return { ok: true, result: res.payload };
    return { ok: false, error: res.error };
  }

  /**
   * Get session history
   * @param {string} key - Session key
   */
  async getSessionHistory(key) {
    const res = await this._rpc('chat.history', { sessionKey: key });
    if (res.ok) return { ok: true, history: res.payload?.messages || res.payload || [] };
    return { ok: false, error: res.error, history: [] };
  }

  /**
   * Get session status
   * @param {string} key - Session key
   */
  async getSessionStatus(key) {
    const res = await this._rpc('sessions.status', { key });
    if (res.ok) return { ok: true, status: res.payload };
    return { ok: false, error: res.error };
  }

  // ─── Agent/Chat ───

  /**
   * Send message to main agent session
   */
  async sendMessage(message) {
    return this.sendToSession('main', message);
  }

  // ─── Subscriptions ───

  /**
   * Subscribe to lifecycle events for a specific session
   * @param {string} sessionKey 
   * @param {function} callback - Called with { event, payload }
   * @returns {function} unsubscribe function
   */
  subscribeToSession(sessionKey, callback) {
    if (!this._sessionSubscriptions.has(sessionKey)) {
      this._sessionSubscriptions.set(sessionKey, new Set());
    }
    this._sessionSubscriptions.get(sessionKey).add(callback);
    return () => {
      const subs = this._sessionSubscriptions.get(sessionKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) this._sessionSubscriptions.delete(sessionKey);
      }
    };
  }

  // ─── Status ───

  getStatus() {
    return {
      connected: this.connected,
      gatewayUrl: this.gatewayUrl,
      gatewayInfo: this.gatewayInfo,
      pendingRequests: this.pendingRequests.size,
      sessionSubscriptions: this._sessionSubscriptions.size,
      reconnectAttempts: this._connectAttempts
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
    this.connected = false;
    this.ws = null;
  }
}

module.exports = { ClawdbotBridge };
