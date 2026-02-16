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
    const result = await enhanceImage(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function enhanceImage(input) {
  const { filePath, operations, width, height, quality = 85 } = input;
  
  if (!filePath || !operations || !Array.isArray(operations) || operations.length === 0) {
    throw new Error('filePath and operations array are required');
  }

  // Check if input file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file does not exist: ${filePath}`);
  }

  const originalSize = fs.statSync(filePath).size;

  const outputDir = '/tmp/superskill-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate output filename
  const inputExt = path.extname(filePath);
  const inputBasename = path.basename(filePath, inputExt);
  const outputFilename = `${inputBasename}_enhanced_${Date.now()}${inputExt}`;
  const outputPath = path.join(outputDir, outputFilename);

  // Copy input to output first
  fs.copyFileSync(filePath, outputPath);

  // Apply operations in sequence
  let currentPath = outputPath;
  for (const operation of operations) {
    currentPath = await applyOperation(currentPath, operation, { width, height, quality });
  }

  const newSize = fs.statSync(currentPath).size;

  return {
    filePath: currentPath,
    originalSize,
    newSize
  };
}

async function applyOperation(imagePath, operation, options) {
  const { width, height, quality } = options;
  const tempPath = imagePath + '.tmp';

  switch (operation) {
    case 'resize':
      await runImageMagick(imagePath, tempPath, [
        '-resize', getResizeParameter(width, height)
      ]);
      break;

    case 'sharpen':
      await runImageMagick(imagePath, tempPath, [
        '-unsharp', '0x1+1.0+0.05'
      ]);
      break;

    case 'optimize':
      await runImageMagick(imagePath, tempPath, [
        '-strip',
        '-quality', quality.toString(),
        '-auto-orient'
      ]);
      break;

    case 'upscale':
      // Upscale by 2x using Lanczos filter
      await runImageMagick(imagePath, tempPath, [
        '-filter', 'Lanczos',
        '-resize', '200%'
      ]);
      break;

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Replace original with processed
  fs.renameSync(tempPath, imagePath);
  return imagePath;
}

function getResizeParameter(width, height) {
  if (width && height) {
    return `${width}x${height}!`; // Force exact dimensions
  } else if (width) {
    return `${width}x`; // Maintain aspect ratio, constrain width
  } else if (height) {
    return `x${height}`; // Maintain aspect ratio, constrain height
  } else {
    throw new Error('Width or height must be specified for resize operation');
  }
}

function runImageMagick(inputPath, outputPath, args) {
  return new Promise((resolve, reject) => {
    const convert = spawn('convert', [inputPath, ...args, outputPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';
    
    convert.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    convert.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ImageMagick convert failed with code ${code}: ${stderr}`));
      }
    });

    convert.on('error', (err) => {
      reject(new Error(`ImageMagick not available: ${err.message}`));
    });
  });
}