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

// Get default versions for each stack
function getDefaultVersions(stack) {
  const versions = {
    node: '18',
    python: '3.11',
    ruby: '3.1'
  };
  return versions[stack] || 'latest';
}

// Detect package file if not specified
function detectPackageFile(stack, packageFile) {
  if (packageFile) return packageFile;
  
  const defaultFiles = {
    node: 'package.json',
    python: 'requirements.txt',
    ruby: 'Gemfile'
  };
  
  return defaultFiles[stack];
}

// Detect lock file
function detectLockFile(stack) {
  const lockFiles = {
    node: 'package-lock.json',
    python: null,
    ruby: 'Gemfile.lock'
  };
  
  return lockFiles[stack];
}

// Generate extras sections
function generateExtras(extras) {
  if (!extras || !Array.isArray(extras)) {
    return '';
  }
  
  const extrasMap = {
    redis: `
# Redis
FROM redis:alpine AS redis
EXPOSE 6379`,
    
    postgres: `
# PostgreSQL
FROM postgres:14-alpine AS postgres
ENV POSTGRES_DB=app
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
EXPOSE 5432`,
    
    nginx: `
# Nginx
FROM nginx:alpine AS nginx
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80 443`,
    
    mongodb: `
# MongoDB
FROM mongo:5 AS mongodb
EXPOSE 27017`
  };
  
  return extras.map(extra => extrasMap[extra] || '').filter(Boolean).join('\\n');
}

// Generate Dockerfile
function generateDockerfile(input) {
  const { stack, packageFile, port = 3000, extras } = input;
  
  // Load template
  const templatePath = path.join(__dirname, 'templates', `${stack}.dockerfile`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template for stack '${stack}' not found`);
  }
  
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // Prepare template data
  const templateData = {
    [`${stack}Version`]: getDefaultVersions(stack),
    packageFile: detectPackageFile(stack, packageFile),
    lockFile: detectLockFile(stack),
    port,
    startCommand: input.startCommand || null
  };
  
  // Generate main Dockerfile
  let dockerfile = applyTemplate(template, templateData);
  
  // Add extras if specified
  const extrasSection = generateExtras(extras);
  if (extrasSection) {
    dockerfile += '\\n\\n# Additional services\\n' + extrasSection;
  }
  
  return dockerfile;
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
    } else if (args[i] === '--output' && args[i + 1]) {
      // Output file path for saving
      const outputFile = args[i + 1];
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
      const { stack } = input;
      
      if (!stack) {
        throw new Error('stack is required');
      }
      
      if (!['node', 'python', 'ruby'].includes(stack)) {
        throw new Error('stack must be one of: node, python, ruby');
      }
      
      const dockerfile = generateDockerfile(input);
      
      console.log(JSON.stringify({
        success: true,
        dockerfile,
        stack,
        port: input.port || 3000,
        extras: input.extras || []
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