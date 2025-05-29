import React, { useState } from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type FunctionsConfig = AppConfig['functions'];

export const FunctionSettingsPanel: React.FC<IConfigSection<FunctionsConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const [availableFunctions] = useState<string[]>([
    'get_user_loyalty_points',
    'get_user_preferences',
    'get_menu_recommendations',
    'get_product_recommendations',
    'track_user_action',
    'search_product_by_name',
    'view_item_details'
  ]);
  
  const handleFunctionToggle = (functionName: string, enabled: boolean) => {
    let newEnabledFunctions: string[];
    if (enabled) {
      newEnabledFunctions = [...config.enabledFunctions, functionName];
    } else {
      newEnabledFunctions = config.enabledFunctions.filter(fn => fn !== functionName);
    }
    onChange('enabledFunctions', newEnabledFunctions);
  };
  
  return (
    <div className={`config-section ${className}`}>
      <h3>Funzioni Abilitate</h3>
      
      <div className="functions-list">
        {availableFunctions.map(functionName => (
          <div key={functionName} className="function-item">
            <div className="form-check">
              <input
                type="checkbox"
                id={`function-${functionName}`}
                checked={config.enabledFunctions.includes(functionName)}
                onChange={(e) => handleFunctionToggle(functionName, e.target.checked)}
              />
              <label htmlFor={`function-${functionName}`}>{functionName}</label>
            </div>
          </div>
        ))}
      </div>
      
      <button
        className="btn btn-secondary"
        onClick={() => onChange('enabledFunctions', availableFunctions)}
      >
        Abilita Tutte
      </button>
      
      <button
        className="btn btn-secondary"
        onClick={() => onChange('enabledFunctions', [])}
      >
        Disabilita Tutte
      </button>
    </div>
  );
};