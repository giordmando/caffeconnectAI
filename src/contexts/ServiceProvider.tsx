import React, { createContext, useContext, useState, useEffect } from 'react';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { IUserContextService } from '../services/user/interfaces/IUserContextService';
import { ISuggestionService } from '../services/action/interfaces/ISuggestionService';
import { ICatalogService } from '../services/catalog/interfaces/ICatalogService';
import { IFunctionService } from '../services/function/interfaces/IFunctionService';
import { IConsentService } from '../services/analytics/interfaces/IConsentService';
import { IConfigManager } from '../config/interfaces/IConfigManager';
import { IThemeService } from '../services/theme/interfaces/IThemeService'; 
import { IActionService } from '../services/action/interfaces/IActionService';
import { IAnalyticsService } from '../services/analytics/interfaces/IAnalyticsService';

// Importazioni delle implementazioni concrete (solo per inizializzazione);
import { userContextService } from '../services/user/UserContextService';
import { FunctionRegistry } from '../services/function/FunctionRegistry';
import { catalogService } from '../services/catalog/CatalogService';
import { SimpleConsentService } from '../services/analytics/SimpleConsentService';
import { AnalyticsService } from '../services/analytics/AnalyticsService';
import { NLPIntegrationService, nlpIntegrationService } from '../services/analytics/nlp/NLPIntegrationService';
import { configManager } from '../config/ConfigManager';
import { themeService } from '../services/theme/ThemeService';
import { AIProviderConfig } from '../types/AIProvider';
import { AIServiceFactory } from '../services/ai/AIServiceFactory';

// Definizione dell'interfaccia per tutti i servizi - Con interfacce invece di implementazioni concrete
export interface AppServices {
  // Servizi principali
  aiService: IAIService;
  userService: IUserContextService;
  suggestionService: ISuggestionService;
  catalogService: ICatalogService;
  functionRegistry: IFunctionService;
  themeService: IThemeService;
  actionService: IActionService;
  
  // Servizi analitici
  consentService: IConsentService;
  nlpService: NLPIntegrationService;
  analyticsService: IAnalyticsService;
  
  // Configurazione
  configManager: IConfigManager;
  
  // Valori e metodi esposti al contesto
  isInitialized: boolean;
  initializationError: string | null;
  currentProvider: string;
  changeAIProvider: (provider: string, config: AIProviderConfig) => void;
  reloadServices: () => Promise<void>;
}

// Creazione del contesto
const ServiceContext = createContext<AppServices | undefined>(undefined);

/**
 * Provider per tutti i servizi dell'applicazione
 * Centralizza l'accesso ai servizi e gestisce l'inizializzazione
 */
export const ServiceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Stato di inizializzazione
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string>('initializing...');
  
  // Creazione delle istanze dei servizi di base
  const consentService = new SimpleConsentService();
  
  // Istanze dei servizi 
  // Nota: qui usiamo le implementazioni concrete solo per l'inizializzazione,
  // ma esponiamo solo le interfacce attraverso il context
  const [services, setServices] = useState<{
    aiService: IAIService;
    userService: IUserContextService;
    suggestionService: ISuggestionService;
    actionService: IActionService;
    catalogService: ICatalogService;
    functionRegistry: IFunctionService;
    themeService: IThemeService;
    consentService: IConsentService;
    nlpService: NLPIntegrationService;
    analyticsService: IAnalyticsService;
    configManager: IConfigManager;
  }>(() => {
    // Creiamo le dipendenze in sequenza per assicurarci che vengano inizializzate correttamente
    const consentServiceInstance = consentService as IConsentService;
    const analyticsServiceInstance = new AnalyticsService(consentServiceInstance) as IAnalyticsService;
    const functionRegistryInstance = FunctionRegistry.getInstance() as IFunctionService;
    const userServiceInstance = userContextService as IUserContextService;
    const catalogServiceInstance = catalogService as ICatalogService;
    const themeServiceInstance = themeService as IThemeService;
    const configManagerInstance = configManager as IConfigManager;
    
    // Inizializzazione del provider AI - gestione separata necessaria per configurare correttamente
    // Per ora inizializziamo con un'istanza vuota, sarà valorizzata correttamente in initializeServices
    const aiServiceInstance = {} as IAIService;
    
    // Creiamo servizi che dipendono da altri servizi
    // Per ora li inizializziamo vuoti, saranno valorizzati correttamente in initializeServices
    const suggestionServiceInstance = {} as ISuggestionService;
    const actionServiceInstance = {} as IActionService;
    
    return {
      aiService: aiServiceInstance,
      userService: userServiceInstance,
      suggestionService: suggestionServiceInstance,
      actionService: actionServiceInstance,
      catalogService: catalogServiceInstance,
      functionRegistry: functionRegistryInstance,
      themeService: themeServiceInstance,
      consentService: consentServiceInstance,
      nlpService: nlpIntegrationService,
      analyticsService: analyticsServiceInstance,
      configManager: configManagerInstance
    };
  });

  // Cambia provider AI
  const changeAIProvider = (provider: string, config: AIProviderConfig) => {
    try {
      // Logica esistente per cambiare provider...
      services.aiService.changeProvider(provider, config);
      setCurrentProvider(provider);
    } catch (error) {
      console.error('Errore nel cambio provider:', error);
    }
  };
  
  // Funzione per inizializzare tutti i servizi
  const initializeServices = async () => {
    try {
      console.log('Inizializzazione dei servizi in corso...');
      setIsInitialized(false);
      setInitializationError(null);
      
      // 1. Carica prima la configurazione
      await (services.configManager as any).initialize(); // Cast temporaneo fino a quando IConfigManager non è completo
      
      // 2. Inizializza i servizi di base in parallelo
      await Promise.all([
        services.themeService.initialize(),
        services.functionRegistry.initialize(),
        //services.consentService.initialize()
      ]);
      
      // 3. Inizializza i servizi analitici
      await services.analyticsService.initialize();
      
      try {
        await services.nlpService.initialize();
        console.log('NLP Service initialized successfully');
      } catch (nlpError) {
        console.warn('NLP Service initialization failed, continuing without NLP:', nlpError);
        // Non bloccare l'inizializzazione se NLP fallisce
      }
      
     
      // Recupera la configurazione AI
      const aiConfig = services.configManager.getSection('ai');
      

      // 4. Carica configurazione da localStorage o usa default
      let savedConfig = getSavedConfig(aiConfig);
      // Crea provider specifici per il business type
      const businessType = services.configManager.getSection('business').type;

      const { aiService, suggestionService, actionService } = AIServiceFactory.createAIService({
        provider: savedConfig.provider,
        providerConfig: savedConfig.config,
        functionService: services.functionRegistry,
        catalogService: services.catalogService,
        businessType: businessType,
        configManager: services.configManager
      });
      
      // 6. Aggiorna lo stato con i nuovi servizi
      setServices(prevServices => {
        const updatedServices = {
          ...prevServices,
          aiService,
          suggestionService, // Aggiorna suggestionService
          actionService     // Aggiorna actionService
        };
        return updatedServices;
      });
  
      setCurrentProvider(savedConfig.provider);
      
      console.log('Tutti i servizi inizializzati con successo');
      setIsInitialized(true);
    } catch (error) {
      console.error('Errore durante l\'inizializzazione dei servizi:', error);
      setInitializationError(error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };
  
  // Funzione di supporto per ottenere la configurazione salvata
function getSavedConfig(aiConfig: any) {
  try {
    const configString = localStorage.getItem('cafeconnect-ai-config');
    return configString ? JSON.parse(configString) : {
      provider: aiConfig.defaultProvider,
      config: {
        apiKey: '',
        model: aiConfig.providers[aiConfig.defaultProvider].defaultModel,
        options: {
          enableAdvancedFunctionSupport: aiConfig.enableAdvancedFunctionSupport || false,
          useMockFunctions: false
        }
      }
    };
  } catch (error) {
    console.warn('Error loading AI config from localStorage, using defaults:', error);
    return {
      provider: aiConfig.defaultProvider,
      config: {
        apiKey: '',
        model: aiConfig.providers[aiConfig.defaultProvider].defaultModel,
        options: {
          enableAdvancedFunctionSupport: aiConfig.enableAdvancedFunctionSupport || false,
          useMockFunctions: false
        }
      }
    };
  }
}

  // Funzione per ricaricare i servizi (utile dopo cambiamenti nella configurazione)
  const reloadServices = async () => {
    await initializeServices();
  };
  
  // Inizializza i servizi al primo caricamento
  useEffect(() => {
    initializeServices();
    
    // Cleanup all'unmount
    return () => {
      // Chiusura pulita dei servizi
      try {
        (services.analyticsService as any).dispose?.();
        (services.nlpService as any).dispose?.();
      } catch (error) {
        console.error('Error during service cleanup:', error);
      }
    };
  }, []);
  
  // Crea il valore del contesto
  const contextValue: AppServices = {
    ...services,
    isInitialized,
    initializationError,
    currentProvider,
    changeAIProvider,
    reloadServices
  };
  
  return (
    <ServiceContext.Provider value={contextValue}>
      {isInitialized ? children : <div>Loading services...</div>}
    </ServiceContext.Provider>
  );
};

// Hook per utilizzare il contesto dei servizi
export const useServices = (): AppServices => {
  const context = useContext(ServiceContext);
  
  if (context === undefined) {
    throw new Error('useServices deve essere utilizzato all\'interno di un ServiceProvider');
  }
  
  return context;
};

// Hook per accedere a un singolo servizio specifico
export function useService<K extends keyof AppServices>(serviceName: K): AppServices[K] {
  const services = useServices();
  return services[serviceName];
}

// Esporta anche servizi individuali per casi speciali
export const useAIService = () => useService('aiService');
export const useUserService = () => useService('userService');
export const useCatalogService = () => useService('catalogService');
export const useThemeService = () => useService('themeService');
export const useConfigManager = () => useService('configManager');