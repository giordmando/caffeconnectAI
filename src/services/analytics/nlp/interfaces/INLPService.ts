// src/services/analytics/interfaces/INLPService.ts

import { INLPBasicProvider } from "./INLPBasicProvider";

export enum AnalysisType {
    INTENT = 'intent',
    SENTIMENT = 'sentiment',
    ENTITY = 'entity',
    KEYWORD = 'keyword',
    TOPIC = 'topic',
    LANGUAGE = 'language'
  }
  
  export interface AnalysisResult {
    // Struttura generica per i risultati di analisi
    [key: string]: any;
    confidence?: number;
  }
  
  export interface NLPProviderOptions {
    apiKey?: string;
    endpoint?: string;
    timeout?: number;
    language?: string;
    analysisTypes?: AnalysisType[];
    maxRetries?: number;
    cache?: boolean;
    customModels?: Record<AnalysisType, string>;
    fallback?: string;
    provider?: string;
  }
  
  export interface INLPService {
    // Metodi principali semplificati
    analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>>;
    analyzeConversation(messages: Array<{role: string, content: string}>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>>;
    
    // Registrazione e gestione provider
    registerProvider(provider: INLPProvider): void;
    setDefaultProvider(providerName: string): void;
    
    // Configurazione
    configure(options: Record<string, any>): void;
    getAvailableProviders(): string[];
    getSupportedFeatures(): AnalysisType[];
  }

  // Esempio di nuova struttura delle interfacce
export interface INLPProvider extends INLPBasicProvider, IConversationAnalyzer {
  // Capacità base
  getSupportedAnalysisTypes(): AnalysisType[];
  
  // Operazione fondamentale
  initialize(options?: NLPProviderOptions): Promise<void>;
  analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>>;
}

// Interfacce opzionali per funzionalità aggiuntive
export interface IConversationAnalyzer {
  analyzeConversation(messages: Array<{role: string, content: string}>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>>;
}