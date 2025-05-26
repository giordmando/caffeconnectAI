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
      enableNLP: true, // Abilita l'NLP di default
      showSidebar: boolean;
      maxRecommendations: number;
      welcomeMessage: string;
    };
  
    privacy: {
      enabled: boolean;
      bannerTitle: string;
      bannerMessage: string;
      additionalInfo: string;
      policyLink: string;
      consentLabels: {
        minimal: string;
        functional: string;
        analytics: string;
      };
      consentDescriptions: {
        minimal: string;
        functional: string;
        analytics: string;
      };
    };

    knowledgeBase?: Array<{ // NUOVA SEZIONE
      key: string;          // Parola chiave o frase per attivare questa conoscenza
      facts: string[];      // Lista di fatti o risposte predefinite
      scope?: 'global' | 'product' | 'category'; // Opzionale: per contestualizzare meglio
      itemId?: string;      // Opzionale: se il fatto è specifico per un item
    }>;
  }