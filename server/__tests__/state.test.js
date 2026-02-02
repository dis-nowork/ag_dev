const StateManager = require('../state');

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('Agent Management', () => {
    it('should create new agent state', () => {
      const agentData = {
        name: 'test-agent',
        status: 'running',
        role: 'developer'
      };

      const agent = stateManager.updateAgent('agent-1', agentData);

      expect(agent).toMatchObject(agentData);
      expect(agent.lastUpdate).toBeDefined();
      expect(stateManager.getAgent('agent-1')).toEqual(agent);
    });

    it('should update existing agent state', () => {
      stateManager.updateAgent('agent-1', { name: 'test-agent', status: 'running' });
      const updated = stateManager.updateAgent('agent-1', { status: 'completed' });

      expect(updated.name).toBe('test-agent');
      expect(updated.status).toBe('completed');
    });

    it('should remove agent', () => {
      stateManager.updateAgent('agent-1', { name: 'test-agent' });
      const removed = stateManager.removeAgent('agent-1');

      expect(removed.name).toBe('test-agent');
      expect(stateManager.getAgent('agent-1')).toBeUndefined();
    });

    it('should list all agents', () => {
      stateManager.updateAgent('agent-1', { name: 'agent-1' });
      stateManager.updateAgent('agent-2', { name: 'agent-2' });

      const agents = stateManager.listAgents();
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.name)).toEqual(['agent-1', 'agent-2']);
    });
  });

  describe('Workflow Management', () => {
    it('should create and update workflow state', () => {
      const workflowData = {
        name: 'test-workflow',
        status: 'running',
        steps: ['step1', 'step2']
      };

      const workflow = stateManager.updateWorkflow('workflow-1', workflowData);

      expect(workflow).toMatchObject(workflowData);
      expect(workflow.lastUpdate).toBeDefined();
    });

    it('should get workflow by id', () => {
      const workflowData = { name: 'test-workflow', status: 'running' };
      stateManager.updateWorkflow('workflow-1', workflowData);

      const workflow = stateManager.getWorkflow('workflow-1');
      expect(workflow).toMatchObject(workflowData);
    });
  });

  describe('System Stats', () => {
    it('should update system stats when agents change', () => {
      expect(stateManager.getSystemState().activeAgents).toBe(0);

      stateManager.updateAgent('agent-1', { status: 'running' });
      expect(stateManager.getSystemState().activeAgents).toBe(1);

      stateManager.updateAgent('agent-2', { status: 'running' });
      expect(stateManager.getSystemState().activeAgents).toBe(2);

      stateManager.removeAgent('agent-1');
      expect(stateManager.getSystemState().activeAgents).toBe(1);
    });
  });

  describe('Event Logging', () => {
    it('should log events when agents are updated', () => {
      stateManager.updateAgent('agent-1', { name: 'test-agent' });

      const events = stateManager.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('agent_update');
      expect(events[0].data.name).toBe('test-agent');
    });

    it('should maintain event history within limits', () => {
      // Simulate many events
      for (let i = 0; i < 1500; i++) {
        stateManager.updateAgent(`agent-${i}`, { name: `agent-${i}` });
      }

      const events = stateManager.getEvents();
      expect(events.length).toBeLessThanOrEqual(1000); // maxEvents limit
    });
  });
});