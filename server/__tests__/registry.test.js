const SuperSkillRegistry = require('../../superskills/registry');

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  readdirSync: jest.fn(),
  existsSync: jest.fn()
}));

// Mock child_process spawn
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

const fs = require('fs');
const { spawn } = require('child_process');

describe('SuperSkillRegistry', () => {
  let registry;
  const mockSuperskillsDir = '/mock/superskills';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock schema file
    fs.readFileSync.mockImplementation((path) => {
      if (path.includes('manifest-schema.json')) {
        return JSON.stringify({
          required: ['name', 'version', 'category', 'description'],
          properties: {
            category: {
              enum: ['generator', 'transformer', 'analyzer', 'connector', 'builder', 'validator']
            }
          }
        });
      }
      throw new Error('File not found');
    });

    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue([]);
    
    registry = new SuperSkillRegistry(mockSuperskillsDir);
  });

  describe('Initialization', () => {
    it('should initialize with superskills directory', () => {
      expect(registry.superskillsDir).toBe(mockSuperskillsDir);
      expect(registry.superskills).toBeInstanceOf(Map);
      expect(registry.categories).toContain('generators');
    });

    it('should load schema on initialization', () => {
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('manifest-schema.json'),
        'utf-8'
      );
      expect(registry.schema).toBeDefined();
    });
  });

  describe('Manifest Validation', () => {
    it('should validate valid manifest', () => {
      const validManifest = {
        name: 'test-skill',
        version: '1.0.0',
        category: 'generator',
        description: 'Test SuperSkill',
        tags: ['test'],
        run: 'node index.js',
        input: { type: 'json' },
        output: { type: 'text' }
      };

      const result = registry.validate(validManifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid manifest', () => {
      const invalidManifest = {
        name: 'test-skill'
        // Missing required fields
      };

      const result = registry.validate(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: version');
    });

    it('should validate semantic version format', () => {
      expect(registry.isValidSemVer('1.0.0')).toBe(true);
      expect(registry.isValidSemVer('1.0.0-beta')).toBe(true);
      expect(registry.isValidSemVer('invalid')).toBe(false);
    });
  });

  describe('SuperSkill Management', () => {
    beforeEach(() => {
      const mockManifest = {
        name: 'test-skill',
        version: '1.0.0',
        category: 'generator',
        description: 'Test SuperSkill',
        tags: ['test', 'mock'],
        tokenSavings: '50% token reduction'
      };
      registry.superskills.set('test-skill', mockManifest);
    });

    it('should get SuperSkill by name', () => {
      const skill = registry.get('test-skill');
      expect(skill.name).toBe('test-skill');
      expect(skill.category).toBe('generator');
    });

    it('should list all SuperSkills', () => {
      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('test-skill');
    });

    it('should list SuperSkills by category', () => {
      const generators = registry.listByCategory('generator');
      expect(generators).toHaveLength(1);
      expect(generators[0].name).toBe('test-skill');

      const transformers = registry.listByCategory('transformer');
      expect(transformers).toHaveLength(0);
    });

    it('should search SuperSkills', () => {
      const results = registry.search('test');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test-skill');
      expect(results[0]._score).toBeGreaterThan(0);
    });

    it('should search SuperSkills by tags', () => {
      // Query must also match something for score > 0, or use empty query with tags
      const results = registry.search('test', ['test']);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test-skill');
    });
  });

  describe('Execution', () => {
    let mockChild;

    beforeEach(() => {
      mockChild = {
        pid: 1234,
        stdin: {
          write: jest.fn(),
          end: jest.fn()
        },
        stdout: {
          on: jest.fn()
        },
        stderr: {
          on: jest.fn()
        },
        on: jest.fn(),
        kill: jest.fn()
      };

      spawn.mockReturnValue(mockChild);

      const mockManifest = {
        name: 'test-skill',
        version: '1.0.0',
        category: 'generator',
        description: 'Test SuperSkill',
        run: 'node index.js',
        timeout: 30,
        input: { type: 'json' },
        _directory: '/mock/superskills/generators/test-skill'
      };
      registry.superskills.set('test-skill', mockManifest);
    });

    it('should execute SuperSkill successfully', async () => {
      // Mock successful execution
      mockChild.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('test output'), 10);
        }
      });
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 20);
        }
      });

      const resultPromise = registry.run('test-skill', { test: 'input' });
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.output).toBe('test output');
      expect(result.exitCode).toBe(0);
      expect(spawn).toHaveBeenCalledWith(
        'node',
        ['index.js'],
        expect.objectContaining({
          cwd: '/mock/superskills/generators/test-skill',
          detached: true,
          maxBuffer: 256 * 1024 * 1024
        })
      );
    });

    it('should handle execution failure', async () => {
      // Mock failed execution
      mockChild.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback('error message'), 10);
        }
      });
      mockChild.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 20);
        }
      });

      const result = await registry.run('test-skill', { test: 'input' });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toContain('Command failed with exit code 1');
    });

    it('should handle timeout', async () => {
      // Mock process.kill for process group kills
      const originalKill = process.kill;
      process.kill = jest.fn();

      // Mock timeout scenario - never call close
      mockChild.on.mockImplementation((event, callback) => {
        // Don't call the close callback to simulate hanging process
      });

      const result = await registry.run('test-skill', { test: 'input' }, { timeout: 1 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      // Should try process group kill first (-pid), or fallback to child.kill
      expect(process.kill.mock.calls.length + mockChild.kill.mock.calls.length).toBeGreaterThan(0);

      process.kill = originalKill;
    }, 10000);
  });

  describe('Statistics', () => {
    beforeEach(() => {
      registry.superskills.set('skill1', {
        name: 'skill1',
        category: 'generator',
        tokenSavings: 'Saves 50% tokens'
      });
      registry.superskills.set('skill2', {
        name: 'skill2',
        category: 'transformer',
        tokenSavings: 'No savings'
      });
    });

    it('should provide registry statistics', () => {
      const stats = registry.getStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byCategory.generator).toBe(1);
      expect(stats.byCategory.transformer).toBe(1);
      expect(stats.totalTokenSavings).toBe(1); // Only skill1 has "save" in tokenSavings
    });
  });
});