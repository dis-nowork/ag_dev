const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { agentGraph } = deps;

  /**
   * Get active agents with metrics
   */
  router.get('/agents', (req, res) => {
    try {
      const { time } = req.query;
      const timestamp = time ? parseInt(time) : Date.now();
      const agents = agentGraph.getActiveAgents(timestamp);
      
      // Add productivity metrics for each agent
      const agentsWithMetrics = agents.map(agent => ({
        ...agent,
        productivity: agentGraph.getAgentProductivity(agent.agentId)
      }));
      
      res.json(agentsWithMetrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get activity timeline with time buckets
   */
  router.get('/timeline', (req, res) => {
    try {
      const { t0, t1, bucket } = req.query;
      
      if (!t0 || !t1) {
        return res.status(400).json({ error: 't0 and t1 parameters are required' });
      }
      
      const bucketMs = bucket ? parseInt(bucket) : 60000; // Default 1 minute buckets
      const timeline = agentGraph.getTimelineData(parseInt(t0), parseInt(t1), bucketMs);
      
      res.json(timeline);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get activity heatmap (hour x day matrix)
   */
  router.get('/heatmap', (req, res) => {
    try {
      const { t0, t1 } = req.query;
      
      if (!t0 || !t1) {
        return res.status(400).json({ error: 't0 and t1 parameters are required' });
      }
      
      const heatmap = agentGraph.getHeatmapData(parseInt(t0), parseInt(t1));
      res.json(heatmap);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get network visualization data
   */
  router.get('/network', (req, res) => {
    try {
      const { time } = req.query;
      const timestamp = time ? parseInt(time) : Date.now();
      const network = agentGraph.getNetworkData(timestamp);
      
      res.json(network);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get project pulse metrics
   */
  router.get('/pulse', (req, res) => {
    try {
      const { window } = req.query;
      let timeWindow;
      
      if (window) {
        const windowMs = parseInt(window);
        timeWindow = {
          from: Date.now() - windowMs,
          to: Date.now()
        };
      }
      
      const pulse = agentGraph.getProjectPulse(timeWindow);
      res.json(pulse);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get specific agent analytics
   */
  router.get('/agent/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { window } = req.query;
      
      let timeWindow;
      if (window) {
        const windowMs = parseInt(window);
        timeWindow = {
          from: Date.now() - windowMs,
          to: Date.now()
        };
      }
      
      const activity = agentGraph.getAgentActivity(id, timeWindow);
      const productivity = agentGraph.getAgentProductivity(id);
      
      res.json({
        agentId: id,
        activity,
        productivity,
        currentConnections: agentGraph.graph.nodeDegreeAt(id)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get hot files analysis
   */
  router.get('/files', (req, res) => {
    try {
      const { window } = req.query;
      
      let timeWindow;
      if (window) {
        const windowMs = parseInt(window);
        timeWindow = {
          from: Date.now() - windowMs,
          to: Date.now()
        };
      }
      
      const hotFiles = agentGraph.getHotFiles(timeWindow);
      res.json(hotFiles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get overall graph stats
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = agentGraph.getStats();
      const bottlenecks = agentGraph.getBottlenecks();
      const teamDynamics = agentGraph.getTeamDynamics();
      
      res.json({
        ...stats,
        bottlenecks,
        teamDynamics
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Record manual interaction/event
   */
  router.post('/events', (req, res) => {
    try {
      const { type, from, to, data } = req.body;
      
      if (!type || !from) {
        return res.status(400).json({ error: 'type and from are required' });
      }
      
      let result;
      switch (type) {
        case 'task_assignment':
          if (!to) return res.status(400).json({ error: 'to is required for task assignments' });
          result = agentGraph.taskAssigned(from, to, data);
          break;
        case 'message_exchange':
          if (!to) return res.status(400).json({ error: 'to is required for message exchanges' });
          result = agentGraph.messageExchanged(from, to, data);
          break;
        case 'file_modification':
          if (!to) return res.status(400).json({ error: 'to (filePath) is required for file modifications' });
          result = agentGraph.fileModified(from, to, data);
          break;
        case 'task_completion':
          if (!data?.taskId) return res.status(400).json({ error: 'data.taskId is required for task completions' });
          result = agentGraph.taskCompleted(from, data.taskId, data);
          break;
        default:
          return res.status(400).json({ error: 'Invalid event type' });
      }
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};