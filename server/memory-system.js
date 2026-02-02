const fs = require('fs');
const path = require('path');

/**
 * Memory System — 3-tier memory for agents
 * 
 * Hot:  Current session context (working memory)
 * Warm: Recent learnings and patterns (episodic memory) 
 * Cold: Historical archive (long-term memory)
 */
class MemorySystem {
  constructor(baseDir) {
    this.baseDir = baseDir || path.join(__dirname, '..', 'memory');
    this.hotDir = path.join(this.baseDir, 'hot');
    this.warmDir = path.join(this.baseDir, 'warm');
    this.coldDir = path.join(this.baseDir, 'cold');
    
    // Ensure directories exist
    for (const dir of [this.hotDir, this.warmDir, this.coldDir]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  // === HOT MEMORY (current session) ===
  
  setHot(key, value) {
    const filePath = path.join(this.hotDir, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ key, value, updatedAt: Date.now() }, null, 2));
  }

  getHot(key) {
    const filePath = path.join(this.hotDir, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')).value;
    } catch { return null; }
  }

  clearHot() {
    const files = fs.readdirSync(this.hotDir).filter(f => f.endsWith('.json'));
    files.forEach(f => fs.unlinkSync(path.join(this.hotDir, f)));
  }

  // === WARM MEMORY (recent learnings) ===
  
  appendWarm(category, entry) {
    const filePath = path.join(this.warmDir, `${category}.jsonl`);
    const record = { ...entry, timestamp: Date.now() };
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
  }

  getWarm(category, limit = 50) {
    const filePath = path.join(this.warmDir, `${category}.jsonl`);
    if (!fs.existsSync(filePath)) return [];
    
    const lines = fs.readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
    
    return lines.slice(-limit);
  }

  // === COLD MEMORY (archive) ===
  
  archive(category) {
    const warmPath = path.join(this.warmDir, `${category}.jsonl`);
    if (!fs.existsSync(warmPath)) return;
    
    const date = new Date().toISOString().slice(0, 10);
    const coldPath = path.join(this.coldDir, `${category}-${date}.jsonl`);
    
    // Move warm to cold
    fs.copyFileSync(warmPath, coldPath);
    fs.writeFileSync(warmPath, ''); // Clear warm
  }

  // === MEMORY FOLDING (compress context) ===
  
  fold(agentId) {
    // Get all warm memories for this agent
    const memories = this.getWarm(`agent-${agentId}`, 100);
    if (memories.length === 0) return null;

    // Create a compressed summary
    const summary = {
      agentId,
      foldedAt: Date.now(),
      totalEntries: memories.length,
      keyEvents: memories.filter(m => m.type === 'completion' || m.type === 'error').slice(-10),
      patterns: memories.filter(m => m.type === 'learning').slice(-5),
      lastActivity: memories[memories.length - 1]
    };

    // Save folded memory
    this.setHot(`folded-${agentId}`, summary);
    
    // Archive the warm memories
    this.archive(`agent-${agentId}`);

    return summary;
  }

  // === QUERY ===
  
  getAgentContext(agentId) {
    // Build context for an agent from all memory tiers
    const hot = this.getHot(`agent-${agentId}`) || {};
    const folded = this.getHot(`folded-${agentId}`);
    const recentLearnings = this.getWarm(`agent-${agentId}`, 20);
    const globalLearnings = this.getWarm('global', 10);

    return {
      currentSession: hot,
      foldedMemory: folded,
      recentLearnings,
      globalLearnings,
      hasMemory: recentLearnings.length > 0 || folded !== null
    };
  }

  // Record an event
  record(agentId, type, data) {
    this.appendWarm(`agent-${agentId}`, { type, ...data });
    
    // Also record to global if it's a learning
    if (type === 'learning' || type === 'pattern') {
      this.appendWarm('global', { agentId, type, ...data });
    }
  }

  // Get statistics
  getStats() {
    const countFiles = (dir) => {
      try { return fs.readdirSync(dir).length; } catch { return 0; }
    };
    
    return {
      hot: countFiles(this.hotDir),
      warm: countFiles(this.warmDir),
      cold: countFiles(this.coldDir),
    };
  }
}

module.exports = MemorySystem;