import { IPromptProvider } from '../interfaces/IPromptProvider';

export class StaticProvider implements IPromptProvider {
  private knowledgeBase: Record<string, string[]> = {};
  
  constructor(knowledgeBase?: Record<string, string[]>) {
    if (knowledgeBase) {
      this.knowledgeBase = knowledgeBase;
    }
  }
  
  getName(): string {
    return 'static';
  }
  
  async initialize(): Promise<void> {
    console.log('StaticProvider initialized');
  }
  
  addKnowledge(key: string, content: string[]): void {
    this.knowledgeBase[key] = content;
  }
  
  async retrieveContent(query: string, context: any): Promise<string[]> {
    // Cerca corrispondenze esatte nel knowledge base
    for (const [key, content] of Object.entries(this.knowledgeBase)) {
      if (query.toLowerCase().includes(key.toLowerCase())) {
        return content;
      }
    }
    
    // Fallback: restituisce un array vuoto
    return [];
  }
}
