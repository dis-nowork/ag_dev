const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { memorySystem } = deps;

  /**
   * Get memory stats
   */
  router.get('/stats', (req, res) => {
    res.json(memorySystem.getStats());
  });

  /**
   * Get agent context
   */
  router.get('/agent/:agentId', (req, res) => {
    const context = memorySystem.getAgentContext(req.params.agentId);
    res.json(context);
  });

  /**
   * Record memory event
   */
  router.post('/record', (req, res) => {
    const { agentId, type, data } = req.body;
    if (!agentId || !type) {
      return res.status(400).json({ error: 'agentId and type required' });
    }
    memorySystem.record(agentId, type, data || {});
    res.json({ ok: true });
  });

  /**
   * Fold agent memory
   */
  router.post('/fold/:agentId', (req, res) => {
    const summary = memorySystem.fold(req.params.agentId);
    res.json({ ok: true, summary });
  });

  return router;
};