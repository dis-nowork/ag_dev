#!/usr/bin/env node

const fs = require('fs');

// Detect CSV delimiter
function detectDelimiter(csvString) {
  const delimiters = [',', ';', '\\t', '|'];
  const sampleLines = csvString.split('\\n').slice(0, 5);
  
  let bestDelimiter = ',';
  let maxScore = 0;
  
  delimiters.forEach(delimiter => {
    let score = 0;
    let consistency = 0;
    let fieldCounts = [];
    
    sampleLines.forEach(line => {
      if (line.trim()) {
        const fields = parseCSVLine(line, delimiter);
        fieldCounts.push(fields.length);
        score += fields.length;
      }
    });
    
    // Check consistency of field counts
    if (fieldCounts.length > 0) {
      const firstCount = fieldCounts[0];
      consistency = fieldCounts.filter(count => count === firstCount).length / fieldCounts.length;
      score = score * consistency;
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestDelimiter = delimiter;
    }
  });
  
  return bestDelimiter;
}

// Parse a single CSV line
function parseCSVLine(line, delimiter) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = null;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (!inQuotes) {
      if ((char === '"' || char === "'") && (i === 0 || line[i - 1] === delimiter)) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      if (char === quoteChar) {
        if (nextChar === quoteChar) {
          // Escaped quote
          current += char;
          i++; // Skip next character
        } else {
          // End of quoted field
          inQuotes = false;
          quoteChar = null;
        }
      } else {
        current += char;
      }
    }
  }
  
  // Add the last field
  fields.push(current.trim());
  
  return fields;
}

// Infer data type
function inferType(value) {
  if (value === '' || value === null || value === undefined) {
    return { type: 'null', value: null };
  }
  
  const trimmed = value.toString().trim();
  
  // Boolean
  if (/^(true|false)$/i.test(trimmed)) {
    return { type: 'boolean', value: trimmed.toLowerCase() === 'true' };
  }
  
  // Integer
  if (/^-?\d+$/.test(trimmed)) {
    return { type: 'integer', value: parseInt(trimmed, 10) };
  }
  
  // Float
  if (/^-?\d*\.\d+$/.test(trimmed)) {
    return { type: 'float', value: parseFloat(trimmed) };
  }
  
  // Date (basic formats)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || 
      /^\d{2}\/\d{2}\/\d{4}$/.test(trimmed) ||
      /^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return { type: 'date', value: trimmed };
    }
  }
  
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: 'email', value: trimmed };
  }
  
  // URL
  if (/^https?:\/\//.test(trimmed)) {
    return { type: 'url', value: trimmed };
  }
  
  // String (default)
  return { type: 'string', value: trimmed };
}

// Analyze column types and statistics
function analyzeColumns(data, headers) {
  const columns = headers.map(header => ({
    name: header,
    types: {},
    samples: [],
    nullCount: 0,
    uniqueCount: 0,
    uniqueValues: new Set()
  }));
  
  data.forEach(row => {
    headers.forEach((header, index) => {
      const value = row[header];
      const column = columns[index];
      
      const typeInfo = inferType(value);
      
      if (typeInfo.type === 'null') {
        column.nullCount++;
      } else {
        column.types[typeInfo.type] = (column.types[typeInfo.type] || 0) + 1;
        column.uniqueValues.add(value);
        
        if (column.samples.length < 5) {
          column.samples.push(value);
        }
      }
    });
  });
  
  // Determine primary type for each column
  return columns.map(column => ({
    name: column.name,
    primaryType: Object.keys(column.types).reduce((a, b) => 
      column.types[a] > column.types[b] ? a : b, 'string'),
    types: column.types,
    samples: column.samples,
    nullCount: column.nullCount,
    uniqueCount: column.uniqueValues.size,
    nullable: column.nullCount > 0
  }));
}

// Convert parsed CSV to typed JSON
function convertToTypedJSON(data, columns, inferTypes) {
  if (!inferTypes) {
    return data;
  }
  
  return data.map(row => {
    const typedRow = {};
    
    Object.keys(row).forEach(key => {
      const column = columns.find(col => col.name === key);
      const value = row[key];
      
      if (column && column.primaryType !== 'string') {
        const typeInfo = inferType(value);
        typedRow[key] = typeInfo.value;
      } else {
        typedRow[key] = value;
      }
    });
    
    return typedRow;
  });
}

// Parse CSV string to JSON
function parseCSV(csvString, options = {}) {
  const {
    delimiter = null,
    hasHeader = true,
    inferTypes = true
  } = options;
  
  // Detect delimiter if not provided
  const actualDelimiter = delimiter || detectDelimiter(csvString);
  
  // Split into lines and remove empty lines
  const lines = csvString.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('No data found in CSV');
  }
  
  // Parse header
  let headers = [];
  let dataStartIndex = 0;
  
  if (hasHeader) {
    headers = parseCSVLine(lines[0], actualDelimiter);
    dataStartIndex = 1;
  } else {
    // Generate generic headers
    const firstRow = parseCSVLine(lines[0], actualDelimiter);
    headers = firstRow.map((_, index) => `column_${index + 1}`);
  }
  
  // Parse data rows
  const data = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i], actualDelimiter);
    
    // Skip rows with wrong number of fields
    if (fields.length !== headers.length) {
      continue;
    }
    
    const row = {};
    headers.forEach((header, index) => {
      row[header] = fields[index];
    });
    
    data.push(row);
  }
  
  // Analyze columns
  const columns = analyzeColumns(data, headers);
  
  // Convert to typed JSON if requested
  const typedData = convertToTypedJSON(data, columns, inferTypes);
  
  // Generate summary
  const summary = {
    totalRows: data.length,
    totalColumns: headers.length,
    delimiter: actualDelimiter,
    hasHeader,
    encoding: 'utf-8',
    columnTypes: columns.reduce((acc, col) => {
      acc[col.name] = col.primaryType;
      return acc;
    }, {})
  };
  
  return {
    data: typedData,
    columns,
    rowCount: data.length,
    summary
  };
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
      let csvString = input.csvString;
      
      // Read from file if path provided
      if (input.csvPath && !csvString) {
        if (!fs.existsSync(input.csvPath)) {
          throw new Error(`CSV file not found: ${input.csvPath}`);
        }
        csvString = fs.readFileSync(input.csvPath, 'utf8');
      }
      
      if (!csvString) {
        throw new Error('No CSV content provided (csvString or csvPath required)');
      }
      
      const options = {
        delimiter: input.delimiter === 'auto' ? null : input.delimiter,
        hasHeader: input.hasHeader !== false, // Default to true
        inferTypes: input.inferTypes !== false // Default to true
      };
      
      const result = parseCSV(csvString, options);
      
      console.log(JSON.stringify({
        success: true,
        ...result
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