// {{name}} Controller
// TODO: Replace with your actual data store (database, etc.)
const {{name}}s = new Map();
let nextId = 1;

class {{name}}Controller {
  
  // Get all {{name}}s
  static async getAll() {
    return Array.from({{name}}s.values());
  }

  // Get {{name}} by ID
  static async getById(id) {
    return {{name}}s.get(id);
  }

  // Create new {{name}}
  static async create({{name}}Data) {
    const {{name}} = {
      id: nextId++,
      ...{{name}}Data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    {{name}}s.set({{name}}.id, {{name}});
    return {{name}};
  }

  // Update {{name}}
  static async update(id, {{name}}Data) {
    const existing{{name}} = {{name}}s.get(parseInt(id));
    if (!existing{{name}}) {
      return null;
    }

    const updated{{name}} = {
      ...existing{{name}},
      ...{{name}}Data,
      updatedAt: new Date().toISOString()
    };

    {{name}}s.set(parseInt(id), updated{{name}});
    return updated{{name}};
  }

  // Delete {{name}}
  static async delete(id) {
    return {{name}}s.delete(parseInt(id));
  }
}

module.exports = {{name}}Controller;