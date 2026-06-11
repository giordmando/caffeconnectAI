import React, { useState } from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type CatalogConfig = AppConfig['catalog'];

function toGoogleSheetCsvUrl(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);

  if (!match) {
    return trimmed;
  }

  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
  const spreadsheetId = match[1];
  const gid = gidMatch?.[1] || '0';

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

export const CatalogSettingsPanel: React.FC<IConfigSection<CatalogConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const [menuSheetUrl, setMenuSheetUrl] = useState(config.menuEndpoint || '');
  const [productsSheetUrl, setProductsSheetUrl] = useState(config.productsEndpoint || '');

  const applyRemoteEndpoint = (field: 'menuEndpoint' | 'productsEndpoint', value: string) => {
    const endpoint = toGoogleSheetCsvUrl(value);
    onChange(field, endpoint);
    onChange('enableLocalData', false);

    if (field === 'menuEndpoint') {
      setMenuSheetUrl(endpoint);
    } else {
      setProductsSheetUrl(endpoint);
    }
  };

  return (
    <div className={`config-section ${className}`}>
      <h3>Impostazioni Catalogo</h3>

      <div className="catalog-onboarding-card">
        <div>
          <h4>Onboarding rapido Google Sheets</h4>
          <p className="form-text">
            Pubblica due fogli come CSV: uno per il menu e uno per i prodotti. Puoi incollare anche il link Google Sheet normale: verra convertito nel formato CSV.
          </p>
        </div>

        <div className="catalog-steps">
          <span>1. Scarica template</span>
          <span>2. Compila su Sheets</span>
          <span>3. Pubblica come CSV</span>
          <span>4. Incolla URL</span>
        </div>

        <div className="catalog-template-actions">
          <a className="catalog-template-link" href="/template-json/menu-template.csv" download>
            Template menu CSV
          </a>
          <a className="catalog-template-link" href="/template-json/product-template.csv" download>
            Template prodotti CSV
          </a>
          <a className="catalog-template-link" href="/template-json/menu-template.json" download>
            Template menu JSON
          </a>
          <a className="catalog-template-link" href="/template-json/product-template.json" download>
            Template prodotti JSON
          </a>
        </div>

        <div className="catalog-onboarding-grid">
          <div className="form-group">
            <label htmlFor="menu-sheet-url">Link Google Sheet / CSV menu</label>
            <input
              id="menu-sheet-url"
              type="text"
              value={menuSheetUrl}
              onChange={(e) => setMenuSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
            />
            <button
              type="button"
              className="catalog-apply-btn"
              onClick={() => applyRemoteEndpoint('menuEndpoint', menuSheetUrl)}
              disabled={!menuSheetUrl.trim()}
            >
              Usa per menu
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="products-sheet-url">Link Google Sheet / CSV prodotti</label>
            <input
              id="products-sheet-url"
              type="text"
              value={productsSheetUrl}
              onChange={(e) => setProductsSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
            />
            <button
              type="button"
              className="catalog-apply-btn"
              onClick={() => applyRemoteEndpoint('productsEndpoint', productsSheetUrl)}
              disabled={!productsSheetUrl.trim()}
            >
              Usa per prodotti
            </button>
          </div>
        </div>
      </div>
      
      <div className="form-group">
        <div className="form-check">
          <input
            type="checkbox"
            id="enable-local-data"
            checked={config.enableLocalData}
            onChange={(e) => onChange('enableLocalData', e.target.checked)}
          />
          <label htmlFor="enable-local-data">Usa dati locali (per demo)</label>
        </div>
        <small className="form-text">
          Se abilitato, usa i dati mock inclusi nell'app. Disabilita per usare gli endpoint.
        </small>
      </div>
      
      <div className="form-group">
        <label htmlFor="menu-endpoint">Endpoint Menu</label>
        <input
          id="menu-endpoint"
          type="text"
          value={config.menuEndpoint || ''}
          onChange={(e) => onChange('menuEndpoint', e.target.value)}
          placeholder="URL dell'endpoint menu"
          disabled={config.enableLocalData}
        />
        <small className="form-text">
          Accetta JSON o CSV pubblico, incluso un Google Sheet pubblicato come CSV.{' '}
          <a href="/template-json/menu-template.json" download>
            Scarica il template JSON
          </a>{' '}
          oppure{' '}
          <a href="/template-json/menu-template.csv" download>
            CSV
          </a> per l'endpoint menu.
        </small>
      </div>
      
      <div className="form-group">
        <label htmlFor="products-endpoint">Endpoint Prodotti</label>
        <input
          id="products-endpoint"
          type="text"
          value={config.productsEndpoint || ''}
          onChange={(e) => onChange('productsEndpoint', e.target.value)}
          placeholder="URL dell'endpoint prodotti"
          disabled={config.enableLocalData}
        />
        <small className="form-text">
          Accetta JSON o CSV pubblico, incluso un Google Sheet pubblicato come CSV.{' '}
          <a href="/template-json/product-template.json" download>
            Scarica il template JSON
          </a>{' '}
          oppure{' '}
          <a href="/template-json/product-template.csv" download>
            CSV
          </a> per l'endpoint prodotti.
        </small>
      </div>
      
      <div className="form-group">
        <label htmlFor="refresh-interval">Intervallo Aggiornamento (minuti)</label>
        <input
          id="refresh-interval"
          type="number"
          min="5"
          value={config.dataRefreshInterval}
          onChange={(e) => onChange('dataRefreshInterval', parseInt(e.target.value))}
        />
      </div>
    </div>
  );
};
