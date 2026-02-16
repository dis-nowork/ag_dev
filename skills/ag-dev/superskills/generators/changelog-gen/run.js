#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Parse conventional commit message
function parseCommit(message) {
  const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: (.+)$/;
  const match = message.match(conventionalRegex);
  
  if (match) {
    return {
      type: match[1],
      scope: match[2] ? match[2].slice(1, -1) : null,
      description: match[3],
      isConventional: true
    };
  }
  
  return {
    type: 'other',
    scope: null,
    description: message,
    isConventional: false
  };
}

// Get git commits between two references
function getCommits(repoPath, fromRef, toRef) {
  const range = fromRef && toRef ? `${fromRef}..${toRef}` : 
                fromRef ? `${fromRef}..HEAD` :
                toRef ? `${toRef}` : '';
  
  const gitCommand = `git log ${range} --oneline --no-merges`;
  
  try {
    const output = execSync(gitCommand, { 
      cwd: repoPath, 
      encoding: 'utf8' 
    });
    
    return output.trim().split('\\n').filter(line => line).map(line => {
      const [hash, ...messageParts] = line.split(' ');
      const message = messageParts.join(' ');
      const parsed = parseCommit(message);
      
      return {
        hash: hash,
        message: message,
        ...parsed
      };
    });
  } catch (error) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

// Group commits by type
function groupCommits(commits) {
  const groups = {
    feat: [],
    fix: [],
    docs: [],
    style: [],
    refactor: [],
    test: [],
    chore: [],
    perf: [],
    ci: [],
    build: [],
    revert: [],
    other: []
  };
  
  commits.forEach(commit => {
    groups[commit.type].push(commit);
  });
  
  // Filter out empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
}

// Generate markdown changelog
function generateMarkdown(groups, fromTag, toTag) {
  let changelog = '# Changelog\\n\\n';
  
  if (fromTag || toTag) {
    const version = toTag || 'HEAD';
    const from = fromTag ? ` (from ${fromTag})` : '';
    changelog += `## ${version}${from}\\n\\n`;
  }
  
  const typeLabels = {
    feat: '✨ Features',
    fix: '🐛 Bug Fixes',
    docs: '📚 Documentation',
    style: '💎 Styles',
    refactor: '♻️ Code Refactoring',
    test: '🧪 Tests',
    chore: '🔧 Chores',
    perf: '⚡ Performance Improvements',
    ci: '👷 CI',
    build: '📦 Build System',
    revert: '⏪ Reverts',
    other: '📝 Other Changes'
  };
  
  Object.keys(groups).forEach(type => {
    const commits = groups[type];
    const label = typeLabels[type] || type;
    
    changelog += `### ${label}\\n\\n`;
    
    commits.forEach(commit => {
      const scope = commit.scope ? `**${commit.scope}:** ` : '';
      changelog += `- ${scope}${commit.description} (${commit.hash})\\n`;
    });
    
    changelog += '\\n';
  });
  
  return changelog;
}

// Generate HTML changelog
function generateHTML(groups, fromTag, toTag) {
  let changelog = '<h1>Changelog</h1>\\n';
  
  if (fromTag || toTag) {
    const version = toTag || 'HEAD';
    const from = fromTag ? ` (from ${fromTag})` : '';
    changelog += `<h2>${version}${from}</h2>\\n`;
  }
  
  const typeLabels = {
    feat: '✨ Features',
    fix: '🐛 Bug Fixes',
    docs: '📚 Documentation',
    style: '💎 Styles',
    refactor: '♻️ Code Refactoring',
    test: '🧪 Tests',
    chore: '🔧 Chores',
    perf: '⚡ Performance Improvements',
    ci: '👷 CI',
    build: '📦 Build System',
    revert: '⏪ Reverts',
    other: '📝 Other Changes'
  };
  
  Object.keys(groups).forEach(type => {
    const commits = groups[type];
    const label = typeLabels[type] || type;
    
    changelog += `<h3>${label}</h3>\\n<ul>\\n`;
    
    commits.forEach(commit => {
      const scope = commit.scope ? `<strong>${commit.scope}:</strong> ` : '';
      changelog += `  <li>${scope}${commit.description} <code>${commit.hash}</code></li>\\n`;
    });
    
    changelog += '</ul>\\n';
  });
  
  return changelog;
}

// Get the last tag in the repository
function getLastTag(repoPath) {
  try {
    const output = execSync('git describe --tags --abbrev=0', {
      cwd: repoPath,
      encoding: 'utf8'
    });
    return output.trim();
  } catch (error) {
    return null;
  }
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
      const { repoPath, fromTag, toTag, format = 'md' } = input;
      
      if (!repoPath) {
        throw new Error('repoPath is required');
      }
      
      if (!fs.existsSync(repoPath)) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
      }
      
      // Auto-detect fromTag if not provided
      const resolvedFromTag = fromTag || getLastTag(repoPath);
      
      // Get commits
      const commits = getCommits(repoPath, resolvedFromTag, toTag);
      
      if (commits.length === 0) {
        console.log(JSON.stringify({
          success: true,
          changelog: format === 'html' ? '<p>No commits found in the specified range.</p>' : 'No commits found in the specified range.',
          commits: 0,
          fromTag: resolvedFromTag,
          toTag: toTag || 'HEAD'
        }));
        return;
      }
      
      // Group commits by type
      const groups = groupCommits(commits);
      
      // Generate changelog
      const changelog = format === 'html' ? 
        generateHTML(groups, resolvedFromTag, toTag) : 
        generateMarkdown(groups, resolvedFromTag, toTag);
      
      console.log(JSON.stringify({
        success: true,
        changelog,
        commits: commits.length,
        groups: Object.keys(groups).map(type => ({
          type,
          count: groups[type].length
        })),
        fromTag: resolvedFromTag,
        toTag: toTag || 'HEAD',
        format
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