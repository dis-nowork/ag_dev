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
    const result = await buildPdf(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function buildPdf(input) {
  const { title, content, author = 'AG Dev', pageSize = 'A4' } = input;
  
  if (!title || !content) {
    throw new Error('title and content are required');
  }

  const outputDir = '/tmp/superskill-output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  
  // Convert markdown to HTML
  const htmlContent = convertMarkdownToHtml(content, title, author, pageSize);
  const htmlFilePath = path.join(outputDir, baseFileName + '.html');
  
  fs.writeFileSync(htmlFilePath, htmlContent);
  
  // Try to generate PDF
  const pdfFilePath = path.join(outputDir, baseFileName + '.pdf');
  
  try {
    await generatePdf(htmlFilePath, pdfFilePath, pageSize);
    // If PDF generation succeeded, remove HTML file
    fs.unlinkSync(htmlFilePath);
    return { filePath: pdfFilePath };
  } catch (pdfError) {
    // Fallback to HTML output
    console.warn('PDF generation failed, falling back to HTML:', pdfError.message);
    return { filePath: htmlFilePath };
  }
}

function convertMarkdownToHtml(markdown, title, author, pageSize) {
  const bodyContent = convertMarkdownToHtmlBody(markdown);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="${escapeHtml(author)}">
    <title>${escapeHtml(title)}</title>
    <style>
        @media print {
            @page {
                size: ${pageSize.toLowerCase()};
                margin: 2cm;
            }
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        
        .document-title {
            font-size: 24pt;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            color: #000;
        }
        
        .document-author {
            text-align: center;
            font-style: italic;
            margin-bottom: 30px;
            color: #666;
        }
        
        h1 {
            font-size: 18pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            page-break-after: avoid;
        }
        
        h2 {
            font-size: 16pt;
            font-weight: bold;
            margin: 18px 0 8px 0;
            page-break-after: avoid;
        }
        
        h3 {
            font-size: 14pt;
            font-weight: bold;
            margin: 16px 0 6px 0;
            page-break-after: avoid;
        }
        
        p {
            margin: 10px 0;
            text-align: justify;
            orphans: 2;
            widows: 2;
        }
        
        strong {
            font-weight: bold;
        }
        
        em {
            font-style: italic;
        }
        
        ul, ol {
            margin: 10px 0;
            padding-left: 30px;
        }
        
        li {
            margin: 5px 0;
        }
        
        blockquote {
            margin: 20px 0;
            padding: 10px 20px;
            border-left: 4px solid #ccc;
            background-color: #f9f9f9;
            font-style: italic;
        }
        
        code {
            font-family: 'Courier New', Courier, monospace;
            background-color: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
        }
        
        pre {
            font-family: 'Courier New', Courier, monospace;
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="document-title">${escapeHtml(title)}</div>
    <div class="document-author">by ${escapeHtml(author)}</div>
    ${bodyContent}
</body>
</html>`;
}

function convertMarkdownToHtmlBody(markdown) {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let listType = '';
  let inCodeBlock = false;
  let codeBlockContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeBlockContent)}</code></pre>`;
        inCodeBlock = false;
        codeBlockContent = '';
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    // Empty line
    if (trimmedLine === '') {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
      }
      html += '<br>';
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
      }
      html += `<h1>${formatInlineMarkdown(line.substring(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
      }
      html += `<h2>${formatInlineMarkdown(line.substring(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
      }
      html += `<h3>${formatInlineMarkdown(line.substring(4))}</h3>`;
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
      }
      html += `<blockquote>${formatInlineMarkdown(line.substring(2))}</blockquote>`;
    }
    // Unordered lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) {
          html += `</${listType}>`;
        }
        html += '<ul>';
        inList = true;
        listType = 'ul';
      }
      html += `<li>${formatInlineMarkdown(line.substring(2))}</li>`;
    }
    // Ordered lists
    else if (/^\d+\.\s/.test(line)) {
      if (!inList || listType !== 'ol') {
        if (inList) {
          html += `</${listType}>`;
        }
        html += '<ol>';
        inList = true;
        listType = 'ol';
      }
      const match = line.match(/^\d+\.\s(.*)$/);
      html += `<li>${formatInlineMarkdown(match[1])}</li>`;
    }
    // Regular paragraphs
    else {
      if (inList) {
        html += `</${listType}>`;
        inList = false;
      }
      html += `<p>${formatInlineMarkdown(line)}</p>`;
    }
  }
  
  // Close any open list
  if (inList) {
    html += `</${listType}>`;
  }
  
  // Close any open code block
  if (inCodeBlock) {
    html += `<pre><code>${escapeHtml(codeBlockContent)}</code></pre>`;
  }
  
  return html;
}

function formatInlineMarkdown(text) {
  // Handle inline code first
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Handle bold and italic
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Handle links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  return escapeHtml(text);
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function generatePdf(htmlFilePath, pdfFilePath, pageSize) {
  return new Promise((resolve, reject) => {
    // Try wkhtmltopdf first
    const wkhtmltopdf = spawn('wkhtmltopdf', [
      '--page-size', pageSize,
      '--margin-top', '20mm',
      '--margin-right', '20mm',
      '--margin-bottom', '20mm',
      '--margin-left', '20mm',
      '--encoding', 'UTF-8',
      '--print-media-type',
      htmlFilePath,
      pdfFilePath
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    wkhtmltopdf.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Try headless Chrome as fallback
        tryChromePdf(htmlFilePath, pdfFilePath)
          .then(resolve)
          .catch(reject);
      }
    });
    
    wkhtmltopdf.on('error', (err) => {
      // Try headless Chrome as fallback
      tryChromePdf(htmlFilePath, pdfFilePath)
        .then(resolve)
        .catch(reject);
    });
  });
}

async function tryChromePdf(htmlFilePath, pdfFilePath) {
  return new Promise((resolve, reject) => {
    const chrome = spawn('google-chrome', [
      '--headless',
      '--disable-gpu',
      '--print-to-pdf=' + pdfFilePath,
      '--no-margins',
      'file://' + htmlFilePath
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    chrome.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Chrome PDF generation failed with code ${code}`));
      }
    });
    
    chrome.on('error', (err) => {
      reject(new Error(`Chrome not available: ${err.message}`));
    });
  });
}