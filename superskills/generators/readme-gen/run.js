#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple template engine
function applyTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  }).replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, content) => {
    return data[condition] ? content : '';
  }).replace(/\{\{#unless\s+(\w+)\}\}(.*?)\{\{\/unless\}\}/gs, (match, condition, content) => {
    return !data[condition] ? content : '';
  });
}

// Analyze package.json
function analyzePackageJson(projectPath) {
  const packagePath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

// Detect project structure
function detectProjectStructure(projectPath) {
  const files = fs.existsSync(projectPath) ? fs.readdirSync(projectPath) : [];
  
  const structure = {
    hasDockerfile: files.includes('Dockerfile'),
    hasEnvExample: files.includes('.env.example'),
    hasGitignore: files.includes('.gitignore'),
    hasLicense: files.includes('LICENSE') || files.includes('LICENSE.md'),
    hasSrcDir: files.includes('src'),
    hasLibDir: files.includes('lib'),
    hasTestDir: files.includes('test') || files.includes('tests') || files.includes('__tests__'),
    hasDocsDir: files.includes('docs'),
    hasExamples: files.includes('examples'),
    stack: 'unknown'
  };
  
  // Detect stack
  if (files.includes('package.json')) {
    structure.stack = 'node';
  } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
    structure.stack = 'python';
  } else if (files.includes('Gemfile')) {
    structure.stack = 'ruby';
  } else if (files.includes('go.mod')) {
    structure.stack = 'go';
  } else if (files.includes('Cargo.toml')) {
    structure.stack = 'rust';
  }
  
  return structure;
}

// Generate installation section
function generateInstallation(packageInfo, structure) {
  if (!packageInfo && structure.stack === 'unknown') {
    return `\\`\\`\\`bash
# Clone the repository
git clone <repository-url>
cd <project-name>

# Follow stack-specific installation instructions
\\`\\`\\``;
  }
  
  if (structure.stack === 'node') {
    return `\\`\\`\\`bash
# Clone the repository
git clone <repository-url>
cd ${packageInfo?.name || '<project-name>'}

# Install dependencies
npm install

# Copy environment file (if needed)
${structure.hasEnvExample ? 'cp .env.example .env' : '# Configure environment variables'}
\\`\\`\\``;
  }
  
  if (structure.stack === 'python') {
    return `\\`\\`\\`bash
# Clone the repository
git clone <repository-url>
cd <project-name>

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (if needed)
${structure.hasEnvExample ? 'cp .env.example .env' : '# Configure environment variables'}
\\`\\`\\``;
  }
  
  return `\\`\\`\\`bash
# Clone the repository
git clone <repository-url>
cd <project-name>

# Follow installation instructions for ${structure.stack}
\\`\\`\\``;
}

// Generate usage section
function generateUsage(packageInfo, structure) {
  if (structure.stack === 'node' && packageInfo?.scripts) {
    const scripts = packageInfo.scripts;
    let usage = '';
    
    if (scripts.dev || scripts.start) {
      usage += `\\`\\`\\`bash
# Development
${scripts.dev ? 'npm run dev' : scripts.start ? 'npm start' : 'npm run start'}
\\`\\`\\`

`;
    }
    
    if (scripts.build) {
      usage += `\\`\\`\\`bash
# Build for production
npm run build
\\`\\`\\`

`;
    }
    
    return usage || 'Add usage instructions here.';
  }
  
  return 'Add usage instructions here.';
}

// Generate development section
function generateDevelopment(packageInfo, structure) {
  let dev = '';
  
  if (structure.stack === 'node' && packageInfo?.scripts) {
    const scripts = packageInfo.scripts;
    
    dev += `\\`\\`\\`bash
# Install dependencies
npm install

`;
    
    if (scripts.dev) {
      dev += `# Start development server
npm run dev

`;
    }
    
    if (scripts.lint) {
      dev += `# Run linting
npm run lint

`;
    }
    
    if (scripts.format) {
      dev += `# Format code
npm run format

`;
    }
  }
  
  if (structure.hasDockerfile) {
    dev += `\\`\\`\\`bash
# Run with Docker
docker build -t ${packageInfo?.name || 'app'} .
docker run -p 3000:3000 ${packageInfo?.name || 'app'}
\\`\\`\\`

`;
  }
  
  return dev || 'Development instructions will be added here.';
}

// Generate testing section
function generateTesting(packageInfo, structure) {
  if (structure.stack === 'node' && packageInfo?.scripts?.test) {
    return `\\`\\`\\`bash
# Run tests
npm test

# Run tests with coverage
${packageInfo.scripts['test:coverage'] ? 'npm run test:coverage' : 'npm test -- --coverage'}
\\`\\`\\``;
  }
  
  if (structure.hasTestDir) {
    return `\\`\\`\\`bash
# Run tests
# Add your testing commands here
\\`\\`\\``;
  }
  
  return null;
}

// Generate table of contents
function generateTableOfContents(sections) {
  const sectionNames = {
    installation: 'Installation',
    usage: 'Usage',
    api: 'API Documentation',
    development: 'Development',
    testing: 'Testing',
    deployment: 'Deployment',
    contributing: 'Contributing',
    license: 'License'
  };
  
  return sections.map(section => {
    const name = sectionNames[section] || section;
    const link = name.toLowerCase().replace(/\s+/g, '-');
    return `- [${name}](#${link})`;
  }).join('\\n');
}

// Generate badges
function generateBadges(packageInfo, structure) {
  const badges = [];
  
  if (packageInfo?.version) {
    badges.push(`![Version](https://img.shields.io/badge/version-${packageInfo.version}-blue.svg)`);
  }
  
  if (packageInfo?.license) {
    badges.push(`![License](https://img.shields.io/badge/license-${packageInfo.license}-green.svg)`);
  }
  
  if (structure.stack === 'node') {
    badges.push('![Node](https://img.shields.io/badge/node-%3E%3D14-brightgreen.svg)');
  }
  
  return badges.join(' ');
}

// Main README generation
function generateReadme(input) {
  const { projectPath, name, description, sections = ['installation', 'usage', 'development'] } = input;
  
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }
  
  const packageInfo = analyzePackageJson(projectPath);
  const structure = detectProjectStructure(projectPath);
  
  const templatePath = path.join(__dirname, 'templates', 'readme.md');
  const template = fs.readFileSync(templatePath, 'utf8');
  
  const data = {
    name: name || packageInfo?.name || 'Project Name',
    description: description || packageInfo?.description || 'Project description',
    badges: generateBadges(packageInfo, structure),
    tableOfContents: generateTableOfContents(sections)
  };
  
  // Generate sections
  if (sections.includes('installation')) {
    data.installation = generateInstallation(packageInfo, structure);
  }
  
  if (sections.includes('usage')) {
    data.usage = generateUsage(packageInfo, structure);
  }
  
  if (sections.includes('development')) {
    data.development = generateDevelopment(packageInfo, structure);
  }
  
  if (sections.includes('testing')) {
    data.testing = generateTesting(packageInfo, structure);
  }
  
  if (sections.includes('api')) {
    data.api = 'API documentation will be added here.';
  }
  
  if (sections.includes('deployment')) {
    data.deployment = structure.hasDockerfile ? 
      'This project includes a Dockerfile for containerized deployment.' : 
      'Deployment instructions will be added here.';
  }
  
  if (sections.includes('contributing')) {
    data.contributing = 'Please read the contributing guidelines before submitting pull requests.';
  }
  
  if (sections.includes('license')) {
    data.license = packageInfo?.license ? 
      `This project is licensed under the ${packageInfo.license} License.` :
      'License information will be added here.';
  }
  
  return applyTemplate(template, data);
}

// Main function
async function main() {
  let input;
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      input = JSON.parse(fs.readFileSync(args[i + 1], 'utf8'));
      i++;
    }
  }
  
  // Read from stdin if no input file specified
  if (!input) {
    const chunks = [];
    process.stdin.on('data', chunk => chunks.push(chunk));
    process.stdin.on('end', () => {
      try {
        input = JSON.parse(chunks.join(''));
        processInput();
      } catch (error) {
        console.error(JSON.stringify({
          success: false,
          error: 'Invalid JSON input: ' + error.message
        }));
        process.exit(1);
      }
    });
  } else {
    processInput();
  }
  
  function processInput() {
    try {
      const { projectPath } = input;
      
      if (!projectPath) {
        throw new Error('projectPath is required');
      }
      
      const readme = generateReadme(input);
      
      console.log(JSON.stringify({
        success: true,
        readme,
        projectPath,
        sections: input.sections || ['installation', 'usage', 'development']
      }));
      
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }));
      process.exit(1);
    }
  }
}

main();