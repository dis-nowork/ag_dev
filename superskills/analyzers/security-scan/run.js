#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Security scanner
class SecurityScanner {
  constructor() {
    this.vulnerabilities = [];
    this.scannedFiles = 0;
    
    // Define security patterns
    this.patterns = {
      secrets: {
        severity: 'high',
        rules: [
          {
            name: 'AWS Access Key',
            pattern: /AKIA[0-9A-Z]{16}/gi,
            description: 'AWS Access Key ID detected'
          },
          {
            name: 'AWS Secret Key',
            pattern: /(aws_secret_access_key|aws_secret_key)\s*[:=]\s*[\'"]?([A-Za-z0-9/+=]{40})[\'"]?/gi,
            description: 'AWS Secret Access Key detected'
          },
          {
            name: 'API Key',
            pattern: /(api_key|apikey|api-key)\s*[:=]\s*[\'"]?([A-Za-z0-9]{20,})[\'"]?/gi,
            description: 'API key detected'
          },
          {
            name: 'Private Key',
            pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
            description: 'Private key detected'
          },
          {
            name: 'Database Password',
            pattern: /(password|pwd|pass)\s*[:=]\s*[\'"]([^\'"\s]{6,})[\'"]?/gi,
            description: 'Hardcoded password detected'
          },
          {
            name: 'JWT Token',
            pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/gi,
            description: 'JWT token detected'
          },
          {
            name: 'GitHub Token',
            pattern: /ghp_[A-Za-z0-9]{36}/gi,
            description: 'GitHub personal access token detected'
          },
          {
            name: 'Slack Token',
            pattern: /xox[baprs]-[A-Za-z0-9-]+/gi,
            description: 'Slack token detected'
          }
        ]
      },
      
      codeInjection: {
        severity: 'high',
        rules: [
          {
            name: 'eval() Usage',
            pattern: /\beval\s*\(/gi,
            description: 'Usage of eval() function detected - can execute arbitrary code'
          },
          {
            name: 'exec() Usage',
            pattern: /\bexec\s*\(/gi,
            description: 'Usage of exec() function detected - can execute system commands'
          },
          {
            name: 'setTimeout String',
            pattern: /setTimeout\s*\(\s*[\'"][^\'\"]*[\'\"]/gi,
            description: 'setTimeout with string parameter can execute arbitrary code'
          },
          {
            name: 'setInterval String',
            pattern: /setInterval\s*\(\s*[\'"][^\'\"]*[\'\"]/gi,
            description: 'setInterval with string parameter can execute arbitrary code'
          },
          {
            name: 'Function Constructor',
            pattern: /new\s+Function\s*\(/gi,
            description: 'Function constructor can execute arbitrary code'
          }
        ]
      },
      
      sqlInjection: {
        severity: 'medium',
        rules: [
          {
            name: 'SQL Concatenation',
            pattern: /(SELECT|INSERT|UPDATE|DELETE).*[\+\s]+.*[\'\"][^\'\"]*[\'\"].*[\+\s]/gi,
            description: 'SQL query concatenation detected - potential SQL injection'
          },
          {
            name: 'Direct SQL Variable',
            pattern: /(SELECT|INSERT|UPDATE|DELETE).*\$\{[^}]*\}/gi,
            description: 'Direct variable interpolation in SQL query'
          },
          {
            name: 'PHP SQL Injection',
            pattern: /\$_(GET|POST|REQUEST)\[[^\]]*\].*\.(query|execute)/gi,
            description: 'Direct user input in SQL query (PHP)'
          }
        ]
      },
      
      xss: {
        severity: 'medium',
        rules: [
          {
            name: 'innerHTML Assignment',
            pattern: /\.innerHTML\s*=\s*[^;]*\$\{[^}]*\}/gi,
            description: 'Direct variable assignment to innerHTML - potential XSS'
          },
          {
            name: 'document.write',
            pattern: /document\.write\s*\(/gi,
            description: 'Usage of document.write() - potential XSS vector'
          },
          {
            name: 'Unsafe jQuery HTML',
            pattern: /\$\([^\)]*\)\.html\s*\([^;]*\$\{[^}]*\}/gi,
            description: 'Direct variable in jQuery html() method'
          },
          {
            name: 'React dangerouslySetInnerHTML',
            pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*__html\s*:\s*[^}]*\$\{[^}]*\}/gi,
            description: 'Dynamic content in dangerouslySetInnerHTML'
          }
        ]
      },
      
      insecureDependencies: {
        severity: 'low',
        rules: [
          {
            name: 'Outdated jQuery',
            pattern: /jquery.*[\'\"](1\.|2\.0|2\.1)[^\'\"]*[\'\"]/gi,
            description: 'Outdated jQuery version with known vulnerabilities'
          },
          {
            name: 'Insecure HTTP',
            pattern: /http:\/\/[^\/\s]*/gi,
            description: 'HTTP URL detected - should use HTTPS'
          },
          {
            name: 'Weak Crypto',
            pattern: /(md5|sha1)\s*\(/gi,
            description: 'Weak cryptographic hash function'
          },
          {
            name: 'Debug Mode',
            pattern: /(debug|DEBUG)\s*[:=]\s*(true|True|TRUE|1)/gi,
            description: 'Debug mode enabled in production code'
          }
        ]
      },
      
      pathTraversal: {
        severity: 'high',
        rules: [
          {
            name: 'Path Traversal',
            pattern: /\.\.[\/\\]/gi,
            description: 'Path traversal pattern detected'
          },
          {
            name: 'File Include',
            pattern: /(include|require)\s*\(\s*\$_(GET|POST|REQUEST)/gi,
            description: 'Dynamic file inclusion from user input'
          }
        ]
      },
      
      commandInjection: {
        severity: 'high',
        rules: [
          {
            name: 'System Command',
            pattern: /(system|shell_exec|passthru|exec)\s*\([^;]*\$_(GET|POST|REQUEST)/gi,
            description: 'System command execution with user input'
          },
          {
            name: 'Backtick Execution',
            pattern: /`[^`]*\$_(GET|POST|REQUEST)[^`]*`/gi,
            description: 'Backtick command execution with user input'
          }
        ]
      }
    };
  }

  // Get files to scan
  getFilesToScan(scanPath, extensions, recursive) {
    const files = [];
    
    const scan = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory()) {
            // Skip common non-code directories
            if (['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode'].includes(item)) {
              continue;
            }
            if (recursive) {
              scan(fullPath);
            }
          } else if (stats.isFile()) {
            const ext = path.extname(fullPath).slice(1).toLowerCase();
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    const stats = fs.statSync(scanPath);
    if (stats.isFile()) {
      files.push(scanPath);
    } else if (stats.isDirectory()) {
      scan(scanPath);
    }

    return files;
  }

  // Scan single file
  scanFile(filePath, maxFileSize) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > maxFileSize) {
        return; // Skip large files
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      this.scannedFiles++;

      // Check each pattern category
      Object.entries(this.patterns).forEach(([category, { severity, rules }]) => {
        rules.forEach(rule => {
          let match;
          const globalPattern = new RegExp(rule.pattern.source, rule.pattern.flags);
          
          // Check each line for matches
          lines.forEach((line, lineNumber) => {
            globalPattern.lastIndex = 0; // Reset regex
            while ((match = globalPattern.exec(line)) !== null) {
              // Skip comments for most patterns (except secrets)
              if (category !== 'secrets') {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('//') || 
                    trimmedLine.startsWith('#') || 
                    trimmedLine.startsWith('/*') ||
                    trimmedLine.startsWith('*')) {
                  continue;
                }
              }

              this.vulnerabilities.push({
                file: path.relative(process.cwd(), filePath),
                line: lineNumber + 1,
                type: rule.name,
                category: category,
                severity: severity,
                description: rule.description,
                code: line.trim(),
                match: match[0]
              });
            }
          });
        });
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Calculate security score
  calculateScore() {
    let score = 100;
    const severityWeights = { high: 15, medium: 10, low: 5 };
    
    this.vulnerabilities.forEach(vuln => {
      score -= severityWeights[vuln.severity] || 5;
    });

    return Math.max(0, score);
  }

  // Generate summary
  generateSummary() {
    const summary = {
      totalVulnerabilities: this.vulnerabilities.length,
      bySeverity: {
        high: this.vulnerabilities.filter(v => v.severity === 'high').length,
        medium: this.vulnerabilities.filter(v => v.severity === 'medium').length,
        low: this.vulnerabilities.filter(v => v.severity === 'low').length
      },
      byCategory: {},
      filesScanned: this.scannedFiles
    };

    // Count by category
    this.vulnerabilities.forEach(vuln => {
      summary.byCategory[vuln.category] = (summary.byCategory[vuln.category] || 0) + 1;
    });

    return summary;
  }

  // Main scan method
  scan(scanPath, options = {}) {
    const {
      recursive = true,
      extensions = ['js', 'ts', 'py', 'php', 'java', 'rb', 'go', 'c', 'cpp', 'cs', 'sql'],
      maxFileSize = 1024 * 1024 // 1MB
    } = options;

    this.vulnerabilities = [];
    this.scannedFiles = 0;

    const files = this.getFilesToScan(scanPath, extensions, recursive);
    
    files.forEach(file => {
      this.scanFile(file, maxFileSize);
    });

    const score = this.calculateScore();
    const summary = this.generateSummary();

    return {
      vulnerabilities: this.vulnerabilities,
      score,
      summary
    };
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
      const { path: scanPath, recursive, extensions, maxFileSize } = input;
      
      if (!scanPath) {
        throw new Error('path is required');
      }
      
      if (!fs.existsSync(scanPath)) {
        throw new Error(`Path does not exist: ${scanPath}`);
      }
      
      const scanner = new SecurityScanner();
      const results = scanner.scan(scanPath, { recursive, extensions, maxFileSize });
      
      console.log(JSON.stringify({
        success: true,
        ...results,
        scannedPath: scanPath
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