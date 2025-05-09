// src/services/analytics/nlp/NLPConfiguration.ts

import { NLPServiceOrchestrator } from './NLPServiceOrchestrator';
import { configManager } from '../../../config/ConfigManager';
import { NLPProviderFactory } from './factories/NLPProviderFactory';

export class NLPConfiguration {
  private static instance: NLPConfiguration;
  private orchestrator: NLPServiceOrchestrator;
  private isInitialized: boolean = false;
  private providerFactory: NLPProviderFactory;
  
  private constructor() {
    this.orchestrator = new NLPServiceOrchestrator();
    this.providerFactory = new NLPProviderFactory();
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
      
      // Utilizza il factory per creare i provider
      if (aiConfig.providers.openai) {
        const openAIConfig = {
          apiKey: localStorage.getItem('cafeconnect-ai-config') ? 
            JSON.parse(localStorage.getItem('cafeconnect-ai-config') || '{}').config?.apiKey : 
            ''
        };
        
        const openaiAdapter = await this.providerFactory.createProvider('OpenAI', openAIConfig);
        this.orchestrator.registerProvider(openaiAdapter);
        console.log('Registered OpenAI NLP provider');
      }
      
      // VADER è sempre disponibile
      const vaderAdapter = await this.providerFactory.createProvider('VADER');
      this.orchestrator.registerProvider(vaderAdapter);
      console.log('Registered VADER NLP provider');
      
      // Configura l'orchestratore
      this.orchestrator.configure({
        cacheTTL: 30 * 60 * 1000, // 30 minuti di cache
      });
      
      // Imposta provider predefinito
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