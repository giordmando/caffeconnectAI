// src/initialization/AppInitializer.ts
import { configManager } from '../config/ConfigManager';
import { aiProviderRegistry } from '../services/ai/AIProviderRegistry';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { catalogService } from '../services/catalog/CatalogService';
import { themeService } from '../services/theme/ThemeService';
import { registerComponents } from '../components/ui/registry/ComponentRegistration';

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

      // NUOVO: Controlla se esistono configurazioni utente in localStorage
      try {
        const savedAIConfig = localStorage.getItem('cafeconnect-ai-config');
        if (savedAIConfig) {
          const config = JSON.parse(savedAIConfig);
          // Aggiorna la sezione AI nella configurazione globale
          configManager.updateSection('ai', {
            defaultProvider: config.provider
          });
          console.log('Applied user AI configuration from localStorage');
        }
      } catch (e) {
        console.error('Error applying localStorage AI config:', e);
      }

      // Ottieni configurazioni
      const businessConfig = configManager.getSection('business');
      // Fase 3: Inizializza registro funzioni
      functionRegistry.setisInitialized(false);
      await functionRegistry.initialize();
      
      const functionsConfig = configManager.getSection('functions');
      if (functionsConfig.functionDataEndpoints) {
        functionRegistry.setFunctionDataEndpoints(functionsConfig.functionDataEndpoints);
      }
  
      // Fase 4: Inizializza catalogo
      await catalogService.initialize();

    // Crea un provider AI dedicato per suggerimenti e azioni
    const aiProvider = aiProviderRegistry.getRegisteredProviders()[0];
    if (!aiProvider) {  
      throw new Error('No AI provider registered');
    }
  
      // Fase 5: Inizializza tema
      themeService.applyTheme({
        primaryColor: businessConfig.theme.primaryColor,
        secondaryColor: businessConfig.theme.secondaryColor,
        bgColor: businessConfig.theme.backgroundColor,
        textColor: businessConfig.theme.textColor
      });
      
      // Fase 6: Registra componenti UI
      registerComponents();
      
      this.isInitialized = true;
      this.isInitializing = false;
      console.log('Application initialization complete');
      
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