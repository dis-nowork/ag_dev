#!/usr/bin/env node

const fs = require('fs');

// Form generator
class FormGenerator {
  constructor(framework = 'html') {
    this.framework = framework;
    this.fieldCount = 0;
  }

  // Determine input type from schema
  getInputType(property) {
    if (property.enum) return 'select';
    if (property.type === 'boolean') return 'checkbox';
    if (property.type === 'number' || property.type === 'integer') return 'number';
    if (property.type === 'string') {
      switch (property.format) {
        case 'email': return 'email';
        case 'password': return 'password';
        case 'date': return 'date';
        case 'date-time': return 'datetime-local';
        case 'uri': case 'url': return 'url';
        case 'tel': return 'tel';
        default:
          // Long text gets textarea
          if (property.maxLength > 100 || property.description?.toLowerCase().includes('description')) {
            return 'textarea';
          }
          return 'text';
      }
    }
    return 'text';
  }

  // Get field label
  getLabel(key, property) {
    return property.title || property.description || 
           key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  // Generate HTML form field
  generateHtmlField(key, property, required = false) {
    const inputType = this.getInputType(property);
    const label = this.getLabel(key, property);
    const requiredAttr = required ? ' required' : '';
    const placeholder = property.example || property.description || '';
    
    this.fieldCount++;

    let fieldHtml = `    <div class="field-group">
      <label for="${key}">${label}${required ? ' *' : ''}</label>`;

    switch (inputType) {
      case 'textarea':
        fieldHtml += `
      <textarea 
        id="${key}" 
        name="${key}"${requiredAttr}
        placeholder="${placeholder}"
        rows="4"${property.maxLength ? ` maxlength="${property.maxLength}"` : ''}
      ></textarea>`;
        break;

      case 'select':
        fieldHtml += `
      <select id="${key}" name="${key}"${requiredAttr}>
        <option value="">Choose...</option>`;
        property.enum.forEach(option => {
          fieldHtml += `
        <option value="${option}">${option}</option>`;
        });
        fieldHtml += `
      </select>`;
        break;

      case 'checkbox':
        fieldHtml += `
      <input 
        type="checkbox" 
        id="${key}" 
        name="${key}"
        value="true"
      />`;
        break;

      case 'number':
        fieldHtml += `
      <input 
        type="number" 
        id="${key}" 
        name="${key}"${requiredAttr}
        placeholder="${placeholder}"${property.minimum ? ` min="${property.minimum}"` : ''}${property.maximum ? ` max="${property.maximum}"` : ''}${property.multipleOf ? ` step="${property.multipleOf}"` : ''}
      />`;
        break;

      default:
        fieldHtml += `
      <input 
        type="${inputType}" 
        id="${key}" 
        name="${key}"${requiredAttr}
        placeholder="${placeholder}"${property.maxLength ? ` maxlength="${property.maxLength}"` : ''}${property.minLength ? ` minlength="${property.minLength}"` : ''}${property.pattern ? ` pattern="${property.pattern}"` : ''}
      />`;
    }

    if (property.description && property.description !== placeholder) {
      fieldHtml += `
      <small class="field-help">${property.description}</small>`;
    }

    fieldHtml += `
    </div>`;

    return fieldHtml;
  }

  // Generate React form field
  generateReactField(key, property, required = false) {
    const inputType = this.getInputType(property);
    const label = this.getLabel(key, property);
    const placeholder = property.example || property.description || '';
    
    this.fieldCount++;

    let fieldJsx = `      <div className="field-group">
        <label htmlFor="${key}">${label}${required ? ' *' : ''}</label>`;

    switch (inputType) {
      case 'textarea':
        fieldJsx += `
        <textarea
          id="${key}"
          name="${key}"
          required={${required}}
          placeholder="${placeholder}"
          rows={4}${property.maxLength ? `\n          maxLength={${property.maxLength}}` : ''}
          value={formData.${key} || ''}
          onChange={(e) => setFormData({...formData, ${key}: e.target.value})}
        />`;
        break;

      case 'select':
        fieldJsx += `
        <select 
          id="${key}" 
          name="${key}"
          required={${required}}
          value={formData.${key} || ''}
          onChange={(e) => setFormData({...formData, ${key}: e.target.value})}
        >
          <option value="">Choose...</option>`;
        property.enum.forEach(option => {
          fieldJsx += `
          <option value="${option}">${option}</option>`;
        });
        fieldJsx += `
        </select>`;
        break;

      case 'checkbox':
        fieldJsx += `
        <input
          type="checkbox"
          id="${key}"
          name="${key}"
          checked={formData.${key} || false}
          onChange={(e) => setFormData({...formData, ${key}: e.target.checked})}
        />`;
        break;

      case 'number':
        fieldJsx += `
        <input
          type="number"
          id="${key}"
          name="${key}"
          required={${required}}
          placeholder="${placeholder}"${property.minimum ? `\n          min={${property.minimum}}` : ''}${property.maximum ? `\n          max={${property.maximum}}` : ''}${property.multipleOf ? `\n          step={${property.multipleOf}}` : ''}
          value={formData.${key} || ''}
          onChange={(e) => setFormData({...formData, ${key}: parseFloat(e.target.value)})}
        />`;
        break;

      default:
        fieldJsx += `
        <input
          type="${inputType}"
          id="${key}"
          name="${key}"
          required={${required}}
          placeholder="${placeholder}"${property.maxLength ? `\n          maxLength={${property.maxLength}}` : ''}${property.minLength ? `\n          minLength={${property.minLength}}` : ''}${property.pattern ? `\n          pattern="${property.pattern}"` : ''}
          value={formData.${key} || ''}
          onChange={(e) => setFormData({...formData, ${key}: e.target.value})}
        />`;
    }

    if (property.description && property.description !== placeholder) {
      fieldJsx += `
        <small className="field-help">${property.description}</small>`;
    }

    fieldJsx += `
      </div>`;

    return fieldJsx;
  }

  // Generate HTML form
  generateHtmlForm(schema, formName = 'generated-form') {
    const { properties = {}, required = [] } = schema;
    
    let fields = '';
    Object.entries(properties).forEach(([key, property]) => {
      fields += this.generateHtmlField(key, property, required.includes(key)) + '\n';
    });

    const css = `<style>
.form-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.field-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

input, textarea, select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.field-help {
  display: block;
  margin-top: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.submit-btn {
  background: #007acc;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.submit-btn:hover {
  background: #005a9e;
}
</style>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formName}</title>
  ${css}
</head>
<body>
  <div class="form-container">
    <form id="${formName}" onsubmit="handleSubmit(event)">
      <h2>${formName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
${fields}
      <button type="submit" class="submit-btn">Submit</button>
    </form>
  </div>

  <script>
    function handleSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());
      console.log('Form data:', data);
      alert('Form submitted! Check console for data.');
    }
  </script>
</body>
</html>`;

    return html;
  }

  // Generate React component
  generateReactComponent(schema, componentName = 'GeneratedForm') {
    const { properties = {}, required = [] } = schema;
    
    let fields = '';
    Object.entries(properties).forEach(([key, property]) => {
      fields += this.generateReactField(key, property, required.includes(key)) + '\n';
    });

    const component = `import React, { useState } from 'react';
import './Form.css'; // You'll need to create this CSS file

const ${componentName} = ({ onSubmit }) => {
  const [formData, setFormData] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    } else {
      console.log('Form data:', formData);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <h2>${componentName.replace(/([A-Z])/g, ' $1').trim()}</h2>
${fields}
        <button type="submit" className="submit-btn">
          Submit
        </button>
      </form>
    </div>
  );
};

export default ${componentName};`;

    return component;
  }

  // Main generation method
  generate(schema, formName = 'GeneratedForm') {
    this.fieldCount = 0;
    
    if (this.framework === 'react') {
      return this.generateReactComponent(schema, formName);
    } else {
      return this.generateHtmlForm(schema, formName);
    }
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
      const { schema, framework = 'html', formName = 'GeneratedForm' } = input;
      
      if (!schema) {
        throw new Error('schema is required');
      }
      
      if (!['html', 'react'].includes(framework)) {
        throw new Error('framework must be one of: html, react');
      }
      
      if (!schema.properties) {
        throw new Error('schema must have properties defined');
      }
      
      const generator = new FormGenerator(framework);
      const code = generator.generate(schema, formName);
      
      console.log(JSON.stringify({
        success: true,
        code,
        fields: generator.fieldCount,
        framework,
        formName
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