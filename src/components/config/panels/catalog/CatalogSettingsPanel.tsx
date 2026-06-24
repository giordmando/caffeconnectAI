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
  blockingIssues: string[];
  warnings: string[];
  sample: Array<Record<string, any>>;
  normalizedJson: string;
}

const EMPTY_PREVIEW: CatalogPreviewResult = {
  status: 'idle',
  message: '',
  count: 0,
  columns: [],
  missingColumns: [],
  blockingIssues: [],
  warnings: [],
  sample: [],
  normalizedJson: ''
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
  const [menuImportText, setMenuImportText] = useState('');
  const [productsImportText, setProductsImportText] = useState('');

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

  const validateCatalogPayload = (kind: CatalogPreviewKind, text: string): CatalogPreviewResult => {
    const rawData = parseCatalogPayload(text);
    const records = extractCatalogRecords(rawData, kind);
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    const missingColumns = getMissingCatalogColumns(records, kind);
    const normalizedRecords = records.map((record, index) =>
      kind === 'menu' ? normalizeMenuRecord(record, index) : normalizeProductRecord(record, index)
    );
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (records.length === 0) {
      blockingIssues.push('Nessuna riga leggibile trovata.');
    }

    normalizedRecords.forEach((record: any, index) => {
      const label = record.name || `Riga ${index + 1}`;
      if (!record.name || /^Voce menu|^Prodotto/.test(record.name)) {
        blockingIssues.push(`${label}: manca il nome.`);
      }
      if (!record.category) {
        blockingIssues.push(`${label}: manca la categoria.`);
      }
      if (!record.price || Number(record.price) <= 0) {
        blockingIssues.push(`${label}: prezzo mancante o non valido.`);
      }
      if (!record.description) {
        warnings.push(`${label}: descrizione assente.`);
      }
      if (!record.imageUrl) {
        warnings.push(`${label}: immagine assente.`);
      }
      if (kind === 'menu' && (!record.allergens || record.allergens.length === 0)) {
        warnings.push(`${label}: allergeni non valorizzati.`);
      }
    });

    const sample = normalizedRecords.slice(0, 3).map((record: any) => {
      if (kind === 'menu') {
        return {
          id: record.id,
          name: record.name,
          category: record.category,
          price: record.price,
          timeOfDay: record.timeOfDay,
          allergens: record.allergens
        };
      }

      return {
        id: record.id,
        name: record.name,
        category: record.category,
        price: record.price,
        inStock: record.inStock
      };
    });

    return {
      status: records.length > 0 && blockingIssues.length === 0 ? 'success' : 'error',
      message: records.length > 0
        ? `${records.length} righe leggibili, ${blockingIssues.length} errori bloccanti, ${warnings.length} avvisi.`
        : 'Nessuna riga leggibile trovata.',
      count: records.length,
      columns,
      missingColumns,
      blockingIssues,
      warnings,
      sample,
      normalizedJson: JSON.stringify(
        kind === 'menu' ? { menuItems: normalizedRecords } : { products: normalizedRecords },
        null,
        2
      )
    };
  };

  const setPreviewForKind = (kind: CatalogPreviewKind, preview: CatalogPreviewResult) => {
    if (kind === 'menu') {
      setMenuPreview(preview);
    } else {
      setProductsPreview(preview);
    }
  };

  const validateSource = async (kind: CatalogPreviewKind, value: string) => {
    const endpoint = normalizeCatalogEndpoint(value);

    setPreviewForKind(kind, {
      ...EMPTY_PREVIEW,
      status: 'loading',
      message: 'Verifica sorgente in corso...'
    });

    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Risposta ${response.status}`);
      }

      setPreviewForKind(kind, validateCatalogPayload(kind, await response.text()));
    } catch (error) {
      setPreviewForKind(kind, {
        ...EMPTY_PREVIEW,
        status: 'error',
        message: error instanceof Error
          ? `Verifica non riuscita: ${error.message}`
          : 'Verifica non riuscita.'
      });
    }
  };

  const validateInlineImport = (kind: CatalogPreviewKind, value: string) => {
    if (!value.trim()) {
      setPreviewForKind(kind, {
        ...EMPTY_PREVIEW,
        status: 'error',
        message: 'Incolla un JSON o CSV prima di validare.'
      });
      return;
    }

    try {
      setPreviewForKind(kind, validateCatalogPayload(kind, value));
    } catch (error) {
      setPreviewForKind(kind, {
        ...EMPTY_PREVIEW,
        status: 'error',
        message: error instanceof Error ? `Import non valido: ${error.message}` : 'Import non valido.'
      });
    }
  };

  const handleFileImport = async (kind: CatalogPreviewKind, file?: File) => {
    if (!file) return;
    const text = await file.text();
    if (kind === 'menu') {
      setMenuImportText(text);
    } else {
      setProductsImportText(text);
    }
    validateInlineImport(kind, text);
  };

  const downloadNormalizedJson = (kind: CatalogPreviewKind, preview: CatalogPreviewResult) => {
    if (!preview.normalizedJson) return;
    const blob = new Blob([preview.normalizedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = kind === 'menu' ? 'cafeconnect-menu-normalized.json' : 'cafeconnect-products-normalized.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderPreview = (kind: CatalogPreviewKind, preview: CatalogPreviewResult) => {
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
        {preview.blockingIssues.length > 0 && (
          <ul className="catalog-preview-issues">
            {preview.blockingIssues.slice(0, 6).map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        )}
        {preview.warnings.length > 0 && (
          <p>Avvisi: {preview.warnings.slice(0, 4).join(' · ')}</p>
        )}
        {preview.sample.length > 0 && (
          <div className="catalog-preview-sample">
            {preview.sample.map((record, index) => (
              <pre key={index}>{JSON.stringify(record, null, 2)}</pre>
            ))}
          </div>
        )}
        {preview.normalizedJson && preview.blockingIssues.length === 0 && (
          <button
            type="button"
            className="catalog-verify-btn"
            onClick={() => downloadNormalizedJson(kind, preview)}
          >
            Scarica JSON normalizzato
          </button>
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
            {renderPreview('menu', menuPreview)}
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
            {renderPreview('products', productsPreview)}
          </div>
        </div>
      </div>

      <div className="catalog-onboarding-card">
        <div>
          <h4>Import diretto catalogo</h4>
          <p className="form-text">
            Incolla o carica un file CSV/JSON per validare subito campi, prezzi, immagini e allergeni. Dopo il controllo puoi scaricare il JSON normalizzato e pubblicarlo come endpoint.
          </p>
        </div>

        <div className="catalog-onboarding-grid">
          <div className="form-group">
            <label htmlFor="menu-import-text">Import menu CSV/JSON</label>
            <textarea
              id="menu-import-text"
              value={menuImportText}
              onChange={(e) => setMenuImportText(e.target.value)}
              placeholder="Incolla qui menuItems JSON o CSV con colonne id,name,category,price,description..."
              rows={6}
            />
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => handleFileImport('menu', e.target.files?.[0])}
            />
            <button
              type="button"
              className="catalog-verify-btn"
              onClick={() => validateInlineImport('menu', menuImportText)}
            >
              Valida import menu
            </button>
            {renderPreview('menu', menuPreview)}
          </div>

          <div className="form-group">
            <label htmlFor="products-import-text">Import prodotti CSV/JSON</label>
            <textarea
              id="products-import-text"
              value={productsImportText}
              onChange={(e) => setProductsImportText(e.target.value)}
              placeholder="Incolla qui products JSON o CSV con colonne id,name,category,price,description..."
              rows={6}
            />
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => handleFileImport('products', e.target.files?.[0])}
            />
            <button
              type="button"
              className="catalog-verify-btn"
              onClick={() => validateInlineImport('products', productsImportText)}
            >
              Valida import prodotti
            </button>
            {renderPreview('products', productsPreview)}
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
