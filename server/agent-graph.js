const fs = require('fs');
const path = require('path');
const TemporalGraph = require('./temporal-graph');

/**
 * AgentGraph - AG Dev-specific layer that uses TemporalGraph to track
 * agent interactions, task flows, and system dynamics over time
 */
class AgentGraph {
  constructor(graphDir = path.join(__dirname, '../data/graph')) {
    this.graphDir = graphDir;
    this.graph = new TemporalGraph();
    this.autoSaveInterval = null;
    this.graphFilePath = path.join(graphDir, 'agent-graph.json');
    
    // Ensure graph directory exists
    if (!fs.existsSync(graphDir)) {
      fs.mkdirSync(graphDir, { recursive: true });
    }
    
    // Try to load existing graph
    this.load();
  }

  // ═══════════════════════════════════
  // AGENT LIFECYCLE
  // ═══════════════════════════════════

  /**
   * Register an agent when it's spawned
   */
  agentSpawned(agentId, metadata = {}) {
    const nodeData = {
      type: 'agent',
      name: metadata.name || agentId,
      agentType: metadata.type || 'unknown',
      task: metadata.task,
      pid: metadata.pid,
      spawned: Date.now(),
      ...metadata
    };
    
    return this.graph.insertNode(agentId, nodeData);
  }

  /**
   * Mark agent as stopped by deactivating all its edges
   */
  agentStopped(agentId, timestamp = Date.now()) {
    // Deactivate all outgoing edges from this agent
    const outgoingEdges = this.graph.getOutgoingEdges(agentId);
    const results = [];
    
    for (const edge of outgoingEdges) {
      if (edge.deactivatedAt === null) {
        results.push(this.graph.deactivateEdge(edge.id, timestamp));
      }
    }
    
    // Also deactivate incoming edges (collaborations)
    const incomingEdges = this.graph.getIncomingEdges(agentId);
    for (const edge of incomingEdges) {
      if (edge.deactivatedAt === null) {
        results.push(this.graph.deactivateEdge(edge.id, timestamp));
      }
    }
    
    return results;
  }

  // ═══════════════════════════════════
  // INTERACTIONS
  // ═══════════════════════════════════

  /**
   * Track task assignment from one agent to another
   */
  taskAssigned(fromAgent, toAgent, taskData = {}) {
    const edgeData = {
      type: 'task_assignment',
      task: taskData.task || taskData.description,
      taskId: taskData.id,
      priority: taskData.priority,
      category: taskData.category,
      estimatedDuration: taskData.estimatedDuration,
      ...taskData
    };
    
    return this.graph.addEdge(fromAgent, toAgent, Date.now(), edgeData);
  }

  /**
   * Track message exchange between agents
   */
  messageExchanged(fromAgent, toAgent, messageData = {}) {
    const edgeData = {
      type: 'communication',
      messageType: messageData.type || 'message',
      channel: messageData.channel,
      size: messageData.content?.length || 0,
      ...messageData
    };
    
    return this.graph.addEdge(fromAgent, toAgent, Date.now(), edgeData);
  }

  /**
   * Track file modification by an agent
   */
  fileModified(agentId, filePath, changeData = {}) {
    const fileNodeId = `file:${filePath}`;
    
    // Ensure file node exists
    if (!this.graph.nodes.has(fileNodeId)) {
      this.graph.insertNode(fileNodeId, {
        type: 'file',
        path: filePath,
        name: path.basename(filePath),
        extension: path.extname(filePath)
      });
    }
    
    const edgeData = {
      type: 'file_modification',
      action: changeData.action || 'modified', // created, modified, deleted
      linesAdded: changeData.linesAdded || 0,
      linesRemoved: changeData.linesRemoved || 0,
      sizeChange: changeData.sizeChange || 0,
      ...changeData
    };
    
    return this.graph.addEdge(agentId, fileNodeId, Date.now(), edgeData);
  }

  /**
   * Track task completion
   */
  taskCompleted(agentId, taskId, resultData = {}) {
    const completionNodeId = `completion:${taskId}`;
    
    // Create completion node
    this.graph.insertNode(completionNodeId, {
      type: 'completion',
      taskId,
      status: resultData.status || 'completed',
      duration: resultData.duration,
      outcome: resultData.outcome,
      ...resultData
    });
    
    const edgeData = {
      type: 'task_completion',
      taskId,
      duration: resultData.duration,
      status: resultData.status || 'completed',
      ...resultData
    };
    
    return this.graph.addEdge(agentId, completionNodeId, Date.now(), edgeData);
  }

  // ═══════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════

  /**
   * Get all activity for a specific agent
   */
  getAgentActivity(agentId, timeWindow = null) {
    let outgoingEdges = this.graph.getOutgoingEdges(agentId);
    let incomingEdges = this.graph.getIncomingEdges(agentId);
    
    if (timeWindow) {
      const { from, to } = timeWindow;
      outgoingEdges = this.graph.getEdgesInInterval(from, to)
        .filter(edge => edge.from === agentId);
      incomingEdges = this.graph.getEdgesInInterval(from, to)
        .filter(edge => edge.to === agentId);
    }
    
    return {
      agentId,
      outgoing: outgoingEdges,
      incoming: incomingEdges,
      totalInteractions: outgoingEdges.length + incomingEdges.length
    };
  }

  /**
   * Get collaboration graph (who worked with whom)
   */
  getCollaborationGraph(timeWindow = null) {
    let edges = this.graph.getEdges();
    
    if (timeWindow) {
      const { from, to } = timeWindow;
      edges = this.graph.getEdgesInInterval(from, to);
    }
    
    // Filter for agent-to-agent interactions
    const agentEdges = edges.filter(edge => 
      this.graph.nodes.get(edge.from)?.data?.type === 'agent' &&
      this.graph.nodes.get(edge.to)?.data?.type === 'agent'
    );
    
    const collaborations = {};
    
    for (const edge of agentEdges) {
      const key = [edge.from, edge.to].sort().join('↔');
      if (!collaborations[key]) {
        collaborations[key] = {
          agents: [edge.from, edge.to],
          interactions: 0,
          types: new Set(),
          firstInteraction: edge.activatedAt,
          lastInteraction: edge.activatedAt
        };
      }
      
      collaborations[key].interactions++;
      collaborations[key].types.add(edge.data.type);
      collaborations[key].lastInteraction = Math.max(
        collaborations[key].lastInteraction, 
        edge.activatedAt
      );
    }
    
    // Convert types Set to Array
    Object.values(collaborations).forEach(collab => {
      collab.types = Array.from(collab.types);
    });
    
    return Object.values(collaborations);
  }

  /**
   * Get most frequently modified files
   */
  getHotFiles(timeWindow = null) {
    let edges = this.graph.getEdges();
    
    if (timeWindow) {
      const { from, to } = timeWindow;
      edges = this.graph.getEdgesInInterval(from, to);
    }
    
    // Filter for file modification edges
    const fileEdges = edges.filter(edge => 
      edge.data.type === 'file_modification'
    );
    
    const fileStats = {};
    
    for (const edge of fileEdges) {
      const fileId = edge.to;
      const fileNode = this.graph.nodes.get(fileId);
      
      if (!fileNode) continue;
      
      if (!fileStats[fileId]) {
        fileStats[fileId] = {
          fileId,
          path: fileNode.data.path,
          name: fileNode.data.name,
          modifications: 0,
          agents: new Set(),
          lastModified: edge.activatedAt,
          linesAdded: 0,
          linesRemoved: 0
        };
      }
      
      const stats = fileStats[fileId];
      stats.modifications++;
      stats.agents.add(edge.from);
      stats.lastModified = Math.max(stats.lastModified, edge.activatedAt);
      stats.linesAdded += edge.data.linesAdded || 0;
      stats.linesRemoved += edge.data.linesRemoved || 0;
    }
    
    // Convert agents Set to Array and sort by modification count
    return Object.values(fileStats)
      .map(stats => ({
        ...stats,
        agents: Array.from(stats.agents),
        agentCount: stats.agents.size
      }))
      .sort((a, b) => b.modifications - a.modifications);
  }

  /**
   * Get agents that are currently active
   */
  getActiveAgents(time = Date.now()) {
    const activeEdges = this.graph.getActiveEdgesAt(time);
    const activeAgentIds = new Set();
    
    for (const edge of activeEdges) {
      const fromNode = this.graph.nodes.get(edge.from);
      const toNode = this.graph.nodes.get(edge.to);
      
      if (fromNode?.data?.type === 'agent') {
        activeAgentIds.add(edge.from);
      }
      if (toNode?.data?.type === 'agent') {
        activeAgentIds.add(edge.to);
      }
    }
    
    return Array.from(activeAgentIds).map(agentId => ({
      agentId,
      ...this.graph.nodes.get(agentId)?.data,
      activeConnections: this.graph.nodeDegreeAt(agentId, time)
    }));
  }

  // ═══════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════

  /**
   * Get productivity metrics for an agent
   */
  getAgentProductivity(agentId) {
    const outgoingEdges = this.graph.getOutgoingEdges(agentId);
    
    // Filter for task completions
    const completions = outgoingEdges.filter(edge => 
      edge.data.type === 'task_completion'
    );
    
    // Calculate average task duration
    const durations = completions
      .filter(edge => edge.data.duration)
      .map(edge => edge.data.duration);
    
    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
    // Count file modifications
    const fileModifications = outgoingEdges.filter(edge => 
      edge.data.type === 'file_modification'
    ).length;
    
    // Count communications
    const communications = outgoingEdges.filter(edge => 
      edge.data.type === 'communication'
    ).length;
    
    return {
      agentId,
      tasksCompleted: completions.length,
      averageTaskDuration: avgDuration,
      fileModifications,
      communications,
      totalInteractions: outgoingEdges.length,
      lifespan: this.graph.nodeLifespan(agentId),
      burstiness: this.graph.nodeBurstiness(agentId)
    };
  }

  /**
   * Get team dynamics analysis
   */
  getTeamDynamics(timeWindow) {
    const collaborations = this.getCollaborationGraph(timeWindow);
    const agents = this.getActiveAgents();
    
    // Calculate collaboration network metrics
    const collaborationMatrix = {};
    agents.forEach(agent => {
      collaborationMatrix[agent.agentId] = {};
    });
    
    collaborations.forEach(collab => {
      const [agent1, agent2] = collab.agents;
      collaborationMatrix[agent1] = collaborationMatrix[agent1] || {};
      collaborationMatrix[agent2] = collaborationMatrix[agent2] || {};
      collaborationMatrix[agent1][agent2] = collab.interactions;
      collaborationMatrix[agent2][agent1] = collab.interactions;
    });
    
    return {
      totalAgents: agents.length,
      totalCollaborations: collaborations.length,
      collaborationMatrix,
      mostCollaborative: collaborations
        .sort((a, b) => b.interactions - a.interactions)
        .slice(0, 5),
      averageCollaborations: collaborations.length > 0 
        ? collaborations.reduce((sum, c) => sum + c.interactions, 0) / collaborations.length 
        : 0
    };
  }

  /**
   * Get project pulse metrics
   */
  getProjectPulse(timeWindow) {
    const { from = Date.now() - (24 * 60 * 60 * 1000), to = Date.now() } = timeWindow || {};
    
    return {
      intensity: this.graph.temporalIntensity(from, to),
      rhythm: this.graph.activationRhythm(),
      velocity: this.graph.interactionVelocity(from, to),
      changeRate: this.graph.temporalChangeRate(from, to),
      aliveRatio: this.graph.graphAliveRatio(from, to),
      acceleration: this.graph.temporalAcceleration(from, to),
      density: this.graph.temporalDensity(from, to),
      overlapRatio: this.graph.temporalOverlapRatio(from, to),
      timeWindow: { from, to }
    };
  }

  /**
   * Identify bottlenecks (agents/files with high overlap)
   */
  getBottlenecks() {
    const activeAgents = this.getActiveAgents();
    const hotFiles = this.getHotFiles();
    
    // Agent bottlenecks: agents with many concurrent connections
    const agentBottlenecks = activeAgents
      .filter(agent => agent.activeConnections > 5)
      .sort((a, b) => b.activeConnections - a.activeConnections);
    
    // File bottlenecks: files modified by many agents
    const fileBottlenecks = hotFiles
      .filter(file => file.agentCount > 3)
      .sort((a, b) => b.agentCount - a.agentCount);
    
    return {
      agents: agentBottlenecks,
      files: fileBottlenecks
    };
  }

  // ═══════════════════════════════════
  // DASHBOARD DATA
  // ═══════════════════════════════════

  /**
   * Get activity timeline data bucketed by time
   */
  getTimelineData(t0, t1, bucketMs = 60000) { // 1 minute buckets by default
    const buckets = [];
    const bucketCount = Math.ceil((t1 - t0) / bucketMs);
    
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = t0 + (i * bucketMs);
      const bucketEnd = Math.min(bucketStart + bucketMs, t1);
      
      const activations = this.graph.activationsInInterval(bucketStart, bucketEnd);
      const deactivations = this.graph.deactivationsInInterval(bucketStart, bucketEnd);
      const activeEdges = this.graph.activeEdgeCountAt(bucketStart);
      
      buckets.push({
        timestamp: bucketStart,
        activations,
        deactivations,
        activeEdges,
        totalActivity: activations + deactivations
      });
    }
    
    return buckets;
  }

  /**
   * Get activity heatmap (hour x day matrix)
   */
  getHeatmapData(t0, t1) {
    const edges = this.graph.getEdgesInInterval(t0, t1);
    const heatmap = {};
    
    // Initialize 24x7 matrix (hours x days)
    for (let day = 0; day < 7; day++) {
      heatmap[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        heatmap[day][hour] = 0;
      }
    }
    
    // Count activities by hour and day
    edges.forEach(edge => {
      const date = new Date(edge.activatedAt);
      const day = date.getDay();
      const hour = date.getHours();
      heatmap[day][hour]++;
    });
    
    return heatmap;
  }

  /**
   * Get network visualization data
   */
  getNetworkData(time = Date.now()) {
    const snapshot = this.graph.temporalSnapshot(time);
    const nodes = [];
    const edges = [];
    
    // Build node list with metadata
    snapshot.activeNodes.forEach(nodeId => {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        nodes.push({
          id: nodeId,
          label: node.data.name || nodeId,
          type: node.data.type || 'unknown',
          degree: this.graph.nodeDegreeAt(nodeId, time),
          ...node.data
        });
      }
    });
    
    // Build edge list
    snapshot.activeEdges.forEach(edge => {
      edges.push({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: edge.data.type || 'unknown',
        weight: 1,
        ...edge.data
      });
    });
    
    return { nodes, edges, timestamp: time };
  }

  // ═══════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════

  /**
   * Save the agent graph
   */
  save() {
    try {
      this.graph.save(this.graphFilePath);
      console.log(`Agent graph saved to ${this.graphFilePath}`);
    } catch (error) {
      console.error('Failed to save agent graph:', error);
    }
  }

  /**
   * Load the agent graph
   */
  load() {
    try {
      if (fs.existsSync(this.graphFilePath)) {
        this.graph = TemporalGraph.load(this.graphFilePath);
        console.log(`Agent graph loaded from ${this.graphFilePath}`);
      }
    } catch (error) {
      console.error('Failed to load agent graph:', error);
      this.graph = new TemporalGraph(); // Reset to empty graph
    }
  }

  /**
   * Enable auto-save at regular intervals
   */
  autoSave(intervalMs = 60000) { // Save every minute by default
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, intervalMs);
    
    console.log(`Auto-save enabled with ${intervalMs}ms interval`);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('Auto-save disabled');
    }
  }

  /**
   * Get overall graph statistics
   */
  getStats() {
    const baseStats = this.graph.getStats();
    const agents = this.getActiveAgents();
    const collaborations = this.getCollaborationGraph();
    const hotFiles = this.getHotFiles();
    
    return {
      ...baseStats,
      activeAgents: agents.length,
      totalCollaborations: collaborations.length,
      hotFilesCount: hotFiles.length,
      topFiles: hotFiles.slice(0, 5).map(f => ({
        path: f.path,
        modifications: f.modifications
      }))
    };
  }

  /**
   * Cleanup old data (edges older than specified time)
   */
  cleanup(olderThanMs = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const cutoff = Date.now() - olderThanMs;
    let removedCount = 0;
    
    for (const [edgeId, edge] of this.graph.edges) {
      if (edge.deactivatedAt && edge.deactivatedAt < cutoff) {
        this.graph.edges.delete(edgeId);
        removedCount++;
      }
    }
    
    console.log(`Cleaned up ${removedCount} old edges`);
    return removedCount;
  }
}

module.exports = AgentGraph;