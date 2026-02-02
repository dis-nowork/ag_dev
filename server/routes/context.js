const express = require('express');
const path = require('path');
const fs = require('fs');

module.exports = function(deps) {
  const router = express.Router();
  const { broadcast } = deps;
  
  const CONTEXT_DIR = path.join(__dirname, '../../project-context');

  // Ensure project-context directory exists
  if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
  }

  /**
   * Get all context files
   */
  router.get('/', (req, res) => {
    try {
      const files = {};
      if (fs.existsSync(CONTEXT_DIR)) {
        const entries = fs.readdirSync(CONTEXT_DIR).filter(f => f.endsWith('.md'));
        for (const entry of entries) {
          files[entry] = fs.readFileSync(path.join(CONTEXT_DIR, entry), 'utf-8');
        }
      }
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get specific context file
   */
  router.get('/:filename', (req, res) => {
    try {
      const filePath = path.join(CONTEXT_DIR, req.params.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      res.json({ filename: req.params.filename, content });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Update context file
   */
  router.put('/:filename', (req, res) => {
    try {
      const { content } = req.body;
      if (content === undefined) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      // Only allow .md files for safety
      const filename = req.params.filename;
      if (!filename.endsWith('.md')) {
        return res.status(400).json({ error: 'Only .md files allowed' });
      }
      
      const filePath = path.join(CONTEXT_DIR, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      
      broadcast('context_updated', { filename });
      res.json({ ok: true, filename });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Create new context file
   */
  router.post('/', (req, res) => {
    try {
      const { filename, content } = req.body;
      if (!filename || !filename.endsWith('.md')) {
        return res.status(400).json({ error: 'Filename (ending in .md) is required' });
      }
      
      const filePath = path.join(CONTEXT_DIR, filename);
      if (fs.existsSync(filePath)) {
        return res.status(409).json({ error: 'File already exists. Use PUT to update.' });
      }
      
      fs.writeFileSync(filePath, content || '', 'utf-8');
      res.json({ ok: true, filename });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};