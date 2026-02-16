#!/usr/bin/env node

// Simple text transformer - converts input text to uppercase

const fs = require('fs');

async function main() {
  try {
    // Read input from stdin
    let inputData = '';
    
    if (process.argv.includes('--input') && process.argv.includes('-')) {
      // Read from stdin
      const chunks = [];
      process.stdin.on('data', chunk => chunks.push(chunk));
      
      await new Promise((resolve) => {
        process.stdin.on('end', resolve);
      });
      
      inputData = Buffer.concat(chunks).toString();
    } else {
      throw new Error('No input provided');
    }

    // Parse JSON input
    const input = JSON.parse(inputData);
    
    // Validate input
    if (!input.text || typeof input.text !== 'string') {
      throw new Error('Input must have a "text" field with a string value');
    }

    // Transform text to uppercase
    const result = {
      result: input.text.toUpperCase()
    };

    // Output result as JSON
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();