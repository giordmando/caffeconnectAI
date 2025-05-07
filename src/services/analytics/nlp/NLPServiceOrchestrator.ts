// src/services/analytics/NLPServiceOrchestrator.ts

import { INLPService, AnalysisType, AnalysisResult, NLPProviderOptions } from './interfaces/INLPService';
import { INLPProviderAdapter } from './interfaces/INLPProviderAdapter';

export class NLPServiceOrchestrator implements INLPService {
  private providers: Map<string, INLPProviderAdapter> = new Map();
  private defaultProvider: string | null = null;
  private cachedResults: Map<string, {result: any, timestamp: number}> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minuti
  
  constructor() {}
  
  async analyzeText(text: string, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    // Verifica cache se abilitata
    const useCaching = options?.cache !== false;
    if (useCaching) {
      const cacheKey = this.getCacheKey(text, options);
      const cached = this.cachedResults.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
        return cached.result;
      }
    }
    
    const provider = this.getProviderForOptions(options);
    if (!provider) {
      throw new Error('No suitable NLP provider available');
    }
    
    try {
      const result = await provider.analyzeText(text, options);
      
      // Salva in cache se abilitata
      if (useCaching) {
        const cacheKey = this.getCacheKey(text, options);
        this.cachedResults.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error in ${provider.getName()} analysis:`, error);
      
      // Tenta con provider fallback se disponibile
      if (options?.fallback && options.fallback !== provider.getName()) {
        const fallbackProvider = this.providers.get(options.fallback);
        if (fallbackProvider) {
          console.log(`Trying fallback provider: ${fallbackProvider.getName()}`);
          return fallbackProvider.analyzeText(text, options);
        }
      }
      
      // Restituisci risultato vuoto in caso di errore
      return this.getEmptyResult();
    }
  }
  
  async analyzeConversation(messages: Array<{role: string, content: string}>, options?: NLPProviderOptions): Promise<Record<AnalysisType, AnalysisResult[]>> {
    const provider = this.getProviderForOptions(options);
    if (!provider) {
      throw new Error('No suitable NLP provider available');
    }
    
    try {
      return await provider.analyzeConversation(messages, options);
    } catch (error) {
      console.error(`Error in ${provider.getName()} conversation analysis:`, error);
      
      // Fallback: analizza solo l'ultimo messaggio
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        return this.analyzeText(lastMessage.content, options);
      }
      
      return this.getEmptyResult();
    }
  }
  
  registerProvider(provider: INLPProviderAdapter): void {
    this.providers.set(provider.name, provider);
    
    // Se è il primo provider, imposta come default
    if (!this.defaultProvider) {
      this.defaultProvider = provider.name;
    }
    
    // Inizializza il provider
    provider.initialize().catch(err => {
      console.error(`Error initializing ${provider.name}:`, err);
    });
  }
  
  setDefaultProvider(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Provider ${providerName} not registered`);
    }
    this.defaultProvider = providerName;
  }
  
  configure(options: Record<string, any>): void {
    if (options.cacheTTL) {
      this.cacheTTL = options.cacheTTL;
    }
    
    // Altri parametri di configurazione
  }
  
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
  
  getSupportedFeatures(): AnalysisType[] {
    // Unione di tutte le caratteristiche supportate dai provider
    const features = new Set<AnalysisType>();
    
    this.providers.forEach(provider => {
      provider.getSupportedAnalysisTypes().forEach(feature => {
        features.add(feature);
      });
    });
    
    return Array.from(features);
  }
  
  private getProviderForOptions(options?: NLPProviderOptions): INLPProviderAdapter | null {
    // Se è specificato un provider
    if (options?.provider && this.providers.has(options.provider)) {
      return this.providers.get(options.provider)!;
    }
    
    // Altrimenti usa il provider predefinito
    if (this.defaultProvider && this.providers.has(this.defaultProvider)) {
      return this.providers.get(this.defaultProvider)!;
    }
    
    // Se non ci sono provider, restituisci null
    return null;
  }
  
  private getCacheKey(text: string, options?: NLPProviderOptions): string {
    // Crea una chiave unica per la cache
    const provider = options?.provider || this.defaultProvider;
    const analysisTypes = options?.analysisTypes?.join(',') || 'all';
    return `${provider}:${analysisTypes}:${text.substring(0, 100)}`;
  }
  
  private getEmptyResult(): Record<AnalysisType, AnalysisResult[]> {
    const result: Record<AnalysisType, AnalysisResult[]> = {} as Record<AnalysisType, AnalysisResult[]>;
    
    Object.values(AnalysisType).forEach(type => {
      result[type] = [];
    });
    
    return result;
  }
}