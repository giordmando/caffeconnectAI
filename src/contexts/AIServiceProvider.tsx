import React, { createContext, useContext, useState, useEffect } from 'react';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { AIProviderConfig } from '../types/AIProvider';
import { AIService } from '../services/ai/AIService';
import { AIConversationManager } from '../services/ai/AIConversationManager';
import { AIProviderFactory } from '../services/ai/AIProviderFactory';
import { AIResponseProcessor } from '../services/ai/AIResponseProcessor';
import { UIComponentGenerator } from '../services/ui/UIComponentGenerator';
import { registerAllProviders } from '../services/ai/providers/registerAllProviders';

// Tipo per il contesto AI
interface AIServiceContextType {
  aiService: IAIService;
  currentProvider: string;
  isInitialized: boolean;
  initializationError: string | null;
  changeAIProvider: (provider: string, config: AIProviderConfig) => void;
}

// Creazione del contesto
const AIServiceContext = createContext<AIServiceContextType | undefined>(undefined);

// Provider per i servizi AI
export const AIServiceProvider: React.FC<{
  children: React.ReactNode;
  functionRegistry: any;
  suggestionService: any;
  actionService: any;
  onProviderInitialized?: (provider: any) => void;
}> = ({ children, functionRegistry, suggestionService, actionService, onProviderInitialized }) => {
  // Stati per il provider
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string>('initializing...');
  const [aiService, setAIService] = useState<IAIService | null>(null);

  // Inizializza il servizio AI
  useEffect(() => {
    const initializeAIService = async () => {
      try {
        // Carica la configurazione dal localStorage o usa quella predefinita
        let savedConfig;
        try {
          const configString = localStorage.getItem('cafeconnect-ai-config');
          savedConfig = configString ? JSON.parse(configString) : {
            provider: 'mockai',
            config: {
              apiKey: '',
              model: 'mockai-sim',
              options: {
                enableAdvancedFunctionSupport: false,
                useMockFunctions: false
              }
            }
          };
        } catch (error) {
          console.warn('Error loading AI config from localStorage, using defaults:', error);
          savedConfig = {
            provider: 'mockai',
            config: {
              apiKey: '',
              model: 'mockai-sim',
              options: {
                enableAdvancedFunctionSupport: false,
                useMockFunctions: false
              }
            }
          };
        }

        // Registra i provider AI
        registerAllProviders();

        // Crea il provider AI
        const aiProvider = AIProviderFactory.createProvider(
          savedConfig.provider, 
          savedConfig.config
        );

        if (isInitialized && aiProvider && onProviderInitialized) {
            onProviderInitialized(aiProvider);
        }

        // Crea la strategia di esecuzione delle funzioni
        const executionStrategy = functionRegistry.createExecutionStrategy(aiProvider);

        // Crea il processor con la strategia
        const responseProcessor = new AIResponseProcessor(
          functionRegistry, 
          executionStrategy
        );

        // Crea i componenti UI
        const uiComponentGenerator = new UIComponentGenerator();

        // Crea il servizio AI base
        const baseAIService = new AIService(
          aiProvider,
          functionRegistry,
          responseProcessor,
          uiComponentGenerator,
          suggestionService,
          actionService,
          {
            enableFunctionCalling: true
          }
        );

        // Decide se usare il manager avanzato in base alla configurazione
        const enableAdvancedFunctionSupport = savedConfig.config.options?.enableAdvancedFunctionSupport || false;

        // Crea il servizio AI appropriato (base o avanzato)
        const service: IAIService = enableAdvancedFunctionSupport
          ? new AIConversationManager(
              baseAIService, 
              functionRegistry,
              suggestionService,
              actionService
            )
          : baseAIService;

        // Aggiorna lo stato
        setAIService(service);
        setCurrentProvider(savedConfig.provider);
        setIsInitialized(true);
        
      } catch (error) {
        console.error('Error initializing AI service:', error);
        setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initializeAIService();
  }, [functionRegistry, suggestionService, actionService, isInitialized, onProviderInitialized]);
 
  // Cambia provider AI
  const changeAIProvider = (provider: string, config: AIProviderConfig) => {
    try {
      if (!aiService) return;
      
      aiService.changeProvider(provider, config);
      setCurrentProvider(provider);
      
    } catch (error) {
      console.error('Error changing AI provider:', error);
    }
  };

  // Valore del contesto
  const contextValue: AIServiceContextType = {
    aiService: aiService!,
    currentProvider,
    isInitialized,
    initializationError,
    changeAIProvider
  };

  if (!isInitialized || !aiService) {
    return <div>Initializing AI services...</div>;
  }

  return (
    <AIServiceContext.Provider value={contextValue}>
      {children}
    </AIServiceContext.Provider>
  );
};

// Hook per utilizzare il contesto AI
export const useAIService = (): AIServiceContextType => {
  const context = useContext(AIServiceContext);
  
  if (context === undefined) {
    throw new Error('useAIService must be used within an AIServiceProvider');
  }
  
  return context;
};