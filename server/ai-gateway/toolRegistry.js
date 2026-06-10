const { createCatalogTools } = require('./tools/catalogTools');
const { createKnowledgeTools } = require('./tools/knowledgeTools');

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!tool || !tool.name || typeof tool.execute !== 'function') {
      throw new Error('Invalid tool registration');
    }
    this.tools.set(tool.name, tool);
  }

  registerMany(tools) {
    tools.forEach(tool => this.register(tool));
  }

  list() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  asOpenAITools() {
    return this.list().map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error('Unknown tool: ' + name);
    return tool.execute(args || {});
  }
}

function createDefaultToolRegistry(config = {}) {
  const registry = new ToolRegistry();
  registry.registerMany(createCatalogTools());
  registry.registerMany(createKnowledgeTools(config));
  return registry;
}

module.exports = { ToolRegistry, createDefaultToolRegistry };
