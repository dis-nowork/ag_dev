/**
 * WorkflowEngine — Reads YAML workflow files and orchestrates agent execution
 * 
 * Supports two workflow formats found in core/workflows/:
 * 
 * 1. Phase-based (greenfield-fullstack, brownfield-*, etc.)
 *    - workflow.phases[] and workflow.sequence[]
 *    - Each sequence entry has: agent, creates/action, requires, optional, condition, notes
 *    - Phase markers: { phase: N, name: "..." }
 * 
 * 2. Step-based (qa-loop)
 *    - workflow.sequence[] with step/phase/agent/task/inputs/outputs/on_success/on_failure
 *    - Loop/conditional control flow
 * 
 * The engine normalizes both formats into a unified step model for execution.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'core', 'workflows');
const STATE_FILE = path.join(__dirname, 'workflow-state.json');

/**
 * Step status values
 */
const StepStatus = {
  PENDING: 'pending',
  READY: 'ready',       // dependencies met, can start
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  PAUSED: 'paused',
};

/**
 * Workflow status values
 */
const WorkflowStatus = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

class WorkflowEngine {
  /**
   * @param {object} options
   * @param {import('./runtimes/index').AgentRuntime} options.runtime - Agent runtime to use
   * @param {function} options.onEvent - Callback for SSE broadcast: (type, data) => void
   * @param {object} options.agentLoader - { getDefinition(agentId) → string }
   */
  constructor(options = {}) {
    this.runtime = options.runtime || null;
    this.onEvent = options.onEvent || (() => {});
    this.agentLoader = options.agentLoader || null;

    // Current workflow state
    this.state = {
      status: WorkflowStatus.IDLE,
      workflowName: null,
      workflowId: null,
      params: {},
      steps: [],        // normalized steps with status
      startedAt: null,
      updatedAt: null,
      currentPhase: null,
      error: null,
    };

    // Session tracking: stepId -> sessionKey
    this._sessionMap = new Map();

    // Load persisted state if exists
    this._loadState();
  }

  // ─── Workflow Loading ───

  /**
   * List all available workflow files
   * @returns {Array<{name: string, file: string, id: string, description: string, type: string}>}
   */
  listAvailable() {
    const workflows = [];
    if (!fs.existsSync(WORKFLOWS_DIR)) return workflows;

    fs.readdirSync(WORKFLOWS_DIR).forEach(f => {
      if (!f.endsWith('.yaml') && !f.endsWith('.yml')) return;
      try {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8');
        const parsed = yaml.load(content);
        const wf = parsed.workflow || parsed;
        workflows.push({
          name: wf.name || f.replace(/\.(yaml|yml)$/, ''),
          file: f,
          id: wf.id || f.replace(/\.(yaml|yml)$/, ''),
          description: wf.description || '',
          type: wf.type || 'unknown',
        });
      } catch (e) {
        workflows.push({
          name: f.replace(/\.(yaml|yml)$/, ''),
          file: f,
          id: f.replace(/\.(yaml|yml)$/, ''),
          description: `(parse error: ${e.message})`,
          type: 'unknown',
        });
      }
    });

    return workflows;
  }

  /**
   * Load and parse a workflow YAML file
   * @param {string} name - Workflow name (without extension)
   * @returns {{ok: boolean, workflow?: object, steps?: Array, error?: string}}
   */
  loadWorkflow(name) {
    const filePath = this._resolveWorkflowPath(name);
    if (!filePath) {
      return { ok: false, error: `Workflow not found: ${name}` };
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.load(content);
      const wf = parsed.workflow || parsed;
      const steps = this._normalizeSteps(wf);

      return { ok: true, workflow: wf, steps };
    } catch (e) {
      return { ok: false, error: `Failed to parse workflow: ${e.message}` };
    }
  }

  // ─── Workflow Execution ───

  /**
   * Start executing a workflow
   * @param {string} name - Workflow name
   * @param {object} params - Execution parameters (e.g., projectRoot, storyId)
   * @returns {{ok: boolean, error?: string}}
   */
  async startWorkflow(name, params = {}) {
    if (this.state.status === WorkflowStatus.RUNNING) {
      return { ok: false, error: 'A workflow is already running. Pause or stop it first.' };
    }

    const loaded = this.loadWorkflow(name);
    if (!loaded.ok) return loaded;

    // Initialize state
    this.state = {
      status: WorkflowStatus.RUNNING,
      workflowName: loaded.workflow.name || name,
      workflowId: loaded.workflow.id || name,
      params,
      steps: loaded.steps.map(s => ({
        ...s,
        status: StepStatus.PENDING,
        startedAt: null,
        completedAt: null,
        error: null,
        sessionKey: null,
      })),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentPhase: null,
      error: null,
    };

    this._saveState();
    this._emitEvent('workflow_started', {
      name: this.state.workflowName,
      id: this.state.workflowId,
      stepCount: this.state.steps.length,
    });

    // Kick off execution
    await this._advanceWorkflow();

    return { ok: true };
  }

  /**
   * Pause the current workflow
   */
  async pauseWorkflow() {
    if (this.state.status !== WorkflowStatus.RUNNING) {
      return { ok: false, error: 'No workflow is running' };
    }

    this.state.status = WorkflowStatus.PAUSED;
    this.state.updatedAt = new Date().toISOString();

    // Pause any running steps
    for (const step of this.state.steps) {
      if (step.status === StepStatus.RUNNING) {
        step.status = StepStatus.PAUSED;
        if (step.sessionKey && this.runtime) {
          try { await this.runtime.pauseAgent(step.sessionKey); } catch {}
        }
      }
    }

    this._saveState();
    this._emitEvent('workflow_paused', { name: this.state.workflowName });
    return { ok: true };
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow() {
    if (this.state.status !== WorkflowStatus.PAUSED) {
      return { ok: false, error: 'Workflow is not paused' };
    }

    this.state.status = WorkflowStatus.RUNNING;
    this.state.updatedAt = new Date().toISOString();

    // Resume paused steps
    for (const step of this.state.steps) {
      if (step.status === StepStatus.PAUSED) {
        step.status = StepStatus.RUNNING;
        if (step.sessionKey && this.runtime) {
          try { await this.runtime.resumeAgent(step.sessionKey); } catch {}
        }
      }
    }

    this._saveState();
    this._emitEvent('workflow_resumed', { name: this.state.workflowName });

    // Continue advancing
    await this._advanceWorkflow();

    return { ok: true };
  }

  /**
   * Get current workflow state
   */
  getWorkflowState() {
    return { ...this.state };
  }

  /**
   * Mark a step as completed (external trigger — e.g., agent finished)
   * @param {string} stepId
   * @param {object} result - Optional result data
   */
  async completeStep(stepId, result = {}) {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) return { ok: false, error: `Step not found: ${stepId}` };

    step.status = StepStatus.COMPLETED;
    step.completedAt = new Date().toISOString();
    step.result = result;
    this.state.updatedAt = new Date().toISOString();

    this._saveState();
    this._emitEvent('step_completed', { stepId, agent: step.agent });

    // Check if workflow is complete
    const allDone = this.state.steps.every(
      s => s.status === StepStatus.COMPLETED || s.status === StepStatus.SKIPPED
    );

    if (allDone) {
      this.state.status = WorkflowStatus.COMPLETED;
      this.state.updatedAt = new Date().toISOString();
      this._saveState();
      this._emitEvent('workflow_completed', { name: this.state.workflowName });
      return { ok: true, workflowComplete: true };
    }

    // Advance to next available steps
    if (this.state.status === WorkflowStatus.RUNNING) {
      await this._advanceWorkflow();
    }

    return { ok: true };
  }

  /**
   * Mark a step as failed
   * @param {string} stepId
   * @param {string} error
   */
  async failStep(stepId, error) {
    const step = this.state.steps.find(s => s.id === stepId);
    if (!step) return { ok: false, error: `Step not found: ${stepId}` };

    step.status = StepStatus.FAILED;
    step.error = error;
    step.completedAt = new Date().toISOString();
    this.state.updatedAt = new Date().toISOString();

    this._saveState();
    this._emitEvent('step_failed', { stepId, agent: step.agent, error });

    return { ok: true };
  }

  // ─── Internal: Workflow Advancement ───

  /**
   * Check which steps can run and spawn them
   */
  async _advanceWorkflow() {
    if (this.state.status !== WorkflowStatus.RUNNING) return;

    const readySteps = this._findReadySteps();

    for (const step of readySteps) {
      step.status = StepStatus.RUNNING;
      step.startedAt = new Date().toISOString();
      this.state.currentPhase = step.phase || this.state.currentPhase;

      this._emitEvent('step_started', {
        stepId: step.id,
        agent: step.agent,
        task: step.task,
        phase: step.phase,
      });

      // Try to spawn the agent if runtime is available
      if (this.runtime && this.runtime.connected && step.agent && step.agent !== 'system') {
        try {
          const spawnConfig = {
            task: step.task || step.notes || `Execute step: ${step.id}`,
            label: `ag-dev:${step.agent}:${step.id}`,
            model: undefined,
          };

          // Load agent system prompt if available
          if (this.agentLoader) {
            try {
              const def = this.agentLoader.getDefinition(step.agent);
              if (def) spawnConfig.systemPrompt = def;
            } catch {}
          }

          const result = await this.runtime.spawnAgent(step.agent, spawnConfig);
          if (result.ok) {
            step.sessionKey = result.sessionKey;
            this._sessionMap.set(step.id, result.sessionKey);

            // Subscribe to completion events
            if (result.sessionKey) {
              this.runtime.subscribeToAgent(result.sessionKey, (evt) => {
                this._handleAgentEvent(step.id, evt);
              });
            }
          } else {
            console.error(`  ⚠ Failed to spawn agent for step ${step.id}: ${result.error}`);
          }
        } catch (e) {
          console.error(`  ⚠ Error spawning agent for step ${step.id}: ${e.message}`);
        }
      }
    }

    this._saveState();
  }

  /**
   * Find steps whose dependencies are all met
   */
  _findReadySteps() {
    return this.state.steps.filter(step => {
      if (step.status !== StepStatus.PENDING) return false;

      // Check all dependencies are completed
      if (step.dependencies && step.dependencies.length > 0) {
        return step.dependencies.every(depId => {
          const dep = this.state.steps.find(s => s.id === depId);
          return dep && (dep.status === StepStatus.COMPLETED || dep.status === StepStatus.SKIPPED);
        });
      }

      return true; // No dependencies — ready immediately
    });
  }

  /**
   * Handle events from a running agent
   */
  _handleAgentEvent(stepId, evt) {
    const event = evt.event || '';
    // Auto-complete step if agent session completes
    if (event === 'session.complete' || event === 'session.done' || event === 'agent.complete') {
      this.completeStep(stepId, evt.payload || {});
    }
    if (event === 'session.error' || event === 'agent.error') {
      this.failStep(stepId, evt.payload?.error || 'Agent error');
    }
  }

  // ─── Internal: YAML Normalization ───

  /**
   * Normalize workflow YAML into a flat list of executable steps
   * Handles both phase-based and step-based formats
   */
  _normalizeSteps(wf) {
    const sequence = wf.sequence || [];
    const steps = [];
    let currentPhase = null;
    let stepIndex = 0;

    for (const entry of sequence) {
      // Phase marker
      if (entry.phase !== undefined && entry.name && !entry.agent && !entry.step) {
        currentPhase = { number: entry.phase, name: entry.name, description: entry.description || '' };
        continue;
      }

      // Skip non-actionable entries (guidance, repeat markers, etc.)
      if (entry.project_setup_guidance || entry.development_order_guidance ||
          entry.repeat_development_cycle || entry.workflow_end) {
        continue;
      }

      // Step-based format (qa-loop style)
      if (entry.step) {
        const step = {
          id: entry.step,
          index: stepIndex++,
          phase: entry.phase_name || entry.phase || currentPhase?.name,
          phaseNumber: typeof entry.phase === 'number' ? entry.phase : currentPhase?.number,
          agent: entry.agent || 'system',
          task: entry.task || entry.description || '',
          action: entry.action || null,
          creates: null,
          requires: null,
          dependencies: [],
          optional: false,
          condition: null,
          notes: entry.description || '',
          inputs: entry.inputs || {},
          outputs: entry.outputs || [],
          onSuccess: entry.on_success || null,
          onFailure: entry.on_failure || null,
          timeout: entry.timeout || null,
        };

        // Derive dependencies from on_success.next of previous steps
        // For step-based workflows, dependencies are implicit (sequential) unless branching
        if (steps.length > 0 && step.agent !== 'system') {
          // Look for any step whose on_success.next points to this step
          const pointsToThis = steps.filter(s =>
            s.onSuccess?.next === entry.step
          );
          if (pointsToThis.length > 0) {
            step.dependencies = pointsToThis.map(s => s.id);
          }
        }

        steps.push(step);
        continue;
      }

      // Phase-based format (greenfield style)
      if (entry.agent) {
        const id = this._generateStepId(entry, stepIndex);
        const requires = entry.requires;
        const dependencies = [];

        // Parse requires into dependency IDs
        if (requires) {
          if (typeof requires === 'string') {
            // Find a step that creates this artifact
            const dep = steps.find(s => s.creates === requires || s.id === requires);
            if (dep) dependencies.push(dep.id);
          } else if (Array.isArray(requires)) {
            for (const req of requires) {
              const dep = steps.find(s => s.creates === req || s.id === req);
              if (dep) dependencies.push(dep.id);
            }
          }
        }

        // If no explicit requires but there are previous steps in same phase, 
        // make it sequential within the phase
        if (dependencies.length === 0 && steps.length > 0 && !entry.optional) {
          // Find the last non-optional step
          for (let i = steps.length - 1; i >= 0; i--) {
            if (!steps[i].optional && steps[i].agent !== 'system') {
              dependencies.push(steps[i].id);
              break;
            }
          }
        }

        steps.push({
          id,
          index: stepIndex++,
          phase: currentPhase?.name || null,
          phaseNumber: currentPhase?.number ?? null,
          agent: entry.agent,
          task: entry.task || entry.action || '',
          action: entry.action || null,
          creates: entry.creates || null,
          requires: requires || null,
          dependencies,
          optional: entry.optional === true,
          condition: entry.condition || null,
          notes: entry.notes || '',
          inputs: {},
          outputs: [],
          onSuccess: null,
          onFailure: null,
          timeout: null,
        });
      }
    }

    return steps;
  }

  /**
   * Generate a unique step ID from entry data
   */
  _generateStepId(entry, index) {
    if (entry.action) return `${entry.agent}-${entry.action}`.replace(/[^a-z0-9-]/gi, '-');
    if (entry.creates) {
      const creates = Array.isArray(entry.creates) ? entry.creates[0] : entry.creates;
      return `${entry.agent}-${creates}`.replace(/[^a-z0-9-]/gi, '-');
    }
    if (entry.updates) return `${entry.agent}-update-${entry.updates}`.replace(/[^a-z0-9-]/gi, '-');
    if (entry.validates) return `${entry.agent}-validate`.replace(/[^a-z0-9-]/gi, '-');
    return `step-${index}`;
  }

  // ─── Internal: File Resolution ───

  /**
   * Resolve workflow name to file path
   * @param {string} name - Workflow name (with or without extension)
   * @returns {string|null}
   */
  _resolveWorkflowPath(name) {
    // Try exact match
    const exact = path.join(WORKFLOWS_DIR, name);
    if (fs.existsSync(exact)) return exact;

    // Try with extensions
    for (const ext of ['.yaml', '.yml']) {
      const withExt = path.join(WORKFLOWS_DIR, name + ext);
      if (fs.existsSync(withExt)) return withExt;
    }

    return null;
  }

  // ─── Internal: Event Emission ───

  _emitEvent(type, data) {
    this.onEvent(type, { ...data, time: new Date().toISOString() });
  }

  // ─── Internal: State Persistence ───

  _loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        this.state = { ...this.state, ...loaded };
      }
    } catch (e) {
      console.error('  ⚠ Failed to load workflow-state.json:', e.message);
    }
  }

  _saveState() {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (e) {
      console.error('  ⚠ Failed to save workflow-state.json:', e.message);
    }
  }
}

module.exports = { WorkflowEngine, StepStatus, WorkflowStatus };
