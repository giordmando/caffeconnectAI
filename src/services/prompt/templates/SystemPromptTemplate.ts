import { IPromptTemplate } from '../interfaces/IPromptTemplate';

export class SystemPromptTemplate implements IPromptTemplate {
  private id: string;
  
  constructor(private template: string, id: string) {
    this.id = id;
  }
  
  getId(): string {
    return this.id;
  }
  
  renderPrompt(context: any): string {
    return this.template.replace(/\{([^}]+)\}/g, (match, key) => {
      const keys = key.split('.');
      let value = context;
      
      for (const k of keys) {
        if (value === undefined || value === null) return match;
        value = value[k];
      }
      
      return value !== undefined ? String(value) : match;
    });
  }
}