const Orchestrator = require('../orchestrator');

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}));

const fs = require('fs').promises;

describe('Orchestrator', () => {
  let orchestrator;
  let mockTerminalManager;
  let mockStateManager;
  let mockConfig;

  beforeEach(() => {
    mockTerminalManager = {
      spawnClaudeAgent: jest.fn(),
      spawnGenericCommand: jest.fn(),
      kill: jest.fn(),
      on: jest.fn()
    };

    mockStateManager = {
      updateAgent: jest.fn(),
      updateWorkflow: jest.fn(),
      getAgent: jest.fn(),
      getWorkflow: jest.fn()
    };

    mockConfig = {
      projectRoot: '/mock/project',
      qualityCommands: []
    };

    orchestrator = new Orchestrator(mockTerminalManager, mockStateManager, mockConfig);
  });

  describe('Initialization', () => {
    it('should initialize with dependencies', () => {
      expect(orchestrator.terminalManager).toBe(mockTerminalManager);
      expect(orchestrator.stateManager).toBe(mockStateManager);
      expect(orchestrator.config).toBe(mockConfig);
    });

    it('should initialize collections', () => {
      expect(orchestrator.agentDefinitions).toBeInstanceOf(Map);
      expect(orchestrator.workflows).toBeInstanceOf(Map);
      expect(orchestrator.activeWorkflows).toBeInstanceOf(Map);
    });
  });

  describe('Agent Definition Management', () => {
    beforeEach(() => {
      // Mock filesystem operations for loading agent definitions
      fs.readdir.mockResolvedValue(['test-agent.md', 'other-file.txt']);
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('test-agent.md')) {
          return Promise.resolve(`# Agent: Test Agent (test-agent)

## Role
A test agent for development tasks

## Expertise
- Testing
- Debugging
- Automation

## Behavior
- Write comprehensive tests
- Debug systematically
- Automate repetitive tasks

## Current Directive
Test the system thoroughly
`);
        }
        return Promise.reject(new Error('File not found'));
      });
    });

    it('should load agent definitions from markdown files', async () => {
      await orchestrator.loadAgentDefinitions();
      
      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('test-agent.md'),
        'utf-8'
      );
      
      const definitions = orchestrator.getAgentDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('test-agent');
      expect(definitions[0].agentName).toBe('Test Agent');
      expect(definitions[0].agentId).toBe('test-agent');
    });

    it('should parse agent definition correctly', () => {
      const content = `# Agent: Test Agent (test-agent)

## Role
A test agent

## Expertise
- Testing
- Debugging

## Behavior
- Be thorough
- Be systematic

## Current Directive
Test everything
`;

      const definition = orchestrator.parseAgentDefinition(content, 'test-agent');
      
      expect(definition.agentName).toBe('Test Agent');
      expect(definition.agentId).toBe('test-agent');
      expect(definition.role).toBe('A test agent');
      expect(definition.expertise).toEqual(['Testing', 'Debugging']);
      expect(definition.behavior).toEqual(['Be thorough', 'Be systematic']);
      expect(definition.directive).toBe('Test everything');
    });
  });

  describe('Agent Spawning', () => {
    beforeEach(() => {
      // Add a mock agent definition
      const mockDefinition = {
        name: 'test-agent',
        agentName: 'Test Agent',
        role: 'Testing agent',
        expertise: ['Testing'],
        behavior: ['Be thorough']
      };
      orchestrator.agentDefinitions.set('test-agent', mockDefinition);

      mockTerminalManager.spawnClaudeAgent.mockReturnValue({
        id: 'terminal-1',
        startTime: Date.now()
      });
    });

    it('should spawn agent with definition', async () => {
      const terminal = await orchestrator.spawnAgent('test-agent', 'Run tests');

      expect(mockTerminalManager.spawnClaudeAgent).toHaveBeenCalledWith(
        expect.stringContaining('You are Test Agent'),
        {}
      );
      expect(mockStateManager.updateAgent).toHaveBeenCalledWith(
        'terminal-1',
        expect.objectContaining({
          name: 'test-agent',
          role: 'Testing agent',
          task: 'Run tests',
          status: 'running'
        })
      );
      expect(terminal.id).toBe('terminal-1');
    });

    it('should throw error for unknown agent', async () => {
      await expect(orchestrator.spawnAgent('unknown-agent')).rejects.toThrow(
        "Agent definition 'unknown-agent' not found"
      );
    });

    it('should create proper agent prompt', () => {
      const definition = {
        name: 'test-agent',
        agentName: 'Test Agent',
        role: 'A testing agent',
        expertise: ['Testing', 'Debugging'],
        behavior: ['Be thorough', 'Be systematic']
      };

      const prompt = orchestrator.createAgentPrompt(definition, 'Run unit tests');

      expect(prompt).toContain('You are Test Agent');
      expect(prompt).toContain('A testing agent');
      expect(prompt).toContain('Expertise:');
      expect(prompt).toContain('- Testing');
      expect(prompt).toContain('- Debugging');
      expect(prompt).toContain('Behavioral rules:');
      expect(prompt).toContain('- Be thorough');
      expect(prompt).toContain('Your current task: Run unit tests');
    });
  });

  describe('Custom Command Spawning', () => {
    beforeEach(() => {
      mockTerminalManager.spawnGenericCommand.mockReturnValue({
        id: 'terminal-2',
        startTime: Date.now()
      });
    });

    it('should spawn custom command', async () => {
      const terminal = await orchestrator.spawnCustomCommand(
        'npm-test',
        'npm',
        ['test'],
        { timeout: 60 }
      );

      expect(mockTerminalManager.spawnGenericCommand).toHaveBeenCalledWith(
        'npm',
        ['test'],
        { timeout: 60 }
      );
      expect(mockStateManager.updateAgent).toHaveBeenCalledWith(
        'terminal-2',
        expect.objectContaining({
          name: 'npm-test',
          role: 'Custom Command',
          command: 'npm',
          args: ['test']
        })
      );
    });
  });

  describe('Workflow Management', () => {
    beforeEach(() => {
      // Mock workflow loading
      fs.readdir.mockResolvedValue(['test-workflow.yaml']);
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('test-workflow.yaml')) {
          return Promise.resolve(`
name: test-workflow
description: Test workflow
steps:
  - type: agent
    agent: test-agent
    task: Run tests
  - type: command
    name: build
    command: npm
    args: ['run', 'build']
`);
        }
        return Promise.reject(new Error('File not found'));
      });
    });

    it('should load workflows from YAML files', async () => {
      // Mock js-yaml
      jest.doMock('js-yaml', () => ({
        load: jest.fn().mockReturnValue({
          name: 'test-workflow',
          description: 'Test workflow',
          steps: [
            { type: 'agent', agent: 'test-agent', task: 'Run tests' },
            { type: 'command', name: 'build', command: 'npm', args: ['run', 'build'] }
          ]
        })
      }));

      await orchestrator.loadWorkflows();
      
      const workflows = orchestrator.getWorkflows();
      expect(workflows).toHaveLength(1);
      expect(workflows[0].name).toBe('test-workflow');
    });

    it('should start workflow execution', async () => {
      // Add a mock workflow
      const mockWorkflow = {
        name: 'test-workflow',
        steps: [
          { type: 'agent', agent: 'test-agent', task: 'Run tests' }
        ]
      };
      orchestrator.workflows.set('test-workflow', mockWorkflow);

      const instance = await orchestrator.startWorkflow('test-workflow', { env: 'test' });

      expect(instance.name).toBe('test-workflow');
      expect(instance.status).toBe('running');
      expect(instance.context).toEqual({ env: 'test' });
      expect(mockStateManager.updateWorkflow).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should handle agent exit events', () => {
      mockStateManager.getAgent.mockReturnValue({ status: 'exited' });
      
      orchestrator.handleAgentEvent('exit', { id: 'agent-1', exitCode: 0 });

      expect(mockStateManager.updateAgent).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({
          status: 'exited',
          exitCode: 0,
          endTime: expect.any(Number)
        })
      );
    });

    it('should handle agent error events', () => {
      orchestrator.handleAgentEvent('error', { id: 'agent-1', error: 'Test error' });

      expect(mockStateManager.updateAgent).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({
          status: 'error',
          error: 'Test error',
          endTime: expect.any(Number)
        })
      );
    });
  });

  describe('Runtime Integration', () => {
    let mockRuntime;

    beforeEach(() => {
      mockRuntime = {
        isConnected: jest.fn().mockReturnValue(true),
        spawnAgent: jest.fn().mockResolvedValue({
          id: 'runtime-agent-1',
          startTime: Date.now()
        })
      };

      // Create orchestrator with runtime
      orchestrator = new Orchestrator(mockTerminalManager, mockStateManager, mockConfig, mockRuntime);
    });

    it('should use runtime when available for spawning agents', async () => {
      const definition = {
        name: 'test-agent',
        agentName: 'Test Agent',
        role: 'Testing agent'
      };
      orchestrator.agentDefinitions.set('test-agent', definition);

      const terminal = await orchestrator.spawnAgent('test-agent', 'Test task');

      expect(mockRuntime.spawnAgent).toHaveBeenCalled();
      expect(mockTerminalManager.spawnClaudeAgent).not.toHaveBeenCalled();
    });

    it('should fallback to PTY when runtime not connected', async () => {
      mockRuntime.isConnected.mockReturnValue(false);
      mockTerminalManager.spawnClaudeAgent.mockReturnValue({
        id: 'pty-agent-1',
        startTime: Date.now()
      });

      const definition = {
        name: 'test-agent',
        agentName: 'Test Agent',
        role: 'Testing agent'
      };
      orchestrator.agentDefinitions.set('test-agent', definition);

      const terminal = await orchestrator.spawnAgent('test-agent', 'Test task');

      expect(mockTerminalManager.spawnClaudeAgent).toHaveBeenCalled();
      expect(mockRuntime.spawnAgent).not.toHaveBeenCalled();
    });
  });
});