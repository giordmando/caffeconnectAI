import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { IFunctionService } from '../services/function/interfaces/IFunctionService';
import { IUserContextService } from '../services/user/interfaces/IUserContextService';
import { AIService } from '../services/ai/AIService';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { userContextService } from '../services/user/UserContextService';
import { AIProviderConfig } from '../types/AIProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { configManager } from '../config/ConfigManager';
// Importa AIConversationManager
import { AIConversationManager } from '../services/ai/AIConversationManager';
import { ISuggestionService } from '../services/action/interfaces/ISuggestionService';
import { IActionService } from '../services/action/interfaces/IActionService';
import { AIProviderFactory } from '../services/ai/AIProviderFactory';
import { UIComponentGenerator } from '../services/ui/UIComponentGenerator';
import { SuggestionServiceFactory } from '../services/action/SuggestionServiceFactory';
import { ActionServiceFactory } from '../services/action/ActionServiceFactory';
import { catalogService } from '../services/catalog/CatalogService';
import { FunctionExecutionStrategyFactory } from '../services/function/FunctionExecutionStrategyFactory';
import { AIResponseProcessor } from '../services/ai/AIResponseProcessor';
import { registerAllProviders } from '../services/ai/providers/registerAllProviders';


// Definizione tipo contesto
interface ServiceContextType {
  aiService: IAIService;
  functionService: IFunctionService;
  userService: IUserContextService;
  currentProvider: string;
  suggestionService: ISuggestionService;
  actionService: IActionService;
  changeAIProvider: (provider: string, config: AIProviderConfig) => void;
  refreshServices: () => void;
}

// Crea contesto con valore predefinito undefined
const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// Interfaccia props provider
interface ServiceProviderProps {
  children: React.ReactNode;
}

/**
 * Provider che rende disponibili i servizi a tutti i componenti figli
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {

  // Registra tutti i provider prima di creare i servizi

  // Assicurati che i provider siano registrati
  registerAllProviders();


  // Carica configurazione salvata da localStorage
  const [savedConfig] = useLocalStorage<{
    provider: string;
    config: AIProviderConfig;
  }>('cafeconnect-ai-config', {
    provider: configManager.getSection('ai').defaultProvider,
    config: {
      apiKey: '',
      model: configManager.getSection('ai').providers[configManager.getSection('ai').defaultProvider].defaultModel
    }
  });
  
  // Traccia provider corrente per visualizzazione UI
  const [currentProvider, setCurrentProvider] = useState(savedConfig.provider);
  
  // Creiamo i servizi principali
  const [services, setServices] = useState(() => {
    // Crea il provider AI
    const aiProvider = AIProviderFactory.createProvider(
      savedConfig.provider,
      savedConfig.config
    );

    // Crea la strategia appropriata
    const executionStrategy = FunctionExecutionStrategyFactory.createStrategy(
      aiProvider,
      functionRegistry
    );

    // Crea il processor con la strategia
    const responseProcessor = new AIResponseProcessor(functionRegistry, executionStrategy);

    // Crea istanza UIComponentGenerator
    const uiComponentGenerator = new UIComponentGenerator();
    
    // Crea i servizi di suggerimento e azione usando le factory
    const businessType = configManager.getSection('business').type;
    const suggestionService = SuggestionServiceFactory.createService(
      businessType,
      catalogService,  // Questo dovrebbe essere definito globalmente o iniettato
      functionRegistry,
      aiProvider
    );
    
    const actionService = ActionServiceFactory.createService(
      businessType,
      catalogService,  // Questo dovrebbe essere definito globalmente o iniettato
      aiProvider
    );
    
    // Crea il servizio AI base
    const baseService = new AIService(
      aiProvider,
      functionRegistry,
      responseProcessor,
      uiComponentGenerator,
      suggestionService,
      actionService
    );
    
    // Decide se usare il manager avanzato o il servizio base
    const useAdvancedFunctionSupport = configManager.getSection('ai').enableAdvancedFunctionSupport || false;
    
    const aiService = useAdvancedFunctionSupport
      ? new AIConversationManager(
          baseService,
          functionRegistry,
          suggestionService,
          actionService
        )
      : baseService;
    
    return {
      aiService,
      suggestionService,
      actionService
    };
  });

  
  // Funzione per cambiare il provider AI
  const changeAIProvider = (provider: string, config: AIProviderConfig) => {
    // Crea nuovo provider
    const aiProvider = AIProviderFactory.createProvider(provider, config);
    
    // Crea nuovi servizi basati sul nuovo provider
    const businessType = configManager.getSection('business').type;
    const uiComponentGenerator = new UIComponentGenerator();

    // Crea la strategia appropriata
    const executionStrategy = FunctionExecutionStrategyFactory.createStrategy(
      aiProvider,
      functionRegistry
    );
    // Crea il processor con la strategia
    const responseProcessor = new AIResponseProcessor(functionRegistry, executionStrategy);
    const suggestionService = SuggestionServiceFactory.createService(
      businessType,
      catalogService,
      functionRegistry,
      aiProvider
    );
    
    const actionService = ActionServiceFactory.createService(
      businessType,
      catalogService,
      aiProvider
    );
    
    // Crea nuovo servizio AI
    const baseService = new AIService(
      aiProvider,
      functionRegistry,
      responseProcessor,
      uiComponentGenerator,
      suggestionService,
      actionService
    );
    
    // Decide se usare il manager avanzato
    const useAdvancedFunctionSupport = configManager.getSection('ai').enableAdvancedFunctionSupport || false;
    
    const aiService = useAdvancedFunctionSupport
      ? new AIConversationManager(
          baseService,
          functionRegistry,
          suggestionService,
          actionService
        )
      : baseService;
    
    // Aggiorna i servizi
    setServices({
      aiService,
      suggestionService,
      actionService
    });
    
    setCurrentProvider(provider);
  };
  
  // Funzione per aggiornare i servizi dopo cambio configurazione
  const refreshServices = () => {
    // Ricarica la configurazione AI dalla configurazione globale
    const aiConfig = configManager.getSection('ai');
    
    // Crea un nuovo provider con la configurazione aggiornata
    changeAIProvider(
      aiConfig.defaultProvider,
      {
        apiKey: savedConfig.config.apiKey, // Mantieni la API key esistente
        model: aiConfig.providers[aiConfig.defaultProvider].defaultModel
      }
    );
  };
  
  // Memoizza il valore del contesto per evitare render non necessari
  const contextValue = useMemo(() => ({
    aiService: services.aiService,
    functionService: functionRegistry,
    userService: userContextService,
    suggestionService: services.suggestionService,
    actionService: services.actionService,
    currentProvider,
    changeAIProvider,
    refreshServices
  }), [services, currentProvider, refreshServices]);
  
  return (
    <ServiceContext.Provider value={contextValue}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Hook personalizzato per utilizzare il contesto dei servizi
 */
export const useServices = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  
  if (context === undefined) {
    throw new Error('useServices deve essere utilizzato all\'interno di un ServiceProvider');
  }
  
  return context;
};

