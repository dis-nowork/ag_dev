#!/usr/bin/env node

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Read input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

process.stdin.on('end', async () => {
  try {
    const input = JSON.parse(inputData);
    const result = await testWebApp(input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
});

async function testWebApp(input) {
  const { url, checks = ['responsive', 'links', 'performance', 'a11y'] } = input;
  
  if (!url) {
    throw new Error('url is required');
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Invalid URL provided');
  }

  const results = [];
  let totalScore = 0;
  const maxScore = checks.length * 100;

  // Fetch the page content first
  const startTime = Date.now();
  let pageContent, responseHeaders, statusCode;
  
  try {
    const fetchResult = await fetchPage(url);
    pageContent = fetchResult.content;
    responseHeaders = fetchResult.headers;
    statusCode = fetchResult.statusCode;
  } catch (error) {
    return {
      results: [{
        check: 'connectivity',
        passed: false,
        details: `Failed to fetch page: ${error.message}`
      }],
      score: 0,
      summary: 'Unable to connect to the web application'
    };
  }

  const loadTime = Date.now() - startTime;

  // Run each requested check
  for (const checkType of checks) {
    let checkResult;
    
    switch (checkType) {
      case 'responsive':
        checkResult = await checkResponsive(pageContent, responseHeaders);
        break;
      case 'links':
        checkResult = await checkLinks(pageContent, parsedUrl);
        break;
      case 'performance':
        checkResult = await checkPerformance(loadTime, responseHeaders, pageContent);
        break;
      case 'a11y':
        checkResult = await checkAccessibility(pageContent);
        break;
      default:
        checkResult = {
          check: checkType,
          passed: false,
          details: `Unknown check type: ${checkType}`
        };
    }
    
    results.push(checkResult);
    if (checkResult.passed) {
      totalScore += 100;
    }
  }

  const score = Math.round((totalScore / maxScore) * 100);
  const passedChecks = results.filter(r => r.passed).length;
  const summary = `${passedChecks}/${checks.length} checks passed. Status: ${statusCode}, Load time: ${loadTime}ms`;

  return {
    results,
    score,
    summary
  };
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'AG Dev SuperSkill WebApp Tester',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 30000
    };

    const req = client.request(options, (res) => {
      let content = '';
      
      res.on('data', (chunk) => {
        content += chunk;
      });
      
      res.on('end', () => {
        resolve({
          content,
          headers: res.headers,
          statusCode: res.statusCode
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function checkResponsive(content, headers) {
  const checks = [];
  let score = 0;
  
  // Check for viewport meta tag
  if (content.includes('<meta name="viewport"') || content.includes('<meta name=\'viewport\'')) {
    checks.push('Viewport meta tag present');
    score += 30;
  } else {
    checks.push('Missing viewport meta tag');
  }
  
  // Check for CSS media queries
  if (content.includes('@media') || content.includes('media=')) {
    checks.push('CSS media queries detected');
    score += 30;
  } else {
    checks.push('No CSS media queries found');
  }
  
  // Check for responsive frameworks
  const responsiveFrameworks = ['bootstrap', 'foundation', 'bulma', 'tailwind'];
  const hasFramework = responsiveFrameworks.some(fw => 
    content.toLowerCase().includes(fw)
  );
  
  if (hasFramework) {
    checks.push('Responsive CSS framework detected');
    score += 40;
  } else {
    checks.push('No known responsive framework found');
  }
  
  return {
    check: 'responsive',
    passed: score >= 60,
    details: checks.join('; ')
  };
}

async function checkLinks(content, baseUrl) {
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  if (links.length === 0) {
    return {
      check: 'links',
      passed: true,
      details: 'No links found to validate'
    };
  }
  
  // Sample a few links to test (max 5 to avoid long execution)
  const linksToTest = links.slice(0, 5);
  const results = [];
  
  for (const link of linksToTest) {
    try {
      // Skip javascript: and mailto: links
      if (link.startsWith('javascript:') || link.startsWith('mailto:') || link.startsWith('tel:')) {
        continue;
      }
      
      // Handle relative URLs
      let testUrl;
      if (link.startsWith('http://') || link.startsWith('https://')) {
        testUrl = link;
      } else if (link.startsWith('/')) {
        testUrl = `${baseUrl.protocol}//${baseUrl.host}${link}`;
      } else if (link.startsWith('#')) {
        // Fragment link - assume valid
        results.push({ link, status: 'fragment' });
        continue;
      } else {
        testUrl = `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname}/${link}`;
      }
      
      const linkResult = await testLink(testUrl);
      results.push({ link, status: linkResult });
    } catch (error) {
      results.push({ link, status: 'error' });
    }
  }
  
  const validLinks = results.filter(r => r.status === 'ok' || r.status === 'fragment').length;
  const totalTested = results.length;
  
  return {
    check: 'links',
    passed: totalTested === 0 || (validLinks / totalTested) >= 0.8,
    details: `Tested ${totalTested} links, ${validLinks} valid (${Math.round((validLinks/totalTested)*100)}% success rate)`
  };
}

function testLink(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'HEAD',
        timeout: 10000
      }, (res) => {
        resolve(res.statusCode < 400 ? 'ok' : 'error');
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve('timeout');
      });
      
      req.on('error', () => {
        resolve('error');
      });
      
      req.end();
    } catch {
      resolve('error');
    }
  });
}

async function checkPerformance(loadTime, headers, content) {
  const checks = [];
  let score = 0;
  
  // Check load time
  if (loadTime < 1000) {
    checks.push(`Fast load time: ${loadTime}ms`);
    score += 40;
  } else if (loadTime < 3000) {
    checks.push(`Acceptable load time: ${loadTime}ms`);
    score += 20;
  } else {
    checks.push(`Slow load time: ${loadTime}ms`);
  }
  
  // Check compression
  const encoding = headers['content-encoding'];
  if (encoding && (encoding.includes('gzip') || encoding.includes('br'))) {
    checks.push('Content compression enabled');
    score += 30;
  } else {
    checks.push('No content compression detected');
  }
  
  // Check caching headers
  const cacheControl = headers['cache-control'];
  const expires = headers['expires'];
  const etag = headers['etag'];
  
  if (cacheControl || expires || etag) {
    checks.push('Caching headers present');
    score += 30;
  } else {
    checks.push('No caching headers found');
  }
  
  return {
    check: 'performance',
    passed: score >= 60,
    details: checks.join('; ')
  };
}

async function checkAccessibility(content) {
  const checks = [];
  let score = 0;
  
  // Check for alt attributes on images
  const imgRegex = /<img[^>]*>/gi;
  const images = content.match(imgRegex) || [];
  const imagesWithAlt = images.filter(img => img.includes('alt=')).length;
  
  if (images.length === 0) {
    checks.push('No images found');
    score += 25;
  } else if (imagesWithAlt / images.length >= 0.8) {
    checks.push(`Good alt text coverage: ${imagesWithAlt}/${images.length} images`);
    score += 25;
  } else {
    checks.push(`Poor alt text coverage: ${imagesWithAlt}/${images.length} images`);
  }
  
  // Check for semantic HTML5 elements
  const semanticElements = ['<header', '<nav', '<main', '<article', '<section', '<aside', '<footer'];
  const foundElements = semanticElements.filter(element => content.includes(element));
  
  if (foundElements.length >= 3) {
    checks.push(`Good semantic HTML: ${foundElements.length}/7 elements found`);
    score += 25;
  } else {
    checks.push(`Limited semantic HTML: ${foundElements.length}/7 elements found`);
  }
  
  // Check for heading structure
  const headingRegex = /<h([1-6])[^>]*>/gi;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(parseInt(match[1]));
  }
  
  if (headings.length > 0 && headings.includes(1)) {
    checks.push(`Heading structure present: ${headings.length} headings with H1`);
    score += 25;
  } else if (headings.length > 0) {
    checks.push(`Heading structure present but missing H1: ${headings.length} headings`);
    score += 15;
  } else {
    checks.push('No heading structure found');
  }
  
  // Check for lang attribute
  if (content.includes('<html') && content.includes('lang=')) {
    checks.push('Language attribute present');
    score += 25;
  } else {
    checks.push('Missing language attribute');
  }
  
  return {
    check: 'a11y',
    passed: score >= 60,
    details: checks.join('; ')
  };
}