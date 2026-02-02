const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { superskillRegistry } = deps;

  /**
   * List all SuperSkills
   */
  router.get('/', (req, res) => {
    try {
      const superskills = superskillRegistry.list();
      res.json(superskills);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Search SuperSkills
   */
  router.get('/search', (req, res) => {
    try {
      const { q: query, tags } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
      }
      
      const tagList = tags ? tags.split(',').map(t => t.trim()) : [];
      const results = superskillRegistry.search(query, tagList);
      
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get SuperSkill registry stats (must be before :name route)
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = superskillRegistry.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get specific SuperSkill
   */
  router.get('/:name', (req, res) => {
    try {
      const { name } = req.params;
      const superskill = superskillRegistry.get(name);
      
      if (!superskill) {
        return res.status(404).json({ error: `SuperSkill '${name}' not found` });
      }
      
      res.json(superskill);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Execute SuperSkill
   */
  router.post('/:name/run', async (req, res) => {
    try {
      const { name } = req.params;
      const input = req.body;
      const { timeout } = req.query;
      
      const superskill = superskillRegistry.get(name);
      if (!superskill) {
        return res.status(404).json({ error: `SuperSkill '${name}' not found` });
      }
      
      const options = {};
      if (timeout) {
        const timeoutNum = parseInt(timeout);
        if (timeoutNum > 0) {
          options.timeout = timeoutNum;
        }
      }
      
      const result = await superskillRegistry.run(name, input, options);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};