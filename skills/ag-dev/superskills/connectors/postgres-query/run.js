#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 
  'CREATE', 'GRANT', 'REVOKE', 'COPY', 'BULK'
];

function validateReadOnlyQuery(query) {
  const upperQuery = query.toUpperCase().trim();
  
  // Check for forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}. Only READ-ONLY queries are allowed.`);
    }
  }
  
  // Must start with SELECT or WITH (for CTEs) or SHOW or EXPLAIN
  const allowedStarters = ['SELECT', 'WITH', 'SHOW', 'EXPLAIN'];
  const startsWithAllowed = allowedStarters.some(starter => upperQuery.startsWith(starter));
  
  if (!startsWithAllowed) {
    throw new Error(`Query must start with one of: ${allowedStarters.join(', ')}`);
  }
  
  return true;
}

function parseConnectionString(connectionString) {
  try {
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: url.port || 5432,
      database: url.pathname.substring(1),
      username: url.username,
      password: url.password
    };
  } catch (error) {
    throw new Error(`Invalid connection string: ${error.message}`);
  }
}

function formatParameterizedQuery(query, params = []) {
  let formattedQuery = query;
  
  // Replace $1, $2, etc. with actual values
  if (params && params.length > 0) {
    for (let i = 0; i < params.length; i++) {
      const paramPlaceholder = `$${i + 1}`;
      const paramValue = typeof params[i] === 'string' ? `'${params[i].replace(/'/g, "''")}'` : params[i];
      formattedQuery = formattedQuery.replace(paramPlaceholder, paramValue);
    }
  }
  
  return formattedQuery;
}

function executePsqlQuery(connectionString, query) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const psqlArgs = [
      connectionString,
      '-t', // tuples only (no headers)
      '-A', // unaligned output
      '-F', '\t', // tab-separated values
      '--quiet',
      '-c', query
    ];
    
    const psql = spawn('psql', psqlArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    psql.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    psql.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    psql.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code !== 0) {
        reject(new Error(`psql failed (exit code ${code}): ${stderr.trim()}`));
        return;
      }
      
      if (stderr.trim() && !stderr.includes('NOTICE:')) {
        reject(new Error(`psql error: ${stderr.trim()}`));
        return;
      }
      
      resolve({
        output: stdout.trim(),
        duration
      });
    });
    
    psql.on('error', (error) => {
      reject(new Error(`Failed to execute psql: ${error.message}`));
    });
  });
}

function parseTabSeparatedOutput(output) {
  if (!output.trim()) {
    return { rows: [], columns: [] };
  }
  
  const lines = output.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { rows: [], columns: [] };
  }
  
  // For this simplified version, we'll assume all columns are strings
  // In a real implementation, you'd need to run a separate query to get column types
  const rows = [];
  
  for (const line of lines) {
    const values = line.split('\t');
    const row = {};
    
    values.forEach((value, index) => {
      // Try to parse numbers
      if (!isNaN(value) && !isNaN(parseFloat(value)) && value.trim() !== '') {
        row[`col_${index}`] = parseFloat(value);
      } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        row[`col_${index}`] = value.toLowerCase() === 'true';
      } else if (value.trim() === '') {
        row[`col_${index}`] = null;
      } else {
        row[`col_${index}`] = value;
      }
    });
    
    rows.push(row);
  }
  
  // Generate column info
  const columns = [];
  if (rows.length > 0) {
    Object.keys(rows[0]).forEach((key, index) => {
      const sampleValue = rows[0][key];
      let type = 'text';
      
      if (typeof sampleValue === 'number') {
        type = 'numeric';
      } else if (typeof sampleValue === 'boolean') {
        type = 'boolean';
      }
      
      columns.push({
        name: key,
        type
      });
    });
  }
  
  return { rows, columns };
}

function getColumnNames(query) {
  // Simple heuristic to extract column names from SELECT query
  const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
  if (!selectMatch) {
    return [];
  }
  
  const columnsPart = selectMatch[1].trim();
  if (columnsPart === '*') {
    return [];
  }
  
  // Parse column names (simplified - doesn't handle complex expressions)
  return columnsPart
    .split(',')
    .map(col => col.trim().split(' ').pop().replace(/['"]/g, ''))
    .filter(col => col.length > 0);
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
    
    if (!input.connectionString) {
      throw new Error('connectionString is required');
    }
    
    if (!input.query) {
      throw new Error('query is required');
    }
    
    // Validate that it's a read-only query
    validateReadOnlyQuery(input.query);
    
    // Format query with parameters
    const formattedQuery = formatParameterizedQuery(input.query, input.params);
    
    // Execute the query
    const { output, duration } = await executePsqlQuery(input.connectionString, formattedQuery);
    
    // Parse the output
    const { rows, columns } = parseTabSeparatedOutput(output);
    
    // Try to get better column names from the query
    const queryColumnNames = getColumnNames(input.query);
    if (queryColumnNames.length > 0 && queryColumnNames.length === columns.length) {
      columns.forEach((col, index) => {
        col.name = queryColumnNames[index];
      });
      
      // Update row keys to match column names
      const updatedRows = rows.map(row => {
        const newRow = {};
        Object.keys(row).forEach((key, index) => {
          const newKey = queryColumnNames[index] || key;
          newRow[newKey] = row[key];
        });
        return newRow;
      });
      
      const result = {
        rows: updatedRows,
        rowCount: updatedRows.length,
        columns,
        duration
      };
      
      console.log(JSON.stringify(result, null, 2));
    } else {
      const result = {
        rows,
        rowCount: rows.length,
        columns,
        duration
      };
      
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    const errorResult = { error: error.message };
    console.log(JSON.stringify(errorResult, null, 2));
    process.exit(0); // Don't crash, return error gracefully
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateReadOnlyQuery, parseConnectionString, formatParameterizedQuery };