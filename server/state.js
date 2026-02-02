/**
 * Estado centralizado dos agents e sistema
 */
class StateManager {
  constructor() {
    this.agents = new Map(); // id -> agent state
    this.workflows = new Map(); // id -> workflow state
    this.system = {
      status: 'idle', // idle, working, error
      startTime: Date.now(),
      activeAgents: 0,
      totalAgents: 0,
      version: '1.0.0'
    };
    this.events = []; // Event log circular buffer
    this.maxEvents = 1000;
  }

  /**
   * Atualiza estado de um agent
   */
  updateAgent(id, data) {
    const existing = this.agents.get(id) || {};
    const updated = {
      ...existing,
      ...data,
      lastUpdate: Date.now()
    };
    
    this.agents.set(id, updated);
    this.updateSystemStats();
    this.addEvent('agent_update', { id, ...data });
    
    return updated;
  }

  /**
   * Remove agent
   */
  removeAgent(id) {
    const agent = this.agents.get(id);
    if (agent) {
      this.agents.delete(id);
      this.updateSystemStats();
      this.addEvent('agent_remove', { id });
    }
    return agent;
  }

  /**
   * Get agent state
   */
  getAgent(id) {
    return this.agents.get(id);
  }

  /**
   * Lista todos os agents
   */
  listAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status) {
    return Array.from(this.agents.values()).filter(agent => agent.status === status);
  }

  /**
   * Atualiza workflow state
   */
  updateWorkflow(id, data) {
    const existing = this.workflows.get(id) || {};
    const updated = {
      ...existing,
      ...data,
      lastUpdate: Date.now()
    };
    
    this.workflows.set(id, updated);
    this.addEvent('workflow_update', { id, ...data });
    
    return updated;
  }

  /**
   * Remove workflow
   */
  removeWorkflow(id) {
    const workflow = this.workflows.get(id);
    if (workflow) {
      this.workflows.delete(id);
      this.addEvent('workflow_remove', { id });
    }
    return workflow;
  }

  /**
   * Get full system state
   */
  getState() {
    return {
      system: this.system,
      agents: this.listAgents(),
      workflows: Array.from(this.workflows.values()),
      recentEvents: this.events.slice(-50) // Últimos 50 eventos
    };
  }

  /**
   * Atualiza estatísticas do sistema
   */
  updateSystemStats() {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter(agent => agent.status === 'running').length;
    const totalAgents = agents.length;
    
    let systemStatus = 'idle';
    if (activeAgents > 0) {
      systemStatus = 'working';
    }
    
    // Check for errors
    const errorAgents = agents.filter(agent => agent.status === 'error').length;
    if (errorAgents > 0) {
      systemStatus = 'error';
    }

    this.system = {
      ...this.system,
      status: systemStatus,
      activeAgents,
      totalAgents,
      lastUpdate: Date.now()
    };
  }

  /**
   * Adiciona evento ao log
   */
  addEvent(type, data) {
    const event = {
      type,
      data,
      timestamp: Date.now(),
      id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
    
    this.events.push(event);
    
    // Manter tamanho limitado
    while (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    return event;
  }

  /**
   * Get eventos recentes
   */
  getEvents(limit = 50, since = null) {
    let events = this.events;
    
    if (since) {
      events = events.filter(event => event.timestamp > since);
    }
    
    return events.slice(-limit);
  }

  /**
   * Clear all state (reset)
   */
  reset() {
    this.agents.clear();
    this.workflows.clear();
    this.events = [];
    this.system = {
      status: 'idle',
      startTime: Date.now(),
      activeAgents: 0,
      totalAgents: 0,
      version: '1.0.0'
    };
    this.addEvent('system_reset', {});
  }

  /**
   * Pause all agents
   */
  pauseAll() {
    const agents = Array.from(this.agents.values());
    agents.forEach(agent => {
      if (agent.status === 'running') {
        this.updateAgent(agent.id, { 
          status: 'paused',
          pausedAt: Date.now()
        });
      }
    });
    this.addEvent('system_pause_all', { count: agents.length });
  }

  /**
   * Resume all paused agents
   */
  resumeAll() {
    const agents = Array.from(this.agents.values());
    agents.forEach(agent => {
      if (agent.status === 'paused') {
        this.updateAgent(agent.id, { 
          status: 'running',
          resumedAt: Date.now()
        });
      }
    });
    this.addEvent('system_resume_all', { count: agents.length });
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const agents = Array.from(this.agents.values());
    const uptime = Date.now() - this.system.startTime;
    
    const statusCounts = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {});

    const avgUptime = agents
      .filter(agent => agent.startTime)
      .reduce((sum, agent) => {
        const agentUptime = agent.endTime 
          ? agent.endTime - agent.startTime 
          : Date.now() - agent.startTime;
        return sum + agentUptime;
      }, 0) / (agents.length || 1);

    return {
      systemUptime: uptime,
      totalAgents: agents.length,
      statusCounts,
      avgAgentUptime: avgUptime,
      totalEvents: this.events.length,
      lastEventTime: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null
    };
  }
}

module.exports = StateManager;