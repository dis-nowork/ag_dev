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
    const startMatch = message.match(/start\s+(\S+)(\s+(.+))?/);
    if (startMatch) {
      const workflowName = startMatch[1];
      const task = startMatch[3] || 'General workflow task';
      const workflows = orchestrator.getWorkflows();
      const workflowExists = workflows.find(w => w.name === workflowName);
      
      if (workflowExists) {
        try {
          const result = await orchestrator.startWorkflow(workflowName, { task });
          broadcast('workflow_event', {
            type: 'workflow_started',
            workflow: workflowName,
            task: task
          });
          return `✅ Workflow "${workflowName}" iniciado com sucesso!\nTask: ${task}\nAgents ativos: ${result.agents?.length || 0}`;
        } catch (error) {
          return `❌ Erro ao iniciar workflow "${workflowName}": ${error.message}`;
        }
      } else {
        const availableWorkflows = workflows.map(w => w.name).join(', ');
        return `Workflow "${workflowName}" não encontrado. Disponíveis: ${availableWorkflows}`;
      }
    }
    
    // Stop/pause commands
    if (message.includes('stop') || message.includes('pause') || message.includes('parar')) {
      try {
        let stoppedItems = [];
        
        // Stop active workflow  
        if (activeWorkflow?.status === 'running') {
          await orchestrator.stopWorkflowExecution();
          stoppedItems.push(`workflow "${activeWorkflow.name}"`);
          broadcast('workflow_event', {
            type: 'workflow_stopped'
          });
        }
        
        // Stop all terminals
        if (terminals.length > 0) {
          const terminalIds = terminals.map(t => t.id);
          for (const id of terminalIds) {
            try {
              await terminalManager.kill(id);
              stoppedItems.push(`terminal ${id.slice(0, 8)}`);
            } catch (e) {
              console.error(`Failed to kill terminal ${id}:`, e.message);
            }
          }
        }
        
        if (stoppedItems.length > 0) {
          return `✅ Parado com sucesso:\n• ${stoppedItems.join('\n• ')}`;
        } else {
          return `ℹ️ Nada estava executando no momento.`;
        }
      } catch (error) {
        return `❌ Erro ao parar execução: ${error.message}`;
      }
    }
    
    // Deploy squad
    const deployMatch = message.match(/deploy\s+(\S+)\s+(.+)/);
    if (deployMatch) {
      const squadName = deployMatch[1];
      const task = deployMatch[2];
      const squads = squadManager.listSquads();
      const squadExists = squads.find(s => s.id === squadName || s.name.toLowerCase() === squadName);
      
      if (squadExists) {
        try {
          const result = await squadManager.activateSquad(squadExists.id, task);
          broadcast('squad_activated', {
            squad: squadExists,
            task: task,
            agents: result.agents
          });
          return `✅ Squad "${squadExists.name}" deployed com sucesso!\nTask: ${task}\nAgents ativos: ${result.agents?.length || 0}\nUse o Workflow view para acompanhar.`;
        } catch (error) {
          return `❌ Erro ao deployar squad "${squadExists.name}": ${error.message}`;
        }
      } else {
        const availableSquads = squads.map(s => s.name).join(', ');
        return `Squad "${squadName}" não encontrado. Disponíveis: ${availableSquads}`;
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
        try {
          const result = await orchestrator.spawnAgent(agentName, task);
          broadcast('terminal_spawn', {
            id: result.id,
            agent: agentName,
            task: task
          });
          return `✅ Agente "${agentName}" spawned com sucesso!\nTerminal ID: ${result.id}\nTask: ${task}\nUse o Grid view para acompanhar.`;
        } catch (error) {
          return `❌ Erro ao spawnar agente "${agentName}": ${error.message}`;
        }
      } else {
        const availableAgents = agents.map(a => a.name).join(', ');
        return `Agente "${agentName}" não encontrado. Disponíveis: ${availableAgents}`;
      }
    }
    
    // Default suggestions  
    const suggestions = [
      '• "status" - ver estado do sistema',
      '• "start {workflow} {task}" - iniciar workflow',
      '• "deploy {squad} {task}" - deployar squad',
      '• "spawn {agente} {tarefa}" - criar agente específico',
      '• "stop" - parar tudo que está executando'
    ];
    
    const availableWorkflows = orchestrator.getWorkflows().map(w => w.name).slice(0, 3).join(', ');
    const availableSquads = squadManager.listSquads().map(s => s.name).slice(0, 3).join(', ');
    const availableAgents = orchestrator.getAgentDefinitions().map(a => a.name).slice(0, 5).join(', ');
    
    return `🤖 Orquestrador AG Dev - Comando Executivo

Comandos executam ações reais:
${suggestions.join('\n')}

💡 Exemplos prontos:
• "deploy builders build a REST API"
• "spawn dev create authentication system" 
• "start analysis-planning analyze user requirements"
• "stop" (para tudo)

📋 Recursos disponíveis:
• Workflows: ${availableWorkflows}
• Squads: ${availableSquads}  
• Agents: ${availableAgents}

⚡ O orquestrador executa comandos automaticamente - sem APIs manuais!`;
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
  router.post('/chat', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const response = await processOrchestratorChat(message.toLowerCase().trim());
      res.json({ response });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};