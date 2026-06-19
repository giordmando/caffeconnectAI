import React, { useMemo, useState } from 'react';
import { AppConfig } from '../config/interfaces/IAppConfig';

interface AdminControlPlaneProps {
  appConfig: AppConfig;
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
}

const ALLOWED_SECTIONS: Array<keyof AppConfig> = [
  'business',
  'catalog',
  'knowledgeBase',
  'knowledgeSources',
  'merchantKnowledge',
  'tenant',
  'agents',
  'integrations',
  'ui',
  'privacy',
  'dataGovernance'
];

const BLOCKED_KEYS = new Set([
  'apiKey',
  'openaiApiKey',
  'secret',
  'token',
  'password',
  'userContext',
  'customerProfile',
  'customerProfiles',
  'conversation',
  'conversations',
  'transcript',
  'transcripts',
  'messages'
]);

function stripSensitiveConfig(value: any): any {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveConfig);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value).reduce((clean, [key, entryValue]) => {
    if (!BLOCKED_KEYS.has(key)) {
      clean[key] = stripSensitiveConfig(entryValue);
    }
    return clean;
  }, {} as Record<string, any>);
}

function getSafeMerchantConfig(appConfig: AppConfig): Partial<AppConfig> {
  return ALLOWED_SECTIONS.reduce((clean, section) => {
    const value = appConfig[section];
    if (value !== undefined) {
      clean[section] = stripSensitiveConfig(value) as any;
    }
    return clean;
  }, {} as Partial<AppConfig>);
}

export function AdminControlPlane({ appConfig, onClose, onSaved }: AdminControlPlaneProps) {
  const defaultMerchantId = process.env.REACT_APP_MERCHANT_ID || appConfig.tenant?.merchantId || 'cafeconnect-roastery';
  const defaultGatewayUrl = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:8787';
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl);
  const [merchantId, setMerchantId] = useState(defaultMerchantId);
  const [adminKey, setAdminKey] = useState('');
  const [configText, setConfigText] = useState(() => JSON.stringify(getSafeMerchantConfig(appConfig), null, 2));
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const endpoint = useMemo(() => {
    const cleanGatewayUrl = gatewayUrl.replace(/\/$/, '');
    return `${cleanGatewayUrl}/v1/merchants/${encodeURIComponent(merchantId)}/config`;
  }, [gatewayUrl, merchantId]);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminKey}`
  }), [adminKey]);

  const loadConfig = async () => {
    setIsBusy(true);
    setStatus('');

    try {
      const response = await fetch(endpoint, { headers });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setConfigText(JSON.stringify(payload.config || getSafeMerchantConfig(appConfig), null, 2));
      setStatus(payload.found ? 'Configurazione caricata dal gateway.' : 'Nessuna configurazione remota: pronta la base locale.');
    } catch (error: any) {
      setStatus(`Errore caricamento: ${error.message || 'richiesta fallita'}`);
    } finally {
      setIsBusy(false);
    }
  };

  const saveConfig = async () => {
    setIsBusy(true);
    setStatus('');

    try {
      const parsedConfig = JSON.parse(configText);
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ config: parsedConfig })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      setConfigText(JSON.stringify(payload.config || parsedConfig, null, 2));
      setStatus(`Configurazione salvata. Versione ${payload.version || 'n/d'}.`);
      await onSaved?.();
    } catch (error: any) {
      setStatus(`Errore salvataggio: ${error.message || 'JSON non valido o richiesta fallita'}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="config-panel admin-control-plane">
      <div className="config-header">
        <h2>Admin Control Plane</h2>
        <button type="button" className="close-button" onClick={onClose}>x</button>
      </div>

      <div className="admin-control-body">
        <section className="admin-control-section">
          <h3>Connessione gateway</h3>
          <div className="admin-control-grid">
            <label>
              Gateway URL
              <input value={gatewayUrl} onChange={event => setGatewayUrl(event.target.value)} />
            </label>
            <label>
              Merchant ID
              <input value={merchantId} onChange={event => setMerchantId(event.target.value)} />
            </label>
            <label>
              Admin write key
              <input
                type="password"
                value={adminKey}
                onChange={event => setAdminKey(event.target.value)}
                placeholder="Inserisci la chiave admin"
              />
            </label>
          </div>
        </section>

        <section className="admin-control-section">
          <h3>Configurazione merchant</h3>
          <textarea
            className="admin-config-editor"
            value={configText}
            onChange={event => setConfigText(event.target.value)}
            spellCheck={false}
          />
        </section>
      </div>

      <div className="admin-control-footer">
        <span className="admin-control-status">{status}</span>
        <div>
          <button type="button" onClick={loadConfig} disabled={isBusy || !adminKey}>Carica</button>
          <button type="button" className="primary-action" onClick={saveConfig} disabled={isBusy || !adminKey}>Salva</button>
        </div>
      </div>
    </div>
  );
}
