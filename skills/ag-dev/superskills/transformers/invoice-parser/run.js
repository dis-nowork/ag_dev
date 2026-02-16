#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Common currency symbols and codes
const CURRENCIES = ['$', '€', '£', '¥', '₹', 'USD', 'EUR', 'GBP', 'JPY', 'INR', 'CAD', 'AUD'];

// Extract text from PDF using pdftotext (if available)
function extractFromPDF(filePath) {
  try {
    // Try pdftotext first
    const output = execSync(`pdftotext "${filePath}" -`, { encoding: 'utf8' });
    return output;
  } catch (error) {
    // Try alternative methods or return basic error
    throw new Error('PDF text extraction failed. pdftotext not available.');
  }
}

// Extract text from image using tesseract (if available)
function extractFromImage(filePath) {
  try {
    const output = execSync(`tesseract "${filePath}" stdout`, { encoding: 'utf8' });
    return output;
  } catch (error) {
    throw new Error('Image text extraction failed. tesseract not available.');
  }
}

// Extract text based on file type
function extractText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') {
    return extractFromPDF(filePath);
  } else if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp'].includes(ext)) {
    return extractFromImage(filePath);
  } else if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

// Parse vendor information
function parseVendor(text) {
  const lines = text.split('\\n');
  
  // Look for company patterns in first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and common invoice headers
    if (!line || /^(invoice|bill|receipt)/i.test(line)) {
      continue;
    }
    
    // Look for lines that might be company names
    if (line.length > 3 && line.length < 100) {
      // Check if it's not obviously a field label
      if (!/^(to:|from:|date:|number:|total:)/i.test(line)) {
        return line;
      }
    }
  }
  
  return null;
}

// Parse invoice number
function parseInvoiceNumber(text) {
  const patterns = [
    /invoice\\s*#?:?\\s*([a-z0-9\\-_]+)/i,
    /inv\\s*#?:?\\s*([a-z0-9\\-_]+)/i,
    /number\\s*:?\\s*([a-z0-9\\-_]+)/i,
    /#\\s*([a-z0-9\\-_]{3,})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Parse date
function parseDate(text) {
  const patterns = [
    /date\\s*:?\\s*(\\d{1,2}[\/\\-]\\d{1,2}[\/\\-]\\d{2,4})/i,
    /issued\\s*:?\\s*(\\d{1,2}[\/\\-]\\d{1,2}[\/\\-]\\d{2,4})/i,
    /(\\d{4}-\\d{2}-\\d{2})/,
    /(\\d{1,2}[\/\\-]\\d{1,2}[\/\\-]\\d{4})/,
    /\\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\w*\\s+\\d{1,2},?\\s+\\d{4}\\b/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// Parse currency and total
function parseTotal(text) {
  let currency = null;
  let total = null;
  
  // Look for currency symbols or codes
  for (const curr of CURRENCIES) {
    if (text.includes(curr)) {
      currency = curr;
      break;
    }
  }
  
  // Look for total patterns
  const totalPatterns = [
    /total\\s*:?\\s*([\\$€£¥₹]?)\\s*(\\d+(?:[,.]\\d{3})*(?:[.,]\\d{2})?)/i,
    /amount\\s*:?\\s*([\\$€£¥₹]?)\\s*(\\d+(?:[,.]\\d{3})*(?:[.,]\\d{2})?)/i,
    /grand\\s*total\\s*:?\\s*([\\$€£¥₹]?)\\s*(\\d+(?:[,.]\\d{3})*(?:[.,]\\d{2})?)/i,
    /balance\\s*due\\s*:?\\s*([\\$€£¥₹]?)\\s*(\\d+(?:[,.]\\d{3})*(?:[.,]\\d{2})?)/i
  ];
  
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && !currency) {
        currency = match[1];
      }
      const amount = match[2].replace(/[,]/g, '').replace(/[.]/g, '.');
      total = parseFloat(amount);
      break;
    }
  }
  
  return { currency: currency || '$', total };
}

// Parse line items
function parseItems(text) {
  const items = [];
  const lines = text.split('\\n');
  
  // Look for table-like structures
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || /^(description|item|qty|quantity|price|amount|total)$/i.test(line)) {
      continue;
    }
    
    // Look for lines that might be items
    const itemPattern = /^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s+([\\$€£¥₹]?\\d+(?:[,.]\\d{3})*(?:[.,]\\d{2})?)\\s+([\\$€£¥₹]?\\d+(?:[,.]\\d{3})*(?:[.,]\\d{2})?)$/;
    const match = line.match(itemPattern);
    
    if (match) {
      const description = match[1].trim();
      const quantity = parseFloat(match[2]);
      const unitPrice = parseFloat(match[3].replace(/[^\\d.]/g, ''));
      const total = parseFloat(match[4].replace(/[^\\d.]/g, ''));
      
      items.push({
        description,
        quantity,
        unitPrice,
        total
      });
    }
  }
  
  return items;
}

// Calculate confidence score
function calculateConfidence(result) {
  let score = 0;
  
  if (result.vendor) score += 20;
  if (result.date) score += 20;
  if (result.total && result.total > 0) score += 30;
  if (result.currency) score += 10;
  if (result.invoiceNumber) score += 15;
  if (result.items && result.items.length > 0) score += 5;
  
  return Math.min(100, score);
}

// Main parsing function
function parseInvoice(text, options = {}) {
  const vendor = parseVendor(text);
  const invoiceNumber = parseInvoiceNumber(text);
  const date = parseDate(text);
  const { currency, total } = parseTotal(text);
  const items = parseItems(text);
  
  const result = {
    vendor,
    date,
    total,
    currency,
    items,
    invoiceNumber,
    rawText: options.includeRawText ? text : null
  };
  
  result.confidence = calculateConfidence(result);
  
  return result;
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
      const { filePath, extractText: shouldExtract = true, fallbackToRaw = true } = input;
      
      if (!filePath) {
        throw new Error('filePath is required');
      }
      
      let text = '';
      let extractionSuccessful = false;
      
      if (shouldExtract) {
        try {
          text = extractText(filePath);
          extractionSuccessful = true;
        } catch (error) {
          if (!fallbackToRaw) {
            throw error;
          }
          text = `Text extraction failed: ${error.message}`;
        }
      }
      
      const result = parseInvoice(text, {
        includeRawText: fallbackToRaw || !extractionSuccessful
      });
      
      console.log(JSON.stringify({
        success: true,
        extractionSuccessful,
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