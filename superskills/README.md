# SuperSkill Core Infrastructure

This directory contains the core SuperSkill system for the AG Dev project.

## Architecture

### Components Built:

1. **manifest-schema.json** - JSON Schema for validating SuperSkill manifests
2. **registry.js** - SuperSkillRegistry class for discovery, validation, and execution
3. **runner.js** - CLI tool for managing and running SuperSkills
4. **Server Integration** - API endpoints added to `../server/server.js`

### Directory Structure:

```
superskills/
├── manifest-schema.json       # JSON Schema validation
├── registry.js               # Core registry class
├── runner.js                 # CLI interface
├── generators/              # Code/content generation SuperSkills
├── transformers/           # Data/format transformation SuperSkills  
├── analyzers/              # Analysis and metrics SuperSkills
├── connectors/             # API/service integration SuperSkills
├── builders/               # Document/file builders SuperSkills
└── validators/             # Validation and testing SuperSkills
```

## Usage

### CLI Commands:

```bash
# List all SuperSkills
node runner.js list

# Search SuperSkills
node runner.js search "api rest"

# Get SuperSkill details
node runner.js info <name>

# Execute SuperSkill
node runner.js run <name> --input data.json

# Show registry statistics
node runner.js stats

# Validate manifest
node runner.js validate path/to/manifest.json
```

### API Endpoints:

```
GET  /api/superskills           → List all SuperSkills
GET  /api/superskills/search?q= → Search SuperSkills  
GET  /api/superskills/:name     → Get specific SuperSkill
POST /api/superskills/:name/run → Execute SuperSkill
GET  /api/superskills/stats     → Registry statistics
```

### Programmatic Usage:

```javascript
const SuperSkillRegistry = require('./registry');

const registry = new SuperSkillRegistry(__dirname);
registry.loadAll();

// Get stats
console.log(registry.getStats());

// Search
const results = registry.search('api', ['rest', 'json']);

// Execute
const result = await registry.run('my-skill', { input: 'data' });
```

## SuperSkill Manifest Structure:

```json
{
  "name": "my-superskill",
  "version": "1.0.0", 
  "category": "generator|transformer|analyzer|connector|builder|validator",
  "description": "What this SuperSkill does",
  "input": {
    "type": "json|text|file|url|stream",
    "schema": { "type": "object", "properties": {...} },
    "required": ["field1", "field2"],
    "example": { "field1": "value" }
  },
  "output": {
    "type": "json|text|file|stream",
    "structure": { "type": "object", "properties": {...} },
    "format": "Description of output format"
  },
  "tokenSavings": "Description of token savings",
  "tags": ["tag1", "tag2"],
  "requires": ["node", "python", "curl"],
  "run": "node script.js",
  "timeout": 60
}
```

## Features:

✅ **Discovery**: Automatically finds all `manifest.json` files in category directories
✅ **Validation**: Validates manifests against JSON Schema  
✅ **Search**: Fuzzy search by name, description, tags with relevance scoring
✅ **Execution**: Runs SuperSkills with timeout handling and input validation
✅ **CLI Interface**: Full-featured command-line tool with colors and JSON output
✅ **API Integration**: RESTful endpoints integrated into AG Dev server
✅ **Error Handling**: Comprehensive error handling with helpful messages
✅ **Statistics**: Registry stats and token savings tracking

## Testing:

The system was tested with existing SuperSkills and a new test SuperSkill (`text-upper`) that transforms text to uppercase. All functionality works as expected.

Current registry contains **14 SuperSkills** across **5 categories**.