import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type AIConfig = AppConfig['ai'];

export const SystemPromptPanel: React.FC<IConfigSection<AIConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>System Prompt</h3>
      
      <div className="form-group">
        <label htmlFor="system-prompt">Prompt di Sistema</label>
        <textarea
          id="system-prompt"
          rows={10}
          value={config.systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder="Prompt di sistema per l'AI"
        />
        <small className="form-text">
          Questo è il prompt di sistema che definisce il comportamento dell'AI.
          Puoi usare {'{business.name}'} e altri segnaposto per renderlo dinamico.
        </small>
      </div>
      
      <div className="prompt-variables">
        <h4>Variabili Disponibili</h4>
        <ul>
          <li><code>{'{business.name}'}</code> - Nome del business</li>
          <li><code>{'{business.type}'}</code> - Tipo di business</li>
          <li><code>{'{business.indirizzo}'}</code> - Indirizzo</li>
          <li><code>{'{business.telefono}'}</code> - Telefono</li>
          <li><code>{'{business.email}'}</code> - Email</li>
          <li><code>{'{business.orari}'}</code> - Orari di apertura</li>
        </ul>
      </div>
    </div>
  );
};