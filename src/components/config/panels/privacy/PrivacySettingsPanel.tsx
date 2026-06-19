import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type PrivacyPanelConfig = Pick<AppConfig, 'privacy' | 'dataGovernance'>;

const DEFAULT_GOVERNANCE: NonNullable<AppConfig['dataGovernance']> = {
  customerProfileStorage: 'local-only',
  conversationTranscript: 'local',
  analyticsEvents: 'gateway-aggregate',
  tenantIsolation: 'schema-per-tenant',
  retentionDays: 30,
  region: 'eu',
  encryptionMode: 'platform',
  allowSensitiveInference: false
};

export const PrivacySettingsPanel: React.FC<IConfigSection<PrivacyPanelConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const privacy = config.privacy;
  const governance = { ...DEFAULT_GOVERNANCE, ...(config.dataGovernance || {}) };

  const updatePrivacy = (field: string, value: any) => {
    onChange('privacy', { ...privacy, [field]: value });
  };

  const updateGovernance = (field: string, value: any) => {
    onChange('dataGovernance', { ...governance, [field]: value });
  };

  return (
    <div className={`config-section ${className}`}>
      <h3>Impostazioni Privacy</h3>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="privacy-enabled"
            checked={privacy?.enabled || false}
            onChange={(e) => updatePrivacy('enabled', e.target.checked)}
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
          value={privacy?.bannerTitle || 'Preferenze privacy'}
          onChange={(e) => updatePrivacy('bannerTitle', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="privacy-message">Messaggio Banner</label>
        <textarea
          id="privacy-message"
          rows={3}
          value={privacy?.bannerMessage || ''}
          onChange={(e) => updatePrivacy('bannerMessage', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="privacy-info">Info Aggiuntive</label>
        <textarea
          id="privacy-info"
          rows={2}
          value={privacy?.additionalInfo || ''}
          onChange={(e) => updatePrivacy('additionalInfo', e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="privacy-link">Link Privacy Policy</label>
        <input
          id="privacy-link"
          type="text"
          value={privacy?.policyLink || ''}
          onChange={(e) => updatePrivacy('policyLink', e.target.value)}
          placeholder="URL privacy policy"
        />
      </div>

      <h4>Governance dati enterprise</h4>

      <div className="governance-grid">
        <div className="form-group">
          <label htmlFor="customer-profile-storage">Profilo cliente</label>
          <select
            id="customer-profile-storage"
            value={governance.customerProfileStorage}
            onChange={(e) => updateGovernance('customerProfileStorage', e.target.value)}
          >
            <option value="local-only">Local-first sul dispositivo</option>
            <option value="cloud-opt-in">Cloud solo opt-in</option>
            <option value="disabled">Disabilitato</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="conversation-transcript">Transcript conversazioni</label>
          <select
            id="conversation-transcript"
            value={governance.conversationTranscript}
            onChange={(e) => updateGovernance('conversationTranscript', e.target.value)}
          >
            <option value="none">Non salvare transcript</option>
            <option value="local">Solo locale/consenso funzionale</option>
            <option value="cloud-opt-in">Cloud solo opt-in</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="analytics-events">Eventi analytics</label>
          <select
            id="analytics-events"
            value={governance.analyticsEvents}
            onChange={(e) => updateGovernance('analyticsEvents', e.target.value)}
          >
            <option value="disabled">Disabilitati</option>
            <option value="local-only">Solo locali</option>
            <option value="gateway-aggregate">Gateway aggregato/minimizzato</option>
            <option value="gateway-detailed">Gateway dettagliato</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tenant-isolation">Isolamento tenant</label>
          <select
            id="tenant-isolation"
            value={governance.tenantIsolation}
            onChange={(e) => updateGovernance('tenantIsolation', e.target.value)}
          >
            <option value="shared-db">DB condiviso + tenant_id</option>
            <option value="schema-per-tenant">Schema per tenant</option>
            <option value="database-per-tenant">Database per tenant</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="retention-days">Retention giorni</label>
          <input
            id="retention-days"
            type="number"
            min="1"
            max="730"
            value={governance.retentionDays}
            onChange={(e) => updateGovernance('retentionDays', Number(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label htmlFor="data-region">Regione dati</label>
          <select
            id="data-region"
            value={governance.region}
            onChange={(e) => updateGovernance('region', e.target.value)}
          >
            <option value="eu">EU</option>
            <option value="us">US</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="allow-sensitive-inference"
            checked={governance.allowSensitiveInference}
            onChange={(e) => updateGovernance('allowSensitiveInference', e.target.checked)}
          />
          <label htmlFor="allow-sensitive-inference">Consenti inferenze sensibili</label>
        </div>
        <small className="form-text">
          Da lasciare disattivato salvo basi giuridiche e consenso esplicito
        </small>
      </div>
      
      <h4>Etichette Livelli di Consenso</h4>
      
      <div className="form-group">
        <label htmlFor="minimal-label">Consenso Minimo</label>
        <input
          id="minimal-label"
          type="text"
          value={privacy?.consentLabels?.minimal || 'Solo essenziali'}
          onChange={(e) => updatePrivacy('consentLabels', { ...privacy.consentLabels, minimal: e.target.value })}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="functional-label">Consenso Funzionale</label>
        <input
          id="functional-label"
          type="text"
          value={privacy?.consentLabels?.functional || 'Funzionali'}
          onChange={(e) => updatePrivacy('consentLabels', { ...privacy.consentLabels, functional: e.target.value })}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="analytics-label">Consenso Completo</label>
        <input
          id="analytics-label"
          type="text"
          value={privacy?.consentLabels?.analytics || 'Tutto (consigliato)'}
          onChange={(e) => updatePrivacy('consentLabels', { ...privacy.consentLabels, analytics: e.target.value })}
        />
      </div>
    </div>
  );
};
