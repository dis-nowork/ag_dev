/**
 * ClawdbotRuntime — Wraps the existing ClawdbotBridge (ws-bridge.js)
 * 
 * Default runtime. Delegates all operations to the WebSocket bridge
 * that connects to Clawdbot Gateway.
 */

const { AgentRuntime } = require('./index');
const { ClawdbotBridge } = require('../ws-bridge');

class ClawdbotRuntime extends AgentRuntime {
  /**
   * @param {object} options
   * @param {string} options.gatewayUrl - WebSocket URL for gateway
   * @param {string} options.token - Auth token
   * @param {function} options.onEvent - Event callback
   * @param {function} options.onAgentReply - Agent reply callback
   * @param {function} options.onLifecycleEvent - Lifecycle event callback
   */
  constructor(options = {}) {
    super();
    this.name = 'clawdbot';
    this.capabilities = ['spawn', 'stream', 'pause', 'inject', 'history', 'sessions'];

    this.bridge = new ClawdbotBridge({
      gatewayUrl: options.gatewayUrl,
      token: options.token,
      onEvent: options.onEvent || (() => {}),
      onAgentReply: options.onAgentReply || (() => {}),
      onLifecycleEvent: options.onLifecycleEvent || (() => {}),
    });
  }

  get connected() {
    return this.bridge.connected;
  }

  set connected(val) {
    // connected is derived from bridge — ignore direct sets
  }

  get gatewayUrl() {
    return this.bridge.gatewayUrl;
  }

  async connect() {
    try {
      this.bridge.connect();
      return true;
    } catch (e) {
      console.log('  ℹ ClawdbotRuntime: Gateway not available');
      return false;
    }
  }

  disconnect() {
    this.bridge.disconnect();
  }

  async spawnAgent(agentId, config = {}) {
    if (!this.connected) {
      return { ok: false, error: 'Not connected to Clawdbot Gateway' };
    }

    const result = await this.bridge.spawnSession(config.task || 'Awaiting instructions.', {
      label: config.label || `ag-dev:${agentId}`,
      model: config.model || undefined,
      systemPrompt: config.systemPrompt || undefined,
    });

    if (result.ok) {
      const sessionKey = result.session?.key || result.session?.sessionKey;
      return { ok: true, sessionKey, session: result.session };
    }
    return { ok: false, error: result.error || 'Failed to spawn session' };
  }

  async sendToAgent(sessionKey, message) {
    if (!this.connected) {
      return { ok: false, error: 'Not connected to Clawdbot Gateway' };
    }
    return this.bridge.sendToSession(sessionKey, message);
  }

  async pauseAgent(sessionKey) {
    if (!this.connected) {
      return { ok: false, error: 'Not connected' };
    }
    return this.bridge.sendToSession(sessionKey, '/stop');
  }

  async resumeAgent(sessionKey) {
    // Resume is typically handled by sending a new message
    // The gateway doesn't have a dedicated resume — the agent continues on next message
    return { ok: true };
  }

  async getAgentHistory(sessionKey) {
    if (!this.connected) {
      return { ok: false, messages: [], error: 'Not connected' };
    }
    const result = await this.bridge.getSessionHistory(sessionKey);
    return { ok: result.ok, messages: result.history || [] };
  }

  async listSessions() {
    if (!this.connected) {
      return { ok: false, sessions: [], error: 'Not connected' };
    }
    return this.bridge.listSessions();
  }

  subscribeToAgent(sessionKey, callback) {
    return this.bridge.subscribeToSession(sessionKey, callback);
  }

  async sendMessage(message) {
    return this.bridge.sendMessage(message);
  }

  getStatus() {
    const bridgeStatus = this.bridge.getStatus();
    return {
      ...bridgeStatus,
      name: this.name,
      capabilities: this.capabilities,
    };
  }
}

module.exports = { ClawdbotRuntime };
