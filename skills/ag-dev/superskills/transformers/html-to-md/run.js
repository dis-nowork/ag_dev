#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// HTML to Markdown converter
function htmlToMarkdown(html, preserveWhitespace = false) {
  if (!html) return '';
  
  let markdown = html;
  
  // Clean up whitespace unless preserving
  if (!preserveWhitespace) {
    markdown = markdown.replace(/\\s+/g, ' ').trim();
  }
  
  // Convert headings (h1-h6)
  markdown = markdown.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '\\n# $1\\n\\n');
  markdown = markdown.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '\\n## $1\\n\\n');
  markdown = markdown.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '\\n### $1\\n\\n');
  markdown = markdown.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '\\n#### $1\\n\\n');
  markdown = markdown.replace(/<h5[^>]*>([^<]+)<\/h5>/gi, '\\n##### $1\\n\\n');
  markdown = markdown.replace(/<h6[^>]*>([^<]+)<\/h6>/gi, '\\n###### $1\\n\\n');
  
  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>([\\s\\S]*?)<\/p>/gi, '\\n\\n$1\\n\\n');
  
  // Convert line breaks
  markdown = markdown.replace(/<br\\s*\/?>/gi, '\\n');
  
  // Convert bold and strong
  markdown = markdown.replace(/<(strong|b)\s*[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**');
  
  // Convert italic and emphasis
  markdown = markdown.replace(/<(em|i)\s*[^>]*>([\s\S]*?)<\/(em|i)>/gi, '*$2*');
  
  // Convert strikethrough
  markdown = markdown.replace(/<(del|s|strike)\s*[^>]*>([\s\S]*?)<\/(del|s|strike)>/gi, '~~$2~~');
  
  // Convert underline (no direct markdown equivalent, use emphasis)
  markdown = markdown.replace(/<u\s*[^>]*>([\s\S]*?)<\/u>/gi, '*$1*');
  
  // Convert code blocks (pre + code)
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n\n');
  
  // Convert inline code
  markdown = markdown.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  
  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (match, content) => {
    const lines = content.trim().split('\n');
    return '\n' + lines.map(line => `> ${line.trim()}`).join('\n') + '\n\n';
  });
  
  // Convert links
  markdown = markdown.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  
  // Convert images
  markdown = markdown.replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]+alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, '![$1]($2)');
  markdown = markdown.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, '![]($1)');
  
  // Convert horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/gi, '\n---\n\n');
  
  // Convert unordered lists
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    const listItems = items.map(item => {
      const text = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1').trim();
      return `- ${text}`;
    });
    return '\n' + listItems.join('\n') + '\n\n';
  });
  
  // Convert ordered lists
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    const items = content.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    const listItems = items.map((item, index) => {
      const text = item.replace(/<li[^>]*>([\s\S]*?)<\/li>/i, '$1').trim();
      return `${index + 1}. ${text}`;
    });
    return '\n' + listItems.join('\n') + '\n\n';
  });
  
  // Convert tables
  markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (match, content) => {
    const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    
    if (rows.length === 0) return '';
    
    let table = '\n';
    let isFirstRow = true;
    
    rows.forEach(row => {
      const cells = row.match(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi) || [];
      const cellTexts = cells.map(cell => {
        return cell.replace(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/i, '$1').trim();
      });
      
      if (cellTexts.length > 0) {
        table += '| ' + cellTexts.join(' | ') + ' |\n';
        
        // Add header separator after first row
        if (isFirstRow) {
          table += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
          isFirstRow = false;
        }
      }
    });
    
    return table + '\n';
  });
  
  // Convert definition lists
  markdown = markdown.replace(/<dl[^>]*>([\s\S]*?)<\/dl>/gi, (match, content) => {
    let result = '\n';
    const terms = content.match(/<dt[^>]*>([\s\S]*?)<\/dt>/gi) || [];
    const definitions = content.match(/<dd[^>]*>([\s\S]*?)<\/dd>/gi) || [];
    
    for (let i = 0; i < Math.min(terms.length, definitions.length); i++) {
      const term = terms[i].replace(/<dt[^>]*>([\s\S]*?)<\/dt>/i, '$1').trim();
      const def = definitions[i].replace(/<dd[^>]*>([\s\S]*?)<\/dd>/i, '$1').trim();
      result += `**${term}**\n: ${def}\n\n`;
    }
    
    return result;
  });
  
  // Remove script and style tags completely
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove HTML comments
  markdown = markdown.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&hellip;': '...',
    '&mdash;': '—',
    '&ndash;': '–',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"'
  };
  
  Object.entries(entities).forEach(([entity, char]) => {
    markdown = markdown.replace(new RegExp(entity, 'g'), char);
  });
  
  // Decode numeric entities
  markdown = markdown.replace(/&#(\\d+);/g, (match, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });
  
  markdown = markdown.replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Clean up whitespace
  if (!preserveWhitespace) {
    // Remove excessive newlines
    markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
    // Trim leading and trailing whitespace
    markdown = markdown.replace(/^\s+|\s+$/g, '');
  }
  
  return markdown;
}

// Fetch content from URL
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
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
    process.stdin.on('end', async () => {
      try {
        input = JSON.parse(chunks.join(''));
        await processInput();
      } catch (error) {
        console.error(JSON.stringify({
          success: false,
          error: 'Invalid JSON input: ' + error.message
        }));
        process.exit(1);
      }
    });
  } else {
    await processInput();
  }
  
  async function processInput() {
    try {
      let html = input.html;
      
      // Fetch from URL if needed
      if (input.url && !html) {
        html = await fetchUrl(input.url);
      }
      
      if (!html) {
        throw new Error('No HTML content provided or fetched');
      }
      
      const markdown = htmlToMarkdown(html, input.preserveWhitespace);
      
      console.log(JSON.stringify({
        success: true,
        markdown,
        url: input.url || null
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