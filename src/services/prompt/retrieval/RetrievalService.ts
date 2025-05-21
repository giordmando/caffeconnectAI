import { IDocument } from "../interfaces/IDocument";
import { IVectorStore } from "../interfaces/IVectorStore";

export class RetrievalService {
  private static instance: RetrievalService;
  private vectorStore: IVectorStore | null = null;
  private initialized: boolean = false;
  
  private constructor() {}
  
  public static getInstance(): RetrievalService {
    if (!RetrievalService.instance) {
      RetrievalService.instance = new RetrievalService();
    }
    return RetrievalService.instance;
  }
  
  setVectorStore(store: IVectorStore): void {
    this.vectorStore = store;
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.vectorStore) {
      await this.vectorStore.initialize();
    }
    
    this.initialized = true;
    console.log('RetrievalService initialized');
  }
  
  async addDocuments(documents: IDocument[]): Promise<void> {
    if (!this.vectorStore) {
      console.warn('No vector store configured');
      return;
    }
    
    await this.vectorStore.addDocuments(documents);
  }
  
  async query(query: string, options: { limit?: number } = {}): Promise<any[]> {
    if (!this.vectorStore) {
      console.warn('No vector store configured');
      return [];
    }
    
    try {
      const results = await this.vectorStore.search(query, options.limit || 5);
      
      // Trasforma i risultati in un formato più utile
      return results.map(result => ({
        content: result.document.content,
        source: result.document.metadata.source || 'Unknown',
        score: result.score
      }));
    } catch (error) {
      console.error('Error querying vector store:', error);
      return [];
    }
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const retrievalService = RetrievalService.getInstance();