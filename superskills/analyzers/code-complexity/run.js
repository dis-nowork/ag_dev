#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CODE_EXTENSIONS = ['.js', '.ts', '.py', '.jsx', '.tsx'];

function isCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

function getAllCodeFiles(dirPath) {
  const files = [];
  
  function walkDir(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Skip common directories that don't contain source code
          if (!['node_modules', '.git', 'dist', 'build', '__pycache__'].includes(item)) {
            walkDir(itemPath);
          }
        } else if (stat.isFile() && isCodeFile(itemPath)) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.error(`Warning: Cannot read directory ${currentPath}: ${error.message}`);
    }
  }
  
  const stats = fs.statSync(dirPath);
  if (stats.isFile()) {
    if (isCodeFile(dirPath)) {
      files.push(dirPath);
    }
  } else if (stats.isDirectory()) {
    walkDir(dirPath);
  }
  
  return files;
}

function countLines(content) {
  return content.split('\n').length;
}

function countFunctions(content, ext) {
  let count = 0;
  
  switch (ext) {
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
      // Count function declarations, arrow functions, methods
      count += (content.match(/function\s+\w+/g) || []).length;
      count += (content.match(/\w+\s*:\s*function/g) || []).length;
      count += (content.match(/=>\s*{/g) || []).length;
      count += (content.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;
      break;
    case '.py':
      // Count def statements
      count += (content.match(/^\s*def\s+\w+/gm) || []).length;
      break;
  }
  
  return count;
}

function countImports(content, ext) {
  let count = 0;
  
  switch (ext) {
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
      count += (content.match(/^import\s+/gm) || []).length;
      count += (content.match(/require\s*\(/g) || []).length;
      break;
    case '.py':
      count += (content.match(/^(import|from)\s+\w+/gm) || []).length;
      break;
  }
  
  return count;
}

function calculateCyclomaticComplexity(content, ext) {
  let complexity = 1; // Base complexity
  
  // Decision points that increase complexity
  const patterns = [];
  
  switch (ext) {
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
      patterns.push(
        /\bif\s*\(/g,      // if statements
        /\belse\s+if\b/g,  // else if statements
        /\bfor\s*\(/g,     // for loops
        /\bwhile\s*\(/g,   // while loops
        /\bswitch\s*\(/g,  // switch statements
        /\bcatch\s*\(/g,   // catch blocks
        /\bcase\s+/g,      // case statements
        /&&/g,             // logical AND
        /\|\|/g,           // logical OR
        /\?/g              // ternary operators
      );
      break;
    case '.py':
      patterns.push(
        /\bif\s+/g,        // if statements
        /\belif\s+/g,      // elif statements
        /\bfor\s+/g,       // for loops
        /\bwhile\s+/g,     // while loops
        /\btry:/g,         // try blocks
        /\bexcept\s+/g,    // except blocks
        /\band\b/g,        // logical and
        /\bor\b/g          // logical or
      );
      break;
  }
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }
  
  return complexity;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    const analysis = {
      path: filePath,
      lines: countLines(content),
      functions: countFunctions(content, ext),
      complexity: calculateCyclomaticComplexity(content, ext),
      imports: countImports(content, ext)
    };
    
    return analysis;
  } catch (error) {
    return {
      path: filePath,
      lines: 0,
      functions: 0,
      complexity: 0,
      imports: 0,
      error: error.message
    };
  }
}

function identifyHotspots(files, threshold = 10) {
  return files
    .filter(file => file.complexity > threshold)
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10) // Top 10 hotspots
    .map(file => ({
      path: file.path,
      complexity: file.complexity,
      reason: `High cyclomatic complexity (${file.complexity}), ${file.functions} functions in ${file.lines} lines`
    }));
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
    
    if (!input.path) {
      throw new Error('path is required');
    }
    
    const targetPath = path.resolve(input.path);
    
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }
    
    const codeFiles = getAllCodeFiles(targetPath);
    
    if (codeFiles.length === 0) {
      const result = {
        files: [],
        totalFiles: 0,
        totalLines: 0,
        avgComplexity: 0,
        hotspots: []
      };
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    
    const fileAnalyses = codeFiles.map(analyzeFile);
    
    // Calculate summary statistics
    const totalFiles = fileAnalyses.length;
    const totalLines = fileAnalyses.reduce((sum, file) => sum + file.lines, 0);
    const totalComplexity = fileAnalyses.reduce((sum, file) => sum + file.complexity, 0);
    const avgComplexity = totalFiles > 0 ? Math.round((totalComplexity / totalFiles) * 100) / 100 : 0;
    
    const hotspots = identifyHotspots(fileAnalyses);
    
    const result = {
      files: fileAnalyses,
      totalFiles,
      totalLines,
      avgComplexity,
      hotspots
    };
    
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    const errorResult = { error: error.message };
    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(0); // Don't crash, return error gracefully
  }
}

if (require.main === module) {
  main();
}

module.exports = { getAllCodeFiles, analyzeFile, calculateCyclomaticComplexity, identifyHotspots };