const express = require('express');
const router = express.Router();
const {{name}}Controller = require('../controllers/{{name}}Controller');
const {{name}}Validator = require('../validators/{{name}}Validator');
const { validationResult } = require('express-validator');

// GET /{{name}}s - List all {{name}}s
router.get('/', async (req, res) => {
  try {
    const {{name}}s = await {{name}}Controller.getAll();
    res.json({{name}}s);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /{{name}}s/:id - Get {{name}} by ID
router.get('/:id', async (req, res) => {
  try {
    const {{name}} = await {{name}}Controller.getById(req.params.id);
    if (!{{name}}) {
      return res.status(404).json({ error: '{{name}} not found' });
    }
    res.json({{name}});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /{{name}}s - Create new {{name}}
router.post('/', {{name}}Validator.validateCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {{name}} = await {{name}}Controller.create(req.body);
    res.status(201).json({{name}});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /{{name}}s/:id - Update {{name}}
router.put('/:id', {{name}}Validator.validateUpdate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {{name}} = await {{name}}Controller.update(req.params.id, req.body);
    if (!{{name}}) {
      return res.status(404).json({ error: '{{name}} not found' });
    }
    res.json({{name}});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /{{name}}s/:id - Delete {{name}}
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await {{name}}Controller.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: '{{name}} not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;