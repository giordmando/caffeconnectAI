// src/config/interfaces/IAppConfig.ts

// Definizione per la configurazione specifica della UI della Chat
export interface ChatConfig {
  welcomeMessage?: string;
  showSidebar?: boolean;
  enableSuggestions?: boolean;
  enableDynamicComponents?: boolean;
  enableNLP?: boolean;
  maxRecommendations?: number;
}

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
      whatsappBusiness?: string;
      orderEmail?: string;
      ecommerceUrl?: string;
      orderWebhook?: string;
    };

    // Configurazione AI
    ai: {
      defaultProvider: string;
      activeProvider: string;
      activeModel: string;
      apiKey: string;
      activeOptions: {
        enableAdvancedFunctionSupport: boolean;
        useMockFunctions: boolean;
        [key: string]: any;
      };
      providers: Record<string, {
        displayName: string;
        models: Array<{
          id: string;
          name: string;
        }>;
        defaultModel: string;
        requiresApiKey: boolean;
      }>;
      systemPrompt: string;
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

    // Configurazione UI - Usa ChatConfig per le opzioni specifiche della chat
    ui: ChatConfig & { // Estende ChatConfig per includere altre opzioni UI generali se necessario
        // Qui potrebbero andare altre opzioni UI non specifiche della chat
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

    knowledgeBase?: Array<{
      key: string;
      facts: string[];
      scope?: 'global' | 'product' | 'category';
      itemId?: string;
    }>;
  }
