// Placeholder for AIConfigPanel component
import React, { useState } from 'react';
import { AIProviderConfig } from '../types/AIProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AIConfigPanelProps {
  onSaveConfig: (provider: string, config: AIProviderConfig) => void;
  onClose: () => void;
}

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onSaveConfig, onClose }) => {
  // Carica la configurazione salvata
  const [savedConfig, setSavedConfig] = useLocalStorage<{
    provider: string;
    config: AIProviderConfig;
  }>('cafeconnect-ai-config', {
    provider: 'openai',
    config: {
      apiKey: '',
      model: 'gpt-4'
    }
  });
  
  // Stato locale per il form
  const [provider, setProvider] = useState(savedConfig.provider);
  const [apiKey, setApiKey] = useState(savedConfig.config.apiKey);
  const [model, setModel] = useState(savedConfig.config.model);
  
  // Opzioni modello in base al provider
  const getModelOptions = (provider: string) => {
    switch (provider) {
      case 'openai':
        return [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case 'claude':
        return [
          { value: 'claude-3-opus', label: 'Claude 3 Opus' },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
        ];
      case 'gemini':
        return [
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'gemini-ultra', label: 'Gemini Ultra' }
        ];
        case 'mockai':
          return [
            { value: 'mockai-sim', label: 'Mock AI simulate' }
          ];
      default:
        return [{ value: 'default', label: 'Default Model' }];
    }
  };
  
  // Gestione cambio provider
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    // Seleziona il primo modello disponibile per il nuovo provider
    setModel(getModelOptions(newProvider)[0].value);
  };
  
  // Gestione invio form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const config: AIProviderConfig = {
      apiKey,
      model
    };
    
    // Salva in localStorage
    setSavedConfig({
      provider,
      config
    });
    
    // Notifica il componente parent
    onSaveConfig(provider, config);
    onClose();
  };
  
  return (
    <div className="ai-config-panel">
      <div className="config-header">
        <h2>Configura Provider AI</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="provider">Provider AI</label>
          <select 
            id="provider" 
            value={provider} 
            onChange={handleProviderChange}
            className="form-control"
          >
            <option value="openai">OpenAI</option>
            <option value="claude">Anthropic Claude</option>
            <option value="gemini">Google Gemini</option>
            <option value="mockai">Mock AI</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="model">Modello</label>
          <select 
            id="model" 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="form-control"
          >
            {getModelOptions(provider).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="apiKey">API Key</label>
          <input 
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Inserisci la tua API key"
            className="form-control"
          />
          <small className="form-text text-muted">
            La tua API key è memorizzata solo localmente nel tuo browser.
          </small>
        </div>
        
        <div className="form-group api-info">
          {provider === 'openai' && (
            <p>Per ottenere una API key di OpenAI, visita <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
          )}
          {provider === 'claude' && (
            <p>Per ottenere una API key di Claude, visita <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></p>
          )}
          {provider === 'gemini' && (
            <p>Per ottenere una API key di Gemini, visita <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer">ai.google.dev</a></p>
          )}
          {provider === 'mockai' && (
            <p>Per ottenere una API key di MockAi, visita <a href="https://localhost:3000/" target="_blank" rel="noopener noreferrer">localhost:3000</a></p>
          )}
        </div>
        
        {/* Checkbox per modalità testing senza API key */}
        <div className="form-check">
          <label className="form-check-label" htmlFor="mockMode">
            Usa modalità demo (con provider MockAI)
          </label>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Salva configurazione
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIConfigPanel;