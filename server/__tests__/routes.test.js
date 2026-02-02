const request = require('supertest');
const express = require('express');

// Mock dependencies
const mockDeps = {
  terminalManager: {
    list: jest.fn().mockReturnValue([]),
    spawn: jest.fn(),
    kill: jest.fn(),
    get: jest.fn(),
    on: jest.fn(),
    terminals: new Map()
  },
  stateManager: {
    getState: jest.fn().mockReturnValue({
      system: { status: 'idle', activeAgents: 0, totalAgents: 0, version: '1.0.0' },
      agents: [],
      workflows: [],
      recentEvents: []
    }),
    getSystemState: jest.fn().mockReturnValue({
      status: 'idle',
      activeAgents: 0,
      totalAgents: 0,
      version: '1.0.0'
    }),
    getMetrics: jest.fn().mockReturnValue({
      systemUptime: 1000,
      totalAgents: 0,
      statusCounts: {},
      avgAgentUptime: 0,
      totalEvents: 0,
      lastEventTime: null
    }),
    pauseAll: jest.fn(),
    resumeAll: jest.fn(),
    listAgents: jest.fn().mockReturnValue([])
  },
  orchestrator: {
    getAgentDefinitions: jest.fn().mockReturnValue([
      { name: 'test-agent', agentName: 'Test Agent', role: 'Testing agent', description: 'A test agent' }
    ]),
    getWorkflows: jest.fn().mockReturnValue([]),
    getWorkflowExecutionState: jest.fn().mockReturnValue(null),
    spawnAgent: jest.fn()
  },
  squadManager: {
    getSquads: jest.fn().mockReturnValue([]),
    getActiveSquads: jest.fn().mockReturnValue([]),
    getStats: jest.fn().mockReturnValue({ totalActiveAgents: 0, totalActiveTerminals: 0, agentBreakdown: {} }),
    listSquads: jest.fn().mockReturnValue([]),
    createSquad: jest.fn(),
    getSquad: jest.fn(),
    updateSquad: jest.fn()
  },
  superskillRegistry: {
    list: jest.fn().mockReturnValue([
      {
        name: 'test-skill',
        version: '1.0.0',
        category: 'generator',
        description: 'Test SuperSkill'
      }
    ]),
    search: jest.fn().mockReturnValue([]),
    get: jest.fn(),
    run: jest.fn(),
    getStats: jest.fn().mockReturnValue({ total: 1, byCategory: {}, totalTokenSavings: 0 }),
    loadAll: jest.fn()
  },
  runtime: {
    isConnected: jest.fn().mockReturnValue(false),
    getStatus: jest.fn().mockReturnValue({ connected: false })
  },
  agentGraph: {
    getNodes: jest.fn().mockReturnValue([]),
    getEdges: jest.fn().mockReturnValue([])
  },
  memorySystem: {
    getMemories: jest.fn().mockReturnValue([]),
    createMemory: jest.fn()
  },
  config: {
    server: { port: 3000 }
  },
  sseClients: new Set(),
  broadcast: jest.fn()
};

describe('API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Reset mocks but restore default return values
    mockDeps.orchestrator.getAgentDefinitions.mockReturnValue([
      { name: 'test-agent', agentName: 'Test Agent', role: 'Testing agent', description: 'A test agent' }
    ]);
    mockDeps.superskillRegistry.list.mockReturnValue([
      { name: 'test-skill', version: '1.0.0', category: 'generator', description: 'Test SuperSkill' }
    ]);
    mockDeps.superskillRegistry.search.mockReturnValue([]);
    mockDeps.terminalManager.list.mockReturnValue([]);
    mockDeps.runtime.getStatus.mockReturnValue({ connected: false });
    mockDeps.stateManager.getState.mockReturnValue({
      system: { status: 'idle', activeAgents: 0, totalAgents: 0, version: '1.0.0' },
      agents: [], workflows: [], recentEvents: []
    });
    mockDeps.stateManager.getMetrics.mockReturnValue({
      systemUptime: 1000, totalAgents: 0, statusCounts: {},
      avgAgentUptime: 0, totalEvents: 0, lastEventTime: null
    });
  });

  describe('/api/agents and /api/v1/agents', () => {
    beforeEach(() => {
      app.use('/api/agents', require('../routes/agents')(mockDeps));
      app.use('/api/v1/agents', require('../routes/agents')(mockDeps));
    });

    it('should get agent definitions from /api/agents', async () => {
      const response = await request(app)
        .get('/api/agents')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('test-agent');
      expect(mockDeps.orchestrator.getAgentDefinitions).toHaveBeenCalled();
    });

    it('should get agent definitions from /api/v1/agents (versioned)', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('test-agent');
    });

    it('should handle errors in agent routes', async () => {
      mockDeps.orchestrator.getAgentDefinitions.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/agents')
        .expect(500);

      expect(response.body.error).toBe('Database connection failed');
    });
  });

  describe('/api/superskills and /api/v1/superskills', () => {
    beforeEach(() => {
      app.use('/api/superskills', require('../routes/superskills')(mockDeps));
      app.use('/api/v1/superskills', require('../routes/superskills')(mockDeps));
    });

    it('should list SuperSkills from /api/superskills', async () => {
      const response = await request(app)
        .get('/api/superskills')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('test-skill');
      expect(mockDeps.superskillRegistry.list).toHaveBeenCalled();
    });

    it('should list SuperSkills from /api/v1/superskills (versioned)', async () => {
      const response = await request(app)
        .get('/api/v1/superskills')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('test-skill');
    });

    it('should search SuperSkills with query parameter', async () => {
      mockDeps.superskillRegistry.search.mockReturnValue([
        { name: 'found-skill', _score: 3 }
      ]);

      const response = await request(app)
        .get('/api/superskills/search?q=test')
        .expect(200);

      expect(mockDeps.superskillRegistry.search).toHaveBeenCalledWith('test', []);
    });

    it('should get specific SuperSkill by name', async () => {
      const mockSkill = {
        name: 'test-skill',
        version: '1.0.0',
        description: 'Test skill'
      };
      mockDeps.superskillRegistry.get.mockReturnValue(mockSkill);

      const response = await request(app)
        .get('/api/superskills/test-skill')
        .expect(200);

      expect(response.body).toEqual(mockSkill);
      expect(mockDeps.superskillRegistry.get).toHaveBeenCalledWith('test-skill');
    });

    it('should return 404 for non-existent SuperSkill', async () => {
      mockDeps.superskillRegistry.get.mockReturnValue(null);

      await request(app)
        .get('/api/superskills/non-existent')
        .expect(404);
    });
  });

  describe('/api/terminals and /api/v1/terminals', () => {
    beforeEach(() => {
      app.use('/api/terminals', require('../routes/terminals')(mockDeps));
      app.use('/api/v1/terminals', require('../routes/terminals')(mockDeps));
    });

    it('should list terminals', async () => {
      mockDeps.terminalManager.list.mockReturnValue([
        { id: 'term-1', status: 'running' }
      ]);

      const response = await request(app)
        .get('/api/terminals')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('term-1');
    });

    it('should list terminals from versioned endpoint', async () => {
      mockDeps.terminalManager.list.mockReturnValue([
        { id: 'term-1', status: 'running' }
      ]);

      const response = await request(app)
        .get('/api/v1/terminals')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });
  });

  describe('/api/runtime and /api/v1/runtime', () => {
    beforeEach(() => {
      app.use('/api/runtime', require('../routes/runtime')(mockDeps));
      app.use('/api/v1/runtime', require('../routes/runtime')(mockDeps));
    });

    it('should get runtime status', async () => {
      const response = await request(app)
        .get('/api/runtime/status')
        .expect(200);

      expect(response.body).toEqual({ connected: false });
      expect(mockDeps.runtime.getStatus).toHaveBeenCalled();
    });

    it('should get runtime status from versioned endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/runtime/status')
        .expect(200);

      expect(response.body).toEqual({ connected: false });
    });
  });

  describe('System routes', () => {
    beforeEach(() => {
      // System routes need terminalManager with a terminals property for /health
      mockDeps.terminalManager.terminals = new Map();
      app.use('/', require('../routes/system')(mockDeps));
    });

    it('should get system state', async () => {
      const response = await request(app)
        .get('/state')
        .expect(200);

      expect(response.body).toMatchObject({
        system: { status: 'idle' }
      });
    });

    it('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.uptime).toBeDefined();
    });

    it('should get system metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body.systemUptime).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      app.use('/api/agents', require('../routes/agents')(mockDeps));
      
      // Add the actual error handler middleware
      const { errorHandler } = require('../middleware/error-handler');
      app.use(errorHandler);
    });

    it('should handle service errors gracefully', async () => {
      mockDeps.orchestrator.getAgentDefinitions.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/api/agents')
        .expect(500);

      expect(response.body).toBeDefined();
    });
  });

  describe('CORS and Content-Type', () => {
    beforeEach(() => {
      app.use('/api/agents', require('../routes/agents')(mockDeps));
    });

    it('should handle JSON requests properly', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Accept', 'application/json')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    beforeEach(() => {
      app.use('/api/agents', require('../routes/agents')(mockDeps));
      app.use('/api/v1/agents', require('../routes/agents')(mockDeps));
    });

    it('should provide identical responses from both /api and /api/v1 endpoints', async () => {
      const [legacyResponse, versionedResponse] = await Promise.all([
        request(app).get('/api/agents'),
        request(app).get('/api/v1/agents')
      ]);

      expect(legacyResponse.status).toBe(200);
      expect(versionedResponse.status).toBe(200);
      expect(legacyResponse.body).toEqual(versionedResponse.body);
    });
  });
});