import { IEmbeddingService } from '../interfaces/IEmbeddingService';

export class DummyEmbeddingService implements IEmbeddingService {
  async initialize(): Promise<void> {
    console.log('DummyEmbeddingService initialized');
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Genera un vettore casuale di dimensione 10
    return Array.from({ length: 10 }, () => Math.random());
  }
}