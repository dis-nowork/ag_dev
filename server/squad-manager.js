const fs = require('fs').promises;
const path = require('path');

/**
 * Squad Manager - Manages squads of agents for collaborative work
 */
class SquadManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.squads = new Map(); // squadId -> squad definition
    this.activeSquads = new Map(); // squadId -> active instance
    
    this.loadSquads();
  }

  /**
   * Load squad definitions from core/squads/*.json
   */
  async loadSquads() {
    try {
      const squadsPath = path.join(__dirname, '../core/squads');
      
      // Create directory if it doesn't exist
      try {
        await fs.access(squadsPath);
      } catch {
        await fs.mkdir(squadsPath, { recursive: true });
        console.log('Created core/squads directory');
      }
      
      const files = await fs.readdir(squadsPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(squadsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          try {
            const squad = JSON.parse(content);
            this.squads.set(squad.id, squad);
          } catch (parseError) {
            console.error(`Error parsing squad ${file}:`, parseError);
          }
        }
      }
      
      console.log(`Loaded ${this.squads.size} squad definitions`);
    } catch (error) {
      console.error('Error loading squads:', error);
    }
  }

  /**
   * List available squads
   */
  listSquads() {
    return Array.from(this.squads.values());
  }

  /**
   * Get squad by ID
   */
  getSquad(squadId) {
    return this.squads.get(squadId);
  }

  /**
   * Create squad dynamically
   */
  createSquad(config) {
    const { id, name, description, agents, icon, defaultWorkflow } = config;
    
    if (!id || !name || !agents || !Array.isArray(agents)) {
      throw new Error('Squad must have id, name, and agents array');
    }
    
    if (this.squads.has(id)) {
      throw new Error(`Squad with id '${id}' already exists`);
    }
    
    const squad = {
      id,
      name,
      description: description || '',
      icon: icon || '🤖',
      agents,
      defaultWorkflow: defaultWorkflow || null,
      createdAt: Date.now()
    };
    
    this.squads.set(id, squad);
    return squad;
  }

  /**
   * Activate squad - spawn all agents with the given task
   */
  async activateSquad(squadId, task, options = {}) {
    const squad = this.squads.get(squadId);
    if (!squad) {
      throw new Error(`Squad '${squadId}' not found`);
    }
    
    if (this.activeSquads.has(squadId)) {
      throw new Error(`Squad '${squadId}' is already active`);
    }
    
    const activeInstance = {
      squadId,
      name: squad.name,
      task,
      agents: [],
      status: 'activating',
      startTime: Date.now(),
      options
    };
    
    this.activeSquads.set(squadId, activeInstance);
    
    try {
      // Spawn each agent in the squad
      const spawnedAgents = [];
      
      for (const agentName of squad.agents) {
        try {
          const agentTask = this.contextualizeTask(agentName, task, squad);
          
          // Special handling for dev agents - spawn multiple instances
          if (agentName === 'dev') {
            const devCount = options.devCount || 2; // Default 2 devs for parallel work
            const terminals = await this.spawnMultipleAgents(agentName, agentTask, devCount, options);
            
            // Add each dev terminal to spawnedAgents
            for (let i = 0; i < terminals.length; i++) {
              const terminal = terminals[i];
              spawnedAgents.push({
                name: `${agentName} #${i + 1}`,
                originalName: agentName,
                terminalId: terminal.id,
                task: agentTask,
                status: 'running',
                instance: i + 1,
                totalInstances: terminals.length
              });
            }
          } else {
            // Regular single agent spawn
            const terminal = await this.orchestrator.spawnAgent(agentName, agentTask, options);
            
            spawnedAgents.push({
              name: agentName,
              originalName: agentName,
              terminalId: terminal.id,
              task: agentTask,
              status: 'running'
            });
          }
        } catch (error) {
          console.error(`Error spawning agent ${agentName}:`, error);
          spawnedAgents.push({
            name: agentName,
            originalName: agentName,
            terminalId: null,
            task: '',
            status: 'error',
            error: error.message
          });
        }
      }
      
      activeInstance.agents = spawnedAgents;
      activeInstance.status = 'active';
      
      return {
        squad: squad,
        instance: activeInstance,
        agentsSpawned: spawnedAgents.length,
        agentsFailed: spawnedAgents.filter(a => a.status === 'error').length,
        multipleDevs: spawnedAgents.filter(a => a.originalName === 'dev').length
      };
      
    } catch (error) {
      activeInstance.status = 'error';
      activeInstance.error = error.message;
      throw error;
    }
  }

  /**
   * Deactivate squad - kill all agents (including multiple instances)
   */
  async deactivateSquad(squadId) {
    const activeInstance = this.activeSquads.get(squadId);
    if (!activeInstance) {
      throw new Error(`Squad '${squadId}' is not active`);
    }
    
    const results = {
      squadId,
      terminalsKilled: 0,
      agentTypes: {},
      errors: []
    };
    
    // Kill all terminals for agents in this squad
    for (const agent of activeInstance.agents) {
      if (agent.terminalId) {
        try {
          this.orchestrator.terminalManager.kill(agent.terminalId);
          results.terminalsKilled++;
          
          // Track by original agent type
          const agentType = agent.originalName || agent.name;
          results.agentTypes[agentType] = (results.agentTypes[agentType] || 0) + 1;
          
        } catch (error) {
          console.error(`Error killing terminal ${agent.terminalId}:`, error);
          results.errors.push({
            agent: agent.name,
            terminalId: agent.terminalId,
            error: error.message
          });
        }
      }
    }
    
    // Remove from active squads
    this.activeSquads.delete(squadId);
    
    return results;
  }

  /**
   * Get active squads
   */
  getActiveSquads() {
    return Array.from(this.activeSquads.values());
  }

  /**
   * Get active squad by ID
   */
  getActiveSquad(squadId) {
    return this.activeSquads.get(squadId);
  }

  /**
   * Check if squad is active
   */
  isSquadActive(squadId) {
    return this.activeSquads.has(squadId);
  }

  /**
   * Spawn multiple instances of the same agent type
   */
  async spawnMultipleAgents(agentName, task, count, options = {}) {
    const terminals = [];
    const maxCount = Math.min(Math.max(count, 1), 4); // Limit between 1-4
    
    for (let i = 1; i <= maxCount; i++) {
      try {
        // Contextualize task for parallel work
        const parallelTask = `${task}\n\n[${agentName.toUpperCase()} #${i} of ${maxCount}] ` +
                           `You are working in parallel with ${maxCount - 1} other ${agentName} agents. ` +
                           `Coordinate your work to avoid duplication and maximize efficiency. ` +
                           `Consider dividing the work by modules, features, or different aspects of the task.`;
        
        const terminal = await this.orchestrator.spawnAgent(agentName, parallelTask, options);
        
        // Update terminal metadata to reflect it's part of a parallel group
        this.orchestrator.terminalManager.setMetadata(terminal.id, {
          name: `${agentName} #${i}`,
          type: 'agent',
          task: parallelTask,
          instance: i,
          totalInstances: maxCount,
          squadId: this.squadId || null
        });
        
        terminals.push(terminal);
      } catch (error) {
        console.error(`Error spawning ${agentName} #${i}:`, error);
        // Continue with other instances even if one fails
      }
    }
    
    return terminals;
  }

  /**
   * Contextualize task for specific agent within squad context
   */
  contextualizeTask(agentName, originalTask, squad) {
    const context = `You are working as part of the "${squad.name}" squad. ` +
                   `Other agents in your squad: ${squad.agents.filter(a => a !== agentName).join(', ')}.\n\n` +
                   `Squad mission: ${originalTask}\n\n` +
                   `Your role as ${agentName}: Focus on your specific expertise while coordinating with your squad.`;
    
    return context;
  }

  /**
   * Update squad agent status
   */
  updateAgentStatus(squadId, agentName, status, data = {}) {
    const activeInstance = this.activeSquads.get(squadId);
    if (!activeInstance) {
      return;
    }
    
    const agent = activeInstance.agents.find(a => a.name === agentName);
    if (agent) {
      agent.status = status;
      Object.assign(agent, data);
    }
  }

  /**
   * Get squad statistics
   */
  getStats() {
    const totalSquads = this.squads.size;
    const activeSquads = this.activeSquads.size;
    
    let totalActiveAgents = 0;
    let totalActiveTerminals = 0;
    const agentBreakdown = {};
    
    // Count active agents and terminals, including multiples
    for (const instance of this.activeSquads.values()) {
      totalActiveTerminals += instance.agents.length;
      
      // Count unique agent types
      const uniqueAgents = new Set();
      for (const agent of instance.agents) {
        const agentType = agent.originalName || agent.name.replace(/ #\d+$/, '');
        uniqueAgents.add(agentType);
        agentBreakdown[agentType] = (agentBreakdown[agentType] || 0) + 1;
      }
      totalActiveAgents += uniqueAgents.size;
    }
    
    return {
      totalSquads,
      activeSquads,
      totalActiveAgents, // Unique agent types
      totalActiveTerminals, // Total running terminals
      agentBreakdown, // Count per agent type including multiples
      squads: this.listSquads().map(squad => ({
        id: squad.id,
        name: squad.name,
        agentCount: squad.agents.length,
        isActive: this.isSquadActive(squad.id),
        activeInstance: this.isSquadActive(squad.id) ? {
          totalTerminals: this.getActiveSquad(squad.id)?.agents.length || 0,
          agents: this.getActiveSquad(squad.id)?.agents.map(a => a.name) || []
        } : null
      }))
    };
  }
}

module.exports = SquadManager;