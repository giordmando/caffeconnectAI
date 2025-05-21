// src/services/retrieval/utils/DocumentProcessor.ts
import { IDocument } from '../../interfaces/IDocument';

export class DocumentProcessor {
  // Divide un documento lungo in chunk più piccoli
  static chunkDocument(doc: IDocument, maxChunkSize: number = 500): IDocument[] {
    const content = doc.content;
    if (content.length <= maxChunkSize) {
      return [doc];
    }
    
    // Divide il testo in frasi
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    // Raggruppa le frasi in chunk
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentence;
      }
    }
    
    // Aggiungi l'ultimo chunk se non è vuoto
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    // Crea un documento per ogni chunk
    return chunks.map((chunk, index) => ({
      id: `${doc.id}-chunk-${index}`,
      content: chunk,
      metadata: {
        ...doc.metadata,
        parentId: doc.id,
        chunkIndex: index,
        totalChunks: chunks.length
      }
    }));
  }
  
  // Crea documenti da testo semplice
  static createDocumentsFromText(text: string, metadata: Record<string, any> = {}): IDocument[] {
    const doc: IDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content: text,
      metadata
    };
    
    return this.chunkDocument(doc);
  }
  
  // In futuro, puoi aggiungere metodi per caricare documenti da file, URL, ecc.
}