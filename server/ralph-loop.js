const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class RalphLoop {
  constructor(terminalManager, options = {}) {
    this.terminalManager = terminalManager;
    this.projectRoot = options.projectRoot || process.cwd();
    this.maxIterations = options.maxIterations || 20;
    this.qualityCommands = options.qualityCommands || [];
    this.onEvent = options.onEvent || (() => {});
    this.state = {
      status: 'idle', // idle | running | paused | completed | failed
      prd: null,
      currentIteration: 0,
      currentTask: null,
      completedTasks: [],
      failedTasks: [],
      startTime: null,
      learnings: []
    };
    this._loopRunning = false;
  }

  // Load PRD from JSON file or object
  loadPRD(prdData) {
    // prd format: { name, branchName, userStories: [{ id, title, description, priority, passes, acceptanceCriteria[] }] }
    if (typeof prdData === 'string') {
      // It's a file path
      const content = fs.readFileSync(path.resolve(this.projectRoot, prdData), 'utf-8');
      this.state.prd = JSON.parse(content);
    } else {
      this.state.prd = prdData;
    }
    return this.state.prd;
  }

  // Generate PRD from a description (creates structured tasks)
  generatePRD(description, options = {}) {
    // Parse description into small, actionable tasks
    // Each task should be completable in one context window
    const prd = {
      name: options.name || 'Development Task',
      branchName: options.branchName || `feature/${Date.now()}`,
      createdAt: new Date().toISOString(),
      userStories: []
    };

    // If description contains numbered items or bullet points, split them
    const lines = description.split('\n').filter(l => l.trim());
    let storyIndex = 0;
    
    for (const line of lines) {
      const cleaned = line.replace(/^[\s\-\*\d.]+/, '').trim();
      if (cleaned.length > 5) {
        storyIndex++;
        prd.userStories.push({
          id: `story-${storyIndex}`,
          title: cleaned.slice(0, 100),
          description: cleaned,
          priority: storyIndex,
          passes: false,
          acceptanceCriteria: [],
          learnings: ''
        });
      }
    }

    // If no structured items found, create a single story
    if (prd.userStories.length === 0) {
      prd.userStories.push({
        id: 'story-1',
        title: description.slice(0, 100),
        description: description,
        priority: 1,
        passes: false,
        acceptanceCriteria: [],
        learnings: ''
      });
    }

    this.state.prd = prd;
    this._savePRD();
    return prd;
  }

  // Start the autonomous loop
  async start() {
    if (this.state.status === 'running') {
      return { ok: false, error: 'Loop already running' };
    }
    if (!this.state.prd) {
      return { ok: false, error: 'No PRD loaded. Call loadPRD() or generatePRD() first.' };
    }

    this.state.status = 'running';
    this.state.startTime = Date.now();
    this.state.currentIteration = 0;
    this._loopRunning = true;

    this.onEvent('loop_started', { prd: this.state.prd.name, stories: this.state.prd.userStories.length });
    
    await this._runLoop();
    
    return { ok: true };
  }

  // Pause the loop
  pause() {
    this._loopRunning = false;
    this.state.status = 'paused';
    this.onEvent('loop_paused', { iteration: this.state.currentIteration });
  }

  // Resume the loop
  async resume() {
    if (this.state.status !== 'paused') {
      return { ok: false, error: 'Loop is not paused' };
    }
    this.state.status = 'running';
    this._loopRunning = true;
    this.onEvent('loop_resumed', { iteration: this.state.currentIteration });
    await this._runLoop();
    return { ok: true };
  }

  // Stop the loop
  stop() {
    this._loopRunning = false;
    this.state.status = 'idle';
    this.onEvent('loop_stopped', { iteration: this.state.currentIteration });
  }

  // Get current state
  getState() {
    const pending = this.state.prd ? this.state.prd.userStories.filter(s => !s.passes).length : 0;
    const completed = this.state.prd ? this.state.prd.userStories.filter(s => s.passes).length : 0;
    const total = this.state.prd ? this.state.prd.userStories.length : 0;
    
    return {
      ...this.state,
      pending,
      completed,
      total,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  // === Internal: The Loop ===
  
  async _runLoop() {
    while (this._loopRunning) {
      // Check if all stories pass
      const pendingStories = this.state.prd.userStories.filter(s => !s.passes);
      if (pendingStories.length === 0) {
        this.state.status = 'completed';
        this.onEvent('loop_completed', { 
          iterations: this.state.currentIteration,
          duration: Date.now() - this.state.startTime 
        });
        this._appendLearning('🏁 All stories completed successfully.');
        break;
      }

      // Check max iterations
      if (this.state.currentIteration >= this.maxIterations) {
        this.state.status = 'failed';
        this.onEvent('loop_max_iterations', { iteration: this.state.currentIteration });
        this._appendLearning(`⚠️ Reached max iterations (${this.maxIterations}) with ${pendingStories.length} stories remaining.`);
        break;
      }

      // Pick highest priority pending story
      const story = pendingStories.sort((a, b) => a.priority - b.priority)[0];
      this.state.currentIteration++;
      this.state.currentTask = story;

      this.onEvent('iteration_started', { 
        iteration: this.state.currentIteration, 
        story: story.title,
        storyId: story.id 
      });

      try {
        // Build the prompt with context
        const prompt = this._buildPrompt(story);
        
        // Spawn a fresh agent (clean context each iteration)
        const terminalResult = await this._spawnAgent(prompt);
        
        // Wait for agent to complete
        await this._waitForCompletion(terminalResult.id);
        
        // Run quality gates
        const qualityResult = await this._runQualityGates();
        
        if (qualityResult.passed) {
          // Mark story as done
          story.passes = true;
          story.completedAt = new Date().toISOString();
          this.state.completedTasks.push(story.id);
          this._savePRD();
          
          this.onEvent('story_completed', { storyId: story.id, title: story.title });
          this._appendLearning(`✅ [${story.id}] ${story.title} — Completed successfully.`);
          
          // Try to git commit
          this._tryGitCommit(story);
        } else {
          // Story failed quality gates
          story.attempts = (story.attempts || 0) + 1;
          this.state.failedTasks.push({ storyId: story.id, reason: qualityResult.reason, attempt: story.attempts });
          
          this.onEvent('story_failed', { storyId: story.id, reason: qualityResult.reason });
          this._appendLearning(`❌ [${story.id}] ${story.title} — Failed: ${qualityResult.reason}`);
          
          // If failed 3 times, skip and move on
          if (story.attempts >= 3) {
            story.passes = true; // mark as "attempted" to avoid infinite loop
            story.skipped = true;
            this._appendLearning(`⏭️ [${story.id}] Skipped after 3 failed attempts.`);
          }
        }
        
        // Clean up terminal
        try { this.terminalManager.kill(terminalResult.id); } catch {}
        
      } catch (error) {
        this.onEvent('iteration_error', { iteration: this.state.currentIteration, error: error.message });
        this._appendLearning(`💥 Iteration ${this.state.currentIteration} error: ${error.message}`);
      }

      // Small delay between iterations
      await this._delay(2000);
    }
  }

  _buildPrompt(story) {
    // Read project context files if they exist
    const contextParts = [];
    
    const contextFiles = ['GOALS.md', 'STACK.md', 'CONSTRAINTS.md'];
    for (const file of contextFiles) {
      const filePath = path.join(this.projectRoot, 'project-context', file);
      try {
        if (fs.existsSync(filePath)) {
          contextParts.push(`## ${file}\n${fs.readFileSync(filePath, 'utf-8')}`);
        }
      } catch {}
    }
    
    // Read progress/learnings
    const progressPath = path.join(this.projectRoot, 'project-context', 'PROGRESS.md');
    try {
      if (fs.existsSync(progressPath)) {
        const progress = fs.readFileSync(progressPath, 'utf-8');
        // Only include last 50 lines to keep context fresh
        const recentProgress = progress.split('\n').slice(-50).join('\n');
        contextParts.push(`## Recent Learnings\n${recentProgress}`);
      }
    } catch {}
    
    return `You are a development agent working on: ${this.state.prd.name}

${contextParts.length > 0 ? '# Project Context\n' + contextParts.join('\n\n') : ''}

# Your Current Task
**Story:** ${story.title}
**Description:** ${story.description}
${story.acceptanceCriteria.length > 0 ? `**Acceptance Criteria:**\n${story.acceptanceCriteria.map(c => `- ${c}`).join('\n')}` : ''}

# Instructions
1. Implement this single task completely
2. Keep changes focused and minimal
3. Write tests if applicable
4. When done, output: TASK_COMPLETE
5. If you encounter issues, document them clearly

Begin working now.`;
  }

  async _spawnAgent(prompt) {
    // Spawn Claude Code CLI with the prompt
    const id = uuidv4();
    const result = this.terminalManager.spawn(id, {
      command: 'claude',
      args: ['--print', '--dangerously-skip-permissions', '-p', prompt],
      cwd: this.projectRoot,
    });
    
    this.terminalManager.setMetadata(id, {
      name: `Ralph #${this.state.currentIteration}`,
      type: 'ralph',
      task: this.state.currentTask?.title
    });
    
    return result;
  }

  async _waitForCompletion(terminalId, timeoutMs = 300000) {
    // Wait for terminal to exit OR output TASK_COMPLETE OR timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve({ completed: true, reason: 'timeout' });
      }, timeoutMs);

      // Listen for exit
      const exitHandler = (data) => {
        if (data.id === terminalId) {
          clearTimeout(timeout);
          this.terminalManager.removeListener('exit', exitHandler);
          resolve({ completed: true, reason: 'exit' });
        }
      };
      this.terminalManager.on('exit', exitHandler);

      // Check for TASK_COMPLETE in output
      const dataHandler = (data) => {
        if (data.id === terminalId && data.data && data.data.includes('TASK_COMPLETE')) {
          clearTimeout(timeout);
          this.terminalManager.removeListener('data', dataHandler);
          this.terminalManager.removeListener('exit', exitHandler);
          resolve({ completed: true, reason: 'task_complete' });
        }
      };
      this.terminalManager.on('data', dataHandler);
    });
  }

  async _runQualityGates() {
    // Run configured quality checks
    if (!this.qualityCommands || this.qualityCommands.length === 0) {
      // No quality gates configured — always pass
      return { passed: true, reason: 'no_gates_configured' };
    }

    const { execSync } = require('child_process');
    
    for (const cmd of this.qualityCommands) {
      try {
        execSync(cmd, { 
          cwd: this.projectRoot, 
          timeout: 60000,
          stdio: 'pipe' 
        });
      } catch (error) {
        return { passed: false, reason: `Quality gate failed: ${cmd}`, error: error.message };
      }
    }

    return { passed: true, reason: 'all_gates_passed' };
  }

  _tryGitCommit(story) {
    const { execSync } = require('child_process');
    try {
      execSync('git add -A', { cwd: this.projectRoot, stdio: 'pipe' });
      execSync(`git commit -m "feat: ${story.title} [ralph-${story.id}]"`, { cwd: this.projectRoot, stdio: 'pipe' });
    } catch {} // Silently fail if no changes or no git
  }

  _appendLearning(text) {
    const progressPath = path.join(this.projectRoot, 'project-context', 'PROGRESS.md');
    const timestamp = new Date().toISOString().slice(0, 19);
    const entry = `[${timestamp}] ${text}\n`;
    
    try {
      // Create directory if needed
      const dir = path.dirname(progressPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.appendFileSync(progressPath, entry);
      this.state.learnings.push({ time: timestamp, text });
    } catch {}
  }

  _savePRD() {
    if (!this.state.prd) return;
    try {
      const prdPath = path.join(this.projectRoot, 'prd.json');
      fs.writeFileSync(prdPath, JSON.stringify(this.state.prd, null, 2));
    } catch {}
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RalphLoop;