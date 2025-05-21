import { IPromptTemplate } from '../interfaces/IPromptTemplate';

export class ActionPromptTemplate implements IPromptTemplate {
  private id: string;
  
  constructor(private template: string, id: string) {
    this.id = id;
  }
  
  getId(): string {
    return this.id;
  }
  
  renderPrompt(context: any): string {
    // Template specializzato per generare azioni e suggerimenti
    let renderedPrompt = this.template.replace(/\{([^}]+)\}/g, (match, key) => {
      const keys = key.split('.');
      let value = context;
      
      for (const k of keys) {
        if (value === undefined || value === null) return match;
        value = value[k];
      }
      
      if (key === 'menuItems' && Array.isArray(value)) {
        return value.map((item: any) => `- ${item.name}`).join('\n');
      }
      
      if (key === 'products' && Array.isArray(value)) {
        return value.map((product: any) => `- ${product.name}`).join('\n');
      }
      
      return value !== undefined ? String(value) : match;
    });
    
    return renderedPrompt;
  }
}