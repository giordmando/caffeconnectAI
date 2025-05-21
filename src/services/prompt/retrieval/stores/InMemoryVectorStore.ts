import { IDocument } from "../../interfaces/IDocument";
import { IRetrievalResult } from "../../interfaces/IRetrievalResult";
import { IVectorStore } from "../../interfaces/IVectorStore";

// Da sostituire con una vera implementazione quando implementerai RAG
export class InMemoryVectorStore implements IVectorStore {
  private documents: IDocument[] = [];
  
  async initialize(): Promise<void> {
    console.log('InMemoryVectorStore initialized');
  }
  
  async addDocuments(documents: IDocument[]): Promise<void> {
    this.documents.push(...documents);
    console.log(`Added ${documents.length} documents, total: ${this.documents.length}`);
  }
  
  async search(query: string, limit: number = 5): Promise<IRetrievalResult[]> {
    // Ricerca semplice basata su keyword
    const keywords = query.toLowerCase().split(' ');
    
    // Calcola un punteggio semplice in base a quante keyword sono presenti
    const scoredDocs = this.documents.map(doc => {
      const content = doc.content.toLowerCase();
      let score = 0;
      
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          score += 1;
        }
      }
      
      return {
        document: doc,
        score: score / keywords.length
      };
    });
    
    // Filtra i documenti con punteggio > 0 e ordina per punteggio decrescente
    return scoredDocs
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}