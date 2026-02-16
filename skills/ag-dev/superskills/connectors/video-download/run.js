#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function validateUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Check for supported domains (extend as needed)
    const supportedDomains = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
      'twitch.tv', 'twitter.com', 'instagram.com', 'tiktok.com'
    ];
    
    const isSupported = supportedDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );
    
    if (!isSupported) {
      console.warn(`Warning: ${urlObj.hostname} may not be supported by yt-dlp`);
    }
    
    return true;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

function buildYtDlpArgs(url, format, quality, outputDir) {
  const args = [];
  
  // Output format and template
  if (outputDir) {
    const outputPath = path.resolve(outputDir);
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    args.push('-o', path.join(outputPath, '%(title)s.%(ext)s'));
  } else {
    args.push('-o', '%(title)s.%(ext)s');
  }
  
  // Format selection
  switch (format) {
    case 'mp3':
      args.push('--extract-audio', '--audio-format', 'mp3');
      break;
    case 'webm':
      if (quality === 'best') {
        args.push('-f', 'best[ext=webm]');
      } else {
        args.push('-f', `best[height<=${quality}][ext=webm]`);
      }
      break;
    case 'mp4':
    default:
      if (quality === 'best') {
        args.push('-f', 'best[ext=mp4]');
      } else {
        args.push('-f', `best[height<=${quality}][ext=mp4]`);
      }
      break;
  }
  
  // Additional options
  args.push('--no-playlist'); // Only download single video, not playlist
  args.push('--print-json'); // Output metadata as JSON
  args.push('--no-warnings'); // Suppress warnings
  
  // URL
  args.push(url);
  
  return args;
}

function executeYtDlp(args) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    ytdlp.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed (exit code ${code}): ${stderr.trim()}`));
        return;
      }
      
      resolve({
        output: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    ytdlp.on('error', (error) => {
      reject(new Error(`Failed to execute yt-dlp: ${error.message}`));
    });
  });
}

function parseYtDlpOutput(output) {
  try {
    // yt-dlp outputs JSON lines, we want the last complete JSON object
    const lines = output.split('\n').filter(line => line.trim());
    
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const metadata = JSON.parse(lines[i]);
        if (metadata && metadata.title) {
          return metadata;
        }
      } catch (e) {
        // Try next line
        continue;
      }
    }
    
    throw new Error('No valid metadata found in yt-dlp output');
  } catch (error) {
    throw new Error(`Failed to parse yt-dlp output: ${error.message}`);
  }
}

function getFileInfo(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size
      };
    }
  } catch (error) {
    console.warn(`Warning: Could not get file info for ${filePath}: ${error.message}`);
  }
  
  return {
    exists: false,
    size: null
  };
}

function findDownloadedFile(metadata, outputDir, format) {
  // Try to find the actual downloaded file
  const possibleExtensions = format === 'mp3' ? ['mp3'] : [format || 'mp4', 'webm', 'mkv'];
  const baseTitle = metadata.title.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid filename chars
  
  const searchDir = outputDir || process.cwd();
  
  for (const ext of possibleExtensions) {
    const fileName = `${baseTitle}.${ext}`;
    const filePath = path.join(searchDir, fileName);
    
    const fileInfo = getFileInfo(filePath);
    if (fileInfo.exists) {
      return {
        filePath: path.resolve(filePath),
        fileSize: fileInfo.size
      };
    }
  }
  
  // Try with the filename from metadata if available
  if (metadata.filepath) {
    const fileInfo = getFileInfo(metadata.filepath);
    if (fileInfo.exists) {
      return {
        filePath: path.resolve(metadata.filepath),
        fileSize: fileInfo.size
      };
    }
  }
  
  return {
    filePath: null,
    fileSize: null
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
    
    if (!input.url) {
      throw new Error('url is required');
    }
    
    // Set defaults
    const format = input.format || 'mp4';
    const quality = input.quality || 'best';
    const outputDir = input.outputDir;
    
    // Validate input
    validateUrl(input.url);
    
    // Build yt-dlp arguments
    const args = buildYtDlpArgs(input.url, format, quality, outputDir);
    
    // Execute yt-dlp
    const { output } = await executeYtDlp(args);
    
    // Parse metadata
    const metadata = parseYtDlpOutput(output);
    
    // Find the downloaded file
    const { filePath, fileSize } = findDownloadedFile(metadata, outputDir, format);
    
    const result = {
      filePath: filePath || `${metadata.title}.${format}`,
      title: metadata.title,
      duration: metadata.duration || null,
      fileSize: fileSize
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

module.exports = { validateUrl, buildYtDlpArgs, parseYtDlpOutput };