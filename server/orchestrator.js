const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Orquestrador - Coordena agents, distribui tasks
 */
class Orchestrator {
  constructor(terminalManager, stateManager, config = {}) {
    this.terminalManager = terminalManager;
    this.stateManager = stateManager;
    this.config = config;
    
    this.agentDefinitions = new Map(); // nome -> definition
    this.workflows = new Map(); // nome -> workflow
    this.activeWorkflows = new Map(); // id -> workflow instance
    this.workflowExecution = null; // current workflow execution state
    
    this.loadAgentDefinitions();
    this.loadWorkflows();
  }

  /**
   * Load agent definitions from core/agents/*.md
   */
  async loadAgentDefinitions() {
    try {
      const agentsPath = path.join(__dirname, '../core/agents');
      const files = await fs.readdir(agentsPath);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = path.join(agentsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const name = path.basename(file, '.md');
          
          // Parse markdown para extrair definição do agent
          const definition = this.parseAgentDefinition(content, name);
          this.agentDefinitions.set(name, definition);
        }
      }
      
      console.log(`Loaded ${this.agentDefinitions.size} agent definitions`);
    } catch (error) {
      console.error('Error loading agent definitions:', error);
    }
  }

  /**
   * Load workflows from core/workflows/*.yaml
   */
  async loadWorkflows() {
    try {
      const workflowsPath = path.join(__dirname, '../core/workflows');
      const files = await fs.readdir(workflowsPath);
      
      for (const file of files) {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const filePath = path.join(workflowsPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const name = path.basename(file, path.extname(file));
          
          try {
            const workflow = yaml.load(content);
            workflow.name = name;
            this.workflows.set(name, workflow);
          } catch (yamlError) {
            console.error(`Error parsing workflow ${file}:`, yamlError);
          }
        }
      }
      
      console.log(`Loaded ${this.workflows.size} workflows`);
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  }

  /**
   * Parse agent definition from markdown
   */
  parseAgentDefinition(content, name) {
    const definition = {
      name,
      description: '',
      role: '',
      skills: [],
      commands: [],
      personality: '',
      examples: []
    };

    // Extract title/description from first lines
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        definition.role = trimmed.substring(2);
      } else if (trimmed.startsWith('## ') && trimmed.toLowerCase().includes('desc')) {
        // Next line usually contains description
        const nextIndex = lines.indexOf(line) + 1;
        if (nextIndex < lines.length) {
          definition.description = lines[nextIndex].trim();
        }
      }
    }

    // Default description if not found
    if (!definition.description) {
      definition.description = `${name} agent for development tasks`;
    }

    return definition;
  }

  /**
   * Get available agents
   */
  getAgentDefinitions() {
    return Array.from(this.agentDefinitions.values());
  }

  /**
   * Get available workflows
   */
  getWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Spawn agent usando definição
   */
  async spawnAgent(agentName, task = '', options = {}) {
    const definition = this.agentDefinitions.get(agentName);
    if (!definition) {
      throw new Error(`Agent definition '${agentName}' not found`);
    }

    // Create prompt for the agent
    const prompt = this.createAgentPrompt(definition, task);
    
    // Spawn terminal with Claude Code CLI
    const terminal = this.terminalManager.spawnClaudeAgent(prompt, options);
    
    // Update state
    this.stateManager.updateAgent(terminal.id, {
      name: agentName,
      role: definition.role,
      description: definition.description,
      task,
      status: 'running',
      startTime: terminal.startTime,
      terminalId: terminal.id
    });

    return terminal;
  }

  /**
   * Spawn custom command
   */
  async spawnCustomCommand(name, command, args = [], options = {}) {
    const terminal = this.terminalManager.spawnGenericCommand(command, args, options);
    
    // Update state
    this.stateManager.updateAgent(terminal.id, {
      name: name || command,
      role: 'Custom Command',
      description: `${command} ${args.join(' ')}`,
      status: 'running',
      startTime: terminal.startTime,
      terminalId: terminal.id,
      command,
      args
    });

    return terminal;
  }

  /**
   * Create prompt for agent based on definition and task
   */
  createAgentPrompt(definition, task) {
    let prompt = `You are ${definition.name}, ${definition.role}.

${definition.description}

Your current task: ${task}

Guidelines:
- Stay focused on your role as ${definition.name}
- Provide clear, actionable output
- If you need to run commands, explain what you're doing
- Ask for clarification if the task is unclear

Begin working on the task now.`;

    return prompt;
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(workflowName, context = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    const workflowId = `${workflowName}-${Date.now()}`;
    const instance = {
      id: workflowId,
      name: workflowName,
      status: 'running',
      startTime: Date.now(),
      context,
      currentStep: 0,
      steps: workflow.steps || [],
      agents: []
    };

    this.activeWorkflows.set(workflowId, instance);
    this.stateManager.updateWorkflow(workflowId, instance);

    // Start executing workflow steps
    this.executeWorkflowStep(workflowId);

    return instance;
  }

  /**
   * Execute workflow step
   */
  async executeWorkflowStep(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow || workflow.status !== 'running') {
      return;
    }

    const step = workflow.steps[workflow.currentStep];
    if (!step) {
      // Workflow completed
      workflow.status = 'completed';
      workflow.endTime = Date.now();
      this.stateManager.updateWorkflow(workflowId, workflow);
      return;
    }

    try {
      // Execute step based on type
      if (step.type === 'agent') {
        const agent = await this.spawnAgent(step.agent, step.task || '');
        workflow.agents.push(agent.id);
      } else if (step.type === 'command') {
        const command = await this.spawnCustomCommand(
          step.name || step.command,
          step.command,
          step.args || []
        );
        workflow.agents.push(command.id);
      }

      // Move to next step
      workflow.currentStep++;
      this.stateManager.updateWorkflow(workflowId, workflow);

      // Continue with next step after delay
      setTimeout(() => {
        this.executeWorkflowStep(workflowId);
      }, step.delay || 1000);

    } catch (error) {
      workflow.status = 'error';
      workflow.error = error.message;
      workflow.endTime = Date.now();
      this.stateManager.updateWorkflow(workflowId, workflow);
    }
  }

  /**
   * Stop workflow
   */
  stopWorkflow(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    workflow.status = 'stopped';
    workflow.endTime = Date.now();
    
    // Stop all agents in workflow
    for (const agentId of workflow.agents) {
      try {
        this.terminalManager.kill(agentId);
        this.stateManager.updateAgent(agentId, { status: 'stopped' });
      } catch (error) {
        console.error(`Error stopping agent ${agentId}:`, error);
      }
    }

    this.stateManager.updateWorkflow(workflowId, workflow);
    return workflow;
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId) {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * List active workflows
   */
  listActiveWorkflows() {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Handle agent events
   */
  handleAgentEvent(eventType, data) {
    const { id } = data;
    
    switch (eventType) {
      case 'exit':
        this.stateManager.updateAgent(id, {
          status: 'exited',
          exitCode: data.exitCode,
          endTime: Date.now()
        });
        break;
      
      case 'error':
        this.stateManager.updateAgent(id, {
          status: 'error',
          error: data.error,
          endTime: Date.now()
        });
        break;
    }

    // Check if this affects any active workflows
    for (const workflow of this.activeWorkflows.values()) {
      if (workflow.agents.includes(id)) {
        this.checkWorkflowCompletion(workflow.id);
      }
    }
  }

  /**
   * Check if workflow should complete based on agent states
   */
  checkWorkflowCompletion(workflowId) {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow || workflow.status !== 'running') {
      return;
    }

    const allAgentsComplete = workflow.agents.every(agentId => {
      const agent = this.stateManager.getAgent(agentId);
      return !agent || ['exited', 'error', 'stopped'].includes(agent.status);
    });

    if (allAgentsComplete && workflow.currentStep >= workflow.steps.length) {
      workflow.status = 'completed';
      workflow.endTime = Date.now();
      this.stateManager.updateWorkflow(workflowId, workflow);
    }
  }

  /**
   * Execute workflow with enhanced monitoring and step management
   */
  async executeWorkflow(workflowName, task, options = {}) {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      throw new Error(`Workflow '${workflowName}' not found`);
    }

    if (this.workflowExecution && this.workflowExecution.status === 'running') {
      throw new Error('Another workflow is already executing');
    }

    const executionId = `${workflowName}-${Date.now()}`;
    this.workflowExecution = {
      id: executionId,
      name: workflowName,
      status: 'running',
      startTime: Date.now(),
      task,
      options,
      currentStep: 0,
      steps: workflow.steps || [],
      completedSteps: [],
      activeAgents: new Map(), // stepIndex -> agent info
      stepTimings: [],
      events: []
    };

    // Emit SSE event for workflow start
    this.emitWorkflowEvent('workflow_started', this.workflowExecution);

    try {
      await this.executeWorkflowSteps();
      return this.workflowExecution;
    } catch (error) {
      this.workflowExecution.status = 'error';
      this.workflowExecution.error = error.message;
      this.workflowExecution.endTime = Date.now();
      this.emitWorkflowEvent('workflow_error', this.workflowExecution);
      throw error;
    }
  }

  /**
   * Execute workflow steps with dependency management
   */
  async executeWorkflowSteps() {
    const execution = this.workflowExecution;
    
    while (execution.currentStep < execution.steps.length && execution.status === 'running') {
      const step = execution.steps[execution.currentStep];
      
      // Check if step dependencies are met
      if (!this.areStepDependenciesMet(step)) {
        // Wait a bit and check again
        await this.sleep(2000);
        continue;
      }

      const stepStartTime = Date.now();
      execution.events.push({
        type: 'step_started',
        step: execution.currentStep,
        stepName: step.name || step.agent || step.command,
        timestamp: stepStartTime
      });

      this.emitWorkflowEvent('step_started', {
        step: execution.currentStep,
        stepInfo: step,
        execution: execution
      });

      try {
        const agentInfo = await this.executeWorkflowStep(step, execution.currentStep);
        
        if (agentInfo) {
          execution.activeAgents.set(execution.currentStep, agentInfo);
          
          // Monitor agent for completion (30s inactivity timeout)
          this.monitorStepAgent(execution.currentStep, agentInfo.terminalId);
        }

        execution.currentStep++;
        execution.stepTimings.push({
          step: execution.currentStep - 1,
          startTime: stepStartTime,
          spawnTime: Date.now()
        });

      } catch (error) {
        execution.events.push({
          type: 'step_error',
          step: execution.currentStep,
          error: error.message,
          timestamp: Date.now()
        });
        throw error;
      }
    }

    // All steps initiated, now wait for completion
    await this.waitForWorkflowCompletion();
  }

  /**
   * Execute a single workflow step
   */
  async executeWorkflowStep(step, stepIndex) {
    const contextualizedTask = this.contextualizeStepTask(step, this.workflowExecution.task);

    if (step.type === 'agent' || step.agent) {
      const agentName = step.agent || step.name;
      const terminal = await this.spawnAgent(agentName, contextualizedTask, this.workflowExecution.options);
      
      return {
        stepIndex,
        agentName,
        terminalId: terminal.id,
        task: contextualizedTask,
        startTime: Date.now(),
        status: 'running'
      };
    } else if (step.type === 'command' || step.command) {
      const terminal = await this.spawnCustomCommand(
        step.name || step.command,
        step.command,
        step.args || [],
        this.workflowExecution.options
      );

      return {
        stepIndex,
        command: step.command,
        terminalId: terminal.id,
        startTime: Date.now(),
        status: 'running'
      };
    }

    return null;
  }

  /**
   * Check if step dependencies are satisfied
   */
  areStepDependenciesMet(step) {
    if (!step.dependsOn || step.dependsOn.length === 0) {
      return true; // No dependencies
    }

    const execution = this.workflowExecution;
    
    for (const dependency of step.dependsOn) {
      const depStepIndex = typeof dependency === 'number' ? 
        dependency : 
        execution.steps.findIndex(s => s.name === dependency);

      if (depStepIndex === -1) {
        continue; // Dependency not found, skip
      }

      if (!execution.completedSteps.includes(depStepIndex)) {
        return false; // Dependency not yet completed
      }
    }

    return true;
  }

  /**
   * Monitor step agent for inactivity timeout
   */
  monitorStepAgent(stepIndex, terminalId) {
    const execution = this.workflowExecution;
    let lastActivityTime = Date.now();
    const inactivityTimeout = 30000; // 30 seconds

    const checkActivity = () => {
      if (execution.status !== 'running') {
        return; // Execution stopped
      }

      const stepInfo = execution.activeAgents.get(stepIndex);
      if (!stepInfo || stepInfo.status === 'completed') {
        return; // Step already completed
      }

      const timeSinceActivity = Date.now() - lastActivityTime;
      
      if (timeSinceActivity >= inactivityTimeout) {
        // Mark step as completed due to inactivity
        this.completeWorkflowStep(stepIndex, 'timeout');
      } else {
        // Check again after a short interval
        setTimeout(checkActivity, 5000);
      }
    };

    // Listen for terminal activity to update lastActivityTime
    const onTerminalActivity = (data) => {
      if (data.id === terminalId) {
        lastActivityTime = Date.now();
      }
    };

    this.terminalManager.on('data', onTerminalActivity);
    
    // Start monitoring
    setTimeout(checkActivity, inactivityTimeout);
  }

  /**
   * Complete a workflow step
   */
  completeWorkflowStep(stepIndex, reason = 'completed') {
    const execution = this.workflowExecution;
    const stepInfo = execution.activeAgents.get(stepIndex);
    
    if (!stepInfo || stepInfo.status === 'completed') {
      return; // Already completed
    }

    stepInfo.status = 'completed';
    stepInfo.endTime = Date.now();
    stepInfo.completionReason = reason;

    execution.completedSteps.push(stepIndex);
    
    // Update step timing
    const timing = execution.stepTimings.find(t => t.step === stepIndex);
    if (timing) {
      timing.endTime = Date.now();
      timing.duration = timing.endTime - timing.startTime;
    }

    execution.events.push({
      type: 'step_completed',
      step: stepIndex,
      reason,
      timestamp: Date.now()
    });

    this.emitWorkflowEvent('step_completed', {
      step: stepIndex,
      stepInfo,
      reason,
      execution
    });

    // Check if all steps are complete
    this.checkWorkflowExecutionCompletion();
  }

  /**
   * Wait for workflow completion
   */
  async waitForWorkflowCompletion() {
    const execution = this.workflowExecution;
    const maxWaitTime = 30 * 60 * 1000; // 30 minutes
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        if (execution.status !== 'running') {
          resolve(execution);
          return;
        }

        if (Date.now() - startTime > maxWaitTime) {
          execution.status = 'timeout';
          execution.endTime = Date.now();
          this.emitWorkflowEvent('workflow_timeout', execution);
          resolve(execution);
          return;
        }

        setTimeout(checkCompletion, 2000);
      };

      checkCompletion();
    });
  }

  /**
   * Check if entire workflow execution is complete
   */
  checkWorkflowExecutionCompletion() {
    const execution = this.workflowExecution;
    
    if (execution.status !== 'running') {
      return;
    }

    const totalSteps = execution.steps.length;
    const completedSteps = execution.completedSteps.length;

    if (completedSteps >= totalSteps) {
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      
      this.emitWorkflowEvent('workflow_completed', execution);
    }
  }

  /**
   * Stop current workflow execution
   */
  stopWorkflowExecution() {
    if (!this.workflowExecution || this.workflowExecution.status !== 'running') {
      throw new Error('No active workflow execution to stop');
    }

    this.workflowExecution.status = 'stopped';
    this.workflowExecution.endTime = Date.now();

    // Kill all active agents
    for (const [stepIndex, stepInfo] of this.workflowExecution.activeAgents) {
      if (stepInfo.terminalId && stepInfo.status === 'running') {
        try {
          this.terminalManager.kill(stepInfo.terminalId);
          stepInfo.status = 'stopped';
        } catch (error) {
          console.error(`Error stopping terminal ${stepInfo.terminalId}:`, error);
        }
      }
    }

    this.emitWorkflowEvent('workflow_stopped', this.workflowExecution);
    return this.workflowExecution;
  }

  /**
   * Get current workflow execution state
   */
  getWorkflowExecutionState() {
    return this.workflowExecution;
  }

  /**
   * Contextualize task for workflow step
   */
  contextualizeStepTask(step, originalTask) {
    const stepContext = step.context || '';
    const stepTask = step.task || originalTask;
    
    let contextualizedTask = `Workflow: ${this.workflowExecution.name}\n` +
                           `Original Task: ${originalTask}\n`;

    if (stepContext) {
      contextualizedTask += `Step Context: ${stepContext}\n`;
    }

    contextualizedTask += `\nYour specific task for this step: ${stepTask}\n` +
                         `Step ${this.workflowExecution.currentStep + 1} of ${this.workflowExecution.steps.length}`;

    return contextualizedTask;
  }

  /**
   * Emit workflow events (for SSE)
   */
  emitWorkflowEvent(eventType, data) {
    // This will be connected to the SSE broadcast system in server.js
    if (this.eventEmitter) {
      this.eventEmitter.emit('workflow_event', { type: eventType, data });
    }
  }

  /**
   * Set event emitter for SSE broadcasts
   */
  setEventEmitter(emitter) {
    this.eventEmitter = emitter;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = Orchestrator;