#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const HEAVY_PACKAGES = [
  'webpack', '@angular/core', 'react', 'vue', 'typescript', 'babel',
  'lodash', 'moment', 'axios', 'express', 'mongoose', 'sequelize',
  'jest', 'mocha', 'cypress', 'puppeteer', 'electron'
];

function parsePackageJson(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    const packageData = JSON.parse(content);
    
    const dependencies = [];
    const devDependencies = [];
    
    // Parse dependencies
    if (packageData.dependencies) {
      for (const [name, version] of Object.entries(packageData.dependencies)) {
        dependencies.push({
          name,
          version,
          type: 'production'
        });
      }
    }
    
    // Parse devDependencies
    if (packageData.devDependencies) {
      for (const [name, version] of Object.entries(packageData.devDependencies)) {
        devDependencies.push({
          name,
          version,
          type: 'development'
        });
      }
    }
    
    return { dependencies, devDependencies, ecosystem: 'node' };
  } catch (error) {
    throw new Error(`Error parsing package.json: ${error.message}`);
  }
}

function parseRequirementsTxt(projectPath) {
  const requirementsPath = path.join(projectPath, 'requirements.txt');
  
  if (!fs.existsSync(requirementsPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(requirementsPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const dependencies = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        // Parse package==version or package>=version etc.
        const match = trimmed.match(/^([^=><!\s]+)([=><!=]+.*)$/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            type: 'production'
          });
        } else {
          dependencies.push({
            name: trimmed,
            version: '*',
            type: 'production'
          });
        }
      }
    }
    
    return { dependencies, devDependencies: [], ecosystem: 'python' };
  } catch (error) {
    throw new Error(`Error parsing requirements.txt: ${error.message}`);
  }
}

function parseGemfile(projectPath) {
  const gemfilePath = path.join(projectPath, 'Gemfile');
  
  if (!fs.existsSync(gemfilePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(gemfilePath, 'utf8');
    const lines = content.split('\n');
    
    const dependencies = [];
    const devDependencies = [];
    
    let inDevGroup = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('group :development')) {
        inDevGroup = true;
        continue;
      } else if (trimmed.startsWith('end')) {
        inDevGroup = false;
        continue;
      }
      
      const gemMatch = trimmed.match(/gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/);
      if (gemMatch) {
        const dep = {
          name: gemMatch[1],
          version: gemMatch[2] || '*',
          type: inDevGroup ? 'development' : 'production'
        };
        
        if (inDevGroup) {
          devDependencies.push(dep);
        } else {
          dependencies.push(dep);
        }
      }
    }
    
    return { dependencies, devDependencies, ecosystem: 'ruby' };
  } catch (error) {
    throw new Error(`Error parsing Gemfile: ${error.message}`);
  }
}

function findDuplicates(allDeps) {
  const nameCount = {};
  const duplicates = [];
  
  for (const dep of allDeps) {
    if (nameCount[dep.name]) {
      nameCount[dep.name]++;
    } else {
      nameCount[dep.name] = 1;
    }
  }
  
  for (const [name, count] of Object.entries(nameCount)) {
    if (count > 1) {
      const versions = allDeps
        .filter(dep => dep.name === name)
        .map(dep => ({ version: dep.version, type: dep.type }));
      duplicates.push({ name, count, versions });
    }
  }
  
  return duplicates;
}

function checkOutdated(allDeps) {
  const outdated = [];
  
  for (const dep of allDeps) {
    // Simple heuristic for potentially outdated versions
    if (dep.version.includes('^0.') || dep.version.includes('~0.')) {
      outdated.push({
        name: dep.name,
        version: dep.version,
        reason: 'Version 0.x (potentially unstable)'
      });
    } else if (dep.version.match(/\^[1-2]\./)) {
      outdated.push({
        name: dep.name,
        version: dep.version,
        reason: 'Potentially old major version'
      });
    }
  }
  
  return outdated;
}

function identifyHeavyPackages(allDeps) {
  const heavy = [];
  
  for (const dep of allDeps) {
    if (HEAVY_PACKAGES.includes(dep.name) || HEAVY_PACKAGES.some(pkg => dep.name.includes(pkg))) {
      heavy.push({
        name: dep.name,
        version: dep.version,
        type: dep.type,
        reason: 'Known large package'
      });
    }
  }
  
  return heavy;
}

function buildTree(dependencies, devDependencies, ecosystem) {
  const files = [];
  
  switch (ecosystem) {
    case 'node':
      files.push('package.json');
      if (fs.existsSync('package-lock.json')) files.push('package-lock.json');
      if (fs.existsSync('yarn.lock')) files.push('yarn.lock');
      break;
    case 'python':
      files.push('requirements.txt');
      if (fs.existsSync('setup.py')) files.push('setup.py');
      if (fs.existsSync('Pipfile')) files.push('Pipfile');
      break;
    case 'ruby':
      files.push('Gemfile');
      if (fs.existsSync('Gemfile.lock')) files.push('Gemfile.lock');
      break;
  }
  
  const allDeps = [...dependencies, ...devDependencies];
  const heavyPackages = identifyHeavyPackages(allDeps);
  
  return {
    ecosystem,
    files,
    heavyPackages
  };
}

async function main() {
  try {
    let input;
    
    // Read from stdin or --input flag
    if (process.argv.includes('--input')) {
      const inputIndex = process.argv.indexOf('--input');
      if (inputIndex + 1 < process.argv.length) {
        input = JSON.parse(process.argv[inputIndex + 1]);
      } else {
        throw new Error('--input flag requires JSON argument');
      }
    } else {
      // Read from stdin
      const chunks = [];
      process.stdin.on('data', chunk => chunks.push(chunk));
      await new Promise(resolve => process.stdin.on('end', resolve));
      input = JSON.parse(Buffer.concat(chunks).toString());
    }
    
    if (!input.projectPath) {
      throw new Error('projectPath is required');
    }
    
    const projectPath = path.resolve(input.projectPath);
    
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }
    
    // Try to parse different dependency files
    let result = null;
    
    // Try Node.js first
    result = parsePackageJson(projectPath);
    
    // Try Python if no Node.js
    if (!result) {
      result = parseRequirementsTxt(projectPath);
    }
    
    // Try Ruby if no Node.js or Python
    if (!result) {
      result = parseGemfile(projectPath);
    }
    
    if (!result) {
      throw new Error('No supported dependency files found (package.json, requirements.txt, or Gemfile)');
    }
    
    const { dependencies, devDependencies, ecosystem } = result;
    const allDeps = [...dependencies, ...devDependencies];
    
    const duplicates = findDuplicates(allDeps);
    const outdated = checkOutdated(allDeps);
    const tree = buildTree(dependencies, devDependencies, ecosystem);
    
    const output = {
      dependencies,
      devDependencies,
      totalDeps: allDeps.length,
      outdatedCheck: {
        outdated,
        duplicates
      },
      tree
    };
    
    console.log(JSON.stringify(output, null, 2));
    
  } catch (error) {
    const errorResult = { error: error.message };
    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(0); // Don't crash, return error gracefully
  }
}

if (require.main === module) {
  main();
}

module.exports = { parsePackageJson, parseRequirementsTxt, parseGemfile, findDuplicates, checkOutdated };