const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

/**
 * SuperSkill Registry - Manages discovery, validation, and execution of SuperSkills
 */
class SuperSkillRegistry {
  /**
   * @param {string} superskillsDir - Root directory containing category subdirectories
   */
  constructor(superskillsDir) {
    this.superskillsDir = superskillsDir;
    this.superskills = new Map();
    this.schema = null;
    this.categories = ['generators', 'transformers', 'analyzers', 'connectors', 'builders', 'validators'];
    
    // Load schema
    this.loadSchema();
    // Auto-discover all superskills
    this.loadAll();
  }

  /**
   * Load and parse the manifest schema
   * @private
   */
  loadSchema() {
    try {
      const schemaPath = path.join(this.superskillsDir, 'manifest-schema.json');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      this.schema = JSON.parse(schemaContent);
    } catch (error) {
      console.warn('Could not load manifest schema:', error.message);
      this.schema = null;
    }
  }

  /**
   * Discover and load all SuperSkills from category directories
   * @returns {Object} Loading results with counts and errors
   */
  loadAll() {
    const results = {
      total: 0,
      byCategory: {},
      errors: []
    };

    this.superskills.clear();

    for (const category of this.categories) {
      const categoryDir = path.join(this.superskillsDir, category);
      const categoryResults = { loaded: 0, errors: [] };

      if (!fs.existsSync(categoryDir)) {
        console.warn(`Category directory not found: ${categoryDir}`);
        results.byCategory[category] = categoryResults;
        continue;
      }

      try {
        const manifests = this.findManifests(categoryDir);
        
        for (const manifestPath of manifests) {
          try {
            const manifest = this.loadManifest(manifestPath);
            const validationResult = this.validate(manifest);
            
            if (!validationResult.valid) {
              const error = `Invalid manifest ${manifestPath}: ${validationResult.errors.join(', ')}`;
              categoryResults.errors.push(error);
              results.errors.push(error);
              continue;
            }

            // Ensure category matches directory
            const expectedCategory = category.slice(0, -1); // Remove 's' suffix
            if (manifest.category !== expectedCategory) {
              const error = `Category mismatch in ${manifestPath}: expected '${expectedCategory}', got '${manifest.category}'`;
              categoryResults.errors.push(error);
              results.errors.push(error);
              continue;
            }

            // Store with full path info
            manifest._path = manifestPath;
            manifest._directory = path.dirname(manifestPath);
            
            this.superskills.set(manifest.name, manifest);
            categoryResults.loaded++;
            results.total++;
            
          } catch (error) {
            const errorMsg = `Failed to load ${manifestPath}: ${error.message}`;
            categoryResults.errors.push(errorMsg);
            results.errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to scan category ${category}: ${error.message}`;
        categoryResults.errors.push(errorMsg);
        results.errors.push(errorMsg);
      }

      results.byCategory[category] = categoryResults;
    }

    return results;
  }

  /**
   * Find all manifest.json files recursively in a directory
   * @param {string} dir - Directory to search
   * @returns {string[]} Array of manifest file paths
   * @private
   */
  findManifests(dir) {
    const manifests = [];
    
    const scanDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name === 'manifest.json') {
          manifests.push(fullPath);
        }
      }
    };

    scanDir(dir);
    return manifests;
  }

  /**
   * Load and parse a manifest file
   * @param {string} manifestPath - Path to manifest.json
   * @returns {Object} Parsed manifest
   * @private
   */
  loadManifest(manifestPath) {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Fuzzy search SuperSkills by name, description, and tags
   * @param {string} query - Search query
   * @param {string[]} [tags] - Optional tag filters
   * @returns {Object[]} Array of matching SuperSkills with relevance scores
   */
  search(query, tags = []) {
    const results = [];
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    for (const [name, superskill] of this.superskills) {
      let score = 0;
      const searchText = `${superskill.name} ${superskill.description} ${superskill.tags.join(' ')}`.toLowerCase();

      // Calculate relevance score
      for (const term of searchTerms) {
        if (superskill.name.toLowerCase().includes(term)) {
          score += 3; // Name matches are highly relevant
        }
        if (superskill.description.toLowerCase().includes(term)) {
          score += 2; // Description matches are moderately relevant
        }
        if (superskill.tags.some(tag => tag.toLowerCase().includes(term))) {
          score += 1; // Tag matches are less relevant
        }
      }

      // Filter by tags if specified
      if (tags.length > 0) {
        const hasAllTags = tags.every(tag => 
          superskill.tags.some(superskillTag => 
            superskillTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasAllTags) {
          continue;
        }
      }

      if (score > 0) {
        results.push({ ...superskill, _score: score });
      }
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b._score - a._score);
  }

  /**
   * Get a specific SuperSkill by name
   * @param {string} name - SuperSkill name
   * @returns {Object|null} SuperSkill manifest or null if not found
   */
  get(name) {
    return this.superskills.get(name) || null;
  }

  /**
   * List SuperSkills filtered by category
   * @param {string} category - Category to filter by
   * @returns {Object[]} Array of SuperSkills in the category
   */
  listByCategory(category) {
    const results = [];
    for (const [name, superskill] of this.superskills) {
      if (superskill.category === category) {
        results.push(superskill);
      }
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * List all SuperSkills with summary information
   * @returns {Object[]} Array of all SuperSkills with basic info
   */
  list() {
    const results = [];
    for (const [name, superskill] of this.superskills) {
      results.push({
        name: superskill.name,
        version: superskill.version,
        category: superskill.category,
        description: superskill.description,
        tags: superskill.tags,
        tokenSavings: superskill.tokenSavings
      });
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Execute a SuperSkill with given input
   * @param {string} name - SuperSkill name
   * @param {*} input - Input data
   * @param {Object} [opts] - Execution options
   * @param {number} [opts.timeout] - Override default timeout
   * @returns {Promise<Object>} Execution result
   */
  async run(name, input, opts = {}) {
    const superskill = this.get(name);
    if (!superskill) {
      throw new Error(`SuperSkill '${name}' not found`);
    }

    const startTime = Date.now();
    const timeout = opts.timeout || superskill.timeout || 60;
    
    try {
      // Validate input against schema if available
      if (superskill.input.schema) {
        const inputValidation = this.validateInput(input, superskill.input);
        if (!inputValidation.valid) {
          throw new Error(`Invalid input: ${inputValidation.errors.join(', ')}`);
        }
      }

      const result = await this.executeCommand(superskill, input, { timeout });
      const duration = (Date.now() - startTime) / 1000;

      return {
        success: true,
        output: result.output,
        duration,
        tokenSavings: superskill.tokenSavings,
        exitCode: result.exitCode
      };

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      return {
        success: false,
        error: error.message,
        duration,
        tokenSavings: null,
        exitCode: error.exitCode || -1
      };
    }
  }

  /**
   * Execute the SuperSkill command
   * @param {Object} superskill - SuperSkill manifest
   * @param {*} input - Input data
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Command execution result
   * @private
   */
  async executeCommand(superskill, input, options) {
    const { timeout } = options;
    
    return new Promise((resolve, reject) => {
      const cwd = superskill._directory;
      const command = superskill.run;
      
      // Parse command and arguments
      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      // Input handling: SuperSkills expect clean arguments
      const inputJson = JSON.stringify(input);
      
      // Security and resource limiting options
      const spawnOptions = {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,  // Run in separate process group for clean kills
        maxBuffer: 256 * 1024 * 1024,  // 256MB memory limit
        env: {
          ...process.env,
          // Limit environment for security
          PATH: process.env.PATH,
          NODE_ENV: process.env.NODE_ENV || 'production'
        }
      };

      // If running as root, switch to 'nobody' user for security
      if (process.getuid && process.getuid() === 0) {
        try {
          const os = require('os');
          spawnOptions.uid = os.userInfo('nobody').uid;
          spawnOptions.gid = os.userInfo('nobody').gid;
        } catch (error) {
          // Fallback to numeric values if 'nobody' user lookup fails
          spawnOptions.uid = 65534; // nobody user
          spawnOptions.gid = 65534; // nobody group
        }
      }

      const child = spawn(cmd, args, spawnOptions);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Always send input via stdin (SuperSkills are designed for this)
      if (child.stdin) {
        child.stdin.write(inputJson);
        child.stdin.end();
      }

      // Set timeout
      const timer = setTimeout(() => {
        // Kill the entire process group to ensure clean termination
        if (child.pid) {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch (error) {
            // Fallback to killing just the main process
            child.kill('SIGKILL');
          }
        }
        const error = new Error(`Command timed out after ${timeout} seconds`);
        error.code = 'TIMEOUT';
        reject(error);
      }, timeout * 1000);

      child.on('close', (code) => {
        clearTimeout(timer);
        
        if (code === 0) {
          resolve({
            output: stdout.trim(),
            exitCode: code
          });
        } else {
          const error = new Error(`Command failed with exit code ${code}: ${stderr}`);
          error.exitCode = code;
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Validate input data against SuperSkill input schema
   * @param {*} input - Input data to validate
   * @param {Object} inputSpec - Input specification from manifest
   * @returns {Object} Validation result
   * @private
   */
  validateInput(input, inputSpec) {
    const errors = [];

    // Check required fields
    if (inputSpec.required && Array.isArray(inputSpec.required)) {
      for (const field of inputSpec.required) {
        if (input == null || typeof input !== 'object' || !(field in input)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Basic type checking based on input type
    if (inputSpec.type === 'json' && typeof input !== 'object') {
      errors.push('Input must be a JSON object');
    } else if (inputSpec.type === 'text' && typeof input !== 'string') {
      errors.push('Input must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a manifest against the schema
   * @param {Object} manifest - Manifest to validate
   * @returns {Object} Validation result
   */
  validate(manifest) {
    const errors = [];

    if (!this.schema) {
      return { valid: true, errors: ['Schema not available'] };
    }

    // Basic schema validation (simplified implementation)
    const required = this.schema.required || [];
    for (const field of required) {
      if (!(field in manifest)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Category validation
    if (manifest.category && this.schema.properties.category.enum) {
      if (!this.schema.properties.category.enum.includes(manifest.category)) {
        errors.push(`Invalid category: ${manifest.category}`);
      }
    }

    // Version format validation (basic semver check)
    if (manifest.version && !this.isValidSemVer(manifest.version)) {
      errors.push(`Invalid semantic version: ${manifest.version}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Basic semantic version validation
   * @param {string} version - Version string to validate
   * @returns {boolean} True if valid semver
   * @private
   */
  isValidSemVer(version) {
    const semVerRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semVerRegex.test(version);
  }

  /**
   * Get registry statistics
   * @returns {Object} Statistics about the registry
   */
  getStats() {
    const stats = {
      total: this.superskills.size,
      byCategory: {},
      totalTokenSavings: 0
    };

    for (const [name, superskill] of this.superskills) {
      const category = superskill.category;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      
      // Count token savings mentions (simplified)
      if (superskill.tokenSavings && superskill.tokenSavings.toLowerCase().includes('save')) {
        stats.totalTokenSavings++;
      }
    }

    return stats;
  }
}

module.exports = SuperSkillRegistry;