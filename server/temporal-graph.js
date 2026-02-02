const fs = require('fs');
const path = require('path');

/**
 * TemporalGraph - A graph engine that tracks nodes and edges with temporal intervals
 */
class TemporalGraph {
  constructor() {
    this.nodes = new Map(); // nodeId -> { id, data, created }
    this.edges = new Map(); // edgeId -> { id, from, to, activatedAt, deactivatedAt?, data }
    this.edgeCounter = 0;
  }

  // ═══════════════════════════════════
  // CORE OPERATIONS
  // ═══════════════════════════════════

  /**
   * Insert a node with optional data
   */
  insertNode(id, data = {}) {
    const node = {
      id,
      data,
      created: Date.now()
    };
    this.nodes.set(id, node);
    return node;
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(from, to, activatedAt = Date.now(), data = {}, deactivatedAt = null) {
    const edgeId = `edge_${++this.edgeCounter}`;
    const edge = {
      id: edgeId,
      from,
      to,
      activatedAt,
      deactivatedAt,
      data
    };
    this.edges.set(edgeId, edge);
    return edge;
  }

  /**
   * Deactivate an edge by setting its deactivation timestamp
   */
  deactivateEdge(edgeId, timestamp = Date.now()) {
    const edge = this.edges.get(edgeId);
    if (!edge) return null;
    
    edge.deactivatedAt = timestamp;
    return edge;
  }

  // ═══════════════════════════════════
  // TEMPORAL QUERIES
  // ═══════════════════════════════════

  /**
   * Get all edges active at a specific time
   */
  getActiveEdgesAt(time = Date.now()) {
    return Array.from(this.edges.values()).filter(edge => {
      return edge.activatedAt <= time && 
             (edge.deactivatedAt === null || edge.deactivatedAt > time);
    });
  }

  /**
   * Get all edges that were active during a time interval
   */
  getEdgesInInterval(t0, t1) {
    return Array.from(this.edges.values()).filter(edge => {
      const edgeEnd = edge.deactivatedAt || Date.now();
      return edge.activatedAt <= t1 && edgeEnd >= t0;
    });
  }

  /**
   * Get all outgoing edges from a node (optionally at a specific time)
   */
  getOutgoingEdges(nodeId, time = null) {
    const edges = Array.from(this.edges.values()).filter(edge => edge.from === nodeId);
    
    if (time !== null) {
      return edges.filter(edge => {
        return edge.activatedAt <= time && 
               (edge.deactivatedAt === null || edge.deactivatedAt > time);
      });
    }
    
    return edges;
  }

  /**
   * Get all incoming edges to a node (optionally at a specific time)
   */
  getIncomingEdges(nodeId, time = null) {
    const edges = Array.from(this.edges.values()).filter(edge => edge.to === nodeId);
    
    if (time !== null) {
      return edges.filter(edge => {
        return edge.activatedAt <= time && 
               (edge.deactivatedAt === null || edge.deactivatedAt > time);
      });
    }
    
    return edges;
  }

  /**
   * Find temporal shortest path between two nodes at a specific time
   */
  temporalShortestPath(start, end, time = Date.now()) {
    const activeEdges = this.getActiveEdgesAt(time);
    const adjacency = new Map();
    
    // Build adjacency list from active edges
    for (const edge of activeEdges) {
      if (!adjacency.has(edge.from)) {
        adjacency.set(edge.from, []);
      }
      adjacency.get(edge.from).push({ to: edge.to, edge });
    }
    
    // BFS for shortest path
    const queue = [{ node: start, path: [start], edges: [] }];
    const visited = new Set();
    
    while (queue.length > 0) {
      const { node, path, edges } = queue.shift();
      
      if (node === end) {
        return { path, edges, length: path.length - 1 };
      }
      
      if (visited.has(node)) continue;
      visited.add(node);
      
      const neighbors = adjacency.get(node) || [];
      for (const { to, edge } of neighbors) {
        if (!visited.has(to)) {
          queue.push({
            node: to,
            path: [...path, to],
            edges: [...edges, edge]
          });
        }
      }
    }
    
    return null; // No path found
  }

  // ═══════════════════════════════════
  // TEMPORAL METRICS
  // ═══════════════════════════════════

  /**
   * Count of active edges at a specific time
   */
  activeEdgeCountAt(time = Date.now()) {
    return this.getActiveEdgesAt(time).length;
  }

  /**
   * Total active time of all edges in a time window
   */
  totalActiveTime(t0, t1) {
    const edges = this.getEdgesInInterval(t0, t1);
    let totalTime = 0;
    
    for (const edge of edges) {
      const start = Math.max(edge.activatedAt, t0);
      const end = Math.min(edge.deactivatedAt || t1, t1);
      totalTime += Math.max(0, end - start);
    }
    
    return totalTime;
  }

  /**
   * Average duration of edge activations in a time window
   */
  averageActiveDuration(t0, t1) {
    const edges = this.getEdgesInInterval(t0, t1);
    if (edges.length === 0) return 0;
    
    const durations = edges
      .filter(edge => edge.deactivatedAt !== null)
      .map(edge => edge.deactivatedAt - edge.activatedAt);
    
    if (durations.length === 0) return 0;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * Number of edge activations in a time window
   */
  activationsInInterval(t0, t1) {
    return this.edges.size > 0 ? Array.from(this.edges.values())
      .filter(edge => edge.activatedAt >= t0 && edge.activatedAt <= t1)
      .length : 0;
  }

  /**
   * Number of edge deactivations in a time window
   */
  deactivationsInInterval(t0, t1) {
    return this.edges.size > 0 ? Array.from(this.edges.values())
      .filter(edge => edge.deactivatedAt && edge.deactivatedAt >= t0 && edge.deactivatedAt <= t1)
      .length : 0;
  }

  /**
   * Ratio of time the graph was "alive" (had active edges) in a window
   */
  graphAliveRatio(t0, t1) {
    if (t1 <= t0) return 0;
    
    const sampleCount = Math.min(1000, t1 - t0); // Sample points
    const interval = (t1 - t0) / sampleCount;
    let aliveCount = 0;
    
    for (let i = 0; i < sampleCount; i++) {
      const time = t0 + (i * interval);
      if (this.activeEdgeCountAt(time) > 0) {
        aliveCount++;
      }
    }
    
    return aliveCount / sampleCount;
  }

  /**
   * Rate of change in graph activity (acceleration)
   */
  temporalAcceleration(t0, t1) {
    const windowSize = (t1 - t0) / 10; // 10 samples
    const samples = [];
    
    for (let i = 0; i < 10; i++) {
      const time = t0 + (i * windowSize);
      samples.push(this.activeEdgeCountAt(time));
    }
    
    // Calculate acceleration (second derivative)
    let acceleration = 0;
    for (let i = 2; i < samples.length; i++) {
      const secondDerivative = samples[i] - 2 * samples[i-1] + samples[i-2];
      acceleration += secondDerivative;
    }
    
    return acceleration / (samples.length - 2);
  }

  /**
   * Snapshot of graph state at a specific time
   */
  temporalSnapshot(time = Date.now()) {
    const activeEdges = this.getActiveEdgesAt(time);
    const activeNodes = new Set();
    
    activeEdges.forEach(edge => {
      activeNodes.add(edge.from);
      activeNodes.add(edge.to);
    });
    
    return {
      timestamp: time,
      activeNodes: Array.from(activeNodes),
      activeEdges: activeEdges.map(e => ({ ...e })),
      nodeCount: activeNodes.size,
      edgeCount: activeEdges.length
    };
  }

  /**
   * Events per minute in a time window
   */
  temporalIntensity(t0, t1) {
    const activations = this.activationsInInterval(t0, t1);
    const deactivations = this.deactivationsInInterval(t0, t1);
    const totalEvents = activations + deactivations;
    const minutes = (t1 - t0) / (1000 * 60);
    
    return minutes > 0 ? totalEvents / minutes : 0;
  }

  /**
   * Average time between activations
   */
  activationRhythm() {
    const activations = Array.from(this.edges.values())
      .map(edge => edge.activatedAt)
      .sort((a, b) => a - b);
    
    if (activations.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < activations.length; i++) {
      intervals.push(activations[i] - activations[i-1]);
    }
    
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }

  /**
   * Ratio of overlapping active periods
   */
  temporalOverlapRatio(t0, t1) {
    const edges = this.getEdgesInInterval(t0, t1);
    if (edges.length < 2) return 0;
    
    let overlapTime = 0;
    let totalTime = 0;
    
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const edge1 = edges[i];
        const edge2 = edges[j];
        
        const start1 = Math.max(edge1.activatedAt, t0);
        const end1 = Math.min(edge1.deactivatedAt || t1, t1);
        const start2 = Math.max(edge2.activatedAt, t0);
        const end2 = Math.min(edge2.deactivatedAt || t1, t1);
        
        const overlapStart = Math.max(start1, start2);
        const overlapEnd = Math.min(end1, end2);
        
        if (overlapStart < overlapEnd) {
          overlapTime += overlapEnd - overlapStart;
        }
        
        totalTime += (end1 - start1) + (end2 - start2);
      }
    }
    
    return totalTime > 0 ? overlapTime / totalTime : 0;
  }

  /**
   * Rate of change in active edge count
   */
  temporalChangeRate(t0, t1) {
    const startCount = this.activeEdgeCountAt(t0);
    const endCount = this.activeEdgeCountAt(t1);
    const timeDiff = t1 - t0;
    
    return timeDiff > 0 ? (endCount - startCount) / timeDiff : 0;
  }

  /**
   * Average density (edges/nodes) over time window
   */
  temporalDensity(t0, t1) {
    const sampleCount = Math.min(100, t1 - t0);
    const interval = (t1 - t0) / sampleCount;
    let totalDensity = 0;
    let validSamples = 0;
    
    for (let i = 0; i < sampleCount; i++) {
      const time = t0 + (i * interval);
      const snapshot = this.temporalSnapshot(time);
      
      if (snapshot.nodeCount > 0) {
        totalDensity += snapshot.edgeCount / snapshot.nodeCount;
        validSamples++;
      }
    }
    
    return validSamples > 0 ? totalDensity / validSamples : 0;
  }

  /**
   * Rate of interactions (edges created/destroyed) per unit time
   */
  interactionVelocity(t0, t1) {
    const activations = this.activationsInInterval(t0, t1);
    const deactivations = this.deactivationsInInterval(t0, t1);
    const totalInteractions = activations + deactivations;
    const timeDiff = t1 - t0;
    
    return timeDiff > 0 ? totalInteractions / timeDiff : 0;
  }

  // ═══════════════════════════════════
  // NODE METRICS
  // ═══════════════════════════════════

  /**
   * Number of active connections for a node at a specific time
   */
  nodeDegreeAt(nodeId, time = Date.now()) {
    const outgoing = this.getOutgoingEdges(nodeId, time);
    const incoming = this.getIncomingEdges(nodeId, time);
    return outgoing.length + incoming.length;
  }

  /**
   * Time span from first to last interaction for a node
   */
  nodeLifespan(nodeId) {
    const relatedEdges = Array.from(this.edges.values())
      .filter(edge => edge.from === nodeId || edge.to === nodeId);
    
    if (relatedEdges.length === 0) return 0;
    
    const times = relatedEdges.flatMap(edge => [
      edge.activatedAt,
      edge.deactivatedAt
    ]).filter(t => t !== null);
    
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return maxTime - minTime;
  }

  /**
   * Measure of irregularity in node's interaction pattern (burstiness)
   */
  nodeBurstiness(nodeId) {
    const relatedEdges = Array.from(this.edges.values())
      .filter(edge => edge.from === nodeId || edge.to === nodeId)
      .map(edge => edge.activatedAt)
      .sort((a, b) => a - b);
    
    if (relatedEdges.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < relatedEdges.length; i++) {
      intervals.push(relatedEdges[i] - relatedEdges[i-1]);
    }
    
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Burstiness coefficient: (σ - μ) / (σ + μ)
    return mean > 0 ? (stdDev - mean) / (stdDev + mean) : 0;
  }

  // ═══════════════════════════════════
  // PERSISTENCE
  // ═══════════════════════════════════

  /**
   * Convert graph to JSON
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      edgeCounter: this.edgeCounter,
      timestamp: Date.now()
    };
  }

  /**
   * Load graph from JSON
   */
  static fromJSON(json) {
    const graph = new TemporalGraph();
    graph.nodes = new Map(json.nodes || []);
    graph.edges = new Map(json.edges || []);
    graph.edgeCounter = json.edgeCounter || 0;
    return graph;
  }

  /**
   * Save graph to file
   */
  save(filePath) {
    const data = this.toJSON();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load graph from file
   */
  static load(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return TemporalGraph.fromJSON(data);
  }

  // ═══════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════

  /**
   * Get all nodes
   */
  getNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getEdges() {
    return Array.from(this.edges.values());
  }

  /**
   * Get basic stats
   */
  getStats() {
    const now = Date.now();
    const activeEdges = this.getActiveEdgesAt(now);
    const totalNodes = this.nodes.size;
    const totalEdges = this.edges.size;
    const activeNodes = new Set();
    
    activeEdges.forEach(edge => {
      activeNodes.add(edge.from);
      activeNodes.add(edge.to);
    });
    
    return {
      totalNodes,
      totalEdges,
      activeNodes: activeNodes.size,
      activeEdges: activeEdges.length,
      timestamp: now
    };
  }
}

module.exports = TemporalGraph;