// src/services/ai/AIProviderFactory.ts
import { AIProviderConfig } from '../../types/AIProvider';
import { IAIProvider } from './interfaces/IAIProvider';
import { aiProviderRegistry } from './AIProviderRegistry';

export class AIProviderFactory {
  /**
   * Crea un provider AI basato sul tipo e la configurazione
   */
  static createProvider(type: string, config: AIProviderConfig): IAIProvider {
    return aiProviderRegistry.createProvider(type, config);
  }
  
  /**
   * Registra un nuovo provider nel registry
   */
  static registerProvider(type: string, factoryFn: (config: AIProviderConfig) => IAIProvider): void {
    aiProviderRegistry.registerProvider(type, factoryFn);
  }
}