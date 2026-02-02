#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple markdown parser
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
      image: /!\[([^\]]*)\]\(([^)]+)\)/g
    };
  }

  parse(markdown) {
    let html = markdown;

    // Code blocks first (to avoid conflicts)
    html = html.replace(this.patterns.codeBlock, '<pre><code>$1</code></pre>');

    // Headings
    html = html.replace(this.patterns.heading, (match, hashes, text) => {
      const level = hashes.length;
      return `<h${level}>${text}</h${level}>`;
    });

    // Bold and italic
    html = html.replace(this.patterns.bold, '<strong>$1</strong>');
    html = html.replace(this.patterns.italic, '<em>$1</em>');

    // Inline code
    html = html.replace(this.patterns.code, '<code>$1</code>');

    // Links and images
    html = html.replace(this.patterns.image, '<img src="$2" alt="$1">');
    html = html.replace(this.patterns.link, '<a href="$2">$1</a>');

    // Lists
    html = html.replace(this.patterns.list, '<li>$1</li>');
    html = html.replace(this.patterns.orderedList, '<li>$1</li>');

    // Wrap consecutive <li> elements in <ul> or <ol>
    html = html.replace(/(<li>.*?<\/li>)/g, (match) => {
      if (!match.includes('<ol>') && !match.includes('<ul>')) {
        return `<ul>${match}</ul>`;
      }
      return match;
    });

    // Paragraphs
    html = html.split('\n\n').map(paragraph => {
      paragraph = paragraph.trim();
      if (!paragraph) return '';
      if (paragraph.startsWith('<') || paragraph.includes('<li>')) return paragraph;
      return `<p>${paragraph}</p>`;
    }).join('\n');

    return html;
  }
}

// Slideshow generator
class SlideshowGenerator {
  constructor(theme = 'light') {
    this.theme = theme;
    this.parser = new MarkdownParser();
  }

  // Split markdown into slides
  splitSlides(markdown) {
    // First try splitting by ---
    let slides = markdown.split(/\n---\n|\n--- \n/);
    
    // If no --- separators found, split by ## headers
    if (slides.length === 1) {
      slides = markdown.split(/\n(?=##\s)/);
    }

    return slides.map(slide => slide.trim()).filter(slide => slide.length > 0);
  }

  // Generate CSS for different themes
  generateCSS(theme) {
    const themes = {
      light: {
        background: '#ffffff',
        color: '#333333',
        accent: '#007acc',
        secondary: '#f5f5f5'
      },
      dark: {
        background: '#1e1e1e',
        color: '#ffffff',
        accent: '#00d4ff',
        secondary: '#2d2d2d'
      },
      corporate: {
        background: '#f8f9fa',
        color: '#212529',
        accent: '#0d6efd',
        secondary: '#e9ecef'
      }
    };

    const colors = themes[theme];

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: ${colors.background};
        color: ${colors.color};
        overflow: hidden;
      }
      
      .slideshow-container {
        position: relative;
        width: 100vw;
        height: 100vh;
      }
      
      .slide {
        display: none;
        padding: 60px;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        position: absolute;
        top: 0;
        left: 0;
        transition: opacity 0.5s ease-in-out;
        opacity: 0;
      }
      
      .slide.active {
        display: flex;
        opacity: 1;
      }
      
      .slide h1 {
        font-size: 3rem;
        margin-bottom: 2rem;
        color: ${colors.accent};
      }
      
      .slide h2 {
        font-size: 2.5rem;
        margin-bottom: 1.5rem;
        color: ${colors.accent};
      }
      
      .slide h3 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      
      .slide p {
        font-size: 1.5rem;
        line-height: 1.6;
        margin-bottom: 1rem;
        max-width: 800px;
      }
      
      .slide ul, .slide ol {
        font-size: 1.3rem;
        text-align: left;
        max-width: 600px;
      }
      
      .slide li {
        margin-bottom: 0.5rem;
      }
      
      .slide code {
        background: ${colors.secondary};
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: monospace;
      }
      
      .slide pre {
        background: ${colors.secondary};
        padding: 1rem;
        border-radius: 5px;
        overflow-x: auto;
        max-width: 100%;
      }
      
      .slide img {
        max-width: 100%;
        max-height: 70vh;
        margin: 1rem 0;
      }
      
      .controls {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        z-index: 1000;
      }
      
      .btn {
        padding: 10px 20px;
        background: ${colors.accent};
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
      }
      
      .btn:hover {
        opacity: 0.8;
      }
      
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .slide-counter {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 14px;
      }
      
      @media (max-width: 768px) {
        .slide {
          padding: 30px 20px;
        }
        .slide h1 { font-size: 2rem; }
        .slide h2 { font-size: 1.8rem; }
        .slide p { font-size: 1.2rem; }
      }
    `;
  }

  // Generate JavaScript for slideshow functionality
  generateJS() {
    return `
      let currentSlide = 0;
      const slides = document.querySelectorAll('.slide');
      const totalSlides = slides.length;
      
      function showSlide(n) {
        slides.forEach(slide => slide.classList.remove('active'));
        currentSlide = Math.max(0, Math.min(n, totalSlides - 1));
        slides[currentSlide].classList.add('active');
        updateCounter();
        updateButtons();
      }
      
      function nextSlide() {
        if (currentSlide < totalSlides - 1) {
          showSlide(currentSlide + 1);
        }
      }
      
      function prevSlide() {
        if (currentSlide > 0) {
          showSlide(currentSlide - 1);
        }
      }
      
      function updateCounter() {
        const counter = document.querySelector('.slide-counter');
        if (counter) {
          counter.textContent = (currentSlide + 1) + ' / ' + totalSlides;
        }
      }
      
      function updateButtons() {
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');
        
        if (prevBtn) prevBtn.disabled = currentSlide === 0;
        if (nextBtn) nextBtn.disabled = currentSlide === totalSlides - 1;
      }
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        switch(e.key) {
          case 'ArrowRight':
          case ' ':
            nextSlide();
            break;
          case 'ArrowLeft':
            prevSlide();
            break;
          case 'Home':
            showSlide(0);
            break;
          case 'End':
            showSlide(totalSlides - 1);
            break;
        }
      });
      
      // Initialize
      document.addEventListener('DOMContentLoaded', () => {
        showSlide(0);
      });
    `;
  }

  // Generate complete HTML slideshow
  generate(markdown, title = 'Presentation') {
    const slideTexts = this.splitSlides(markdown);
    const slideHtml = slideTexts.map(slideText => {
      const html = this.parser.parse(slideText);
      return `<div class="slide">${html}</div>`;
    }).join('\n');

    const css = this.generateCSS(this.theme);
    const js = this.generateJS();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${css}</style>
</head>
<body>
  <div class="slideshow-container">
    ${slideHtml}
  </div>
  
  <div class="slide-counter">1 / ${slideTexts.length}</div>
  
  <div class="controls">
    <button class="btn prev-btn" onclick="prevSlide()">← Previous</button>
    <button class="btn next-btn" onclick="nextSlide()">Next →</button>
  </div>
  
  <script>${js}</script>
</body>
</html>`;

    return {
      html,
      slideCount: slideTexts.length
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
      const { markdown, theme = 'light', title = 'Presentation' } = input;
      
      if (!markdown) {
        throw new Error('markdown content is required');
      }
      
      if (!['light', 'dark', 'corporate'].includes(theme)) {
        throw new Error('theme must be one of: light, dark, corporate');
      }
      
      const generator = new SlideshowGenerator(theme);
      const result = generator.generate(markdown, title);
      
      // Save to file
      const outputDir = '/tmp/superskill-output';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filename = `slideshow-${Date.now()}.html`;
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, result.html);
      
      console.log(JSON.stringify({
        success: true,
        html: result.html,
        slideCount: result.slideCount,
        filePath: filePath,
        theme: theme,
        title: title
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