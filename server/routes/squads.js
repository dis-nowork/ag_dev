const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { squadManager } = deps;

  /**
   * Get available squads
   */
  router.get('/', async (req, res) => {
    try {
      const squads = squadManager.listSquads();
      const stats = squadManager.getStats();
      res.json({ squads, stats });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get active squads
   */
  router.get('/active', (req, res) => {
    try {
      const activeSquads = squadManager.getActiveSquads();
      res.json(activeSquads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Create dynamic squad
   */
  router.post('/', (req, res) => {
    try {
      const squad = squadManager.createSquad(req.body);
      res.status(201).json(squad);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get specific squad info
   */
  router.get('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const squad = squadManager.getSquad(id);
      
      if (!squad) {
        return res.status(404).json({ error: 'Squad not found' });
      }
      
      const activeInstance = squadManager.getActiveSquad(id);
      res.json({ squad, active: activeInstance });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Activate squad
   */
  router.post('/:id/activate', async (req, res) => {
    try {
      const { id } = req.params;
      const { task, options, devCount } = req.body;
      
      if (!task) {
        return res.status(400).json({ error: 'Task is required' });
      }
      
      // Merge devCount into options
      const squadOptions = { 
        ...(options || {}),
        devCount: devCount || options?.devCount || 2 // Default 2 devs
      };
      
      const result = await squadManager.activateSquad(id, task, squadOptions);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Deactivate squad
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await squadManager.deactivateSquad(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};