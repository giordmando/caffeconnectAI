// src/services/analytics/interfaces/INLPService.ts

export interface INLPAnalysisResult {
    intents: string[];
    topics: string[];
    sentiment: number;
    entities: Array<{
      text: string;
      type: string;
      confidence: number;
    }>;
  }
  
  export interface INLPService {
    analyzeText(text: string): Promise<INLPAnalysisResult>;
  }