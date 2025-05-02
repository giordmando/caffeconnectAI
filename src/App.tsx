import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import AIConfigPanel from './components/AIConfigPanel';
import BusinessConfigPanel  from './components/BusinessConfigPanel';
import { useServices } from './contexts/ServiceContext';
import { appInitializer } from './initialization/AppInitializer';
import { configManager, interpolateConfig } from './config/ConfigManager';
import LoadingScreen from './components/LoadingScreen';
import './styles/App.css';

/**
 * Componente principale dell'applicazione
 */
function App() {
  // Stati dell'applicazione
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isBusinessPanelOpen, setIsBusinessPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appConfig, setAppConfig] = useState(configManager.getConfig());
  
  // Ottieni servizi dal contesto
  const { currentProvider, functionService } = useServices();
  
  // Funzioni disponibili
  const availableFunctions = functionService.getAllFunctions().map(fn => fn.name);
  
  // Inizializzazione app
  useEffect(() => {
    const initApp = async () => {
      try {
        // Carica configurazione da un URL remoto o localStorage se disponibile
        // In questo esempio usiamo un URL fittizio, ma in produzione dovresti usare un URL reale
        // o passare un valore da variabile d'ambiente
        const configUrl = process.env.REACT_APP_CONFIG_URL;
        
        await appInitializer.initialize(configUrl);
        
        // Aggiorna lo stato con la configurazione caricata
        setAppConfig(configManager.getConfig());
        
        // Simuliamo un breve ritardo per mostrare la schermata di caricamento
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      } catch (error) {
        console.error('Error initializing app:', error);
        // Anche in caso di errore, mostriamo l'app con le impostazioni predefinite
        setIsLoading(false);
      }
    };
    
    initApp();
  }, []);
  
  // Gestione della reinizializzazione dopo cambio configurazione business
  const handleBusinessConfigSave = async () => {
    setIsLoading(true);
    
    try {
      await appInitializer.reinitialize();
      setAppConfig(configManager.getConfig());
      
      // Breve ritardo per mostrare la schermata di caricamento
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error reinitializing app:', error);
      setIsLoading(false);
    }
  };
  
  // Mostra schermata di caricamento
  if (isLoading) {
    return <LoadingScreen businessName={appConfig.business.name} />;
  }
  
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
        <ChatInterface 
          welcomeMessage={welcomeMessage}
          showSidebar={appConfig.ui.showSidebar}
          enableSuggestions={appConfig.ui.enableSuggestions}
          enableDynamicComponents={appConfig.ui.enableDynamicComponents}
          maxRecommendations={appConfig.ui.maxRecommendations}
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
