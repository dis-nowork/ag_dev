const { spawn } = require('node-pty');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * CORE Terminal Manager - PTY spawner para CLI agents
 * Gerencia múltiplos terminais PTY, cada um rodando um agente CLI
 */
class TerminalManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.terminals = new Map(); // id -> terminal instance
    this.buffers = new Map();   // id -> circular buffer
    this.metadata = new Map();  // id -> { name, type, task }
    this.autoRestart = new Map(); // id -> { max, count, originalOptions }
    this.config = {
      maxCount: config.maxCount || 16,
      bufferSize: config.bufferSize || 10000,
      defaultCols: config.defaultCols || 120,
      defaultRows: config.defaultRows || 40,
      ...config
    };
  }

  /**
   * Spawna um novo terminal agent
   */
  spawn(id = uuidv4(), options = {}) {
    if (this.terminals.has(id)) {
      throw new Error(`Terminal ${id} already exists`);
    }

    if (this.terminals.size >= this.config.maxCount) {
      throw new Error(`Maximum terminal count reached (${this.config.maxCount})`);
    }

    const {
      command = 'bash',
      args = [],
      env = process.env,
      cwd = process.cwd(),
      cols = this.config.defaultCols,
      rows = this.config.defaultRows
    } = options;

    try {
      // Spawn PTY process
      const terminal = spawn(command, args, {
        name: 'xterm-color',
        cols,
        rows,
        cwd,
        env: {
          ...env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        }
      });

      const terminalInfo = {
        id,
        terminal,
        command,
        args,
        startTime: Date.now(),
        status: 'running',
        cols,
        rows
      };

      // Initialize circular buffer
      this.buffers.set(id, []);

      // Store terminal
      this.terminals.set(id, terminalInfo);

      // Store original options for auto-restart if enabled
      const restartConfig = this.autoRestart.get(id);
      if (restartConfig) {
        restartConfig.originalOptions = options;
      }

      // Handle terminal data output
      terminal.onData((data) => {
        this._addToBuffer(id, data);
        this.emit('data', { id, data });
      });

      // Handle terminal exit
      terminal.onExit(({ exitCode, signal }) => {
        const info = this.terminals.get(id);
        if (info) {
          info.status = 'exited';
          info.exitCode = exitCode;
          info.exitSignal = signal;
          info.endTime = Date.now();
        }
        this.emit('exit', { id, exitCode, signal });
        
        // Auto-restart logic
        const restartConfig = this.autoRestart.get(id);
        if (restartConfig && restartConfig.count < restartConfig.max && exitCode !== 0) {
          restartConfig.count++;
          this.emit('auto_restart', { id, attempt: restartConfig.count });
          // Re-spawn with same options after 2s delay
          setTimeout(() => {
            try {
              this.spawn(id + '-r' + restartConfig.count, restartConfig.originalOptions || options);
            } catch {}
          }, 2000);
        }
      });

      this.emit('spawn', { id, command, args });
      
      return {
        id,
        command,
        args,
        status: 'running',
        startTime: terminalInfo.startTime
      };

    } catch (error) {
      this.emit('error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Enable auto-restart for a terminal
   */
  enableAutoRestart(id, maxRestarts = 3) {
    this.autoRestart.set(id, { max: maxRestarts, count: 0, originalOptions: null });
  }

  /**
   * Envia input para o terminal
   */
  write(id, data) {
    const terminalInfo = this.terminals.get(id);
    if (!terminalInfo) {
      throw new Error(`Terminal ${id} not found`);
    }

    if (terminalInfo.status !== 'running') {
      throw new Error(`Terminal ${id} is not running`);
    }

    terminalInfo.terminal.write(data);
    this.emit('input', { id, data });
  }

  /**
   * Resize terminal
   */
  resize(id, cols, rows) {
    const terminalInfo = this.terminals.get(id);
    if (!terminalInfo) {
      throw new Error(`Terminal ${id} not found`);
    }

    terminalInfo.terminal.resize(cols, rows);
    terminalInfo.cols = cols;
    terminalInfo.rows = rows;
    this.emit('resize', { id, cols, rows });
  }

  /**
   * Kill terminal
   */
  kill(id, signal = 'SIGTERM') {
    const terminalInfo = this.terminals.get(id);
    if (!terminalInfo) {
      throw new Error(`Terminal ${id} not found`);
    }

    try {
      terminalInfo.terminal.kill(signal);
      terminalInfo.status = 'killed';
      terminalInfo.endTime = Date.now();
      this.emit('kill', { id, signal });
    } catch (error) {
      this.emit('error', { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get buffer (últimas N linhas)
   */
  getBuffer(id, lines = 100) {
    const buffer = this.buffers.get(id);
    if (!buffer) {
      return [];
    }

    const startIndex = Math.max(0, buffer.length - lines);
    return buffer.slice(startIndex);
  }

  /**
   * Lista terminals ativos
   */
  /**
   * Set metadata for a terminal (name, type, task)
   */
  setMetadata(id, meta) {
    this.metadata.set(id, { ...(this.metadata.get(id) || {}), ...meta });
  }

  list() {
    const result = [];
    
    for (const [id, info] of this.terminals) {
      const meta = this.metadata.get(id) || {};
      result.push({
        id,
        command: info.command,
        args: info.args,
        status: info.status,
        startTime: info.startTime,
        endTime: info.endTime,
        exitCode: info.exitCode,
        cols: info.cols,
        rows: info.rows,
        name: meta.name || info.command,
        type: meta.type || 'custom',
        task: meta.task || '',
        uptime: info.status === 'running' ? Date.now() - info.startTime : null
      });
    }

    return result;
  }

  /**
   * Get specific terminal info
   */
  getTerminal(id) {
    const info = this.terminals.get(id);
    if (!info) return null;

    return {
      id,
      command: info.command,
      args: info.args,
      status: info.status,
      startTime: info.startTime,
      endTime: info.endTime,
      exitCode: info.exitCode,
      cols: info.cols,
      rows: info.rows,
      uptime: info.status === 'running' ? Date.now() - info.startTime : null
    };
  }

  /**
   * Remove terminal da memória (após exit)
   */
  remove(id) {
    const terminalInfo = this.terminals.get(id);
    if (terminalInfo && terminalInfo.status === 'running') {
      this.kill(id);
    }

    this.terminals.delete(id);
    this.buffers.delete(id);
    this.emit('remove', { id });
  }

  /**
   * Graceful shutdown de todos os terminais
   */
  shutdown() {
    const promises = [];
    
    for (const [id, info] of this.terminals) {
      if (info.status === 'running') {
        promises.push(new Promise((resolve) => {
          const timeout = setTimeout(() => {
            this.kill(id, 'SIGKILL');
            resolve();
          }, 5000);

          this.once('exit', (data) => {
            if (data.id === id) {
              clearTimeout(timeout);
              resolve();
            }
          });

          this.kill(id, 'SIGTERM');
        }));
      }
    }

    return Promise.all(promises);
  }

  /**
   * Adiciona dados ao buffer circular
   */
  _addToBuffer(id, data) {
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    // Split data em linhas se contém quebras
    const lines = data.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (i === 0 && buffer.length > 0) {
        // Primeira linha - pode ser continuação da última linha
        buffer[buffer.length - 1] += line;
      } else if (line.length > 0 || i < lines.length - 1) {
        // Nova linha (só adiciona se não for string vazia no final)
        buffer.push(line);
      }
    }

    // Manter tamanho do buffer limitado
    while (buffer.length > this.config.bufferSize) {
      buffer.shift();
    }
  }

  /**
   * Helpers para spawnar agentes específicos
   */
  spawnClaudeAgent(prompt, options = {}) {
    const id = uuidv4();
    // Run as non-root user to allow --dangerously-skip-permissions
    const isRoot = process.getuid && process.getuid() === 0;
    const claudeBin = isRoot ? '/usr/local/bin/claude-bin' : 'claude';
    const command = isRoot ? 'sudo' : claudeBin;
    const args = isRoot 
      ? ['-u', 'agdev', '-E', claudeBin, '--print', '--dangerously-skip-permissions', '-p', prompt]
      : ['--print', '--dangerously-skip-permissions', '-p', prompt];
    
    return this.spawn(id, {
      command,
      args,
      env: { ...options.env, HOME: isRoot ? '/home/agdev' : process.env.HOME },
      ...options
    });
  }

  spawnGenericCommand(command, args = [], options = {}) {
    const id = uuidv4();
    
    return this.spawn(id, {
      command,
      args,
      ...options
    });
  }
}

module.exports = TerminalManager;