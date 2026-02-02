const express = require('express');
const path = require('path');
const fs = require('fs');

module.exports = function(deps) {
  const router = express.Router();
  const { stateManager, orchestrator, squadManager, terminalManager, superskillRegistry, sseClients, broadcast } = deps;

  /**
   * Process orchestrator chat messages and execute commands
   */
  async function processOrchestratorChat(message) {
    const activeWorkflow = orchestrator.getWorkflowExecutionState();
    const activeSquads = squadManager.getActiveSquads();
    const terminals = terminalManager.list();
    
    // Status queries
    if (message.includes('status') || message.includes('como tá') || message.includes('estado')) {
      const squadStats = squadManager.getStats();
      const status = {
        activeTerminals: terminals.length,
        activeSquads: activeSquads.length,
        totalActiveAgents: squadStats.totalActiveAgents,
        totalActiveTerminals: squadStats.totalActiveTerminals,
        workflowRunning: activeWorkflow?.status === 'running',
        workflowName: activeWorkflow?.name || null,
        agentBreakdown: squadStats.agentBreakdown
      };
      
      let response = `📊 Status do Sistema:\n`;
      response += `• Terminais ativos: ${status.activeTerminals}\n`;
      response += `• Squads ativos: ${status.activeSquads}\n`;
      response += `• Agents únicos: ${status.totalActiveAgents}\n`;
      response += `• Terminais de squads: ${status.totalActiveTerminals}\n`;
      
      if (Object.keys(status.agentBreakdown).length > 0) {
        response += `• Breakdown: `;
        const breakdown = Object.entries(status.agentBreakdown)
          .map(([agent, count]) => `${agent}×${count}`)
          .join(', ');
        response += breakdown + '\n';
      }
      
      if (status.workflowRunning) {
        response += `• Workflow ativo: ${status.workflowName}\n`;
      } else {
        response += `• Nenhum workflow ativo\n`;
      }
      
      return response;
    }
    
    // Start workflow
    const startMatch = message.match(/start\s+(\S+)/);
    if (startMatch) {
      const workflowName = startMatch[1];
      const workflows = orchestrator.getWorkflows();
      const workflowExists = workflows.find(w => w.name === workflowName);
      
      if (workflowExists) {
        return `Para iniciar o workflow "${workflowName}", use:\nPOST /api/workflows/${workflowName}/execute\ncom {"task": "sua tarefa aqui"}`;
      } else {
        const availableWorkflows = workflows.map(w => w.name).join(', ');
        return `Workflow "${workflowName}" não encontrado. Disponíveis: ${availableWorkflows}`;
      }
    }
    
    // Stop/pause commands
    if (message.includes('stop') || message.includes('pause') || message.includes('parar')) {
      if (activeWorkflow?.status === 'running') {
        return `Para parar o workflow ativo "${activeWorkflow.name}", use:\nPOST /api/workflows/active/stop`;
      } else if (terminals.length > 0) {
        return `Para parar todos os terminais, use:\nDELETE /api/terminals/{id} para cada terminal`;
      } else {
        return `Nada está executando no momento.`;
      }
    }
    
    // Spawn agent
    const spawnMatch = message.match(/spawn\s+(\S+)\s+(.+)/);
    if (spawnMatch) {
      const agentName = spawnMatch[1];
      const task = spawnMatch[2];
      const agents = orchestrator.getAgentDefinitions();
      const agentExists = agents.find(a => a.name === agentName);
      
      if (agentExists) {
        return `Para spawnar o agente "${agentName}", use:\nPOST /api/terminals\ncom {"type": "agent", "name": "${agentName}", "task": "${task}"}`;
      } else {
        const availableAgents = agents.map(a => a.name).join(', ');
        return `Agente "${agentName}" não encontrado. Disponíveis: ${availableAgents}`;
      }
    }
    
    // Default suggestions
    const suggestions = [
      '• "status" - ver estado do sistema',
      '• "start {workflow}" - iniciar workflow',
      '• "stop" - parar execução ativa',
      '• "spawn {agente} {tarefa}" - criar agente específico'
    ];
    
    const availableWorkflows = orchestrator.getWorkflows().map(w => w.name).slice(0, 3).join(', ');
    const availableSquads = squadManager.listSquads().map(s => s.name).slice(0, 3).join(', ');
    
    return `🤖 Orquestrador AG Dev

Comandos disponíveis:
${suggestions.join('\n')}

💡 Recursos especiais:
• Múltiplos devs: Squads spawnam 2+ devs automaticamente
• API múltipla: count=1-4 no POST /api/terminals
• Trabalho paralelo: Agentes colaboram automaticamente

Workflows: ${availableWorkflows}
Squads: ${availableSquads}

Para mais detalhes, consulte a documentação da API.`;
  }

  /**
   * Server-Sent Events endpoint
   */
  router.get('/events', (req, res) => {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add client to set
    sseClients.add(res);
    
    // Send initial state
    res.write(`data: ${JSON.stringify({ 
      type: 'init', 
      data: stateManager.getState() 
    })}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      sseClients.delete(res);
    });

    req.on('aborted', () => {
      sseClients.delete(res);
    });
  });

  /**
   * Get system state
   */
  router.get('/state', (req, res) => {
    try {
      const state = stateManager.getState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get system metrics
   */
  router.get('/metrics', (req, res) => {
    try {
      const metrics = stateManager.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Health check endpoint for deployment monitoring
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      superskills: superskillRegistry.getStats().total,
      agents: Object.keys(terminalManager.terminals || {}).length
    });
  });

  /**
   * Pause all agents
   */
  router.post('/system/pause-all', (req, res) => {
    try {
      stateManager.pauseAll();
      broadcast('system_pause_all', {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Resume all agents
   */
  router.post('/system/resume-all', (req, res) => {
    try {
      stateManager.resumeAll();
      broadcast('system_resume_all', {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Orchestrator Chat API
   */
  router.post('/chat', (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const response = processOrchestratorChat(message.toLowerCase().trim());
      res.json({ response });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};