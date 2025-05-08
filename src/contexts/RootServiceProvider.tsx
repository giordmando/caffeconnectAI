import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AIServiceProvider, useAIService } from './AIServiceProvider';
import { AnalyticsServiceProvider, useAnalytics } from './AnalyticsServiceProvider';
import { CatalogServiceProvider, useCatalog } from './CatalogServiceProvider';
import { ThemeService } from '../services/theme/ThemeService';
import { configManager } from '../config/ConfigManager';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { SuggestionServiceFactory } from '../services/action/SuggestionServiceFactory';
import { ActionServiceFactory } from '../services/action/ActionServiceFactory';
import { userContextService } from '../services/user/UserContextService';
import AppInitializer from '../initialization/AppInitializer';
import LoadingScreen from '../components/LoadingScreen';
import { ICatalogService } from '../services/catalog/interfaces/ICatalogService';
import { IAIProvider } from '../services/ai/interfaces/IAIProvider';
import { IAIService } from '../services/ai/interfaces/IAIService';

// Tipo per il contesto radice
interface RootServiceContextType {
  isInitialized: boolean;
  initializationError: string | null;
  reloadServices: () => Promise<void>;
  themeService: ThemeService;
  configManager: typeof configManager;
  functionRegistry: typeof functionRegistry;
  userContextService: typeof userContextService;
  // Aggiungi questi servizi
  suggestionService: any;
  actionService: any;
}

// Creazione del contesto
const RootServiceContext = createContext<RootServiceContextType | undefined>(undefined);

// Provider radice che coordina tutti gli altri provider
export const RootServiceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Stati per l'inizializzazione
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [serviceInstances, setServiceInstances] = useState<{
    suggestionService: any;
    actionService: any;
    aiProvider: any;
    catalog: any;
  } | null>(null);

  
  // Riferimenti per i servizi
  const themeService = useRef(ThemeService.getInstance());

  // Inizializzazione principale
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(10);
        
        // 1. Inizializza la configurazione
        await configManager.initialize();
        setLoadingProgress(20);
        
        // 2. Inizializza i servizi base non dipendenti
        await Promise.all([
          themeService.current.initialize(),
          functionRegistry.initialize()
        ]);
        setLoadingProgress(40);

        // 3. Applica il tema dalla configurazione
        const businessConfig = configManager.getSection('business');
        themeService.current.applyTheme({
          primaryColor: businessConfig.theme.primaryColor,
          secondaryColor: businessConfig.theme.secondaryColor,
          bgColor: businessConfig.theme.backgroundColor,
          textColor: businessConfig.theme.textColor
        });
        setLoadingProgress(60);

        // 4. Prepara servizi che saranno necessari per altri provider
        // Risolviamo le dipendenze circolari usando un approccio in due fasi:
        // Prima creiamo i servizi con dipendenze fittizie
        const businessType = businessConfig.type;
        
        // Questi servizi verranno poi aggiornati dai provider con le istanze reali
        const catalog = {} as ICatalogService; // Cast esplicito al tipo ICatalogService
        const aiProvider = {} as IAIProvider; // Cast esplicito al tipo IAIProvider

        // Crea i servizi di suggerimento e azione con placeholder
        const suggestionService = SuggestionServiceFactory.createService(
          businessType,
          catalog, 
          functionRegistry,
          aiProvider
        );
        
        const actionService = ActionServiceFactory.createService(
          businessType,
          catalog,
          aiProvider
        );
        
        // Salva le istanze che verranno passate ai provider
        setServiceInstances({
          suggestionService,
          actionService,
          aiProvider,
          catalog
        });
        
        setLoadingProgress(80);
        
        // Imposta le endpoint per i dati delle funzioni
        const functionsConfig = configManager.getSection('functions');
        if (functionsConfig.functionDataEndpoints) {
          functionRegistry.setFunctionDataEndpoints(functionsConfig.functionDataEndpoints);
        }
        
        setLoadingProgress(100);
        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing core services:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  // Funzione per ricaricare i servizi
  const reloadServices = async () => {
    setIsInitialized(false);
    setIsLoading(true);
    setLoadingProgress(0);
    setInitializationError(null);
    
    try {
      // Ricarica la configurazione
      await configManager.initialize();
      setLoadingProgress(30);
      
      // Reinizializza il tema e il registro delle funzioni
      await Promise.all([
        themeService.current.initialize(),
        functionRegistry.initialize()
      ]);
      setLoadingProgress(60);
      
      // Applica il tema aggiornato
      const businessConfig = configManager.getSection('business');
      themeService.current.applyTheme({
        primaryColor: businessConfig.theme.primaryColor,
        secondaryColor: businessConfig.theme.secondaryColor,
        bgColor: businessConfig.theme.backgroundColor,
        textColor: businessConfig.theme.textColor
      });
      
      // Ricrea gli altri servizi
      // Seguiamo lo stesso processo dell'inizializzazione
      const businessType = businessConfig.type;
      
      const catalog = {} as ICatalogService; // Cast esplicito al tipo ICatalogService
      const aiProvider = {} as IAIProvider; // Cast esplicito al tipo IAIProvider
      
      const suggestionService = SuggestionServiceFactory.createService(
        businessType,
        catalog, 
        functionRegistry,
        aiProvider
      );
      
      const actionService = ActionServiceFactory.createService(
        businessType,
        catalog,
        aiProvider
      );
      
      setServiceInstances({
        suggestionService,
        actionService,
        aiProvider,
        catalog
      });
      
      setLoadingProgress(100);
      setIsInitialized(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error reloading services:', error);
      setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  // Valore del contesto
  const contextValue: RootServiceContextType = {
    isInitialized,
    initializationError,
    reloadServices,
    themeService: themeService.current,
    configManager, 
    functionRegistry,
    userContextService,
    // Aggiungi questi servizi
    suggestionService: serviceInstances?.suggestionService,
    actionService: serviceInstances?.actionService
  };

  // Mostra schermata di caricamento se non inizializzato
  if (isLoading) {
    const businessName = configManager.getSection('business').name || 'CaféConnect';
    return (
      <LoadingScreen 
        businessName={businessName}
        progress={loadingProgress}
        error={initializationError}
        onRetry={reloadServices}
      />
    );
  }

  // Gestisci il caso di errore
  if (initializationError) {
    return (
      <div className="error-screen">
        <h1>Errore di inizializzazione</h1>
        <p>{initializationError}</p>
        <button onClick={reloadServices}>Riprova</button>
      </div>
    );
  }

  // Se non ancora inizializzato o servizi non pronti, mostra caricamento
  if (!isInitialized || !serviceInstances) {
    return <div>Inizializzazione dei servizi in corso...</div>;
  }

  // Compone tutti i provider con AppInitializer per gestire meglio il flusso di inizializzazione
  return (
    <RootServiceContext.Provider value={contextValue}>
    <AnalyticsServiceProvider>
      <CatalogServiceProvider 
        onInitialized={(catalogService) => {
          if (serviceInstances?.catalog) {
            Object.assign(serviceInstances.catalog, catalogService);
          }
        }}
      >
        <AIServiceProvider 
          functionRegistry={functionRegistry}
          suggestionService={serviceInstances?.suggestionService}
          actionService={serviceInstances?.actionService}
          onProviderInitialized={(provider) => {
            if (serviceInstances?.aiProvider) {
              Object.assign(serviceInstances.aiProvider, provider);
            }
          }}
        >
          {/* AppInitializer qui, DOPO tutti i provider necessari */}
          <AppInitializer>
            {children}
          </AppInitializer>
        </AIServiceProvider>
      </CatalogServiceProvider>
    </AnalyticsServiceProvider>
  </RootServiceContext.Provider>
  );
};

// Hook per utilizzare il contesto radice
export const useRootServices = (): RootServiceContextType => {
  const context = useContext(RootServiceContext);
  
  if (context === undefined) {
    throw new Error('useRootServices must be used within a RootServiceProvider');
  }
  
  return context;
};

// Hooks specializzati per accedere direttamente ai servizi comuni
export const useThemeService = () => {
  const { themeService } = useRootServices();
  return themeService;
};

export const useConfigManager = () => {
  const { configManager } = useRootServices();
  return configManager;
};

export const useFunctionRegistry = () => {
  const { functionRegistry } = useRootServices();
  return functionRegistry;
};

export const useUserService = () => {
  const { userContextService } = useRootServices();
  return userContextService;
};

// Hook di compatibilità per supportare la migrazione graduale
export const useServices = () => {
  const rootServices = useRootServices();
  //const { aiService, currentProvider } = useAIService();
  const { catalogService } = useCatalog();
  const { analyticsService, consentService, conversationTracker } = useAnalytics();
  
  // Emula la struttura del vecchio context per compatibilità
  return {
    // Temporaneamente, fornisci valori fittizi per i servizi che verranno
    // effettivamente resi disponibili dai provider figli (come AIService)
    aiService: {} as IAIService,
    currentProvider: "initializing...",
    catalogService,
    themeService: rootServices.themeService,
    configManager: rootServices.configManager,
    functionRegistry: rootServices.functionRegistry,
    userService: rootServices.userContextService,
    analyticsService,
    consentService,
    conversationTracker,
    // Aggiungi questi servizi
    suggestionService: rootServices.suggestionService,
    actionService: rootServices.actionService,
    isInitialized: rootServices.isInitialized,
    initializationError: rootServices.initializationError,
    reloadServices: rootServices.reloadServices
  };
};

// Versione di compatibilità di useService
export const useService = (serviceName: string) => {
  const services = useServices();
  return (services as any)[serviceName];
};