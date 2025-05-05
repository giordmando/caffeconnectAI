import { aiProviderRegistry } from './AIProviderRegistry';
import { IAIProvider } from './interfaces/IAIProvider';
import { AIProviderConfig } from '../../types/AIProvider';

export class AIProviderFactory {
  /**
   * Crea un provider AI basato sul tipo e la configurazione
   * Utilizza il registry per la creazione effettiva
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