import { IPromptTemplate } from '../interfaces/IPromptTemplate';

export class FunctionPromptTemplate implements IPromptTemplate {
  private id: string;
  
  constructor(private template: string, id: string) {
    this.id = id;
  }
  
  getId(): string {
    return this.id;
  }
  
  renderPrompt(context: any): string {
    // Gestisce la formattazione speciale per definizioni di funzioni
    let renderedPrompt = this.template.replace(/\{([^}]+)\}/g, (match, key) => {
      const keys = key.split('.');
      let value = context;
      
      for (const k of keys) {
        if (value === undefined || value === null) return match;
        value = value[k];
      }
      
      if (key === 'availableFunctions' && Array.isArray(value)) {
        return value.map((fn: any) => `- ${fn.name}: ${fn.description}`).join('\n');
      }
      
      if (key === 'preferences' && Array.isArray(value)) {
        return value.map((p: any) => `${p.itemType}:${p.itemId} (rating: ${p.rating})`).join(', ');
      }
      
      return value !== undefined ? String(value) : match;
    });
    
    return renderedPrompt;
  }
}
