/**
 * RuntimeFactory — Creates the appropriate runtime based on config
 * 
 * Strategy:
 * 1. If forced to 'standalone' via config/env → use standalone
 * 2. If gateway configured → try Clawdbot, with auto-fallback to standalone
 * 3. No gateway → standalone
 * 
 * The factory also wraps Clawdbot runtime in a resilient proxy that
 * catches crashes and degrades gracefully instead of killing the process.
 */

const { ClawdbotRuntime } = require('./clawdbot-runtime');
const { StandaloneRuntime } = require('./standalone-runtime');

/**
 * Create a runtime instance based on configuration
 * @param {object} config - Server config object
 * @param {object} config.gateway - { url, token }
 * @param {string} [config.runtime] - Force: 'clawdbot' | 'standalone'
 * @param {object} callbacks - { onEvent, onAgentReply, onLifecycleEvent }
 * @returns {import('./index').AgentRuntime}
 */
function createRuntime(config = {}, callbacks = {}) {
  const forcedRuntime = config.runtime || process.env.AG_DEV_RUNTIME;

  if (forcedRuntime === 'standalone') {
    console.log('  ℹ Runtime: standalone (forced by config)');
    return new StandaloneRuntime();
  }

  if (config.gateway && config.gateway.url) {
    console.log(`  ℹ Runtime: clawdbot → ${config.gateway.url}`);
    
    try {
      const clawdbot = new ClawdbotRuntime({
        gatewayUrl: config.gateway.url,
        token: config.gateway.token || undefined,
        onEvent: callbacks.onEvent || (() => {}),
        onAgentReply: callbacks.onAgentReply || (() => {}),
        onLifecycleEvent: callbacks.onLifecycleEvent || (() => {}),
      });

      // Wrap in resilient proxy — if Clawdbot crashes, degrade to standalone
      return new ResilientRuntime(clawdbot, callbacks);
    } catch (e) {
      console.log(`  ⚠ Failed to create ClawdbotRuntime: ${e.message}`);
      console.log('  ℹ Falling back to standalone runtime');
      return new StandaloneRuntime();
    }
  }

  console.log('  ℹ Runtime: standalone (no gateway configured)');
  return new StandaloneRuntime();
}

/**
 * ResilientRuntime — Wraps a primary runtime with crash protection
 * 
 * If the primary runtime throws, it catches the error and either:
 * - Returns a graceful error response (for API calls)
 * - Falls back to standalone for critical operations
 * - NEVER crashes the server process
 */
class ResilientRuntime {
  constructor(primary, callbacks = {}) {
    this._primary = primary;
    this._standalone = new StandaloneRuntime();
    this._callbacks = callbacks;
    this._degraded = false;
    this.name = primary.name;
    this.capabilities = primary.capabilities;
  }

  get connected() {
    if (this._degraded) return this._standalone.connected;
    return this._primary.connected;
  }

  set connected(val) {
    // Derived property
  }

  get gatewayUrl() {
    if (this._degraded) return 'standalone (degraded)';
    return this._primary.gatewayUrl || this._primary.bridge?.gatewayUrl || '';
  }

  _active() {
    return this._degraded ? this._standalone : this._primary;
  }

  async connect() {
    try {
      const result = await this._primary.connect();
      return result;
    } catch (e) {
      console.log(`  ⚠ Runtime connect failed: ${e.message} — degrading to standalone`);
      this._degraded = true;
      return this._standalone.connect();
    }
  }

  disconnect() {
    try { this._primary.disconnect(); } catch {}
    if (this._degraded) this._standalone.disconnect();
  }

  async spawnAgent(agentId, config = {}) {
    try {
      return await this._active().spawnAgent(agentId, config);
    } catch (e) {
      console.error(`  ⚠ spawnAgent failed: ${e.message}`);
      if (!this._degraded) {
        this._degraded = true;
        return this._standalone.spawnAgent(agentId, config);
      }
      return { ok: false, error: e.message };
    }
  }

  async sendToAgent(sessionKey, message) {
    try {
      return await this._active().sendToAgent(sessionKey, message);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async pauseAgent(sessionKey) {
    try {
      return await this._active().pauseAgent(sessionKey);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async resumeAgent(sessionKey) {
    try {
      return await this._active().resumeAgent(sessionKey);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async getAgentHistory(sessionKey) {
    try {
      return await this._active().getAgentHistory(sessionKey);
    } catch (e) {
      return { ok: false, messages: [], error: e.message };
    }
  }

  async listSessions() {
    try {
      return await this._active().listSessions();
    } catch (e) {
      return { ok: false, sessions: [], error: e.message };
    }
  }

  subscribeToAgent(sessionKey, callback) {
    try {
      return this._active().subscribeToAgent(sessionKey, callback);
    } catch (e) {
      return () => {}; // noop unsubscribe
    }
  }

  async sendMessage(message) {
    try {
      return await this._active().sendMessage(message);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  getStatus() {
    try {
      const status = this._active().getStatus();
      return {
        ...status,
        degraded: this._degraded,
        name: this._degraded ? 'standalone (degraded)' : this.name,
      };
    } catch (e) {
      return {
        connected: false,
        name: 'error',
        error: e.message,
        degraded: true,
      };
    }
  }
}

module.exports = { createRuntime, ResilientRuntime };
