#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

function buildRedditUrl(input) {
  let baseUrl;
  const sort = input.sort || 'hot';
  const limit = Math.min(input.limit || 25, 100);
  
  if (input.url) {
    // Direct Reddit URL - append .json
    const url = new URL(input.url);
    if (!url.hostname.includes('reddit.com')) {
      throw new Error('URL must be a Reddit URL');
    }
    
    baseUrl = input.url.endsWith('.json') ? input.url : `${input.url}.json`;
  } else if (input.subreddit) {
    // Subreddit posts
    const subreddit = input.subreddit.replace(/^r\//, ''); // Remove r/ prefix if present
    
    if (input.query) {
      // Search within subreddit
      baseUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(input.query)}&restrict_sr=1&sort=${sort}&limit=${limit}`;
    } else {
      // Regular subreddit listing
      baseUrl = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;
    }
  } else if (input.query) {
    // Global search
    baseUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(input.query)}&sort=${sort}&limit=${limit}`;
  } else {
    throw new Error('Either subreddit, url, or query must be provided');
  }
  
  return baseUrl;
}

function fetchRedditData(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'SuperSkill Reddit Fetcher 1.0'
      }
    };
    
    https.get(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
  });
}

function parseRedditResponse(data) {
  let posts = [];
  
  // Handle different Reddit API response structures
  if (data.data && data.data.children) {
    // Standard subreddit/search response
    posts = data.data.children.map(child => child.data);
  } else if (Array.isArray(data) && data.length > 0) {
    // Post with comments (first element is the post)
    if (data[0].data && data[0].data.children) {
      posts = data[0].data.children.map(child => child.data);
    }
  } else if (data.data) {
    // Single post
    posts = [data.data];
  }
  
  // Extract relevant information from each post
  return posts
    .filter(post => post.title) // Filter out non-post entries
    .map(post => ({
      title: post.title,
      author: post.author || '[deleted]',
      score: post.score || 0,
      comments: post.num_comments || 0,
      url: `https://reddit.com${post.permalink}`,
      selftext: post.selftext || '',
      created: new Date(post.created_utc * 1000).toISOString(),
      subreddit: post.subreddit,
      postHint: post.post_hint,
      isVideo: post.is_video || false,
      thumbnail: post.thumbnail !== 'self' ? post.thumbnail : null,
      domain: post.domain
    }));
}

function validateInput(input) {
  if (!input.subreddit && !input.url && !input.query) {
    throw new Error('At least one of subreddit, url, or query must be provided');
  }
  
  if (input.subreddit && typeof input.subreddit !== 'string') {
    throw new Error('subreddit must be a string');
  }
  
  if (input.url && typeof input.url !== 'string') {
    throw new Error('url must be a string');
  }
  
  if (input.query && typeof input.query !== 'string') {
    throw new Error('query must be a string');
  }
  
  if (input.sort && !['hot', 'new', 'top'].includes(input.sort)) {
    throw new Error('sort must be one of: hot, new, top');
  }
  
  if (input.limit && (typeof input.limit !== 'number' || input.limit < 1 || input.limit > 100)) {
    throw new Error('limit must be a number between 1 and 100');
  }
  
  return true;
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
    
    // Validate input
    validateInput(input);
    
    // Build Reddit API URL
    const url = buildRedditUrl(input);
    
    // Fetch data from Reddit
    const data = await fetchRedditData(url);
    
    // Parse response
    const posts = parseRedditResponse(data);
    
    const result = {
      posts
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

module.exports = { buildRedditUrl, parseRedditResponse, validateInput };