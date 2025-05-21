import { IPromptProvider } from '../interfaces/IPromptProvider';
import { retrievalService } from '../retrieval/RetrievalService';


export class VectorDBProvider implements IPromptProvider {
  private initialized: boolean = false;
  
  constructor(private config: any = {}) {}
  
  getName(): string {
    return 'vectordb';
  }
  
  async initialize(): Promise<void> {
    if (!this.initialized) {
      // La vera inizializzazione avverrà quando implementerai RAG
      console.log('VectorDBProvider: initialization placeholder');
      this.initialized = true;
    }
  }
  
  async retrieveContent(query: string, context: any): Promise<string[]> {
    // In futuro, interrogherà il retrieval service
    console.log('VectorDBProvider: retrieval placeholder for query:', query);
    
    try {
      // Qui in futuro userai il vero retrievalService
      const results = await retrievalService.query(query, {
        limit: context.limit || 5
      });
      
      return results.map(result => `Fonte: ${result.source || 'Sconosciuta'}\n${result.content}`);
    } catch (error) {
      console.error('Error retrieving content:', error);
      return [];
    }
  }
}