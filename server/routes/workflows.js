const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { orchestrator } = deps;

  /**
   * Get available workflows
   */
  router.get('/', (req, res) => {
    try {
      const workflows = orchestrator.getWorkflows();
      res.json(workflows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get active workflow execution state
   */
  router.get('/active', (req, res) => {
    try {
      const execution = orchestrator.getWorkflowExecutionState();
      res.json(execution || null);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Pause active workflow execution
   */
  router.post('/active/pause', (req, res) => {
    try {
      const execution = orchestrator.getWorkflowExecutionState();
      if (execution && execution.status === 'running') {
        execution.status = 'paused';
        res.json(execution);
      } else {
        res.status(400).json({ error: 'No active workflow to pause' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Stop active workflow execution
   */
  router.post('/active/stop', (req, res) => {
    try {
      const execution = orchestrator.stopWorkflowExecution();
      res.json(execution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Start workflow
   */
  router.post('/:name/start', async (req, res) => {
    try {
      const { name } = req.params;
      const { context } = req.body;
      
      const workflow = await orchestrator.startWorkflow(name, context || {});
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Execute workflow with enhanced monitoring
   */
  router.post('/:name/execute', async (req, res) => {
    try {
      const { name } = req.params;
      const { task } = req.body;
      
      if (!task) {
        return res.status(400).json({ error: 'Task is required' });
      }
      
      const execution = await orchestrator.executeWorkflow(name, task);
      res.json(execution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Stop workflow
   */
  router.post('/:id/stop', (req, res) => {
    try {
      const { id } = req.params;
      
      const workflow = orchestrator.stopWorkflow(id);
      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};