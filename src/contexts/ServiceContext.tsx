import React, { createContext, useContext, useState, useMemo } from 'react';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { IFunctionService } from '../services/function/interfaces/IFunctionService';
import { IUserContextService } from '../services/user/interfaces/IUserContextService';
import { AIService } from '../services/ai/AIService';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { userContextService } from '../services/user/UserContextService';
import { AIProviderConfig } from '../types/AIProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { configManager } from '../config/ConfigManager';

// Definizione tipo contesto
interface ServiceContextType {
  aiService: IAIService;
  functionService: IFunctionService;
  userService: IUserContextService;
  currentProvider: string;
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
  
  // Crea istanza AIService con la configurazione salvata
  const [aiService, setAIService] = useState(() => {
    return new AIService(
      savedConfig.provider,
      savedConfig.config,
      functionRegistry,
      { enableFunctionCalling: true }
    );
  });
  
  // Funzione per cambiare il provider AI
  const changeAIProvider = (provider: string, config: AIProviderConfig) => {
    aiService.changeProvider(provider, config);
    setCurrentProvider(provider);
  };
  
  // Funzione per aggiornare i servizi dopo cambio configurazione
  const refreshServices = () => {
    // Ricarica la configurazione AI dalla configurazione globale
    const aiConfig = configManager.getSection('ai');
    
    // Crea un nuovo AIService con la configurazione aggiornata
    const newAIService = new AIService(
      aiConfig.defaultProvider,
      {
        apiKey: savedConfig.config.apiKey, // Mantieni la API key esistente
        model: aiConfig.providers[aiConfig.defaultProvider].defaultModel
      },
      functionRegistry,
      { enableFunctionCalling: true }
    );
    
    setAIService(newAIService);
    setCurrentProvider(aiConfig.defaultProvider);
  };
  
  // Memoizza il valore del contesto per evitare render non necessari
  const contextValue = useMemo(() => ({
    aiService,
    functionService: functionRegistry,
    userService: userContextService,
    currentProvider,
    changeAIProvider,
    refreshServices
  }), [aiService, currentProvider]);
  
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