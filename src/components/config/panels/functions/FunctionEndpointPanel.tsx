import React, { useState } from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';


type FunctionsConfig = AppConfig['functions'];

export const FunctionEndpointPanel: React.FC<IConfigSection<FunctionsConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleLoadFunctions = async () => {
    if (!config.customFunctionEndpoint) {
      setError('Devi specificare un endpoint valido.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(config.customFunctionEndpoint);
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.functions) {
        throw new Error('Formato risposta non valido');
      }
      
      const functionNames = data.functions.map((f: any) => f.name);
      onChange('enabledFunctions', functionNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`config-section ${className}`}>
      <h3>Endpoint Funzioni</h3>
      
      <div className="form-group">
        <label htmlFor="custom-function-endpoint">Endpoint Funzioni Personalizzate</label>
        <div className="endpoint-input-group">
          <input
            id="custom-function-endpoint"
            type="text"
            value={config.customFunctionEndpoint || ''}
            onChange={(e) => onChange('customFunctionEndpoint', e.target.value)}
            placeholder="URL dell'endpoint"
            className={error ? 'input-error' : ''}
          />
          <button
            className="load-btn"
            onClick={handleLoadFunctions}
            disabled={isLoading || !config.customFunctionEndpoint}
          >
            {isLoading ? 'Caricamento...' : 'Carica'}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <small className="form-text">
          <a href="/template-json/registration-funzioni-personalizzate.json" download>
            Scarica il template JSON
          </a>
        </small>
      </div>
      
      <h4>Endpoint Dati per Funzioni</h4>
      <small className="form-text">
        Specifica gli endpoint da cui le funzioni recuperano i dati.
      </small>
      
      {config.enabledFunctions.map(functionName => (
        <div key={functionName} className="form-group">
          <label htmlFor={`endpoint-${functionName}`}>{functionName}</label>
          <input
            id={`endpoint-${functionName}`}
            type="text"
            value={(config.functionDataEndpoints || {})[functionName] || ''}
            onChange={(e) => {
              const newEndpoints = {
                ...(config.functionDataEndpoints || {}),
                [functionName]: e.target.value.trim()
              };
              onChange('functionDataEndpoints', newEndpoints);
            }}
            placeholder={`URL endpoint per ${functionName}`}
          />
        </div>
      ))}
    </div>
  );
};
