import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import AIConfigPanel from './components/AIConfigPanel';
import { useServices } from './contexts/ServiceContext';
import './styles/App.css';

/**
 * Main application component
 */
function App() {
  // Application state
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get services from context
  const { currentProvider, functionService } = useServices();
  
  // Get available functions
  const availableFunctions = functionService.getAllFunctions().map(fn => fn.name);
  
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
          <p>CaféConnect AI Light &copy; 2025</p>
        </div>
      </footer>
      
      {isConfigPanelOpen && (
        <div className="modal-overlay">
          <AIConfigPanel 
            onClose={() => setIsConfigPanelOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default App;