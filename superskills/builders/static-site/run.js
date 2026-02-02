#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple markdown parser (reused from md-to-slides)
class MarkdownParser {
  constructor() {
    this.patterns = {
      heading: /^(#{1,6})\s+(.+)$/gm,
      bold: /\*\*(.*?)\*\*/g,
      italic: /\*(.*?)\*/g,
      code: /`(.*?)`/g,
      codeBlock: /```([\s\S]*?)```/g,
      list: /^[\s]*[-*+]\s+(.+)$/gm,
      orderedList: /^[\s]*\d+\.\s+(.+)$/gm,
      link: /\[([^\]]+)\]\(([^)]+)\)/g,
      image: /!\[([^\]]*)\]\(([^)]+)\)/g,
      table: /^\|(.+)\|$/gm,
      blockquote: /^>\s+(.+)$/gm
    };
  }

  parse(markdown) {
    let html = markdown;

    // Code blocks first (to avoid conflicts)
    html = html.replace(this.patterns.codeBlock, '<pre><code>$1</code></pre>');

    // Tables
    html = this.parseTable(html);

    // Headings
    html = html.replace(this.patterns.heading, (match, hashes, text) => {
      const level = hashes.length;
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `<h${level} id="${id}">${text}</h${level}>`;
    });

    // Blockquotes
    html = html.replace(this.patterns.blockquote, '<blockquote>$1</blockquote>');

    // Bold and italic
    html = html.replace(this.patterns.bold, '<strong>$1</strong>');
    html = html.replace(this.patterns.italic, '<em>$1</em>');

    // Inline code
    html = html.replace(this.patterns.code, '<code>$1</code>');

    // Links and images
    html = html.replace(this.patterns.image, '<img src="$2" alt="$1">');
    html = html.replace(this.patterns.link, '<a href="$2">$1</a>');

    // Lists
    html = this.parseLists(html);

    // Paragraphs
    html = html.split('\n\n').map(paragraph => {
      paragraph = paragraph.trim();
      if (!paragraph) return '';
      if (paragraph.startsWith('<') || paragraph.includes('<li>') || paragraph.includes('<table>')) {
        return paragraph;
      }
      return `<p>${paragraph}</p>`;
    }).join('\n');

    return html;
  }

  parseTable(html) {
    const lines = html.split('\n');
    const result = [];
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
        tableRows.push(cells);
      } else if (inTable && line.match(/^\|[\s\-:]*\|$/)) {
        // Table separator line - skip
        continue;
      } else {
        if (inTable && tableRows.length > 0) {
          // End of table
          let tableHtml = '<table>\n';
          tableRows.forEach((row, idx) => {
            const tag = idx === 0 ? 'th' : 'td';
            tableHtml += '  <tr>\n';
            row.forEach(cell => {
              tableHtml += `    <${tag}>${cell}</${tag}>\n`;
            });
            tableHtml += '  </tr>\n';
          });
          tableHtml += '</table>';
          result.push(tableHtml);
          tableRows = [];
          inTable = false;
        }
        
        if (line) {
          result.push(line);
        }
      }
    }

    // Handle table at end of document
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<table>\n';
      tableRows.forEach((row, idx) => {
        const tag = idx === 0 ? 'th' : 'td';
        tableHtml += '  <tr>\n';
        row.forEach(cell => {
          tableHtml += `    <${tag}>${cell}</${tag}>\n`;
        });
        tableHtml += '  </tr>\n';
      });
      tableHtml += '</table>';
      result.push(tableHtml);
    }

    return result.join('\n');
  }

  parseLists(html) {
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let listItems = [];
    let listType = null;

    for (const line of lines) {
      const unorderedMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);
      const orderedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
      
      if (unorderedMatch || orderedMatch) {
        if (!inList) {
          inList = true;
          listItems = [];
          listType = unorderedMatch ? 'ul' : 'ol';
        }
        const content = unorderedMatch ? unorderedMatch[1] : orderedMatch[1];
        listItems.push(content);
      } else {
        if (inList) {
          // End of list
          let listHtml = `<${listType}>\n`;
          listItems.forEach(item => {
            listHtml += `  <li>${item}</li>\n`;
          });
          listHtml += `</${listType}>`;
          result.push(listHtml);
          listItems = [];
          inList = false;
          listType = null;
        }
        
        result.push(line);
      }
    }

    // Handle list at end of document
    if (inList && listItems.length > 0) {
      let listHtml = `<${listType}>\n`;
      listItems.forEach(item => {
        listHtml += `  <li>${item}</li>\n`;
      });
      listHtml += `</${listType}>`;
      result.push(listHtml);
    }

    return result.join('\n');
  }
}

// Static site generator
class StaticSiteGenerator {
  constructor(theme = 'minimal') {
    this.theme = theme;
    this.parser = new MarkdownParser();
  }

  // Get theme CSS
  getThemeCSS(theme) {
    const themes = {
      minimal: {
        primaryColor: '#333',
        accentColor: '#007acc',
        backgroundColor: '#ffffff',
        textColor: '#333',
        borderColor: '#eee',
        codeBackground: '#f5f5f5'
      },
      docs: {
        primaryColor: '#2c3e50',
        accentColor: '#3498db',
        backgroundColor: '#ffffff',
        textColor: '#2c3e50',
        borderColor: '#bdc3c7',
        codeBackground: '#ecf0f1'
      },
      blog: {
        primaryColor: '#34495e',
        accentColor: '#e74c3c',
        backgroundColor: '#ffffff',
        textColor: '#2c3e50',
        borderColor: '#95a5a6',
        codeBackground: '#f8f9fa'
      }
    };

    const colors = themes[theme] || themes.minimal;

    return `
      /* Reset and base styles */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: ${colors.textColor};
        background: ${colors.backgroundColor};
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        min-height: 100vh;
      }

      /* Navigation */
      .nav {
        width: 300px;
        background: #f8f9fa;
        border-right: 1px solid ${colors.borderColor};
        padding: 2rem 1rem;
        position: fixed;
        height: 100vh;
        overflow-y: auto;
      }

      .nav h1 {
        color: ${colors.primaryColor};
        margin-bottom: 2rem;
        font-size: 1.5rem;
        border-bottom: 2px solid ${colors.accentColor};
        padding-bottom: 0.5rem;
      }

      .nav ul {
        list-style: none;
      }

      .nav li {
        margin-bottom: 0.5rem;
      }

      .nav a {
        color: ${colors.textColor};
        text-decoration: none;
        display: block;
        padding: 0.5rem 0;
        border-radius: 4px;
        transition: all 0.3s;
      }

      .nav a:hover, .nav a.active {
        color: ${colors.accentColor};
        background: rgba(52, 152, 219, 0.1);
        padding-left: 1rem;
      }

      /* Main content */
      .content {
        margin-left: 300px;
        flex: 1;
        padding: 2rem;
      }

      /* Typography */
      h1, h2, h3, h4, h5, h6 {
        color: ${colors.primaryColor};
        margin-top: 2rem;
        margin-bottom: 1rem;
      }

      h1 { font-size: 2.5rem; }
      h2 { font-size: 2rem; border-bottom: 2px solid ${colors.borderColor}; padding-bottom: 0.5rem; }
      h3 { font-size: 1.75rem; }
      h4 { font-size: 1.5rem; }

      p {
        margin-bottom: 1rem;
        text-align: justify;
      }

      /* Links */
      a {
        color: ${colors.accentColor};
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      /* Lists */
      ul, ol {
        margin-bottom: 1rem;
        padding-left: 2rem;
      }

      li {
        margin-bottom: 0.5rem;
      }

      /* Code */
      code {
        background: ${colors.codeBackground};
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        font-size: 0.9em;
      }

      pre {
        background: ${colors.codeBackground};
        padding: 1rem;
        border-radius: 5px;
        overflow-x: auto;
        margin-bottom: 1rem;
      }

      pre code {
        background: none;
        padding: 0;
      }

      /* Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1rem;
        border: 1px solid ${colors.borderColor};
      }

      th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid ${colors.borderColor};
      }

      th {
        background: ${colors.codeBackground};
        font-weight: bold;
        color: ${colors.primaryColor};
      }

      /* Blockquotes */
      blockquote {
        border-left: 4px solid ${colors.accentColor};
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: #666;
      }

      /* Images */
      img {
        max-width: 100%;
        height: auto;
        margin: 1rem 0;
        border-radius: 5px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .nav {
          position: static;
          width: 100%;
          height: auto;
        }

        .content {
          margin-left: 0;
        }

        .container {
          flex-direction: column;
        }
      }

      /* Search */
      .search {
        margin-bottom: 2rem;
      }

      .search input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid ${colors.borderColor};
        border-radius: 4px;
        font-size: 1rem;
      }

      .search input:focus {
        outline: none;
        border-color: ${colors.accentColor};
        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
      }
    `;
  }

  // Get navigation JavaScript
  getNavJS() {
    return `
      // Simple search functionality
      function setupSearch() {
        const searchInput = document.querySelector('.search input');
        const navLinks = document.querySelectorAll('.nav a');
        
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase();
          
          navLinks.forEach(link => {
            const text = link.textContent.toLowerCase();
            const listItem = link.closest('li');
            
            if (text.includes(query)) {
              listItem.style.display = 'block';
            } else {
              listItem.style.display = 'none';
            }
          });
        });
      }

      // Highlight active page
      function highlightActivePage() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav a');
        
        navLinks.forEach(link => {
          if (link.getAttribute('href') === currentPath.split('/').pop()) {
            link.classList.add('active');
          }
        });
      }

      // Initialize
      document.addEventListener('DOMContentLoaded', () => {
        setupSearch();
        highlightActivePage();
      });
    `;
  }

  // Scan markdown files
  scanMarkdownFiles(sourceDir) {
    const files = [];
    
    const scan = (dir, relativePath = '') => {
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          if (item.startsWith('.')) continue; // Skip hidden files
          
          const fullPath = path.join(dir, item);
          const stats = fs.statSync(fullPath);
          const itemRelativePath = path.join(relativePath, item);
          
          if (stats.isDirectory()) {
            scan(fullPath, itemRelativePath);
          } else if (path.extname(item).toLowerCase() === '.md') {
            files.push({
              fullPath,
              relativePath: itemRelativePath,
              name: path.basename(item, '.md')
            });
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scan(sourceDir);
    return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  // Extract title from markdown content
  extractTitle(content) {
    const lines = content.split('\n');
    
    // Look for first heading
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)$/);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Generate HTML page
  generatePage(markdownFile, allFiles, siteConfig) {
    const content = fs.readFileSync(markdownFile.fullPath, 'utf8');
    const title = this.extractTitle(content) || markdownFile.name;
    const htmlContent = this.parser.parse(content);
    
    // Generate navigation
    const navItems = allFiles.map(file => {
      const fileTitle = this.extractTitle(fs.readFileSync(file.fullPath, 'utf8')) || file.name;
      const htmlFileName = file.name + '.html';
      return `    <li><a href="${htmlFileName}">${fileTitle}</a></li>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${siteConfig.title}</title>
  <meta name="description" content="${siteConfig.description}">
  <meta name="author" content="${siteConfig.author}">
  <style>
    ${this.getThemeCSS(this.theme)}
  </style>
</head>
<body>
  <div class="container">
    <nav class="nav">
      <h1>${siteConfig.title}</h1>
      <div class="search">
        <input type="text" placeholder="Search pages..." />
      </div>
      <ul>
${navItems}
      </ul>
    </nav>
    
    <main class="content">
      ${htmlContent}
    </main>
  </div>
  
  <script>
    ${this.getNavJS()}
  </script>
</body>
</html>`;

    return { html, title };
  }

  // Generate static site
  generate(sourceDir, siteConfig) {
    const files = this.scanMarkdownFiles(sourceDir);
    
    if (files.length === 0) {
      throw new Error('No markdown files found in source directory');
    }

    // Create output directory
    const outputDir = '/tmp/superskill-output/site';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pages = [];

    // Generate pages
    files.forEach(file => {
      const { html, title } = this.generatePage(file, files, siteConfig);
      const outputPath = path.join(outputDir, file.name + '.html');
      
      fs.writeFileSync(outputPath, html);
      pages.push({
        title,
        path: file.name + '.html',
        originalFile: file.relativePath
      });
    });

    // Create index.html (copy of first page or create index)
    const indexFile = files.find(f => f.name.toLowerCase() === 'index') || 
                      files.find(f => f.name.toLowerCase().includes('readme')) || 
                      files[0];
    
    if (indexFile) {
      const { html } = this.generatePage(indexFile, files, siteConfig);
      fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    }

    return {
      outputDir,
      pages,
      totalPages: pages.length
    };
  }
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
      const { 
        sourceDir, 
        title = 'Static Site', 
        theme = 'minimal',
        description = '',
        author = ''
      } = input;
      
      if (!sourceDir) {
        throw new Error('sourceDir is required');
      }
      
      if (!fs.existsSync(sourceDir)) {
        throw new Error(`Source directory does not exist: ${sourceDir}`);
      }
      
      if (!['minimal', 'docs', 'blog'].includes(theme)) {
        throw new Error('theme must be one of: minimal, docs, blog');
      }
      
      const generator = new StaticSiteGenerator(theme);
      const result = generator.generate(sourceDir, {
        title,
        description,
        author
      });
      
      console.log(JSON.stringify({
        success: true,
        ...result,
        theme,
        config: {
          title,
          description,
          author
        }
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