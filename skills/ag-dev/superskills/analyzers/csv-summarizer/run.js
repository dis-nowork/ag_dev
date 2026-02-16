#!/usr/bin/env node

const fs = require('fs');

function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || null;
    });
    return row;
  });
  
  return { headers, rows };
}

function detectType(values) {
  const nonNullValues = values.filter(v => v !== null && v !== '');
  if (nonNullValues.length === 0) return 'string';
  
  // Check if all are numbers
  const numericValues = nonNullValues.filter(v => !isNaN(v) && !isNaN(parseFloat(v)));
  if (numericValues.length === nonNullValues.length) return 'number';
  
  // Check if all are booleans
  const boolValues = nonNullValues.filter(v => 
    v.toLowerCase() === 'true' || v.toLowerCase() === 'false' || 
    v === '1' || v === '0'
  );
  if (boolValues.length === nonNullValues.length) return 'boolean';
  
  // Check if all are dates
  const dateValues = nonNullValues.filter(v => {
    const date = new Date(v);
    return !isNaN(date.getTime()) && v.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/);
  });
  if (dateValues.length === nonNullValues.length) return 'date';
  
  return 'string';
}

function getNumericValues(values) {
  return values
    .filter(v => v !== null && v !== '')
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));
}

function calculateStats(values, type) {
  const stats = {
    unique: new Set(values.filter(v => v !== null && v !== '')).size,
    nullCount: values.filter(v => v === null || v === '').length
  };
  
  if (type === 'number') {
    const numValues = getNumericValues(values);
    if (numValues.length > 0) {
      numValues.sort((a, b) => a - b);
      stats.min = numValues[0];
      stats.max = numValues[numValues.length - 1];
      stats.mean = numValues.reduce((a, b) => a + b, 0) / numValues.length;
      stats.median = numValues.length % 2 === 0 
        ? (numValues[Math.floor(numValues.length / 2) - 1] + numValues[Math.floor(numValues.length / 2)]) / 2
        : numValues[Math.floor(numValues.length / 2)];
    }
  } else {
    const nonNullValues = values.filter(v => v !== null && v !== '');
    if (nonNullValues.length > 0) {
      stats.min = Math.min(...nonNullValues.map(v => v.length));
      stats.max = Math.max(...nonNullValues.map(v => v.length));
    }
  }
  
  // Calculate mode and top 5 values
  const frequency = {};
  values.filter(v => v !== null && v !== '').forEach(v => {
    frequency[v] = (frequency[v] || 0) + 1;
  });
  
  const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
  stats.mode = sorted.length > 0 ? sorted[0][0] : null;
  stats.top5 = sorted.slice(0, 5).map(([value, count]) => ({ value, count }));
  
  return stats;
}

function calculateCorrelations(data, headers) {
  const numericColumns = headers.filter(header => {
    const values = data.map(row => row[header]);
    return detectType(values) === 'number';
  });
  
  if (numericColumns.length < 2) return null;
  
  const correlations = {};
  
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const col1 = numericColumns[i];
      const col2 = numericColumns[j];
      
      const values1 = getNumericValues(data.map(row => row[col1]));
      const values2 = getNumericValues(data.map(row => row[col2]));
      
      if (values1.length > 1 && values2.length > 1) {
        const correlation = calculatePearsonCorrelation(values1, values2);
        correlations[`${col1}_${col2}`] = Math.round(correlation * 1000) / 1000;
      }
    }
  }
  
  return Object.keys(correlations).length > 0 ? correlations : null;
}

function calculatePearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;
  
  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function generateSummary(columns, rowCount) {
  const numericCols = columns.filter(c => c.type === 'number').length;
  const stringCols = columns.filter(c => c.type === 'string').length;
  const dateCols = columns.filter(c => c.type === 'date').length;
  const booleanCols = columns.filter(c => c.type === 'boolean').length;
  
  return `Dataset with ${rowCount} rows and ${columns.length} columns. ` +
    `Types: ${numericCols} numeric, ${stringCols} text, ${dateCols} date, ${booleanCols} boolean. ` +
    `Completeness: ${Math.round((1 - columns.reduce((sum, c) => sum + c.nullCount, 0) / (rowCount * columns.length)) * 100)}%`;
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
    
    let csvString;
    if (input.csvPath) {
      csvString = fs.readFileSync(input.csvPath, 'utf8');
    } else if (input.csvString) {
      csvString = input.csvString;
    } else {
      throw new Error('Either csvPath or csvString is required');
    }
    
    const { headers, rows } = parseCSV(csvString);
    
    if (headers.length === 0) {
      throw new Error('No columns found in CSV');
    }
    
    const columns = headers.map(header => {
      const values = rows.map(row => row[header]);
      const type = detectType(values);
      const stats = calculateStats(values, type);
      
      return {
        name: header,
        type,
        ...stats
      };
    });
    
    const correlations = calculateCorrelations(rows, headers);
    const summary = generateSummary(columns, rows.length);
    
    const result = {
      columns,
      rowCount: rows.length,
      correlations,
      summary
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

module.exports = { parseCSV, detectType, calculateStats, calculateCorrelations };