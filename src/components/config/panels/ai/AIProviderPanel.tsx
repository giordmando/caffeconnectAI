import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type AIConfig = AppConfig['ai'];

export const AIProviderPanel: React.FC<IConfigSection<AIConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Provider AI</h3>
      
      <div className="form-group">
        <label htmlFor="default-provider">Provider AI Predefinito</label>
        <select
          id="default-provider"
          value={config.defaultProvider}
          onChange={(e) => onChange('defaultProvider', e.target.value)}
        >
          {Object.keys(config.providers).map(key => (
            <option key={key} value={key}>
              {config.providers[key].displayName}
            </option>
          ))}
        </select>
        <small className="form-text">
          Provider utilizzato se l'utente non ne seleziona uno specifico
        </small>
      </div>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="enableAdvancedFunctionSupport"
            checked={config.activeOptions.enableAdvancedFunctionSupport}
            onChange={(e) => onChange('activeOptions.enableAdvancedFunctionSupport', e.target.checked)}
          />
          <label htmlFor="enableAdvancedFunctionSupport">
            Abilita supporto avanzato alle funzioni (ciclo chiamate multiple)
          </label>
        </div>
      </div>
      
      <div className="providers-container">
        <h4>Provider Disponibili</h4>
        {Object.entries(config.providers).map(([key, provider]) => (
          <div key={key} className="provider-card">
            <h5>{provider.displayName}</h5>
            <div className="provider-models">
              <p>Modelli disponibili:</p>
              <ul>
                {provider.models.map(model => (
                  <li key={model.id}>
                    {model.name}
                    {model.id === provider.defaultModel && (
                      <span className="default-badge"> (default)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      
      <p className="form-text">
        Le impostazioni del provider AI attivo (modello, API key) vengono gestite 
        nel pannello "Configurazione AI" accessibile dall'header dell'applicazione.
      </p>
    </div>
  );
};