const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { runtime } = deps;

  /**
   * Get runtime status
   */
  router.get('/status', (req, res) => {
    try {
      const status = runtime.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ 
        error: error.message,
        connected: false,
        name: 'error' 
      });
    }
  });

  return router;
};