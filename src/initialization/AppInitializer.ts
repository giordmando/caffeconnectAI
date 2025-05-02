// src/initialization/AppInitializer.ts
import { configManager } from '../config/ConfigManager';
import { aiProviderRegistry } from '../services/ai/AIProviderRegistry';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { catalogService } from '../services/catalog/CatalogService';
import { themeService } from '../services/theme/ThemeService';
import { userContextService } from '../services/user/UserContextService';
import { registerOpenAIProvider } from '../services/ai/providers/registerOpenAI';

// Importazioni opzionali per provider AI
// import { OpenAIProvider } from '../services/ai/providers/OpenAIProvider';
// import { ClaudeProvider } from '../services/ai/providers/ClaudeProvider';

/**
 * Classe per inizializzare l'applicazione in modo ordinato
 */
export class AppInitializer {
  private static instance: AppInitializer;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  
  private constructor() {}
  
  /**
   * Ottiene l'istanza singleton
   */
  public static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }
  
  /**
   * Inizializza l'applicazione
   * @param configUrl URL della configurazione remota (opzionale)
   */
  public async initialize(configUrl?: string): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      console.log('App already initialized or initializing');
      return;
    }
    
    this.isInitializing = true;
    console.log('Starting application initialization...');
    
    try {
      // Fase 1: Carica configurazione
      if (configUrl) {
        await configManager.loadConfig(configUrl);
      } else {
        console.log('Using default configuration');
      }
      
      // Fase 2: Registra provider AI
      this.registerAIProviders();
      
      // Fase 3: Inizializza registro funzioni
      functionRegistry.setisInitialized(false);
      await functionRegistry.initialize();
      
      const functionsConfig = configManager.getSection('functions');
      if (functionsConfig.functionDataEndpoints) {
        functionRegistry.setFunctionDataEndpoints(functionsConfig.functionDataEndpoints);
      }
  
      // Fase 4: Inizializza catalogo
      await catalogService.initialize();
      
      // Fase 5: Inizializza tema
      // (Già fatto nel costruttore del ThemeService)
      
      // Fase 6: Inizializza contesto utente
      // (Già fatto nel costruttore del UserContextService)
      
      this.isInitialized = true;
      this.isInitializing = false;
      console.log('Application initialization complete');
    } catch (error) {
      this.isInitializing = false;
      console.error('Error during application initialization:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se l'applicazione è inizializzata
   */
  public isAppInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Registra provider AI disponibili
   */
  private registerAIProviders(): void {
    // Già registrato il MockAIProvider in AIProviderRegistry
    // Registra il provider OpenAI
    registerOpenAIProvider();
    // Registra provider AI aggiuntivi
    // Qui andrebbero registrati i provider personalizzati
    
    // Esempio:
    // aiProviderRegistry.registerProvider('openai', (config) => new OpenAIProvider(config));
    // aiProviderRegistry.registerProvider('claude', (config) => new ClaudeProvider(config));
    
    console.log('AI providers registered');
  }
  
  /**
   * Reinizializza l'applicazione (dopo cambio configurazione)
   */
  public async reinitialize(): Promise<void> {
    this.isInitialized = false;
    
    // Reinizializzazione completa
    await this.initialize();
    
    console.log('Application reinitialized');
  }
}

// Esporta l'istanza singleton
export const appInitializer = AppInitializer.getInstance();