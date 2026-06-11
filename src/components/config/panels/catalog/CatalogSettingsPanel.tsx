import React, { useState } from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';
import {
  CatalogPreviewKind,
  extractCatalogRecords,
  getMissingCatalogColumns,
  normalizeCatalogEndpoint,
  normalizeMenuRecord,
  normalizeProductRecord,
  parseCatalogPayload
} from '../../../../services/catalog/catalogDataUtils';

type CatalogConfig = AppConfig['catalog'];

interface CatalogPreviewResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  count: number;
  columns: string[];
  missingColumns: string[];
  sample: Array<Record<string, any>>;
}

const EMPTY_PREVIEW: CatalogPreviewResult = {
  status: 'idle',
  message: '',
  count: 0,
  columns: [],
  missingColumns: [],
  sample: []
};

export const CatalogSettingsPanel: React.FC<IConfigSection<CatalogConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const [menuSheetUrl, setMenuSheetUrl] = useState(config.menuEndpoint || '');
  const [productsSheetUrl, setProductsSheetUrl] = useState(config.productsEndpoint || '');
  const [menuPreview, setMenuPreview] = useState<CatalogPreviewResult>(EMPTY_PREVIEW);
  const [productsPreview, setProductsPreview] = useState<CatalogPreviewResult>(EMPTY_PREVIEW);

  const applyRemoteEndpoint = (field: 'menuEndpoint' | 'productsEndpoint', value: string) => {
    const endpoint = normalizeCatalogEndpoint(value);
    onChange(field, endpoint);
    onChange('enableLocalData', false);

    if (field === 'menuEndpoint') {
      setMenuSheetUrl(endpoint);
    } else {
      setProductsSheetUrl(endpoint);
    }
  };

  const validateSource = async (kind: CatalogPreviewKind, value: string) => {
    const endpoint = normalizeCatalogEndpoint(value);
    const setPreview = kind === 'menu' ? setMenuPreview : setProductsPreview;

    setPreview({
      ...EMPTY_PREVIEW,
      status: 'loading',
      message: 'Verifica sorgente in corso...'
    });

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Risposta ${response.status}`);
      }

      const rawData = parseCatalogPayload(await response.text());
      const records = extractCatalogRecords(rawData, kind);
      const columns = records.length > 0 ? Object.keys(records[0]) : [];
      const missingColumns = getMissingCatalogColumns(records, kind);

      setPreview({
        status: records.length > 0 ? 'success' : 'error',
        message: records.length > 0
          ? `${records.length} righe leggibili.`
          : 'Nessuna riga leggibile trovata.',
        count: records.length,
        columns,
        missingColumns,
        sample: records.slice(0, 3).map((record, index) => {
          if (kind === 'menu') {
            const normalized = normalizeMenuRecord(record, index);
            return {
              id: normalized.id,
              name: normalized.name,
              category: normalized.category,
              price: normalized.price,
              timeOfDay: normalized.timeOfDay,
              allergens: normalized.allergens
            };
          }

          const normalized = normalizeProductRecord(record, index);
          return {
            id: normalized.id,
            name: normalized.name,
            category: normalized.category,
            price: normalized.price,
            inStock: normalized.inStock
          };
        })
      });
    } catch (error) {
      setPreview({
        ...EMPTY_PREVIEW,
        status: 'error',
        message: error instanceof Error
          ? `Verifica non riuscita: ${error.message}`
          : 'Verifica non riuscita.'
      });
    }
  };

  const renderPreview = (preview: CatalogPreviewResult) => {
    if (preview.status === 'idle') return null;

    return (
      <div className={`catalog-preview catalog-preview-${preview.status}`}>
        <strong>{preview.message}</strong>
        {preview.columns.length > 0 && (
          <p>Colonne rilevate: {preview.columns.join(', ')}</p>
        )}
        {preview.missingColumns.length > 0 && (
          <p>Colonne consigliate mancanti: {preview.missingColumns.join(', ')}</p>
        )}
        {preview.sample.length > 0 && (
          <div className="catalog-preview-sample">
            {preview.sample.map((record, index) => (
              <pre key={index}>{JSON.stringify(record, null, 2)}</pre>
            ))}
          </div>
        )}
      </div>
    );
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
            <button
              type="button"
              className="catalog-verify-btn"
              onClick={() => validateSource('menu', menuSheetUrl)}
              disabled={!menuSheetUrl.trim() || menuPreview.status === 'loading'}
            >
              Verifica sorgente
            </button>
            {renderPreview(menuPreview)}
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
            <button
              type="button"
              className="catalog-verify-btn"
              onClick={() => validateSource('products', productsSheetUrl)}
              disabled={!productsSheetUrl.trim() || productsPreview.status === 'loading'}
            >
              Verifica sorgente
            </button>
            {renderPreview(productsPreview)}
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
