const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { orchestrator } = deps;

  /**
   * Get available agent definitions
   */
  router.get('/', (req, res) => {
    try {
      const agents = orchestrator.getAgentDefinitions();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};