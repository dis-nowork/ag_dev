#!/usr/bin/env node

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

// Simple HTML parser for basic extraction
function parseHTML(html) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Extract meta description
  const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
                   html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i);
  const description = descMatch ? descMatch[1].trim() : '';
  
  // Extract author
  const authorMatch = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i) ||
                     html.match(/<meta[^>]+content="([^"]+)"[^>]+name="author"/i) ||
                     html.match(/<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)</i) ||
                     html.match(/<div[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)</i);
  const author = authorMatch ? authorMatch[1].trim() : '';
  
  // Extract date
  const dateMatch = html.match(/<time[^>]+datetime="([^"]+)"/i) ||
                   html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i) ||
                   html.match(/<span[^>]*class="[^"]*date[^"]*"[^>]*>([^<]+)</i);
  const date = dateMatch ? dateMatch[1].trim() : '';
  
  return { title, description, author, date };
}

// Extract main content from HTML
function extractContent(html) {
  // Remove script and style tags
  html = html.replace(/<script[^>]*>.*?<\/script>/gis, '');
  html = html.replace(/<style[^>]*>.*?<\/style>/gis, '');
  
  // Remove comments
  html = html.replace(/<!--.*?-->/gs, '');
  
  // Try to find main content areas
  const contentSelectors = [
    /<article[^>]*>(.*?)<\/article>/is,
    /<main[^>]*>(.*?)<\/main>/is,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/is,
    /<div[^>]*class="[^"]*post[^"]*"[^>]*>(.*?)<\/div>/is,
    /<div[^>]*id="content"[^>]*>(.*?)<\/div>/is,
    /<div[^>]*id="main"[^>]*>(.*?)<\/div>/is
  ];
  
  let mainContent = '';
  for (const selector of contentSelectors) {
    const match = html.match(selector);
    if (match && match[1]) {
      mainContent = match[1];
      break;
    }
  }
  
  // If no specific content area found, try to extract from body
  if (!mainContent) {
    const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
    if (bodyMatch) {
      mainContent = bodyMatch[1];
      
      // Remove common non-content elements
      mainContent = mainContent.replace(/<nav[^>]*>.*?<\/nav>/gis, '');
      mainContent = mainContent.replace(/<header[^>]*>.*?<\/header>/gis, '');
      mainContent = mainContent.replace(/<footer[^>]*>.*?<\/footer>/gis, '');
      mainContent = mainContent.replace(/<aside[^>]*>.*?<\/aside>/gis, '');
      mainContent = mainContent.replace(/<div[^>]*class="[^"]*sidebar[^"]*"[^>]*>.*?<\/div>/gis, '');
      mainContent = mainContent.replace(/<div[^>]*class="[^"]*menu[^"]*"[^>]*>.*?<\/div>/gis, '');
    }
  }
  
  return mainContent || html;
}

// Convert HTML to Markdown (simplified)
function htmlToMarkdown(html) {
  if (!html) return '';
  
  // Clean up whitespace
  html = html.replace(/\\s+/g, ' ').trim();
  
  // Convert headings
  html = html.replace(/<h1[^>]*>([^<]+)<\/h1>/gi, '\\n# $1\\n');
  html = html.replace(/<h2[^>]*>([^<]+)<\/h2>/gi, '\\n## $1\\n');
  html = html.replace(/<h3[^>]*>([^<]+)<\/h3>/gi, '\\n### $1\\n');
  html = html.replace(/<h4[^>]*>([^<]+)<\/h4>/gi, '\\n#### $1\\n');
  html = html.replace(/<h5[^>]*>([^<]+)<\/h5>/gi, '\\n##### $1\\n');
  html = html.replace(/<h6[^>]*>([^<]+)<\/h6>/gi, '\\n###### $1\\n');
  
  // Convert paragraphs
  html = html.replace(/<p[^>]*>([^<]+)<\/p>/gi, '\\n$1\\n');
  
  // Convert line breaks
  html = html.replace(/<br[^>]*>/gi, '\\n');
  
  // Convert bold and italic
  html = html.replace(/<(strong|b)[^>]*>([^<]+)<\/(strong|b)>/gi, '**$2**');
  html = html.replace(/<(em|i)[^>]*>([^<]+)<\/(em|i)>/gi, '*$2*');
  
  // Convert links
  html = html.replace(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '[$2]($1)');
  
  // Convert images
  html = html.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  html = html.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '![]($1)');
  
  // Convert lists
  html = html.replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>([^<]+)<\/li>/gi) || [];
    return '\\n' + items.map(item => {
      const text = item.replace(/<li[^>]*>([^<]+)<\/li>/i, '$1').trim();
      return `- ${text}`;
    }).join('\\n') + '\\n';
  });
  
  html = html.replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
    const items = content.match(/<li[^>]*>([^<]+)<\/li>/gi) || [];
    return '\\n' + items.map((item, index) => {
      const text = item.replace(/<li[^>]*>([^<]+)<\/li>/i, '$1').trim();
      return `${index + 1}. ${text}`;
    }).join('\\n') + '\\n';
  });
  
  // Convert code blocks
  html = html.replace(/<pre[^>]*><code[^>]*>([^<]+)<\/code><\/pre>/gi, '\\n```\\n$1\\n```\\n');
  html = html.replace(/<code[^>]*>([^<]+)<\/code>/gi, '`$1`');
  
  // Convert blockquotes
  html = html.replace(/<blockquote[^>]*>([^<]+)<\/blockquote>/gi, '\\n> $1\\n');
  
  // Remove remaining HTML tags
  html = html.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#39;/g, "'");
  html = html.replace(/&nbsp;/g, ' ');
  
  // Clean up whitespace
  html = html.replace(/\\n\\s*\\n\\s*\\n/g, '\\n\\n');
  html = html.replace(/^\\s+|\\s+$/g, '');
  
  return html;
}

// Count words in text
function countWords(text) {
  if (!text) return 0;
  return text.split(/\\s+/).filter(word => word.length > 0).length;
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

// Main extraction function
async function extractArticle(input) {
  let html = input.html;
  
  // Fetch from URL if needed
  if (input.url && !html) {
    html = await fetchUrl(input.url);
  }
  
  if (!html) {
    throw new Error('No HTML content provided or fetched');
  }
  
  // Parse metadata
  const metadata = parseHTML(html);
  
  // Extract main content
  const contentHtml = extractContent(html);
  
  // Convert to markdown
  const markdown = htmlToMarkdown(contentHtml);
  
  // Count words
  const wordCount = countWords(markdown);
  
  return {
    title: metadata.title || 'Untitled',
    author: metadata.author || '',
    date: metadata.date || '',
    content: markdown,
    wordCount,
    url: input.url || null
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
      if (!input.url && !input.html) {
        throw new Error('Either url or html must be provided');
      }
      
      const result = await extractArticle(input);
      
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