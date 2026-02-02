#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple template engine
function applyTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

// Generate field validations for express-validator
function generateValidations(fields, isUpdate = false) {
  const validations = [];
  
  fields.forEach(field => {
    const constraints = field.constraints || {};
    let validation = `body('${field.name}')`;
    
    if (!constraints.required || isUpdate) {
      validation += '.optional()';
    }
    
    // Type validation
    switch (field.type) {
      case 'email':
        validation += '.isEmail().withMessage(\'Must be a valid email\')';
        break;
      case 'string':
        validation += '.isString().withMessage(\'Must be a string\')';
        break;
      case 'number':
        validation += '.isNumeric().withMessage(\'Must be a number\')';
        break;
      case 'boolean':
        validation += '.isBoolean().withMessage(\'Must be a boolean\')';
        break;
      case 'date':
        validation += '.isISO8601().withMessage(\'Must be a valid date\')';
        break;
      case 'uuid':
        validation += '.isUUID().withMessage(\'Must be a valid UUID\')';
        break;
    }
    
    // Required validation (for create only)
    if (constraints.required && !isUpdate) {
      validation += `.notEmpty().withMessage('${field.name} is required')`;
    }
    
    // Length constraints
    if (constraints.minLength || constraints.maxLength) {
      const lengthOptions = {};
      if (constraints.minLength) lengthOptions.min = constraints.minLength;
      if (constraints.maxLength) lengthOptions.max = constraints.maxLength;
      
      validation += `.isLength(${JSON.stringify(lengthOptions)}).withMessage('${field.name} length validation failed')`;
    }
    
    // Numeric constraints
    if (constraints.min !== undefined || constraints.max !== undefined) {
      const numOptions = {};
      if (constraints.min !== undefined) numOptions.min = constraints.min;
      if (constraints.max !== undefined) numOptions.max = constraints.max;
      
      validation += `.isFloat(${JSON.stringify(numOptions)}).withMessage('${field.name} range validation failed')`;
    }
    
    validations.push('    ' + validation);
  });
  
  return validations.join(',\\n');
}

// Generate test data
function generateTestData(fields) {
  const testData = {};
  const updateData = {};
  
  fields.forEach(field => {
    let value, updateValue;
    
    switch (field.type) {
      case 'email':
        value = 'test@example.com';
        updateValue = 'updated@example.com';
        break;
      case 'string':
        value = 'Test Value';
        updateValue = 'Updated Value';
        break;
      case 'number':
        value = 42;
        updateValue = 84;
        break;
      case 'boolean':
        value = true;
        updateValue = false;
        break;
      case 'date':
        value = new Date().toISOString();
        updateValue = new Date(Date.now() + 86400000).toISOString();
        break;
      case 'uuid':
        value = '123e4567-e89b-12d3-a456-426614174000';
        updateValue = '123e4567-e89b-12d3-a456-426614174001';
        break;
      default:
        value = 'test';
        updateValue = 'updated';
    }
    
    testData[field.name] = value;
    updateData[field.name] = updateValue;
  });
  
  return {
    testData: JSON.stringify(testData, null, 6),
    updateData: JSON.stringify(updateData, null, 6)
  };
}

// Process a single entity
function processEntity(entity, outputDir) {
  const entityName = entity.name;
  const entityNameLower = entityName.toLowerCase();
  
  // Load templates
  const templateDir = path.join(__dirname, 'templates');
  const routeTemplate = fs.readFileSync(path.join(templateDir, 'route.js'), 'utf8');
  const controllerTemplate = fs.readFileSync(path.join(templateDir, 'controller.js'), 'utf8');
  const validatorTemplate = fs.readFileSync(path.join(templateDir, 'validator.js'), 'utf8');
  const testTemplate = fs.readFileSync(path.join(templateDir, 'test.js'), 'utf8');
  
  // Generate validations
  const validations = generateValidations(entity.fields, false);
  const updateValidations = generateValidations(entity.fields, true);
  
  // Generate test data
  const { testData, updateData } = generateTestData(entity.fields);
  
  // Template data
  const templateData = {
    name: entityName,
    validations,
    updateValidations,
    testData,
    updateData
  };
  
  // Create output directories
  fs.mkdirSync(path.join(outputDir, 'routes'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'validators'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'tests'), { recursive: true });
  
  // Generate files
  fs.writeFileSync(
    path.join(outputDir, 'routes', `${entityName}Routes.js`),
    applyTemplate(routeTemplate, templateData)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'controllers', `${entityName}Controller.js`),
    applyTemplate(controllerTemplate, templateData)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'validators', `${entityName}Validator.js`),
    applyTemplate(validatorTemplate, templateData)
  );
  
  fs.writeFileSync(
    path.join(outputDir, 'tests', `${entityName}.test.js`),
    applyTemplate(testTemplate, templateData)
  );
  
  return {
    entity: entityName,
    files: [
      `routes/${entityName}Routes.js`,
      `controllers/${entityName}Controller.js`,
      `validators/${entityName}Validator.js`,
      `tests/${entityName}.test.js`
    ]
  };
}

// Main function
async function main() {
  let input;
  let outputDir = './output';
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      input = JSON.parse(fs.readFileSync(args[i + 1], 'utf8'));
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[i + 1];
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
        console.error('Invalid JSON input:', error.message);
        process.exit(1);
      }
    });
  } else {
    processInput();
  }
  
  function processInput() {
    try {
      if (!input.entities || !Array.isArray(input.entities)) {
        throw new Error('Input must contain an "entities" array');
      }
      
      const results = [];
      
      input.entities.forEach(entity => {
        const result = processEntity(entity, outputDir);
        results.push(result);
      });
      
      console.log(JSON.stringify({
        success: true,
        generated: results,
        outputDirectory: outputDir
      }, null, 2));
      
    } catch (error) {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
      process.exit(1);
    }
  }
}

main();