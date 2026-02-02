#!/usr/bin/env node

const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Creative domain generation patterns
class DomainGenerator {
  constructor(concept, keywords) {
    this.concept = concept;
    this.keywords = keywords;
    this.prefixes = ['my', 'get', 'go', 'the', 'pro', 'super', 'smart', 'quick', 'easy', 'best'];
    this.suffixes = ['ly', 'fy', 'io', 'ai', 'hub', 'lab', 'kit', 'box', 'app', 'tool'];
  }

  // Generate prefix + keyword combinations
  generatePrefixed() {
    const domains = [];
    this.keywords.forEach(keyword => {
      this.prefixes.forEach(prefix => {
        domains.push({
          name: prefix + keyword,
          creative_method: 'prefix+keyword'
        });
      });
    });
    return domains;
  }

  // Generate keyword + suffix combinations  
  generateSuffixed() {
    const domains = [];
    this.keywords.forEach(keyword => {
      this.suffixes.forEach(suffix => {
        domains.push({
          name: keyword + suffix,
          creative_method: 'keyword+suffix'
        });
      });
    });
    return domains;
  }

  // Generate portmanteau (blended words)
  generatePortmanteau() {
    const domains = [];
    if (this.keywords.length >= 2) {
      for (let i = 0; i < this.keywords.length; i++) {
        for (let j = i + 1; j < this.keywords.length; j++) {
          const word1 = this.keywords[i];
          const word2 = this.keywords[j];
          
          // Blend first half of word1 + second half of word2
          if (word1.length >= 3 && word2.length >= 3) {
            const blend1 = word1.slice(0, Math.ceil(word1.length / 2)) + word2.slice(Math.floor(word2.length / 2));
            const blend2 = word2.slice(0, Math.ceil(word2.length / 2)) + word1.slice(Math.floor(word1.length / 2));
            
            domains.push({
              name: blend1,
              creative_method: 'portmanteau'
            });
            domains.push({
              name: blend2,
              creative_method: 'portmanteau'
            });
          }
        }
      }
    }
    return domains;
  }

  // Generate abbreviations
  generateAbbreviations() {
    const domains = [];
    const conceptWords = this.concept.toLowerCase().split(' ');
    
    // Generate acronyms from concept
    if (conceptWords.length >= 2) {
      const acronym = conceptWords.map(word => word[0]).join('');
      domains.push({
        name: acronym,
        creative_method: 'abbreviation'
      });
    }

    // Generate abbreviations from keywords
    this.keywords.forEach(keyword => {
      if (keyword.length >= 4) {
        // First 3 letters
        domains.push({
          name: keyword.slice(0, 3),
          creative_method: 'abbreviation'
        });
        
        // Remove vowels
        const consonants = keyword.replace(/[aeiou]/gi, '');
        if (consonants.length >= 2 && consonants.length <= 6) {
          domains.push({
            name: consonants,
            creative_method: 'abbreviation'
          });
        }
      }
    });

    return domains;
  }

  // Generate rhyming variations
  generateRhyming() {
    const domains = [];
    const rhymingPatterns = {
      'ly': ['fy', 'py', 'my', 'by'],
      'er': ['ar', 'or', 'ur'],
      'ing': ['ung', 'ang', 'ong'],
      'ed': ['ad', 'od', 'id']
    };

    this.keywords.forEach(keyword => {
      Object.entries(rhymingPatterns).forEach(([ending, rhymes]) => {
        if (keyword.endsWith(ending)) {
          const base = keyword.slice(0, -ending.length);
          rhymes.forEach(rhyme => {
            domains.push({
              name: base + rhyme,
              creative_method: 'rhyming'
            });
          });
        }
      });
    });

    return domains;
  }

  // Generate all creative domains
  generateAll() {
    const domains = [
      ...this.generatePrefixed(),
      ...this.generateSuffixed(),
      ...this.generatePortmanteau(),
      ...this.generateAbbreviations(),
      ...this.generateRhyming()
    ];

    // Remove duplicates and clean up
    const unique = domains.reduce((acc, domain) => {
      const name = domain.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (name.length >= 2 && name.length <= 20 && !acc.some(d => d.name === name)) {
        acc.push({ ...domain, name });
      }
      return acc;
    }, []);

    return unique;
  }
}

// Check domain availability using DNS lookup
async function checkAvailability(domain, tld) {
  try {
    const fullDomain = `${domain}.${tld}`;
    const { stdout } = await execAsync(`dig +short ${fullDomain} A`);
    // If dig returns empty result, domain might be available
    // If it returns IP addresses, domain is taken
    return stdout.trim() === '';
  } catch (error) {
    // If dig fails, assume unavailable for safety
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
      const { concept, keywords, tlds = ['com', 'io', 'dev', 'app'] } = input;
      
      if (!concept || !keywords || !Array.isArray(keywords)) {
        throw new Error('concept and keywords array are required');
      }
      
      const generator = new DomainGenerator(concept, keywords);
      const creativeDomains = generator.generateAll();
      
      // Check availability for each domain + TLD combination
      const results = [];
      const promises = [];
      
      for (const domain of creativeDomains.slice(0, 50)) { // Limit to 50 to avoid timeout
        for (const tld of tlds) {
          promises.push(
            checkAvailability(domain.name, tld).then(available => ({
              name: domain.name,
              tld,
              available,
              creative_method: domain.creative_method
            }))
          );
        }
      }
      
      const domains = await Promise.all(promises);
      
      console.log(JSON.stringify({
        success: true,
        domains,
        total: domains.length,
        available_count: domains.filter(d => d.available).length
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