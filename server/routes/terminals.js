const express = require('express');

module.exports = function(deps) {
  const router = express.Router();
  const { terminalManager, orchestrator, agentGraph, broadcast } = deps;

  /**
   * Get terminals list
   */
  router.get('/', (req, res) => {
    try {
      const terminals = terminalManager.list();
      res.json(terminals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Create new terminal(s) - supports multiple instances
   */
  router.post('/', async (req, res) => {
    try {
      const { type, name, command, args, task, env, cwd, cols, rows, count = 1 } = req.body;
      
      // Validate count
      const spawnCount = Math.min(Math.max(parseInt(count) || 1, 1), 4);
      const terminals = [];
      
      for (let i = 1; i <= spawnCount; i++) {
        let terminal;
        let terminalName = name;
        
        // Add number suffix for multiple instances
        if (spawnCount > 1) {
          terminalName = `${name || type} #${i}`;
        }
        
        switch (type) {
          case 'claude':
            if (!task) {
              return res.status(400).json({ error: 'Task is required for Claude agent' });
            }
            terminal = terminalManager.spawnClaudeAgent(task, { env, cwd, cols, rows });
            terminal.name = terminalName || 'Claude Code';
            terminal.type = 'claude';
            terminal.task = task;
            break;
            
          case 'agent':
            if (!name || !task) {
              return res.status(400).json({ error: 'Agent name and task are required' });
            }
            
            // Contextualize task for multiple instances
            let contextualizedTask = task;
            if (spawnCount > 1) {
              contextualizedTask = `${task}\n\n[Instance ${i} of ${spawnCount}] You are working in parallel with other ${name} agents. Coordinate and divide the work efficiently.`;
            }
            
            terminal = await orchestrator.spawnAgent(name, contextualizedTask, { env, cwd, cols, rows });
            terminal.name = terminalName;
            terminal.type = 'agent';
            terminal.task = contextualizedTask;
            terminal.instance = i;
            terminal.totalInstances = spawnCount;
            break;
            
          case 'custom':
            if (!command) {
              return res.status(400).json({ error: 'Command is required for custom terminal' });
            }
            terminal = await orchestrator.spawnCustomCommand(
              terminalName || command, 
              command, 
              args || [], 
              { env, cwd, cols, rows }
            );
            terminal.name = terminalName || command;
            terminal.type = 'custom';
            terminal.instance = i;
            terminal.totalInstances = spawnCount;
            break;
            
          default:
            return res.status(400).json({ error: 'Invalid terminal type' });
        }
        
        // Store metadata for list endpoint
        terminalManager.setMetadata(terminal.id, { 
          name: terminal.name, 
          type: terminal.type,
          task: terminal.task,
          instance: terminal.instance,
          totalInstances: terminal.totalInstances
        });
        
        terminals.push(terminal);
      }
      
      // Return single terminal for count=1, array for count>1
      res.json(spawnCount === 1 ? terminals[0] : terminals);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Write to terminal
   */
  router.post('/:id/write', (req, res) => {
    try {
      const { id } = req.params;
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: 'Data is required' });
      }
      
      terminalManager.write(id, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Resize terminal
   */
  router.post('/:id/resize', (req, res) => {
    try {
      const { id } = req.params;
      const { cols, rows } = req.body;
      
      if (!cols || !rows) {
        return res.status(400).json({ error: 'Cols and rows are required' });
      }
      
      terminalManager.resize(id, cols, rows);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Kill terminal
   */
  router.delete('/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { signal } = req.query;
      
      terminalManager.kill(id, signal);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get terminal buffer
   */
  router.get('/:id/buffer', (req, res) => {
    try {
      const { id } = req.params;
      const { lines } = req.query;
      
      const buffer = terminalManager.getBuffer(id, lines ? parseInt(lines) : 100);
      res.json({ buffer });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};