#!/usr/bin/env node

const fs = require('fs');

// TypeScript interface generator
class TypeScriptGenerator {
  constructor() {
    this.interfaces = [];
    this.interfaceNames = new Set();
  }

  // Convert JSON Schema type to TypeScript type
  convertType(schema, name = null) {
    if (!schema) return 'any';

    // Handle references
    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return this.capitalizeFirst(refName);
    }

    // Handle arrays
    if (schema.type === 'array') {
      if (schema.items) {
        const itemType = this.convertType(schema.items);
        return `${itemType}[]`;
      }
      return 'any[]';
    }

    // Handle objects
    if (schema.type === 'object' || schema.properties) {
      if (name) {
        return this.generateInterface(schema, name);
      } else {
        // Inline object
        return this.generateInlineObject(schema);
      }
    }

    // Handle enums
    if (schema.enum) {
      return schema.enum.map(val => typeof val === 'string' ? `"${val}"` : val).join(' | ');
    }

    // Handle unions/anyOf/oneOf
    if (schema.anyOf || schema.oneOf) {
      const schemas = schema.anyOf || schema.oneOf;
      return schemas.map(s => this.convertType(s)).join(' | ');
    }

    // Handle allOf (intersection types)
    if (schema.allOf) {
      return schema.allOf.map(s => this.convertType(s)).join(' & ');
    }

    // Basic types
    switch (schema.type) {
      case 'string':
        if (schema.format === 'date-time' || schema.format === 'date') {
          return 'Date';
        }
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      default:
        return 'any';
    }
  }

  // Generate inline object type
  generateInlineObject(schema) {
    if (!schema.properties) return '{}';

    const properties = Object.entries(schema.properties).map(([key, prop]) => {
      const isOptional = !schema.required?.includes(key);
      const propType = this.convertType(prop);
      return `  ${key}${isOptional ? '?' : ''}: ${propType};`;
    }).join('\n');

    return `{\n${properties}\n}`;
  }

  // Generate named interface
  generateInterface(schema, name) {
    const interfaceName = this.capitalizeFirst(name);
    
    if (this.interfaceNames.has(interfaceName)) {
      return interfaceName; // Already generated
    }

    this.interfaceNames.add(interfaceName);

    if (!schema.properties) {
      this.interfaces.push(`export interface ${interfaceName} {}`);
      return interfaceName;
    }

    const properties = Object.entries(schema.properties).map(([key, prop]) => {
      const isOptional = !schema.required?.includes(key);
      
      // Handle nested objects
      let propType;
      if ((prop.type === 'object' || prop.properties) && !prop.enum) {
        const nestedName = this.capitalizeFirst(key);
        propType = this.generateInterface(prop, nestedName);
      } else if (prop.type === 'array' && prop.items && (prop.items.type === 'object' || prop.items.properties)) {
        const itemName = this.capitalizeFirst(key.endsWith('s') ? key.slice(0, -1) : key + 'Item');
        const itemType = this.generateInterface(prop.items, itemName);
        propType = `${itemType}[]`;
      } else {
        propType = this.convertType(prop);
      }

      const description = prop.description ? ` // ${prop.description}` : '';
      return `  ${key}${isOptional ? '?' : ''}: ${propType};${description}`;
    }).join('\n');

    const description = schema.description ? `/**\n * ${schema.description}\n */\n` : '';
    const interfaceCode = `${description}export interface ${interfaceName} {\n${properties}\n}`;
    
    this.interfaces.push(interfaceCode);
    return interfaceName;
  }

  // Capitalize first letter
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Generate all TypeScript code
  generate(schema, rootName = 'Generated') {
    this.interfaces = [];
    this.interfaceNames.clear();

    // Generate root interface
    this.generateInterface(schema, rootName);

    // Combine all interfaces
    const typescript = this.interfaces.join('\n\n');
    const interfaceList = Array.from(this.interfaceNames);

    return {
      typescript,
      interfaces: interfaceList
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
      const { schema, interfaceName = 'Generated' } = input;
      
      if (!schema) {
        throw new Error('schema is required');
      }
      
      if (typeof schema !== 'object') {
        throw new Error('schema must be a valid JSON Schema object');
      }
      
      const generator = new TypeScriptGenerator();
      const result = generator.generate(schema, interfaceName);
      
      console.log(JSON.stringify({
        success: true,
        typescript: result.typescript,
        interfaces: result.interfaces,
        rootInterface: interfaceName
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