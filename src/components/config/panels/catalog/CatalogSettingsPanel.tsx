import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type CatalogConfig = AppConfig['catalog'];

export const CatalogSettingsPanel: React.FC<IConfigSection<CatalogConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Impostazioni Catalogo</h3>
      
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
          <a href="/template-json/menu-template.json" download>
            Scarica il template JSON
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
          <a href="/template-json/product-template.json" download>
            Scarica il template JSON
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