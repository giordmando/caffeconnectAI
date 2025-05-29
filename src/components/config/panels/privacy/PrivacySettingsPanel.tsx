import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type PrivacyConfig = AppConfig['privacy'];

export const PrivacySettingsPanel: React.FC<IConfigSection<PrivacyConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Impostazioni Privacy</h3>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="privacy-enabled"
            checked={config?.enabled || false}
            onChange={(e) => onChange('enabled', e.target.checked)}
          />
          <label htmlFor="privacy-enabled">Abilita Banner Consenso</label>
        </div>
      </div>
      
      <h4>Testi del Banner</h4>
      
      <div className="form-group">
        <label htmlFor="privacy-title">Titolo Banner</label>
        <input
          id="privacy-title"
          type="text"
          value={config?.bannerTitle || 'Preferenze privacy'}
          onChange={(e) => onChange('bannerTitle', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="privacy-message">Messaggio Banner</label>
        <textarea
          id="privacy-message"
          rows={3}
          value={config?.bannerMessage || ''}
          onChange={(e) => onChange('bannerMessage', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="privacy-info">Info Aggiuntive</label>
        <textarea
          id="privacy-info"
          rows={2}
          value={config?.additionalInfo || ''}
          onChange={(e) => onChange('additionalInfo', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="privacy-link">Link Privacy Policy</label>
        <input
          id="privacy-link"
          type="text"
          value={config?.policyLink || ''}
          onChange={(e) => onChange('policyLink', e.target.value)}
          placeholder="URL privacy policy"
        />
      </div>
      
      <h4>Etichette Livelli di Consenso</h4>
      
      <div className="form-group">
        <label htmlFor="minimal-label">Consenso Minimo</label>
        <input
          id="minimal-label"
          type="text"
          value={config?.consentLabels?.minimal || 'Solo essenziali'}
          onChange={(e) => onChange('consentLabels.minimal', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="functional-label">Consenso Funzionale</label>
        <input
          id="functional-label"
          type="text"
          value={config?.consentLabels?.functional || 'Funzionali'}
          onChange={(e) => onChange('consentLabels.functional', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="analytics-label">Consenso Completo</label>
        <input
          id="analytics-label"
          type="text"
          value={config?.consentLabels?.analytics || 'Tutto (consigliato)'}
          onChange={(e) => onChange('consentLabels.analytics', e.target.value)}
        />
      </div>
    </div>
  );
};