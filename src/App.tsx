import React, { useState, useEffect } from 'react';
import { useServices, useService } from './contexts/ServiceProvider';
import AIConfigPanel from './components/AIConfigPanel';
import CompleteChatInterface from './components/ContextChatUI';
import { interpolateConfig } from './config/ConfigManager';
import './styles/App.css';
import { CartDrawer } from './components/cart/CartDrawer';
import { CartButton } from './components/cart/CartButton';
import { ConfigPanelOrchestrator } from './components/config/ConfigPanelOrchestrator';

/**
 * Componente principale dell'applicazione
 * Utilizza il nuovo sistema di servizi centralizzato
 */
function App() {
  // Stati dell'applicazione
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isBusinessPanelOpen, setIsBusinessPanelOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { currentAiProvider, reloadServices, appConfig, isInitialized, initializationError } = useServices();
  const functionRegistry = useService('functionRegistry'); // configManager è già in appConfig

  // Stato locale per le funzioni disponibili, aggiornato dopo l'inizializzazione
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);

  useEffect(() => {
    if (isInitialized && !initializationError && functionRegistry) {
      setAvailableFunctions(functionRegistry.getAllFunctions().map(fn => fn.name));
    }
  }, [isInitialized, initializationError, functionRegistry]);


  // Gestione della reinizializzazione dopo cambio configurazione business
  const handleBusinessConfigSave = async () => {
    try {
      await reloadServices(); // AppInitializer gestirà lo stato di caricamento
    } catch (error) {
      console.error('Error reinitializing app after business config save:', error);
    }
  };

  // Se i servizi non sono ancora inizializzati o c'è un errore critico durante l'init,
  // AppInitializer (usato in index.tsx) dovrebbe gestire la visualizzazione del caricamento/errore.
  // Qui potremmo aggiungere un ulteriore controllo se App viene renderizzato prima che AppInitializer abbia finito.
  if (!isInitialized || !appConfig) {
    // Questo stato dovrebbe essere gestito da AppInitializer, ma come fallback:
    return <div>Inizializzazione dell'applicazione in corso o fallita...</div>;
  }

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
            {/* CORREZIONE: currentProvider -> currentAiProvider */}
            <span className="provider-name">{currentAiProvider}</span>
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
        <CompleteChatInterface
          initialConfig={{
            showSidebar: appConfig.ui.showSidebar,
            enableSuggestions: appConfig.ui.enableSuggestions,
            enableDynamicComponents: appConfig.ui.enableDynamicComponents,
            enableNLP: appConfig.ui.enableNLP,
            maxRecommendations: appConfig.ui.maxRecommendations
          }}
        />
      </main>
      {/* Cart Components */}
      <CartButton onClick={() => setIsCartOpen(true)} />
          <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
          />
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
          <ConfigPanelOrchestrator
            onClose={() => setIsBusinessPanelOpen(false)}
            onSave={handleBusinessConfigSave}
          />
        </div>
      )}
    </div>
  );
}

export default App;
