#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(inputData);
    const result = await organizeFiles(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function organizeFiles(input) {
  const { directory, rules = 'type', dryRun = false } = input;
  
  if (!directory) {
    throw new Error('directory is required');
  }

  // Check if directory exists
  if (!fs.existsSync(directory)) {
    throw new Error(`Directory does not exist: ${directory}`);
  }

  const stats = fs.statSync(directory);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${directory}`);
  }

  // Get all files in directory (non-recursive for safety)
  const files = fs.readdirSync(directory)
    .map(file => path.join(directory, file))
    .filter(filePath => {
      try {
        return fs.statSync(filePath).isFile();
      } catch {
        return false;
      }
    });

  const moves = [];
  const categories = {};

  for (const filePath of files) {
    const targetDir = getTargetDirectory(filePath, directory, rules);
    const targetPath = path.join(targetDir, path.basename(filePath));
    
    // Avoid moving to same location
    if (path.dirname(filePath) === targetDir) {
      continue;
    }
    
    moves.push({ from: filePath, to: targetPath });
    
    // Track categories
    const categoryName = path.relative(directory, targetDir) || 'root';
    categories[categoryName] = (categories[categoryName] || 0) + 1;
  }

  // Execute moves if not dry run
  if (!dryRun) {
    for (const move of moves) {
      const targetDir = path.dirname(move.to);
      
      // Create target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Handle filename conflicts
      let finalPath = move.to;
      let counter = 1;
      while (fs.existsSync(finalPath)) {
        const ext = path.extname(move.to);
        const baseName = path.basename(move.to, ext);
        finalPath = path.join(path.dirname(move.to), `${baseName}_${counter}${ext}`);
        counter++;
      }
      
      // Move the file
      fs.renameSync(move.from, finalPath);
      move.to = finalPath; // Update the actual destination
    }
  }

  return {
    moved: moves,
    summary: {
      totalFiles: files.length,
      categories
    }
  };
}

function getTargetDirectory(filePath, baseDir, rules) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const stats = fs.statSync(filePath);

  switch (rules) {
    case 'type':
      return getDirectoryByType(baseDir, ext);
    
    case 'extension':
      return getDirectoryByExtension(baseDir, ext);
    
    case 'date':
      return getDirectoryByDate(baseDir, stats.mtime);
    
    case 'size':
      return getDirectoryBySize(baseDir, stats.size);
    
    default:
      throw new Error(`Unknown organization rule: ${rules}`);
  }
}

function getDirectoryByType(baseDir, ext) {
  const typeMap = {
    // Images
    '.jpg': 'images',
    '.jpeg': 'images',
    '.png': 'images',
    '.gif': 'images',
    '.bmp': 'images',
    '.tiff': 'images',
    '.webp': 'images',
    '.svg': 'images',
    '.ico': 'images',
    
    // Videos
    '.mp4': 'videos',
    '.avi': 'videos',
    '.mov': 'videos',
    '.mkv': 'videos',
    '.wmv': 'videos',
    '.flv': 'videos',
    '.webm': 'videos',
    '.m4v': 'videos',
    
    // Audio
    '.mp3': 'audio',
    '.wav': 'audio',
    '.flac': 'audio',
    '.aac': 'audio',
    '.ogg': 'audio',
    '.wma': 'audio',
    '.m4a': 'audio',
    
    // Documents
    '.pdf': 'docs',
    '.doc': 'docs',
    '.docx': 'docs',
    '.txt': 'docs',
    '.rtf': 'docs',
    '.odt': 'docs',
    '.pages': 'docs',
    
    // Spreadsheets
    '.xls': 'docs',
    '.xlsx': 'docs',
    '.csv': 'docs',
    '.ods': 'docs',
    '.numbers': 'docs',
    
    // Presentations
    '.ppt': 'docs',
    '.pptx': 'docs',
    '.odp': 'docs',
    '.key': 'docs',
    
    // Code
    '.js': 'code',
    '.ts': 'code',
    '.py': 'code',
    '.java': 'code',
    '.c': 'code',
    '.cpp': 'code',
    '.h': 'code',
    '.cs': 'code',
    '.php': 'code',
    '.rb': 'code',
    '.go': 'code',
    '.rs': 'code',
    '.swift': 'code',
    '.kt': 'code',
    '.scala': 'code',
    '.html': 'code',
    '.css': 'code',
    '.scss': 'code',
    '.sass': 'code',
    '.json': 'code',
    '.xml': 'code',
    '.yaml': 'code',
    '.yml': 'code',
    
    // Archives
    '.zip': 'archives',
    '.rar': 'archives',
    '.7z': 'archives',
    '.tar': 'archives',
    '.gz': 'archives',
    '.bz2': 'archives',
    '.xz': 'archives',
    
    // Executables
    '.exe': 'executables',
    '.msi': 'executables',
    '.deb': 'executables',
    '.rpm': 'executables',
    '.dmg': 'executables',
    '.app': 'executables'
  };
  
  const type = typeMap[ext] || 'misc';
  return path.join(baseDir, type);
}

function getDirectoryByExtension(baseDir, ext) {
  if (!ext || ext === '.') {
    return path.join(baseDir, 'no-extension');
  }
  
  // Remove the dot and use extension as directory name
  const extName = ext.substring(1);
  return path.join(baseDir, extName);
}

function getDirectoryByDate(baseDir, mtime) {
  const year = mtime.getFullYear();
  const month = String(mtime.getMonth() + 1).padStart(2, '0');
  return path.join(baseDir, `${year}`, `${year}-${month}`);
}

function getDirectoryBySize(baseDir, size) {
  let sizeCategory;
  
  if (size < 1024) {
    sizeCategory = 'tiny';       // < 1KB
  } else if (size < 1024 * 1024) {
    sizeCategory = 'small';      // 1KB - 1MB
  } else if (size < 10 * 1024 * 1024) {
    sizeCategory = 'medium';     // 1MB - 10MB
  } else if (size < 100 * 1024 * 1024) {
    sizeCategory = 'large';      // 10MB - 100MB
  } else {
    sizeCategory = 'huge';       // > 100MB
  }
  
  return path.join(baseDir, sizeCategory);
}