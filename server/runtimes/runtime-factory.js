/**
 * RuntimeFactory — Creates the appropriate runtime based on config
 * 
 * Tries Clawdbot first (default), falls back to standalone if unavailable.
 */

const { ClawdbotRuntime } = require('./clawdbot-runtime');
const { StandaloneRuntime } = require('./standalone-runtime');

/**
 * Create a runtime instance based on configuration
 * @param {object} config - Server config object
 * @param {object} config.gateway - { url, token }
 * @param {string} [config.runtime] - Force a specific runtime: 'clawdbot' | 'standalone'
 * @param {object} callbacks - { onEvent, onAgentReply, onLifecycleEvent }
 * @returns {import('./index').AgentRuntime}
 */
function createRuntime(config = {}, callbacks = {}) {
  const forcedRuntime = config.runtime || process.env.AG_DEV_RUNTIME;

  // If explicitly set to standalone, skip clawdbot entirely
  if (forcedRuntime === 'standalone') {
    console.log('  ℹ Runtime: standalone (forced by config)');
    return new StandaloneRuntime();
  }

  // Default: try Clawdbot runtime
  if (config.gateway && config.gateway.url) {
    console.log(`  ℹ Runtime: clawdbot → ${config.gateway.url}`);
    return new ClawdbotRuntime({
      gatewayUrl: config.gateway.url,
      token: config.gateway.token || undefined,
      onEvent: callbacks.onEvent || (() => {}),
      onAgentReply: callbacks.onAgentReply || (() => {}),
      onLifecycleEvent: callbacks.onLifecycleEvent || (() => {}),
    });
  }

  // No gateway config — fallback to standalone
  console.log('  ℹ Runtime: standalone (no gateway configured)');
  return new StandaloneRuntime();
}

module.exports = { createRuntime };
