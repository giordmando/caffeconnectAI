// src/services/analytics/interfaces/INLPProviderAdapter.ts

import { AnalysisType, AnalysisResult, NLPProviderOptions } from './INLPService';

export interface INLPProviderAdapter {
  name: string;
  version: string;
  
  // Capacità
  getSupportedAnalysisTypes(): AnalysisType[];
  getSupportedLanguages(): string[];
  
  // Operazioni fondamentali
  initialize(options?: NLPProviderOptions): Promise<void>;
  analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>>;
  analyzeConversation(messages: Array<{role: string, content: string}>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>>;
  
  // Metadati
  getCredits(): number;
  getName(): string;
  requiresAPIKey(): boolean;
  isOnline(): boolean;
}