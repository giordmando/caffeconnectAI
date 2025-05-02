// src/services/ai/AIProviderRegistry.ts
import { IAIProvider } from './interfaces/IAIProvider';
import { AIProviderConfig } from '../../types/AIProvider';
import { MockAIProvider } from './providers/MockAIProvider';

type AIProviderFactoryType = (config: AIProviderConfig) => IAIProvider;

/**
 * Registry per i provider AI
 * Permette la registrazione dinamica di nuovi provider
 */
export class AIProviderRegistry {
  private static instance: AIProviderRegistry;
  private providerFactories: Map<string, AIProviderFactoryType> = new Map();
  
  private constructor() {
    // Registra il provider mock di default
    this.registerProvider('mockai', (config) => new MockAIProvider(config));
  }
  
  /**
   * Ottiene l'istanza singleton
   */
  public static getInstance(): AIProviderRegistry {
    if (!AIProviderRegistry.instance) {
      AIProviderRegistry.instance = new AIProviderRegistry();
    }
    return AIProviderRegistry.instance;
  }
  
  /**
   * Registra un nuovo provider AI
   * @param providerId Identificativo del provider
   * @param factory Factory function per creare istanze del provider
   */
  public registerProvider(providerId: string, factory: AIProviderFactoryType): void {
    this.providerFactories.set(providerId.toLowerCase(), factory);
    console.log(`AI Provider registered: ${providerId}`);
  }
  
  /**
   * Crea un'istanza di un provider AI
   * @param providerId Identificativo del provider
   * @param config Configurazione del provider
   * @returns Istanza del provider AI
   */
  public createProvider(providerId: string, config: AIProviderConfig): IAIProvider {
    const factory = this.providerFactories.get(providerId.toLowerCase());
    
    if (!factory) {
      console.warn(`Provider ${providerId} not found, using MockAI as fallback`);
      return new MockAIProvider(config);
    }
    
    return factory(config);
  }
  
  /**
   * Verifica se un provider è registrato
   * @param providerId Identificativo del provider
   * @returns true se il provider è registrato
   */
  public hasProvider(providerId: string): boolean {
    return this.providerFactories.has(providerId.toLowerCase());
  }
  
  /**
   * Ottiene tutti gli ID dei provider registrati
   * @returns Array di ID dei provider
   */
  public getRegisteredProviders(): string[] {
    return Array.from(this.providerFactories.keys());
  }
}

// Esporta l'istanza singleton
export const aiProviderRegistry = AIProviderRegistry.getInstance();

// Esempio di registrazione di provider aggiuntivi:
// (Questi dovrebbero essere implementati in moduli separati e registrati all'avvio dell'app)

// import { OpenAIProvider } from './providers/OpenAIProvider';
// aiProviderRegistry.registerProvider('openai', (config) => new OpenAIProvider(config));

// import { ClaudeProvider } from './providers/ClaudeProvider';
// aiProviderRegistry.registerProvider('claude', (config) => new ClaudeProvider(config));

// Aggiorniamo la factory per utilizzare il registry
export class AIProviderFactory {
  /**
   * Crea un provider AI basato sul tipo e la configurazione
   * @param type Tipo di provider
   * @param config Configurazione del provider
   * @returns Istanza del provider AI
   */
  static createProvider(type: string, config: AIProviderConfig): IAIProvider {
    return aiProviderRegistry.createProvider(type, config);
  }
}