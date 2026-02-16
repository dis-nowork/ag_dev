const TemporalGraph = require('../../../server/temporal-graph');

/**
 * Temporal Analysis SuperSkill
 * Analyzes timeline data using temporal graph metrics
 */
function run(input) {
  try {
    const { events, window } = input;
    
    if (!events || !Array.isArray(events)) {
      throw new Error('events array is required');
    }
    
    // Create temporal graph from events
    const graph = new TemporalGraph();
    
    // Process events and build graph
    const eventsByNode = {};
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    for (const event of events) {
      const { from, to, timestamp, type, data = {} } = event;
      
      if (!from || !timestamp || !type) {
        continue; // Skip invalid events
      }
      
      // Track time bounds
      minTime = Math.min(minTime, timestamp);
      maxTime = Math.max(maxTime, timestamp);
      
      // Ensure nodes exist
      if (!graph.nodes.has(from)) {
        graph.insertNode(from, { 
          id: from, 
          type: data.nodeType || 'unknown',
          firstSeen: timestamp
        });
      }
      
      if (to && !graph.nodes.has(to)) {
        graph.insertNode(to, { 
          id: to, 
          type: data.targetType || 'unknown',
          firstSeen: timestamp
        });
      }
      
      // Add edge if there's a target
      if (to) {
        graph.addEdge(from, to, timestamp, { type, ...data });
      }
      
      // Track events per node for burstiness analysis
      if (!eventsByNode[from]) {
        eventsByNode[from] = [];
      }
      eventsByNode[from].push(timestamp);
    }
    
    // Use provided window or auto-detect
    const t0 = window?.t0 || (minTime === Infinity ? Date.now() - 3600000 : minTime);
    const t1 = window?.t1 || (maxTime === -Infinity ? Date.now() : maxTime);
    
    if (t0 >= t1) {
      throw new Error('Invalid time window: t0 must be less than t1');
    }
    
    // Calculate temporal metrics
    const intensity = graph.temporalIntensity(t0, t1);
    const rhythm = graph.activationRhythm();
    const velocity = graph.interactionVelocity(t0, t1);
    const changeRate = graph.temporalChangeRate(t0, t1);
    const acceleration = graph.temporalAcceleration(t0, t1);
    const density = graph.temporalDensity(t0, t1);
    const aliveRatio = graph.graphAliveRatio(t0, t1);
    const overlapRatio = graph.temporalOverlapRatio(t0, t1);
    
    // Detect activity bursts
    const bursts = detectBursts(events, t0, t1);
    
    // Analyze patterns
    const patterns = analyzePatterns(events, t0, t1);
    
    // Find hot nodes (most active)
    const hotNodes = findHotNodes(eventsByNode, graph);
    
    // Generate human-readable summary
    const summary = generateSummary({
      intensity, rhythm, velocity, changeRate, acceleration, 
      density, aliveRatio, bursts, patterns, hotNodes,
      totalEvents: events.length,
      timeSpan: t1 - t0,
      nodeCount: graph.nodes.size
    });
    
    return {
      success: true,
      data: {
        // Core metrics
        intensity,
        rhythm,
        velocity,
        changeRate,
        acceleration,
        density,
        aliveRatio,
        overlapRatio,
        
        // Analysis results
        bursts,
        patterns,
        hotNodes,
        summary,
        
        // Additional context
        timeWindow: { t0, t1 },
        totalEvents: events.length,
        totalNodes: graph.nodes.size,
        totalEdges: graph.edges.size
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Detect activity bursts in the timeline
 */
function detectBursts(events, t0, t1, windowMs = 60000) {
  const buckets = {};
  const bucketSize = windowMs;
  
  // Group events into time buckets
  for (const event of events) {
    if (event.timestamp < t0 || event.timestamp > t1) continue;
    
    const bucket = Math.floor((event.timestamp - t0) / bucketSize);
    if (!buckets[bucket]) {
      buckets[bucket] = {
        start: t0 + (bucket * bucketSize),
        end: t0 + ((bucket + 1) * bucketSize),
        count: 0,
        events: []
      };
    }
    buckets[bucket].count++;
    buckets[bucket].events.push(event);
  }
  
  // Find bursts (buckets with activity > 2 standard deviations above mean)
  const counts = Object.values(buckets).map(b => b.count);
  if (counts.length === 0) return [];
  
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + (2 * stdDev);
  
  return Object.values(buckets)
    .filter(bucket => bucket.count > threshold)
    .map(bucket => ({
      start: bucket.start,
      end: bucket.end,
      intensity: bucket.count,
      threshold: threshold,
      events: bucket.events.length
    }))
    .sort((a, b) => b.intensity - a.intensity);
}

/**
 * Analyze temporal patterns
 */
function analyzePatterns(events, t0, t1) {
  const hourlyActivity = new Array(24).fill(0);
  const dailyActivity = new Array(7).fill(0);
  const eventTypes = {};
  
  for (const event of events) {
    if (event.timestamp < t0 || event.timestamp > t1) continue;
    
    const date = new Date(event.timestamp);
    const hour = date.getHours();
    const day = date.getDay();
    
    hourlyActivity[hour]++;
    dailyActivity[day]++;
    
    const type = event.type || 'unknown';
    eventTypes[type] = (eventTypes[type] || 0) + 1;
  }
  
  // Find peak hours and days
  const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
  const peakDay = dailyActivity.indexOf(Math.max(...dailyActivity));
  
  // Calculate activity distribution
  const totalEvents = events.filter(e => e.timestamp >= t0 && e.timestamp <= t1).length;
  
  return {
    hourlyDistribution: hourlyActivity.map((count, hour) => ({
      hour,
      count,
      percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0
    })),
    dailyDistribution: dailyActivity.map((count, day) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
      count,
      percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0
    })),
    eventTypes: Object.entries(eventTypes)
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count),
    peakActivity: {
      hour: peakHour,
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][peakDay]
    }
  };
}

/**
 * Find most active nodes
 */
function findHotNodes(eventsByNode, graph) {
  const nodeStats = [];
  
  for (const [nodeId, events] of Object.entries(eventsByNode)) {
    const node = graph.nodes.get(nodeId);
    if (!node) continue;
    
    // Calculate node metrics
    const eventCount = events.length;
    const lifespan = graph.nodeLifespan(nodeId);
    const burstiness = graph.nodeBurstiness(nodeId);
    const degree = graph.nodeDegreeAt(nodeId);
    
    // Calculate activity rate
    const rate = lifespan > 0 ? (eventCount / lifespan) * 1000 : eventCount; // events per second
    
    nodeStats.push({
      nodeId,
      type: node.data.type,
      eventCount,
      lifespan,
      burstiness,
      degree,
      rate,
      score: (eventCount * 0.4) + (rate * 0.3) + (degree * 0.2) + (Math.abs(burstiness) * 0.1)
    });
  }
  
  return nodeStats
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 hot nodes
}

/**
 * Generate human-readable summary
 */
function generateSummary(metrics) {
  const {
    intensity, rhythm, velocity, changeRate, acceleration,
    density, aliveRatio, bursts, patterns, hotNodes,
    totalEvents, timeSpan, nodeCount
  } = metrics;
  
  const timeSpanHours = timeSpan / (1000 * 60 * 60);
  const timeSpanDays = timeSpan / (1000 * 60 * 60 * 24);
  
  let summary = `📊 Temporal Analysis Summary\n\n`;
  
  // Basic stats
  summary += `📈 Overview:\n`;
  summary += `• ${totalEvents} events across ${nodeCount} nodes\n`;
  summary += `• Time span: ${timeSpanDays > 1 ? `${timeSpanDays.toFixed(1)} days` : `${timeSpanHours.toFixed(1)} hours`}\n`;
  summary += `• Activity intensity: ${intensity.toFixed(2)} events/minute\n\n`;
  
  // Activity patterns
  summary += `⏰ Activity Patterns:\n`;
  if (patterns.peakActivity) {
    summary += `• Peak hour: ${patterns.peakActivity.hour}:00\n`;
    summary += `• Peak day: ${patterns.peakActivity.day}\n`;
  }
  
  const topEventTypes = patterns.eventTypes.slice(0, 3);
  if (topEventTypes.length > 0) {
    summary += `• Top event types: ${topEventTypes.map(et => `${et.type} (${et.percentage.toFixed(1)}%)`).join(', ')}\n`;
  }
  summary += '\n';
  
  // System dynamics
  summary += `🔄 System Dynamics:\n`;
  summary += `• Rhythm: ${rhythm > 0 ? `${(rhythm / 1000).toFixed(1)}s between events` : 'No clear rhythm'}\n`;
  summary += `• Velocity: ${velocity.toFixed(4)} interactions/ms\n`;
  summary += `• Graph density: ${density.toFixed(3)}\n`;
  summary += `• Alive ratio: ${(aliveRatio * 100).toFixed(1)}% (graph had active connections)\n\n`;
  
  // Bursts and anomalies
  if (bursts.length > 0) {
    summary += `💥 Activity Bursts:\n`;
    summary += `• ${bursts.length} burst(s) detected\n`;
    const topBurst = bursts[0];
    summary += `• Highest intensity: ${topBurst.intensity} events in 1 minute\n\n`;
  }
  
  // Hot nodes
  if (hotNodes.length > 0) {
    summary += `🔥 Most Active Nodes:\n`;
    const topNodes = hotNodes.slice(0, 3);
    topNodes.forEach((node, i) => {
      summary += `${i + 1}. ${node.nodeId} (${node.eventCount} events, ${node.degree} connections)\n`;
    });
    summary += '\n';
  }
  
  // Overall assessment
  summary += `🎯 Assessment:\n`;
  if (intensity > 10) {
    summary += `• High activity system (${intensity.toFixed(1)} events/min)\n`;
  } else if (intensity > 1) {
    summary += `• Moderate activity system (${intensity.toFixed(1)} events/min)\n`;
  } else {
    summary += `• Low activity system (${intensity.toFixed(1)} events/min)\n`;
  }
  
  if (Math.abs(changeRate) > 0.001) {
    summary += `• ${changeRate > 0 ? 'Accelerating' : 'Decelerating'} activity trend\n`;
  } else {
    summary += `• Stable activity levels\n`;
  }
  
  if (density > 2) {
    summary += `• Highly connected system (avg ${density.toFixed(1)} edges/node)\n`;
  } else if (density > 1) {
    summary += `• Well connected system (avg ${density.toFixed(1)} edges/node)\n`;
  } else {
    summary += `• Sparse connections (avg ${density.toFixed(1)} edges/node)\n`;
  }
  
  return summary;
}

module.exports = { run };