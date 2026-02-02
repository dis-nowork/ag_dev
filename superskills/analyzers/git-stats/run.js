#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Git stats analyzer
class GitStatsAnalyzer {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.stats = {
      commits: 0,
      authors: [],
      byDay: {},
      byHour: {},
      topFiles: [],
      firstCommit: null,
      lastCommit: null,
      totalAdditions: 0,
      totalDeletions: 0
    };
  }

  // Execute git command in repository
  async gitCommand(command) {
    try {
      const { stdout } = await execAsync(command, { 
        cwd: this.repoPath,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  // Check if directory is a git repository
  async isGitRepo() {
    try {
      await this.gitCommand('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  // Get basic commit count and timeline
  async getBasicStats(since, until) {
    let dateFilter = '';
    if (since) dateFilter += ` --since="${since}"`;
    if (until) dateFilter += ` --until="${until}"`;

    // Total commits
    const commitCount = await this.gitCommand(`git rev-list --count HEAD${dateFilter}`);
    this.stats.commits = parseInt(commitCount, 10);

    // First and last commit
    if (this.stats.commits > 0) {
      try {
        const firstCommit = await this.gitCommand(`git log --reverse --format="%H|%ai|%s" -1${dateFilter}`);
        const lastCommit = await this.gitCommand(`git log --format="%H|%ai|%s" -1${dateFilter}`);
        
        const [firstHash, firstDate, firstMessage] = firstCommit.split('|');
        const [lastHash, lastDate, lastMessage] = lastCommit.split('|');
        
        this.stats.firstCommit = {
          hash: firstHash,
          date: firstDate,
          message: firstMessage
        };
        
        this.stats.lastCommit = {
          hash: lastHash,
          date: lastDate,
          message: lastMessage
        };
      } catch (error) {
        // Handle case where no commits match date filter
        this.stats.firstCommit = null;
        this.stats.lastCommit = null;
      }
    }
  }

  // Analyze authors and their contributions
  async analyzeAuthors(maxAuthors, since, until) {
    let dateFilter = '';
    if (since) dateFilter += ` --since="${since}"`;
    if (until) dateFilter += ` --until="${until}"`;

    try {
      // Get author commit counts
      const authorStats = await this.gitCommand(`git shortlog -sn HEAD${dateFilter}`);
      const authorCommits = {};
      
      authorStats.split('\n').forEach(line => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        if (match) {
          const [, commits, name] = match;
          authorCommits[name] = parseInt(commits, 10);
        }
      });

      // Get detailed author stats with additions/deletions
      const detailedStats = await this.gitCommand(`git log --format="%aN" --numstat${dateFilter}`);
      const authorDetails = {};
      
      let currentAuthor = null;
      detailedStats.split('\n').forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // If line doesn't contain tabs, it's an author name
        if (!line.includes('\t')) {
          currentAuthor = line;
          if (!authorDetails[currentAuthor]) {
            authorDetails[currentAuthor] = { additions: 0, deletions: 0 };
          }
        } else if (currentAuthor) {
          // Parse numstat line: additions  deletions  filename
          const [additions, deletions] = line.split('\t');
          if (additions !== '-') {
            authorDetails[currentAuthor].additions += parseInt(additions, 10) || 0;
          }
          if (deletions !== '-') {
            authorDetails[currentAuthor].deletions += parseInt(deletions, 10) || 0;
          }
        }
      });

      // Combine data
      const authors = Object.entries(authorCommits)
        .map(([name, commits]) => ({
          name,
          commits,
          additions: authorDetails[name]?.additions || 0,
          deletions: authorDetails[name]?.deletions || 0
        }))
        .sort((a, b) => b.commits - a.commits)
        .slice(0, maxAuthors);

      this.stats.authors = authors;
      this.stats.totalAdditions = authors.reduce((sum, author) => sum + author.additions, 0);
      this.stats.totalDeletions = authors.reduce((sum, author) => sum + author.deletions, 0);
    } catch (error) {
      console.error('Error analyzing authors:', error.message);
      this.stats.authors = [];
    }
  }

  // Analyze activity patterns by day of week and hour
  async analyzeTimePatterns(since, until) {
    let dateFilter = '';
    if (since) dateFilter += ` --since="${since}"`;
    if (until) dateFilter += ` --until="${until}"`;

    try {
      // Get commits with timestamps
      const commits = await this.gitCommand(`git log --format="%ai"${dateFilter}`);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayStats = {};
      const hourStats = {};

      // Initialize counters
      dayNames.forEach(day => dayStats[day] = 0);
      for (let i = 0; i < 24; i++) {
        hourStats[i] = 0;
      }

      commits.split('\n').forEach(timestamp => {
        if (!timestamp.trim()) return;
        
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return;
        
        const day = dayNames[date.getDay()];
        const hour = date.getHours();
        
        dayStats[day]++;
        hourStats[hour]++;
      });

      this.stats.byDay = dayStats;
      this.stats.byHour = hourStats;
    } catch (error) {
      console.error('Error analyzing time patterns:', error.message);
    }
  }

  // Analyze top modified files
  async analyzeTopFiles(since, until) {
    let dateFilter = '';
    if (since) dateFilter += ` --since="${since}"`;
    if (until) dateFilter += ` --until="${until}"`;

    try {
      // Get file modification counts
      const fileStats = await this.gitCommand(`git log --format="" --name-only${dateFilter}`);
      const fileCounts = {};
      
      fileStats.split('\n').forEach(filename => {
        filename = filename.trim();
        if (filename) {
          fileCounts[filename] = (fileCounts[filename] || 0) + 1;
        }
      });

      // Get top 20 files with detailed stats
      const topFiles = Object.entries(fileCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20);

      this.stats.topFiles = await Promise.all(
        topFiles.map(async ([filename, modifications]) => {
          try {
            // Get additions/deletions for this file
            const diffStats = await this.gitCommand(`git log --format="" --numstat${dateFilter} -- "${filename}"`);
            let additions = 0, deletions = 0;
            
            diffStats.split('\n').forEach(line => {
              line = line.trim();
              if (line && line.includes('\t')) {
                const [add, del] = line.split('\t');
                if (add !== '-') additions += parseInt(add, 10) || 0;
                if (del !== '-') deletions += parseInt(del, 10) || 0;
              }
            });

            return {
              filename,
              modifications,
              additions,
              deletions,
              netChange: additions - deletions
            };
          } catch {
            return {
              filename,
              modifications,
              additions: 0,
              deletions: 0,
              netChange: 0
            };
          }
        })
      );
    } catch (error) {
      console.error('Error analyzing top files:', error.message);
      this.stats.topFiles = [];
    }
  }

  // Main analysis method
  async analyze(options = {}) {
    const { since, until, maxAuthors = 10 } = options;

    if (!(await this.isGitRepo())) {
      throw new Error('Directory is not a git repository');
    }

    await this.getBasicStats(since, until);
    await this.analyzeAuthors(maxAuthors, since, until);
    await this.analyzeTimePatterns(since, until);
    await this.analyzeTopFiles(since, until);

    return this.stats;
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
      const { repoPath, since, until, maxAuthors = 10 } = input;
      
      if (!repoPath) {
        throw new Error('repoPath is required');
      }
      
      if (!fs.existsSync(repoPath)) {
        throw new Error(`Repository path does not exist: ${repoPath}`);
      }
      
      const analyzer = new GitStatsAnalyzer(repoPath);
      const stats = await analyzer.analyze({ since, until, maxAuthors });
      
      console.log(JSON.stringify({
        success: true,
        ...stats,
        repository: path.basename(repoPath),
        analyzedPeriod: {
          since: since || 'beginning',
          until: until || 'now'
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