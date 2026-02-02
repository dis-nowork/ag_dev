const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { ralphLoop } = deps;

  /**
   * Load or generate PRD
   */
  router.post('/prd', (req, res) => {
    try {
      const { description, prd, name } = req.body;
      if (prd) {
        ralphLoop.loadPRD(prd);
      } else if (description) {
        ralphLoop.generatePRD(description, { name });
      } else {
        return res.status(400).json({ error: 'Provide description or prd object' });
      }
      res.json({ ok: true, prd: ralphLoop.getState().prd });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Start ralph loop
   */
  router.post('/start', async (req, res) => {
    try {
      const result = await ralphLoop.start();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Pause ralph loop
   */
  router.post('/pause', (req, res) => {
    try {
      ralphLoop.pause();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Resume ralph loop
   */
  router.post('/resume', async (req, res) => {
    try {
      const result = await ralphLoop.resume();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Stop ralph loop
   */
  router.post('/stop', (req, res) => {
    try {
      ralphLoop.stop();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get ralph state
   */
  router.get('/state', (req, res) => {
    try {
      res.json(ralphLoop.getState());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};