import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import AIConfigPanel from './components/AIConfigPanel';
import { createDefaultAIService } from './services/enhancedAIService';
import { AIProviderConfig } from './types/AIProvider';
import { useLocalStorage } from './hooks/useLocalStorage';
import { FunctionService, functionService } from './services/functionService';
import './styles/App.css';

// Servizio AI
const aiService = createDefaultAIService();

function App() {
  // Stato applicazione
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState('openai');
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carica la configurazione salvata
  const [savedConfig] = useLocalStorage<{
    provider: string;
    config: AIProviderConfig;
  }>('cafeconnect-ai-config', {
    provider: 'openai',
    config: {
      apiKey: 'mock-key',
      model: 'gpt-4'
    }
  });
  
  // Inizializzazione
  useEffect(() => {
    const initApp = async () => {
      // Configurazione AI
      if (savedConfig && savedConfig.provider) {
        setCurrentProvider(savedConfig.provider);
        aiService.changeProvider(savedConfig.provider, savedConfig.config);
      }
      
      // Ottieni le funzioni disponibili
      const functions = functionService.getAllFunctions();
      setAvailableFunctions(functions.map(fn => fn.name));
      
      setIsLoading(false);
    };
    
    initApp();
  }, []);
  
  // Gestione salvataggio configurazione
  const handleSaveConfig = (provider: string, config: AIProviderConfig) => {
    setCurrentProvider(provider);
    aiService.changeProvider(provider, config);
  };
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Caricamento CaféConnect AI...</p>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <img src="/logo.svg" alt="CaféConnect" />
          <h1>CaféConnect</h1>
        </div>
        
        <div className="header-actions">
          <div className="provider-info">
            <span className="provider-label">AI:</span>
            <span className="provider-name">{currentProvider}</span>
          </div>
          
          <button 
            className="config-button"
            onClick={() => setIsConfigPanelOpen(true)}
          >
            Configurazione AI
          </button>
        </div>
      </header>
      
      <main className="app-main">
        <ChatInterface />
      </main>
      
      <footer className="app-footer">
        <div className="functions-info">
          <span>Funzioni disponibili: {availableFunctions.length}</span>
          <div className="functions-list">
            {availableFunctions.map(fn => (
              <span key={fn} className="function-badge">{fn}</span>
            ))}
          </div>
        </div>
        <div className="app-info">
          <p>CaféConnect AI Light &copy; 2023</p>
        </div>
      </footer>
      
      {isConfigPanelOpen && (
        <div className="modal-overlay">
          <AIConfigPanel 
            onSaveConfig={handleSaveConfig}
            onClose={() => setIsConfigPanelOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;