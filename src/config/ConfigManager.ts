/**
 * Interfaccia per la configurazione dell'applicazione
 */
export interface AppConfig {
  // Configurazione business
  business: {
    name: string;
    type: 'cafe' | 'restaurant' | 'bar' | 'store' | 'hybrid';
    indirizzo?: string;
    telefono?: string;  
    email?: string;
    orari?: string;
    socialMedia?: { 
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        };  
    website?: string;   
    privacyPolicy?: string;
    termsOfService?: string;
    cookiePolicy?: string;
    logo: string;
    theme: {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
    };
  };
  
  // Configurazione AI
  ai: {
    defaultProvider: string;
    providers: Record<string, {
      displayName: string;
      models: Array<{
        id: string;
        name: string;
      }>;
      defaultModel: string;
    }>;
    systemPrompt: string;
    enableAdvancedFunctionSupport: boolean; // Nuova proprietà
  };
  
  // Configurazione menu/prodotti
  catalog: {
    menuEndpoint?: string;
    productsEndpoint?: string;
    enableLocalData: boolean;
    dataRefreshInterval: number; // in minuti
    categories: Array<{
      id: string;
      name: string;
      icon: string;
    }>;
    timeBasedMenus: {
      morning: string[];
      afternoon: string[];
      evening: string[];
    };
  };
  
  // Configurazione funzioni
  functions: {
    enabledFunctions: string[];
    customFunctionEndpoint?: string;
    functionDataEndpoints: Record<string, string> | undefined;
  };
  
  // Configurazione UI
  ui: {
    enableSuggestions: boolean;
    enableDynamicComponents: boolean;
    showSidebar: boolean;
    maxRecommendations: number;
    welcomeMessage: string;
  };
}

/**
 * Gestore della configurazione dell'applicazione
 * Implementa il pattern Singleton per accesso globale
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private isLoaded: boolean = false;
  
  private constructor(initialConfig?: Partial<AppConfig>) {
    this.config = this.mergeWithDefault(initialConfig || {});
  }
  
  public static getInstance(initialConfig?: Partial<AppConfig>): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(initialConfig);
    }
    return ConfigManager.instance;
  }
  
  /**
   * Carica la configurazione da un endpoint remoto
   * @param configUrl URL dell'endpoint di configurazione
   */
  public async loadConfig(configUrl: string): Promise<void> {
    try {
      const response = await fetch(configUrl);
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
      }
      
      const loadedConfig = await response.json();
      this.config = this.mergeWithDefault(loadedConfig);
      this.isLoaded = true;
      console.log('Configuration loaded successfully');
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Usa la configurazione di default in caso di errore
      this.config = this.getDefaultConfig();
      this.isLoaded = true;
    }
  }
  
  /**
   * Carica la configurazione da un oggetto locale
   * @param config Oggetto di configurazione
   */
  public loadLocalConfig(config: Partial<AppConfig>): void {
    this.config = this.mergeWithDefault(config);
    this.isLoaded = true;
    console.log('Local configuration loaded successfully');
  }
  
  /**
   * Ottiene la configurazione completa
   */
  public getConfig(): AppConfig {
    if (!this.isLoaded) {
      console.warn('Configuration not loaded yet, using default configuration');
    }
    return this.config;
  }
  
  /**
   * Ottiene una sezione specifica della configurazione
   * @param section Nome della sezione
   */
  public getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return this.config[section];
  }
  
  /**
   * Aggiorna una parte della configurazione
   * @param section Nome della sezione
   * @param data Nuovi dati
   */
  public updateSection<K extends keyof AppConfig>(section: K, data: Partial<AppConfig[K]>): void {
    this.config[section] = { ...this.config[section], ...data };
  }
  
  /**
   * Unisce la configurazione caricata con quella di default
   * @param loadedConfig Configurazione caricata
   */
  private mergeWithDefault(loadedConfig: Partial<AppConfig>): AppConfig {
    const defaultConfig = this.getDefaultConfig();
    
    // Unisci ricorsivamente gli oggetti
    return this.deepMerge(defaultConfig, loadedConfig) as AppConfig;
  }
  
  /**
   * Esegue un deep merge di due oggetti
   * @param target Oggetto target
   * @param source Oggetto source
   */
  private deepMerge(target: any, source: any): any {
    if (!source) return target;
    
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
    
    function isObject(item: any): boolean {
      return (item && typeof item === 'object' && !Array.isArray(item));
    }
  }
  
  /**
   * Ottiene la configurazione di default
   */
  private getDefaultConfig(): AppConfig {
    return {
      business: {
        name: 'CaféConnect',
        type: 'cafe',
        logo: '/logo.svg',
        indirizzo: 'Via Roma 123, Milano',
        telefono: '+39 02 1234567', 
        email: '',
        orari: 'Lun-Dom 8:00-20:00',
        socialMedia: {
          facebook: 'https://facebook.com/cafeconnect',
          instagram: 'https://instagram.com/cafeconnect',
          twitter: 'https://twitter.com/cafeconnect',
          linkedin: 'https://linkedin.com/company/cafeconnect'
        },
        website: 'https://cafeconnect.com',
        privacyPolicy: 'https://cafeconnect.com/privacy',
        termsOfService: 'https://cafeconnect.com/terms',
        cookiePolicy: 'https://cafeconnect.com/cookies',
        theme: {
          primaryColor: '#2a4365',
          secondaryColor: '#ed8936',
          backgroundColor: '#f7fafc',
          textColor: '#2d3748'
        }
      },
      ai: {
        defaultProvider: 'mockai',
        providers: {
          mockai: {
            displayName: 'Mock AI',
            models: [
              { id: 'mockai-sim', name: 'Mock AI simulate' }
            ],
            defaultModel: 'mockai-sim'
          },
          openai: {
            displayName: 'OpenAI',
            models: [
              { id: 'gpt-4', name: 'GPT-4' },
              { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
              { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
            ],
            defaultModel: 'gpt-3.5-turbo'
          },
          claude: {
            displayName: 'Claude',
            models: [
              { id: 'claude-3-opus', name: 'Claude 3 Opus' },
              { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
              { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
            ],
            defaultModel: 'claude-3-haiku'
          }
        },
        systemPrompt: `
Sei un assistente AI per {business.name}, un {business.type} di qualità.
Il tuo obiettivo è aiutare i clienti con raccomandazioni personalizzate, informazioni e supporto.

LINEE GUIDA:
1. Sii conversazionale, cordiale e conciso (max 2-3 frasi per risposta).
2. Basa le raccomandazioni sulle preferenze dell'utente, la storia degli ordini e il momento della giornata.
3. Suggerisci sempre articoli specifici dal nostro menu attuale o prodotti acquistabili.
4. Non inventare prodotti non presenti nelle nostre liste.
5. Adatta il tono in base al contesto: informale per chat casual, più formale per supporto.
6. Se l'utente chiede informazioni sui punti fedeltà o preferenze, usa le funzioni appropriate.
7. Se ritieni che una funzione possa fornire informazioni utili, chiamala proattivamente.

Il nostro menu e i prodotti cambiano durante la giornata, quindi fai attenzione al contesto temporale.
`,
enableAdvancedFunctionSupport: true // Nuova proprietà
      },
      catalog: {
        enableLocalData: true,
        dataRefreshInterval: 60,
        categories: [
          { id: 'beverage', name: 'Bevande', icon: '☕' },
          { id: 'food', name: 'Cibo', icon: '🍽️' },
          { id: 'product', name: 'Prodotti', icon: '🛒' }
        ],
        timeBasedMenus: {
          morning: ['coffee', 'pastry', 'breakfast'],
          afternoon: ['lunch', 'sandwich', 'salad'],
          evening: ['aperitivo', 'wine', 'cocktail']
        }
      },
      functions: {
        enabledFunctions: [
          'get_user_loyalty_points',
          'get_user_preferences',
          'get_menu_recommendations',
          'get_product_recommendations',
          'track_user_action'
        ],
        functionDataEndpoints: {}
     
      },
      ui: {
        enableSuggestions: true,
        enableDynamicComponents: true,
        showSidebar: true,
        maxRecommendations: 3,
        welcomeMessage: 'Benvenuto a {business.name}! Come posso aiutarti oggi?'
      }
    };
  }
}

// Esporta l'istanza singleton
export const configManager = ConfigManager.getInstance();

// Funzione di utilità per sostituire i segnaposto nella configurazione
export function interpolateConfig(text: string, config: AppConfig): string {
  return text.replace(/\{([^}]+)\}/g, (match, path) => {
    const parts = path.split('.');
    let value: any = config;
    
    for (const part of parts) {
      if (value && value[part] !== undefined) {
        value = value[part];
      } else {
        return match; // Mantieni il segnaposto originale se il percorso non esiste
      }
    }
    
    return String(value);
  });
}