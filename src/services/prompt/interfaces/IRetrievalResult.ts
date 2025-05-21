import { IDocument } from "./IDocument";

export interface IRetrievalResult {
    document: IDocument;
    score: number;
  }
