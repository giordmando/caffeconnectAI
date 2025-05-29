
import { AppConfig } from "./interfaces/IAppConfig";
import { IConfigManager } from "./interfaces/IConfigManager";


/**
 * Gestore della configurazione dell'applicazione * Implementa il pattern Singleton per accesso globale
 */
export class ConfigManager implements IConfigManager {
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

  public async initialize(configUrl?: string): Promise<void> {
    if (this.isLoaded && !configUrl) { // Evita reinizializzazione se già caricato e non c'è URL
        console.log('ConfigManager already initialized with local/default config.');
        return;
    }
    if (configUrl) {
      await this.loadConfig(configUrl);
    } else {
      // Prova a caricare da localStorage come fallback prima dei default assoluti
      this.loadFromLocalStorageOrDefaults();
    }
    this.isLoaded = true; // Segna come caricato dopo il tentativo
  }

  private loadFromLocalStorageOrDefaults(): void {
    try {
        const storedConfig = localStorage.getItem('cafeconnect-app-config');
        if (storedConfig) {
            console.log('Loading configuration from localStorage.');
            this.config = this.mergeWithDefault(JSON.parse(storedConfig));
            this.isLoaded = true;
            return;
        }
    } catch (error) {
        console.warn('Failed to load configuration from localStorage, using defaults.', error);
    }
    console.log('No remote URL and no localStorage config found, using default application configuration.');
    this.config = this.getDefaultConfig();
    this.isLoaded = true;
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
      this.saveToLocalStorage(); // Salva la configurazione caricata remotamente
      console.log('Remote configuration loaded and saved to localStorage successfully');
    } catch (error) {
      console.error('Error loading remote configuration:', error);
      // Fallback: prova localStorage, poi default
      this.loadFromLocalStorageOrDefaults();
    }
  }

  /**
   * Carica la configurazione da un oggetto locale
   * @param config Oggetto di configurazione
   */
  public loadLocalConfig(config: Partial<AppConfig>): void {
    this.config = this.mergeWithDefault(config);
    this.isLoaded = true;
    this.saveToLocalStorage();
    console.log('Local configuration object loaded and saved to localStorage successfully');
  }

  /**
   * Salva la configurazione corrente nel localStorage
   */
  private saveToLocalStorage(): void {
    try {
        localStorage.setItem('cafeconnect-app-config', JSON.stringify(this.config));
        console.log('Configuration saved to localStorage.');
    } catch (error) {
        console.error('Error saving configuration to localStorage:', error);
    }
  }

  /**
   * Ottiene la configurazione completa
   */
  public getConfig(): AppConfig {
    if (!this.isLoaded) {
      // Questo non dovrebbe accadere se initialize() è chiamato correttamente
      console.warn('ConfigManager.getConfig() called before initialization. Returning defaults.');
      return this.getDefaultConfig(); // Ritorna i default se non ancora caricato
    }
    return this.config;
  }

  /**
   * Ottiene una sezione specifica della configurazione
   * @param section Nome della sezione
   */
  public getSection<K extends keyof AppConfig>(section: K): AppConfig[K] {
    return this.getConfig()[section];
  }

  /**
   * Aggiorna una parte della configurazione
   * @param section Nome della sezione
   * @param data Nuovi dati
   */
  public updateSection<K extends keyof AppConfig>(section: K, data: Partial<AppConfig[K]>): void {
    // Assicurati che la sezione esista prima di tentare di unirla
    const currentSection = this.config[section] || {};
    this.config[section] = this.deepMerge(currentSection, data) as AppConfig[K];
    this.saveToLocalStorage(); // Salva dopo ogni aggiornamento
    console.log(`Configuration section '${section}' updated and saved.`);
  }

  /**
   * Unisce la configurazione caricata con quella di default
   * @param loadedConfig Configurazione caricata
   */
  private mergeWithDefault(loadedConfig: Partial<AppConfig>): AppConfig {
    const defaultConfig = this.getDefaultConfig();
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
          if (!(key in target) || !isObject(target[key])) { // Modificato per gestire casi in cui target[key] non è un oggetto
            output[key] = source[key]; // Sovrascrivi se il tipo non corrisponde o la chiave non esiste
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    } else if (isObject(source)) { // Se target non è un oggetto ma source lo è, prendi source
        return { ...source };
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
    const defaultProviderId = 'mockai';

    const allProviderDetails: AppConfig['ai']['providers'] = {
        mockai: {
            displayName: 'Mock AI',
            models: [{ id: 'mockai-sim', name: 'Mock AI (Simulato)' }],
            defaultModel: 'mockai-sim',
            requiresApiKey: false,
        },
        openai: {
            displayName: 'OpenAI',
            models: [
              { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
              { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
              { id: 'gpt-4', name: 'GPT-4' },
              { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
            ],
            defaultModel: 'gpt-3.5-turbo',
            requiresApiKey: true,
        },
    };

    const activeProviderDefaultModel = allProviderDetails[defaultProviderId]?.defaultModel || 'unknown-model';

    return {
      business: {
        name: 'CaféConnect',
        type: 'cafe',
        logo: '/logo.svg',
        indirizzo: 'Via Roma 123, Milano',
        telefono: '+39 02 1234567',
        email: 'info@cafeconnect.example.com',
        orari: 'Lun-Dom 8:00-20:00',
        socialMedia: {
          facebook: 'https://facebook.com/cafeconnect',
          instagram: 'https://instagram.com/cafeconnect',
          twitter: 'https://twitter.com/cafeconnect',
          linkedin: 'https://linkedin.com/company/cafeconnect'
        },
        website: 'https://cafeconnect.example.com',
        privacyPolicy: 'https://cafeconnect.example.com/privacy',
        termsOfService: 'https://cafeconnect.example.com/terms',
        cookiePolicy: 'https://cafeconnect.example.com/cookies',
        theme: {
          primaryColor: '#2a4365',
          secondaryColor: '#ed8936',
          backgroundColor: '#f7fafc',
          textColor: '#2d3748'
        }
      },
      ai: {
        defaultProvider: defaultProviderId,
        activeProvider: defaultProviderId,
        activeModel: activeProviderDefaultModel,
        apiKey: '',
        activeOptions: {
          enableAdvancedFunctionSupport: true,
          useMockFunctions: defaultProviderId === 'mockai',
        },
        providers: allProviderDetails,
        systemPrompt: `Sei un assistente AI per {business.name}, un {business.type}. Aiuta i clienti con informazioni e raccomandazioni.`,
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
          'track_user_action',
          'search_product_by_name',
          'view_item_details'
        ],
        functionDataEndpoints: {}
      },
      ui: {
        enableSuggestions: true,
        enableDynamicComponents: true,
        enableNLP: true,
        showSidebar: true,
        maxRecommendations: 3,
        welcomeMessage: 'Benvenuto a {business.name}! Come posso aiutarti oggi?'
      },
      privacy: {
        enabled: true,
        bannerTitle: 'Preferenze privacy',
        bannerMessage: 'Utilizziamo i dati di conversazione per migliorare il nostro assistente AI. Scegli il livello di condivisione dati che preferisci:',
        additionalInfo: 'Con "Tutto" ci aiuti a personalizzare meglio le risposte in base alle tue preferenze.',
        policyLink: '',
        consentLabels: {
          minimal: 'Solo essenziali',
          functional: 'Funzionali',
          analytics: 'Tutto (consigliato)'
        },
        consentDescriptions: {
          minimal: 'Raccogliamo solo i dati essenziali per il funzionamento dell\'app.',
          functional: 'Permette di memorizzare le conversazioni per migliorare l\'esperienza.',
          analytics: 'Ci permette di analizzare le conversazioni per personalizzare le risposte.'
        }
      },
      knowledgeBase: [
        {
          key: "caffè qualità",
          facts: [
            "Il nostro caffè viene da piantagioni sostenibili in Etiopia e Colombia.",
            "Abbiamo diverse varietà di caffè, tra cui Arabica, Robusta e miscele speciali.",
            "Il caffè più venduto è l'Arabica Specialty Etiopia Yirgacheffe."
          ],
          scope: "global"
        },
        {
          key: "menu variazioni",
          facts: [
            "Il nostro menu varia durante la giornata: colazione (generalmente dalle 7 alle 12), pranzo (dalle 12 alle 18), aperitivo (dalle 18 alle 22).",
            "Offriamo prodotti da forno freschi ogni giorno.",
            "Tutti gli ingredienti sono selezionati da fornitori locali quando possibile."
          ],
          scope: "global"
        }
      ]
    };
  }
}

// Esporta l'istanza singleton
export const configManager = ConfigManager.getInstance();

// Funzione di utilità per sostituire i segnaposto nella configurazione
export function interpolateConfig(text: string, config: AppConfig): string {
  if (!text) return '';
  return text.replace(/\{([^}]+)\}/g, (match, path) => {
    const parts = path.split('.');
    let value: any = config;

    for (const part of parts) {
      if (value && typeof value === 'object' && value[part] !== undefined) {
        value = value[part];
      } else {
        return match; // Mantieni il segnaposto originale se il percorso non esiste
      }
    }
    return String(value);
  });
}
