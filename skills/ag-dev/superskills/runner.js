#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const SuperSkillRegistry = require('./registry');

// Simple color helpers (no external deps)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  dim: '\x1b[2m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
  console.log(colorize(message, color));
}

function error(message) {
  console.error(colorize(`❌ ${message}`, 'red'));
}

function success(message) {
  console.log(colorize(`✅ ${message}`, 'green'));
}

function info(message) {
  console.log(colorize(`ℹ️  ${message}`, 'blue'));
}

function warning(message) {
  console.log(colorize(`⚠️  ${message}`, 'yellow'));
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  const params = [];

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const flagName = arg.slice(2);
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('--')) {
        options[flagName] = nextArg;
        i++; // Skip next arg since we consumed it
      } else {
        options[flagName] = true;
      }
    } else {
      params.push(arg);
    }
  }

  return { command, params, options };
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
${colorize('SuperSkill Registry CLI', 'cyan')}
${colorize('======================', 'cyan')}

${colorize('USAGE:', 'bright')}
  node runner.js <command> [options] [arguments]

${colorize('COMMANDS:', 'bright')}
  ${colorize('list', 'green')}                              List all SuperSkills
  ${colorize('search <query>', 'green')}                   Search SuperSkills by name/description/tags
  ${colorize('info <name>', 'green')}                      Show detailed SuperSkill information
  ${colorize('run <name>', 'green')}                       Execute a SuperSkill
  ${colorize('stats', 'green')}                            Show registry statistics
  ${colorize('validate <path>', 'green')}                  Validate a manifest file

${colorize('OPTIONS:', 'bright')}
  ${colorize('--json', 'yellow')}                          Output results as JSON
  ${colorize('--input <file>', 'yellow')}                  Input file for run command
  ${colorize('--output <dir>', 'yellow')}                  Output directory for run command
  ${colorize('--timeout <seconds>', 'yellow')}             Override timeout for run command
  ${colorize('--tags <tag1,tag2>', 'yellow')}              Filter by tags (search command)

${colorize('EXAMPLES:', 'bright')}
  node runner.js list
  node runner.js search "api rest"
  node runner.js info my-generator
  node runner.js run my-transformer --input data.json
  node runner.js validate ./generators/my-skill/manifest.json
  node runner.js stats --json
`);
}

/**
 * Format SuperSkill for display
 */
function formatSuperskill(superskill, detailed = false) {
  if (detailed) {
    return `
${colorize(`📦 ${superskill.name}`, 'bright')} ${colorize(`v${superskill.version}`, 'dim')}
${colorize('Category:', 'yellow')} ${superskill.category}
${colorize('Description:', 'yellow')} ${superskill.description}
${colorize('Tags:', 'yellow')} ${superskill.tags.join(', ') || 'None'}
${colorize('Token Savings:', 'yellow')} ${superskill.tokenSavings || 'Not specified'}
${colorize('Requires:', 'yellow')} ${superskill.requires?.join(', ') || 'None'}
${colorize('Timeout:', 'yellow')} ${superskill.timeout || 60}s
${colorize('Command:', 'yellow')} ${superskill.run}

${colorize('Input:', 'cyan')}
  Type: ${superskill.input.type}
  Required: ${superskill.input.required?.join(', ') || 'None'}

${colorize('Output:', 'cyan')}
  Type: ${superskill.output.type}
  Format: ${superskill.output.format || 'Not specified'}
`;
  } else {
    const nameWithVersion = `${superskill.name} (${superskill.version})`;
    const categoryBadge = `[${superskill.category}]`;
    const description = superskill.description.length > 60 
      ? superskill.description.substring(0, 57) + '...'
      : superskill.description;
    
    return `${colorize(nameWithVersion, 'green')} ${colorize(categoryBadge, 'yellow')} - ${description}`;
  }
}

/**
 * List all SuperSkills
 */
async function listCommand(registry, options) {
  try {
    const superskills = registry.list();
    
    if (options.json) {
      console.log(JSON.stringify(superskills, null, 2));
      return;
    }

    if (superskills.length === 0) {
      warning('No SuperSkills found. Try running loadAll() first.');
      return;
    }

    log(`\n${colorize(`Found ${superskills.length} SuperSkills:`, 'bright')}\n`);

    // Group by category
    const byCategory = {};
    superskills.forEach(skill => {
      if (!byCategory[skill.category]) byCategory[skill.category] = [];
      byCategory[skill.category].push(skill);
    });

    Object.keys(byCategory).sort().forEach(category => {
      log(colorize(`📂 ${category.toUpperCase()}`, 'cyan'));
      byCategory[category].forEach(skill => {
        console.log(`  ${formatSuperskill(skill)}`);
      });
      console.log();
    });

  } catch (error) {
    error(`Failed to list SuperSkills: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Search SuperSkills
 */
async function searchCommand(registry, query, options) {
  if (!query) {
    error('Search query is required');
    process.exit(1);
  }

  try {
    const tags = options.tags ? options.tags.split(',').map(t => t.trim()) : [];
    const results = registry.search(query, tags);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      warning(`No SuperSkills found matching "${query}"`);
      return;
    }

    log(`\n${colorize(`Found ${results.length} results for "${query}":`, 'bright')}\n`);

    results.forEach((skill, index) => {
      const relevanceScore = colorize(`[${skill._score}]`, 'dim');
      console.log(`${index + 1}. ${formatSuperskill(skill)} ${relevanceScore}`);
    });
    console.log();

  } catch (error) {
    error(`Search failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show SuperSkill info
 */
async function infoCommand(registry, name, options) {
  if (!name) {
    error('SuperSkill name is required');
    process.exit(1);
  }

  try {
    const superskill = registry.get(name);

    if (!superskill) {
      error(`SuperSkill "${name}" not found`);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(superskill, null, 2));
      return;
    }

    console.log(formatSuperskill(superskill, true));

  } catch (error) {
    error(`Failed to get SuperSkill info: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run a SuperSkill
 */
async function runCommand(registry, name, options) {
  if (!name) {
    error('SuperSkill name is required');
    process.exit(1);
  }

  try {
    const superskill = registry.get(name);

    if (!superskill) {
      error(`SuperSkill "${name}" not found`);
      process.exit(1);
    }

    // Prepare input
    let input = {};
    
    if (options.input) {
      if (options.input === '-') {
        // Read from stdin
        const chunks = [];
        process.stdin.on('data', chunk => chunks.push(chunk));
        await new Promise(resolve => process.stdin.on('end', resolve));
        const inputText = Buffer.concat(chunks).toString();
        
        try {
          input = JSON.parse(inputText);
        } catch (e) {
          input = inputText;
        }
      } else {
        // Read from file
        const inputPath = path.resolve(options.input);
        if (!fs.existsSync(inputPath)) {
          error(`Input file not found: ${inputPath}`);
          process.exit(1);
        }

        const inputText = fs.readFileSync(inputPath, 'utf-8');
        try {
          input = JSON.parse(inputText);
        } catch (e) {
          input = inputText;
        }
      }
    }

    // Execute
    if (!options.json) {
      info(`Running SuperSkill: ${name}`);
      if (Object.keys(input).length > 0) {
        log(`Input: ${JSON.stringify(input, null, 2)}`, 'dim');
      }
      console.log();
    }

    const runOptions = {};
    if (options.timeout) {
      runOptions.timeout = parseInt(options.timeout);
    }

    const startTime = Date.now();
    const result = await registry.run(name, input, runOptions);
    const endTime = Date.now();

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Display results
    if (result.success) {
      success(`SuperSkill completed successfully in ${result.duration}s`);
      
      if (result.tokenSavings && result.tokenSavings !== 'Not specified') {
        info(`Token Savings: ${result.tokenSavings}`);
      }

      log('\n' + colorize('OUTPUT:', 'cyan'));
      console.log(result.output);

      // Save output if requested
      if (options.output) {
        const outputDir = path.resolve(options.output);
        fs.mkdirSync(outputDir, { recursive: true });
        
        const outputFile = path.join(outputDir, `${name}-output-${Date.now()}.txt`);
        fs.writeFileSync(outputFile, result.output);
        info(`Output saved to: ${outputFile}`);
      }
    } else {
      error(`SuperSkill failed: ${result.error}`);
      log(`Duration: ${result.duration}s`, 'dim');
      process.exit(1);
    }

  } catch (error) {
    error(`Execution failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show registry statistics
 */
async function statsCommand(registry, options) {
  try {
    const stats = registry.getStats();

    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    log(`\n${colorize('📊 SuperSkill Registry Statistics', 'bright')}\n`);
    
    log(`${colorize('Total SuperSkills:', 'yellow')} ${stats.total}`);
    log(`${colorize('Token Savings Count:', 'yellow')} ${stats.totalTokenSavings}`);
    
    log(`\n${colorize('By Category:', 'cyan')}`);
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    console.log();

  } catch (error) {
    error(`Failed to get stats: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Validate a manifest file
 */
async function validateCommand(registry, manifestPath, options) {
  if (!manifestPath) {
    error('Manifest path is required');
    process.exit(1);
  }

  try {
    const fullPath = path.resolve(manifestPath);
    
    if (!fs.existsSync(fullPath)) {
      error(`Manifest file not found: ${fullPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const manifest = JSON.parse(content);
    
    const validation = registry.validate(manifest);

    if (options.json) {
      console.log(JSON.stringify({
        path: fullPath,
        valid: validation.valid,
        errors: validation.errors
      }, null, 2));
      return;
    }

    if (validation.valid) {
      success(`Manifest is valid: ${fullPath}`);
      log(`✓ SuperSkill: ${manifest.name} v${manifest.version}`, 'green');
      log(`✓ Category: ${manifest.category}`, 'green');
    } else {
      error(`Manifest validation failed: ${fullPath}`);
      validation.errors.forEach(err => {
        log(`  • ${err}`, 'red');
      });
      process.exit(1);
    }

  } catch (error) {
    error(`Validation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main CLI function
 */
async function main() {
  const { command, params, options } = parseArgs();

  if (!command || command === 'help' || options.help) {
    showHelp();
    return;
  }

  // Initialize registry
  const registryPath = path.resolve(__dirname);
  const registry = new SuperSkillRegistry(registryPath);
  
  // Load all SuperSkills
  try {
    const loadResults = registry.loadAll();
    
    if (!options.json && loadResults.errors.length > 0) {
      warning(`Loaded ${loadResults.total} SuperSkills with ${loadResults.errors.length} errors`);
    }
  } catch (error) {
    if (!options.json) {
      error(`Failed to load SuperSkills: ${error.message}`);
    }
    process.exit(1);
  }

  // Execute command
  try {
    switch (command) {
      case 'list':
        await listCommand(registry, options);
        break;

      case 'search':
        await searchCommand(registry, params[0], options);
        break;

      case 'info':
        await infoCommand(registry, params[0], options);
        break;

      case 'run':
        await runCommand(registry, params[0], options);
        break;

      case 'stats':
        await statsCommand(registry, options);
        break;

      case 'validate':
        await validateCommand(registry, params[0], options);
        break;

      default:
        error(`Unknown command: ${command}`);
        log('Run "node runner.js help" for usage information.', 'dim');
        process.exit(1);
    }
  } catch (error) {
    if (!options.json) {
      error(`Command failed: ${error.message}`);
    }
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  log('\n\nOperation cancelled by user.', 'yellow');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  parseArgs,
  colorize,
  colors
};