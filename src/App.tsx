import React, { useState } from 'react';
// Aggiungi questi import
import { useRootServices, useConfigManager, useThemeService } from './contexts/RootServiceProvider';
import AIConfigPanel from './components/AIConfigPanel';
import BusinessConfigPanel from './components/BusinessConfigPanel';
import CompleteChatInterface from './components/ContextChatUI';
import { interpolateConfig } from './config/ConfigManager';
import './styles/App.css';
import { useAIService } from './contexts/AIServiceProvider';
import { functionRegistry } from './services/function/FunctionRegistry';

/**
 * Componente principale dell'applicazione
 * Utilizza il nuovo sistema di servizi centralizzato
 */
function App() {
  // Stati dell'applicazione
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isBusinessPanelOpen, setIsBusinessPanelOpen] = useState(false);
  
  // Sostituisci con:
  const { reloadServices } = useRootServices();
  const configManager = useConfigManager();
  
  // Ottieni configurazione
  const appConfig = configManager.getConfig();

  const { currentProvider } = useAIService();
  // Funzioni disponibili
  const availableFunctions = functionRegistry.getAllFunctions().map(fn => fn.name);
  
  // Gestione della reinizializzazione dopo cambio configurazione business
  const handleBusinessConfigSave = async () => {
    try {
      // Il nuovo AppInitializer mostrerà automaticamente lo stato di caricamento
      await reloadServices();
    } catch (error) {
      console.error('Error reinitializing app:', error);
    }
  };
  
  // Sostituisci i segnaposto nel messaggio di benvenuto
  const welcomeMessage = interpolateConfig(appConfig.ui.welcomeMessage, appConfig);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <img src={appConfig.business.logo} alt={appConfig.business.name} />
          <h1>{appConfig.business.name}</h1>
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
          
          <button 
            className="business-config-button"
            onClick={() => setIsBusinessPanelOpen(true)}
          >
            Impostazioni Business
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {/* Usa il nuovo componente unificato che supporta tutte le funzionalità */}
        <CompleteChatInterface 
          initialConfig={{
            welcomeMessage: welcomeMessage,
            showSidebar: appConfig.ui.showSidebar,
            enableSuggestions: appConfig.ui.enableSuggestions,
            enableDynamicComponents: appConfig.ui.enableDynamicComponents,
            enableNLP: appConfig.ui.enableNLP,
            maxRecommendations: appConfig.ui.maxRecommendations
          }}
        />
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
          <p>{appConfig.business.name} &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
      
      {isConfigPanelOpen && (
        <div className="modal-overlay">
          <AIConfigPanel 
            onClose={() => setIsConfigPanelOpen(false)}
          />
        </div>
      )}
      
      {isBusinessPanelOpen && (
        <div className="modal-overlay">
          <BusinessConfigPanel 
            onClose={() => setIsBusinessPanelOpen(false)}
            onSave={handleBusinessConfigSave}
          />
        </div>
      )}
    </div>
  );
}

export default App;