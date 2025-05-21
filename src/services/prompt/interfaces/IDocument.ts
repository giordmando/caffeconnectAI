export interface IDocument {
    id: string;
    content: string;
    metadata: Record<string, any>;
    embedding?: number[];
  }