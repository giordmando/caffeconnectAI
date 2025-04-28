import React, { createContext, useContext, useState, useMemo } from 'react';
import { IAIService } from '../services/ai/interfaces/IAIService';
import { IFunctionService } from '../services/function/interfaces/IFunctionService';
import { IUserContextService } from '../services/user/interfaces/IUserContextService';
import { AIService } from '../services/ai/AIService';
import { functionService } from '../services/function/FunctionService';
import { userContextService } from '../services/user/UserContextService';
import { AIProviderConfig } from '../types/AIProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Define the context type
interface ServiceContextType {
  aiService: IAIService;
  functionService: IFunctionService;
  userService: IUserContextService;
  currentProvider: string;
  changeAIProvider: (provider: string, config: AIProviderConfig) => void;
}

// Create context with default undefined value
const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

// Provider props interface
interface ServiceProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that makes services available to all children
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  // Load saved configuration from localStorage
  const [savedConfig] = useLocalStorage<{
    provider: string;
    config: AIProviderConfig;
  }>('cafeconnect-ai-config', {
    provider: 'mockai',
    config: {
      apiKey: 'mock-key',
      model: 'mockai-sim'
    }
  });
  
  // Track current provider for UI display
  const [currentProvider, setCurrentProvider] = useState(savedConfig.provider);
  
  // Create AIService instance with the saved config
  const aiService = useMemo(() => {
    return new AIService(
      savedConfig.provider,
      savedConfig.config,
      functionService,
      { enableFunctionCalling: true }
    );
  }, []);
  
  // Function to change the AI provider
  const changeAIProvider = (provider: string, config: AIProviderConfig) => {
    aiService.changeProvider(provider, config);
    setCurrentProvider(provider);
  };
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    aiService,
    functionService,
    userService: userContextService,
    currentProvider,
    changeAIProvider
  }), [aiService, currentProvider]);
  
  return (
    <ServiceContext.Provider value={contextValue}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * Custom hook to use the service context
 */
export const useServices = (): ServiceContextType => {
  const context = useContext(ServiceContext);
  
  if (context === undefined) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  
  return context;
};