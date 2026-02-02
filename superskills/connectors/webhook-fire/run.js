#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const querystring = require('querystring');

// HTTP client for webhooks
class WebhookClient {
  constructor() {
    this.defaultHeaders = {
      'User-Agent': 'ClawdbotWebhook/1.0'
    };
  }

  // Prepare request body based on content type
  prepareBody(body, contentType) {
    if (!body) return null;

    switch (contentType) {
      case 'json':
        if (typeof body === 'object') {
          return JSON.stringify(body);
        }
        return String(body);
      
      case 'form':
        if (typeof body === 'object') {
          return querystring.stringify(body);
        }
        return String(body);
      
      case 'text':
      default:
        return String(body);
    }
  }

  // Get content type header
  getContentType(contentType) {
    switch (contentType) {
      case 'json':
        return 'application/json';
      case 'form':
        return 'application/x-www-form-urlencoded';
      case 'text':
        return 'text/plain';
      default:
        return 'application/json';
    }
  }

  // Make HTTP request
  async request(options) {
    const {
      url,
      method = 'POST',
      headers = {},
      body = null,
      timeout = 30000,
      contentType = 'json'
    } = options;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let parsedUrl;

      try {
        parsedUrl = new URL(url);
      } catch (error) {
        return reject(new Error(`Invalid URL: ${url}`));
      }

      // Choose http or https module
      const client = parsedUrl.protocol === 'https:' ? https : http;

      // Prepare request body
      const requestBody = this.prepareBody(body, contentType);

      // Prepare headers
      const requestHeaders = {
        ...this.defaultHeaders,
        ...headers
      };

      // Set content type if body exists
      if (requestBody && !requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
        requestHeaders['Content-Type'] = this.getContentType(contentType);
      }

      // Set content length if body exists
      if (requestBody && !requestHeaders['Content-Length'] && !requestHeaders['content-length']) {
        requestHeaders['Content-Length'] = Buffer.byteLength(requestBody);
      }

      // Request options
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method.toUpperCase(),
        headers: requestHeaders,
        timeout: timeout
      };

      // Create request
      const req = client.request(requestOptions, (res) => {
        let responseBody = '';
        
        // Collect response data
        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          const duration = Date.now() - startTime;
          let parsedBody = responseBody;

          // Try to parse JSON response
          try {
            if (res.headers['content-type']?.includes('application/json')) {
              parsedBody = JSON.parse(responseBody);
            }
          } catch {
            // Keep as string if parsing fails
          }

          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            body: parsedBody,
            rawBody: responseBody,
            duration,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        });
      });

      // Handle request errors
      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      // Handle timeout
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${timeout}ms`));
      });

      // Send request body
      if (requestBody) {
        req.write(requestBody);
      }

      req.end();
    });
  }

  // Fire webhook with retry logic
  async fireWebhook(options, retries = 0) {
    try {
      return await this.request(options);
    } catch (error) {
      if (retries > 0 && this.shouldRetry(error)) {
        await this.sleep(Math.pow(2, 3 - retries) * 1000); // Exponential backoff
        return this.fireWebhook(options, retries - 1);
      }
      throw error;
    }
  }

  // Check if error is retryable
  shouldRetry(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ];
    
    return retryableErrors.some(code => error.message.includes(code));
  }

  // Sleep helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Validate URL
function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
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
  
  async function processInput() {
    try {
      const { 
        url, 
        method = 'POST', 
        headers = {}, 
        body = null, 
        timeout = 30000,
        contentType = 'json',
        retries = 2
      } = input;
      
      if (!url) {
        throw new Error('url is required');
      }
      
      if (!validateUrl(url)) {
        throw new Error('Invalid URL format');
      }
      
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      if (!validMethods.includes(method.toUpperCase())) {
        throw new Error(`Invalid method. Must be one of: ${validMethods.join(', ')}`);
      }
      
      if (timeout < 1000 || timeout > 300000) {
        throw new Error('Timeout must be between 1000ms and 300000ms');
      }

      const client = new WebhookClient();
      const result = await client.fireWebhook({
        url,
        method,
        headers,
        body,
        timeout,
        contentType
      }, retries);
      
      // Remove potentially large raw body from output
      const output = { ...result };
      if (output.rawBody && output.rawBody.length > 10000) {
        output.rawBody = `[Truncated - ${output.rawBody.length} bytes]`;
      }
      
      console.log(JSON.stringify({
        success: true,
        request: {
          url,
          method: method.toUpperCase(),
          contentType,
          hasBody: !!body
        },
        response: output
      }));
      
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error.message,
        request: {
          url: input?.url,
          method: input?.method || 'POST'
        }
      }));
      process.exit(1);
    }
  }
}

main();