import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type UIConfig = AppConfig['ui'];

export const UISettingsPanel: React.FC<IConfigSection<UIConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Impostazioni Interfaccia</h3>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="enable-suggestions"
            checked={config.enableSuggestions}
            onChange={(e) => onChange('enableSuggestions', e.target.checked)}
          />
          <label htmlFor="enable-suggestions">Abilita Suggerimenti di Prompt</label>
        </div>
      </div>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="enable-dynamic-components"
            checked={config.enableDynamicComponents}
            onChange={(e) => onChange('enableDynamicComponents', e.target.checked)}
          />
          <label htmlFor="enable-dynamic-components">
            Abilita Componenti UI Dinamici
          </label>
        </div>
      </div>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="enable-nlp"
            checked={config.enableNLP}
            onChange={(e) => onChange('enableNLP', e.target.checked)}
          />
          <label htmlFor="enable-nlp">Abilita Analisi NLP</label>
        </div>
        <small className="form-text">
          Mostra insight NLP nella sidebar
        </small>
      </div>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="show-sidebar"
            checked={config.showSidebar}
            onChange={(e) => onChange('showSidebar', e.target.checked)}
          />
          <label htmlFor="show-sidebar">Mostra Sidebar</label>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="max-recommendations">Numero Max Raccomandazioni</label>
        <input
          id="max-recommendations"
          type="number"
          min="1"
          max="10"
          value={config.maxRecommendations}
          onChange={(e) => onChange('maxRecommendations', parseInt(e.target.value))}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="welcome-message">Messaggio di Benvenuto</label>
        <textarea
          id="welcome-message"
          rows={3}
          value={config.welcomeMessage}
          onChange={(e) => onChange('welcomeMessage', e.target.value)}
          placeholder="Messaggio di benvenuto"
        />
        <small className="form-text">
          Usa {'{business.name}'} per il nome del business
        </small>
      </div>
    </div>
  );
};