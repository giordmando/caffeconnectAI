import React, { useState } from 'react';
import { AIProviderConfig } from '../types/AIProvider';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useServices } from '../contexts/ServiceContext';

interface AIConfigPanelProps {
  onClose: () => void;
}

/**
 * Component for configuring AI provider settings
 */
const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onClose }) => {
  const { changeAIProvider, currentProvider } = useServices();
  
  // Load saved configuration
  const [savedConfig, setSavedConfig] = useLocalStorage<{
    provider: string;
    config: AIProviderConfig;
  }>('cafeconnect-ai-config', {
    provider: 'mockai',
    config: {
      apiKey: '',
      model: 'mockai-sim'
    }
  });
  
  // Local state for form
  const [provider, setProvider] = useState(savedConfig.provider);
  const [apiKey, setApiKey] = useState(savedConfig.config.apiKey);
  const [model, setModel] = useState(savedConfig.config.model);
  
  // Get model options based on provider
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
  
  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    // Select first available model for the new provider
    setModel(getModelOptions(newProvider)[0].value);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const config: AIProviderConfig = {
      apiKey,
      model
    };
    
    // Save to localStorage
    setSavedConfig({
      provider,
      config
    });
    
    // Update the AI service
    changeAIProvider(provider, config);
    
    // Close the panel
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
        
        {/* Checkbox for testing mode without API key */}
        <div className="form-check">
          <input
            type="checkbox"
            id="mockMode"
            checked={provider === 'mockai'}
            onChange={(e) => {
              if (e.target.checked) {
                setProvider('mockai');
                setModel('mockai-sim');
              }
            }}
            className="form-check-input"
          />
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