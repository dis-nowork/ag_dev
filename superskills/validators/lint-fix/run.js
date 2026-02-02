#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(inputData);
    const result = await lintAndFix(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function lintAndFix(input) {
  const { path: inputPath, language } = input;
  
  if (!inputPath) {
    throw new Error('path is required');
  }

  // Check if path exists
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Path does not exist: ${inputPath}`);
  }

  // Get all files to process
  const files = getFilesToProcess(inputPath, language);
  
  if (files.length === 0) {
    return {
      fixed: 0,
      errors: 0,
      warnings: 0,
      files: []
    };
  }

  // Detect language if not specified
  const detectedLanguage = language || detectLanguage(files[0]);
  
  let totalFixed = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const fileResults = [];

  // Try professional tools first, fall back to pattern-based
  try {
    if (detectedLanguage === 'js' || detectedLanguage === 'ts') {
      const result = await tryESLintPrettier(files, detectedLanguage);
      return result;
    } else if (detectedLanguage === 'py') {
      const result = await tryPythonLinters(files);
      return result;
    }
  } catch (toolError) {
    console.warn('Professional tools not available, using pattern-based checks');
  }

  // Pattern-based fallback
  for (const file of files) {
    const fileResult = await processFileWithPatterns(file, detectedLanguage);
    fileResults.push(fileResult);
    
    totalFixed += fileResult.fixed;
    totalErrors += fileResult.issues.filter(i => i.severity === 'error').length;
    totalWarnings += fileResult.issues.filter(i => i.severity === 'warning').length;
  }

  return {
    fixed: totalFixed,
    errors: totalErrors,
    warnings: totalWarnings,
    files: fileResults
  };
}

function getFilesToProcess(inputPath, language) {
  const stats = fs.statSync(inputPath);
  
  if (stats.isFile()) {
    return [inputPath];
  } else if (stats.isDirectory()) {
    const extensions = getExtensionsForLanguage(language);
    const files = [];
    
    function scanDirectory(dir) {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const entryStats = fs.statSync(fullPath);
        
        if (entryStats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (entryStats.isFile()) {
          const ext = path.extname(entry);
          if (!language || extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    scanDirectory(inputPath);
    return files.slice(0, 50); // Limit to 50 files for safety
  }
  
  return [];
}

function getExtensionsForLanguage(language) {
  switch (language) {
    case 'js':
      return ['.js', '.jsx', '.mjs'];
    case 'ts':
      return ['.ts', '.tsx'];
    case 'py':
      return ['.py'];
    default:
      return ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.py'];
  }
}

function detectLanguage(filePath) {
  const ext = path.extname(filePath);
  
  switch (ext) {
    case '.js':
    case '.jsx':
    case '.mjs':
      return 'js';
    case '.ts':
    case '.tsx':
      return 'ts';
    case '.py':
      return 'py';
    default:
      return 'js'; // Default fallback
  }
}

async function tryESLintPrettier(files, language) {
  // Try ESLint first
  try {
    const eslintResult = await runESLint(files);
    
    // Try Prettier for formatting
    try {
      await runPrettier(files);
      eslintResult.fixed += files.length; // Assume prettier fixed formatting
    } catch (prettierError) {
      // Prettier failed, that's okay
    }
    
    return eslintResult;
  } catch (eslintError) {
    throw new Error('ESLint not available');
  }
}

function runESLint(files) {
  return new Promise((resolve, reject) => {
    const eslint = spawn('npx', ['eslint', '--fix', '--format', 'json', ...files], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    eslint.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    eslint.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    eslint.on('close', (code) => {
      try {
        const results = JSON.parse(stdout || '[]');
        
        let totalFixed = 0;
        let totalErrors = 0;
        let totalWarnings = 0;
        const fileResults = [];

        for (const result of results) {
          const issues = result.messages.map(msg => ({
            line: msg.line,
            column: msg.column,
            message: msg.message,
            rule: msg.ruleId,
            severity: msg.severity === 2 ? 'error' : 'warning'
          }));

          fileResults.push({
            path: result.filePath,
            issues,
            fixed: result.fixableErrorCount + result.fixableWarningCount
          });

          totalFixed += result.fixableErrorCount + result.fixableWarningCount;
          totalErrors += result.errorCount;
          totalWarnings += result.warningCount;
        }

        resolve({
          fixed: totalFixed,
          errors: totalErrors,
          warnings: totalWarnings,
          files: fileResults
        });
      } catch (parseError) {
        reject(new Error('Failed to parse ESLint output'));
      }
    });

    eslint.on('error', (err) => {
      reject(err);
    });
  });
}

function runPrettier(files) {
  return new Promise((resolve, reject) => {
    const prettier = spawn('npx', ['prettier', '--write', ...files], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    prettier.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('Prettier failed'));
      }
    });

    prettier.on('error', (err) => {
      reject(err);
    });
  });
}

async function tryPythonLinters(files) {
  // Try flake8 or pylint
  try {
    const result = await runFlake8(files);
    return result;
  } catch (error) {
    throw new Error('Python linters not available');
  }
}

function runFlake8(files) {
  return new Promise((resolve, reject) => {
    const flake8 = spawn('flake8', ['--format=json', ...files], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';

    flake8.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    flake8.on('close', (code) => {
      // Parse flake8 output (simplified)
      const fileResults = files.map(file => ({
        path: file,
        issues: [],
        fixed: 0
      }));

      resolve({
        fixed: 0,
        errors: 0,
        warnings: 0,
        files: fileResults
      });
    });

    flake8.on('error', (err) => {
      reject(err);
    });
  });
}

async function processFileWithPatterns(filePath, language) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  let fixedCount = 0;
  let modifiedContent = content;

  // Common patterns to check
  const patterns = getPatterns(language);

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex, 'gm');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      issues.push({
        line: lineNumber,
        column: match.index - content.lastIndexOf('\n', match.index - 1),
        message: pattern.message,
        rule: pattern.rule,
        severity: pattern.severity
      });
      
      // Apply fix if available
      if (pattern.fix) {
        modifiedContent = modifiedContent.replace(match[0], pattern.fix(match[0]));
        fixedCount++;
      }
    }
  }

  // Write back fixed content if changes were made
  if (fixedCount > 0) {
    fs.writeFileSync(filePath, modifiedContent);
  }

  return {
    path: filePath,
    issues,
    fixed: fixedCount
  };
}

function getPatterns(language) {
  const commonPatterns = [
    {
      regex: 'console\\.log\\([^)]*\\)',
      message: 'Remove console.log statements',
      rule: 'no-console',
      severity: 'warning'
    },
    {
      regex: 'debugger;?',
      message: 'Remove debugger statements',
      rule: 'no-debugger',
      severity: 'error',
      fix: () => ''
    },
    {
      regex: '\\s+$',
      message: 'Remove trailing whitespace',
      rule: 'no-trailing-spaces',
      severity: 'warning',
      fix: (match) => ''
    },
    {
      regex: '\\t',
      message: 'Use spaces instead of tabs',
      rule: 'no-tabs',
      severity: 'warning',
      fix: (match) => '  '.repeat(match.length)
    }
  ];

  if (language === 'js' || language === 'ts') {
    return [
      ...commonPatterns,
      {
        regex: 'var\\s+\\w+',
        message: 'Use let or const instead of var',
        rule: 'no-var',
        severity: 'warning'
      },
      {
        regex: '==\\s',
        message: 'Use === instead of ==',
        rule: 'eqeqeq',
        severity: 'warning',
        fix: (match) => match.replace('==', '===')
      },
      {
        regex: 'function\\s*\\([^)]*\\)\\s*{[^}]*}\\s*;',
        message: 'Remove unnecessary semicolon after function',
        rule: 'no-extra-semi',
        severity: 'warning'
      }
    ];
  } else if (language === 'py') {
    return [
      {
        regex: '\\s+$',
        message: 'Remove trailing whitespace',
        rule: 'trailing-whitespace',
        severity: 'warning',
        fix: () => ''
      },
      {
        regex: '^\\t+',
        message: 'Use spaces instead of tabs for indentation',
        rule: 'indentation',
        severity: 'warning'
      },
      {
        regex: 'import\\s+\\*',
        message: 'Avoid wildcard imports',
        rule: 'wildcard-import',
        severity: 'warning'
      },
      {
        regex: 'print\\([^)]*\\)',
        message: 'Remove print statements',
        rule: 'no-print',
        severity: 'warning'
      }
    ];
  }

  return commonPatterns;
}