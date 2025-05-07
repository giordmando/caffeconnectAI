// src/services/analytics/nlp/NLPConfiguration.ts

import { NLPServiceOrchestrator } from './NLPServiceOrchestrator';
import { OpenAIAdapter } from './adapters/OpenAIAdapter';
import { VADERAdapter } from './adapters/VADERAdapter';
import { configManager } from '../../../config/ConfigManager';

export class NLPConfiguration {
  private static instance: NLPConfiguration;
  private orchestrator: NLPServiceOrchestrator;
  private isInitialized: boolean = false;
  
  private constructor() {
    this.orchestrator = new NLPServiceOrchestrator();
  }
  
  public static getInstance(): NLPConfiguration {
    if (!NLPConfiguration.instance) {
      NLPConfiguration.instance = new NLPConfiguration();
    }
    return NLPConfiguration.instance;
  }
  
  public getOrchestrator(): NLPServiceOrchestrator {
    if (!this.isInitialized) {
      console.warn('NLP configuration not initialized. Call initialize() first');
    }
    return this.orchestrator;
  }
  
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('NLP configuration already initialized');
      return;
    }
    
    try {
      // Carica la configurazione NLP dalle impostazioni globali
      const aiConfig = configManager.getSection('ai');
      
      // Registra gli adattatori NLP disponibili
      
      // 1. Registra OpenAI se disponibile
      if (aiConfig.providers.openai) {
        const openaiAdapter = new OpenAIAdapter();
        // Inizializza con la stessa API key del provider AI
        await openaiAdapter.initialize({
          apiKey: localStorage.getItem('cafeconnect-ai-config') ? 
            JSON.parse(localStorage.getItem('cafeconnect-ai-config') || '{}').config?.apiKey : 
            '',
          /*customModels: {
            [AnalysisType.SENTIMENT]: aiConfig.providers.openai.models[0].name || 'gpt-3.5-turbo'
            }*/
        });
        this.orchestrator.registerProvider(openaiAdapter);
        console.log('Registered OpenAI NLP provider');
      }
      
      // 2. Registra VADER (sempre disponibile, è locale)
      const vaderAdapter = new VADERAdapter();
      await vaderAdapter.initialize();
      this.orchestrator.registerProvider(vaderAdapter);
      console.log('Registered VADER NLP provider');
      
      // Configura l'orchestratore
      this.orchestrator.configure({
        cacheTTL: 30 * 60 * 1000, // 30 minuti di cache
      });
      
      // Imposta provider predefinito
      // Se è disponibile OpenAI, usalo come default, altrimenti usa VADER
      if (aiConfig.providers.openai) {
        this.orchestrator.setDefaultProvider('OpenAI');
      } else {
        this.orchestrator.setDefaultProvider('VADER');
      }
      
      this.isInitialized = true;
      console.log('NLP configuration initialized successfully');
    } catch (error) {
      console.error('Error initializing NLP configuration:', error);
      throw error;
    }
  }
}

// Esporta l'istanza singleton
export const nlpConfiguration = NLPConfiguration.getInstance();