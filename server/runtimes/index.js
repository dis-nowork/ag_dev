/**
 * AgentRuntime — Abstract base class for all runtimes
 * 
 * Every runtime must implement these methods:
 * - connect() → Promise<boolean>
 * - disconnect() → void
 * - spawnAgent(agentId, config) → Promise<{sessionKey, ok, error?}>
 * - sendToAgent(sessionKey, message) → Promise<{ok, result?}>
 * - pauseAgent(sessionKey) → Promise<{ok}>
 * - resumeAgent(sessionKey) → Promise<{ok}>
 * - getAgentHistory(sessionKey) → Promise<{messages[]}>
 * - listSessions() → Promise<{sessions[]}>
 * - subscribeToAgent(sessionKey, callback) → unsubscribe function
 * - getStatus() → {connected, info}
 * 
 * Properties:
 * - connected: boolean
 * - name: string
 * - capabilities: string[] (e.g., ['spawn', 'stream', 'pause', 'inject'])
 */

class AgentRuntime {
  constructor() {
    if (new.target === AgentRuntime) {
      throw new Error('AgentRuntime is abstract — use a concrete implementation');
    }
    this.connected = false;
    this.name = 'abstract';
    this.capabilities = [];
  }

  async connect() {
    throw new Error('Not implemented: connect()');
  }

  disconnect() {
    throw new Error('Not implemented: disconnect()');
  }

  /**
   * Spawn an agent session
   * @param {string} agentId - Agent identifier
   * @param {object} config - { task, label, model, systemPrompt, ... }
   * @returns {Promise<{ok: boolean, sessionKey?: string, session?: object, error?: string}>}
   */
  async spawnAgent(agentId, config) {
    throw new Error('Not implemented: spawnAgent()');
  }

  /**
   * Send a message to an agent session
   * @param {string} sessionKey - Session key
   * @param {string} message - Message text
   * @returns {Promise<{ok: boolean, result?: object}>}
   */
  async sendToAgent(sessionKey, message) {
    throw new Error('Not implemented: sendToAgent()');
  }

  /**
   * Pause an agent session
   * @param {string} sessionKey
   * @returns {Promise<{ok: boolean}>}
   */
  async pauseAgent(sessionKey) {
    throw new Error('Not implemented: pauseAgent()');
  }

  /**
   * Resume an agent session
   * @param {string} sessionKey
   * @returns {Promise<{ok: boolean}>}
   */
  async resumeAgent(sessionKey) {
    throw new Error('Not implemented: resumeAgent()');
  }

  /**
   * Get message history for a session
   * @param {string} sessionKey
   * @returns {Promise<{ok: boolean, messages?: Array}>}
   */
  async getAgentHistory(sessionKey) {
    throw new Error('Not implemented: getAgentHistory()');
  }

  /**
   * List all active sessions
   * @returns {Promise<{ok: boolean, sessions?: Array}>}
   */
  async listSessions() {
    throw new Error('Not implemented: listSessions()');
  }

  /**
   * Subscribe to lifecycle events for a session
   * @param {string} sessionKey
   * @param {function} callback - Called with event data
   * @returns {function} unsubscribe function
   */
  subscribeToAgent(sessionKey, callback) {
    throw new Error('Not implemented: subscribeToAgent()');
  }

  /**
   * Get runtime status
   * @returns {{connected: boolean, name: string, capabilities: string[], info?: object}}
   */
  getStatus() {
    return {
      connected: this.connected,
      name: this.name,
      capabilities: this.capabilities,
    };
  }

  /**
   * Send a message to the main/default session (chat)
   * @param {string} message
   * @returns {Promise<{ok: boolean, result?: object}>}
   */
  async sendMessage(message) {
    return this.sendToAgent('main', message);
  }
}

module.exports = { AgentRuntime };
