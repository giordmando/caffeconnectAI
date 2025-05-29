import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { InitializedServices, initializeAppServices } from '../initialization/AppServicesInitializer';
import { AppConfig } from '../config/interfaces/IAppConfig';
import { configManager } from '../config/ConfigManager'; // Importa configManager
import { orderOrchestrator } from '../services/order/OrderOrchestrator';
import { WhatsAppOrderStrategy } from '../services/order/strategies/WhatsAppOrderStrategy';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { ComponentManager } from '../services/ui/compstore/ComponentManager';


export interface AppServicesContextType extends Omit<InitializedServices, 'currentAiProvider' | 'appConfig'> {
  isInitialized: boolean;
  initializationError: string | null;
  currentAiProvider: string;
  appConfig: AppConfig | null;
  changeAIProvider: (provider: string, model: string, apiKey: string, options: AppConfig['ai']['activeOptions']) => void; // Modificata la firma
  reloadServices: () => Promise<void>;
}

const ServiceContext = createContext<AppServicesContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initializedServices, setInitializedServices] = useState<InitializedServices | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [currentAiProvider, setCurrentAiProvider] = useState<string>('loading...');
  const [currentAppConfig, setCurrentAppConfig] = useState<AppConfig | null>(null);


  const loadServices = useCallback(async () => {
    console.log("ServiceProvider: Initiating service loading...");
    setIsInitialized(false);
    setInitializedServices(null);
    setInitializationError(null);
    setCurrentAiProvider('loading...');
    setCurrentAppConfig(null);
    try {
      const services = await initializeAppServices();
      setInitializedServices(services);
      setCurrentAiProvider(services.currentAiProvider);
      setCurrentAppConfig(services.appConfig); // Salva l'appConfig caricato
      setIsInitialized(true);
      console.log("ServiceProvider: Services loaded and context updated.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown critical initialization error';
      console.error('FATAL: Error during service initialization in ServiceProvider:', errorMessage, error);
      setInitializationError(errorMessage);
      setInitializedServices(null);
      setCurrentAppConfig(null);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const changeAIProvider = useCallback(
    async (provider: string, model: string, apiKey: string, options: AppConfig['ai']['activeOptions']) => {
    if (!initializedServices) {
      console.warn('Attempted to change AI provider before services are fully initialized.');
      return;
    }
    try {
      console.log(`Attempting to change AI provider to ${provider} with model ${model}`);
      // 1. Aggiorna ConfigManager
      configManager.updateSection('ai', {
        activeProvider: provider,
        activeModel: model,
        apiKey: apiKey, // Salva l'API key nella configurazione (sarà in localStorage)
        activeOptions: options,
      });
      console.log('ConfigManager updated with new AI settings.');

      // 2. Ricarica i servizi per applicare la nuova configurazione
      // reloadServices() aggiornerà currentAiProvider e appConfig nello stato del ServiceProvider
      await loadServices();
      console.log(`AI Provider changed to ${provider} and services reloaded.`);

    } catch (error) {
      console.error('Error changing AI provider and reloading services:', error);
      // Potresti voler impostare un errore specifico per il cambio provider qui
      // e/o fare un revert della configurazione se il reload fallisce.
      setInitializationError(`Errore durante il cambio del provider AI: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    }
  }, [initializedServices, loadServices]); // Aggiungi loadServices alle dipendenze

  const contextValue: AppServicesContextType = initializedServices
    ? {
        ...initializedServices,
        isInitialized,
        initializationError,
        currentAiProvider,
        appConfig: currentAppConfig, // Usa lo stato locale per appConfig
        changeAIProvider,
        reloadServices: loadServices,
      }
    : ({
        isInitialized: false,
        initializationError: null,
        currentAiProvider: 'loading...',
        appConfig: null,
        changeAIProvider: () => console.warn("Services not ready to change AI provider"),
        reloadServices: async () => console.warn("Services not ready to reload"),
      } as unknown as AppServicesContextType);
    orderOrchestrator.registerStrategy('whatsapp', new WhatsAppOrderStrategy());
  return (
    <ServiceContext.Provider value={contextValue}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = (): AppServicesContextType => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};

export function useService<K extends keyof Omit<AppServicesContextType, 'isInitialized' | 'initializationError' | 'currentAiProvider' | 'appConfig' | 'changeAIProvider' | 'reloadServices'>>(
    serviceName: K
  ): AppServicesContextType[K] {
  const services = useServices();
  if (!services.isInitialized && !services.initializationError) {
      console.warn(`useService: Attempting to access service "${String(serviceName)}" before services are fully initialized. This might lead to undefined behavior or runtime errors if the service is not yet available. Ensure that components consuming services handle the loading state appropriately (e.g., by checking 'isInitialized' from useServices).`);
  }
  if (services.initializationError && services[serviceName] === undefined) {
    throw new Error(
      `useService: Service "${String(serviceName)}" is unavailable due to a critical initialization error: ${services.initializationError}. Check console for details.`
    );
  }
  return services[serviceName];
}

export const useAIService = () => useService('aiService');
export const useUserService = () => useService('userService');
export const useCatalogService = () => useService('catalogService');
export const useThemeService = () => useService('themeService');
export const useConfigManager = () => useService('configManager');
