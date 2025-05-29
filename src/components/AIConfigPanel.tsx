import React, { useState, useEffect } from 'react';
import { useServices } from '../contexts/ServiceProvider';
import { configManager } from '../config/ConfigManager';
import { AppConfig } from '../config/interfaces/IAppConfig';

interface AIConfigPanelProps {
  onClose: () => void;
}

// Definiamo un tipo standard per le opzioni del modello
interface ModelOption {
  id: string;
  name: string;
}

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ onClose }) => {
  const { reloadServices, appConfig } = useServices(); // Otteniamo appConfig dal contesto

  // Stato locale inizializzato da ConfigManager o dai default se appConfig non è pronto
  const initialAiConfig = appConfig?.ai || configManager.getSection('ai');

  const [currentAiConfig, setCurrentAiConfig] = useState<AppConfig['ai']>(initialAiConfig);

  const [provider, setProvider] = useState(currentAiConfig.activeProvider);
  const [apiKey, setApiKey] = useState(currentAiConfig.apiKey);
  const [model, setModel] = useState(currentAiConfig.activeModel);
  const [enableAdvancedFunctionSupport, setEnableAdvancedFunctionSupport] = useState(
    currentAiConfig.activeOptions.enableAdvancedFunctionSupport
  );
  const [useMockFunctions, setUseMockFunctions] = useState(
    currentAiConfig.activeOptions.useMockFunctions
  );

  // Aggiorna lo stato locale se appConfig cambia (es. dopo il caricamento iniziale)
  useEffect(() => {
    if (appConfig) {
      const updatedGlobalAiConfig = appConfig.ai;
      setCurrentAiConfig(updatedGlobalAiConfig);
      setProvider(updatedGlobalAiConfig.activeProvider);
      setApiKey(updatedGlobalAiConfig.apiKey);
      setModel(updatedGlobalAiConfig.activeModel);
      setEnableAdvancedFunctionSupport(updatedGlobalAiConfig.activeOptions.enableAdvancedFunctionSupport);
      setUseMockFunctions(updatedGlobalAiConfig.activeOptions.useMockFunctions);
    }
  }, [appConfig]);


  // Get model options based on provider, standardizzando il tipo di ritorno
  const getModelOptions = (prov: string): ModelOption[] => {
    const providerDetails = currentAiConfig.providers[prov];
    if (providerDetails && providerDetails.models) {
      // La configurazione usa { id: string; name: string; }
      return providerDetails.models.map(m => ({ id: m.id, name: m.name }));
    }
    // Fallback standardizzato
    return [{ id: 'default', name: 'Default Model' }];
  };

  // Handle provider change
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    setProvider(newProvider);
    const providerDetails = currentAiConfig.providers[newProvider];
    // Usa il defaultModel del provider se esiste, altrimenti il primo modello della lista
    const defaultModelForProvider = providerDetails?.defaultModel;
    const modelsForProvider = getModelOptions(newProvider);
    setModel(defaultModelForProvider || (modelsForProvider.length > 0 ? modelsForProvider[0].id : 'default'));
    setUseMockFunctions(newProvider === 'mockai');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newActiveOptions: AppConfig['ai']['activeOptions'] = {
      enableAdvancedFunctionSupport,
      useMockFunctions,
    };

    configManager.updateSection('ai', {
      activeProvider: provider,
      apiKey: apiKey,
      activeModel: model,
      activeOptions: newActiveOptions,
    });

    try {
      await reloadServices();
      console.log('AI configuration saved and services reloaded.');
    } catch (error) {
      console.error('Error reloading services after AI config change:', error);
    }

    onClose();
  };

  const selectedProviderDetails = currentAiConfig.providers[provider];

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
            {Object.keys(currentAiConfig.providers).map(key => (
              <option key={key} value={key}>
                {currentAiConfig.providers[key].displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="model">Modello</label>
          <select
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="form-control"
            disabled={!selectedProviderDetails}
          >
            {/* Ora getModelOptions restituisce sempre ModelOption[] */}
            {selectedProviderDetails && getModelOptions(provider).map((option: ModelOption) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProviderDetails?.requiresApiKey && (
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
              La tua API key è memorizzata nella configurazione dell'app (localStorage).
            </small>
          </div>
        )}

        <div className="form-group api-info">
          {provider === 'openai' && (
            <div className="api-info">
              <p>Per ottenere una API key di OpenAI:</p>
              <ol>
                <li>Accedi al tuo account su <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer">platform.openai.com</a></li>
                <li>Vai alla sezione API Keys</li>
                <li>Clicca su "Create new secret key"</li>
                <li>Imposta un nome per la chiave (opzionale) e copia la chiave generata</li>
                <li>Incolla la chiave qui</li>
              </ol>
              <p>Nota: I modelli GPT-4 potrebbero richiedere un account con accesso avanzato.</p>
            </div>
          )}
          {/* Aggiungi qui if per altri provider se necessario */}
        </div>

        <div className="form-check">
          <input
            type="checkbox"
            id="advancedFunctionSupport"
            checked={enableAdvancedFunctionSupport}
            onChange={(e) => setEnableAdvancedFunctionSupport(e.target.checked)}
            className="form-check-input"
          />
          <label className="form-check-label" htmlFor="advancedFunctionSupport">
            Abilita supporto avanzato alle funzioni (ciclo di chiamate multiple)
          </label>
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            id="useMockFunctions"
            checked={useMockFunctions}
            onChange={(e) => setUseMockFunctions(e.target.checked)}
            className="form-check-input"
            disabled={provider !== 'mockai' && provider !== 'openai'}
          />
          <label className="form-check-label" htmlFor="useMockFunctions">
            Usa funzioni mock (per testing e sviluppo)
          </label>
          <small className="form-text text-muted d-block mt-1">
            Attiva questa opzione per usare dati simulati anziché chiamare API reali per le funzioni.
            {provider !== 'mockai' && provider !== 'openai' && " (Disponibile solo per MockAI o OpenAI)"}
          </small>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Salva e Riavvia Servizi
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
