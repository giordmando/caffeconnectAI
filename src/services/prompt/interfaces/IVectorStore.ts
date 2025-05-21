import { IDocument } from "./IDocument";
import { IRetrievalResult } from "./IRetrievalResult";

export interface IVectorStore {
    addDocuments(documents: IDocument[]): Promise<void>;
    search(query: string, limit?: number): Promise<IRetrievalResult[]>;
    initialize(): Promise<void>;
  }