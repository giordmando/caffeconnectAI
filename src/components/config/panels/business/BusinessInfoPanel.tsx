import React from 'react';
import { IConfigSection } from '../../interfaces/IConfigSection';
import { AppConfig } from '../../../../config/interfaces/IAppConfig';

type BusinessConfig = AppConfig['business'];

export const BusinessInfoPanel: React.FC<IConfigSection<BusinessConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Informazioni Business</h3>
      
      <div className="form-group">
        <label htmlFor="business-name">Nome Business</label>
        <input
          id="business-name"
          type="text"
          value={config.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Nome della tua attività"
        />
      </div>

      <div className="form-group">
        <label htmlFor="business-type">Tipo Business</label>
        <select
          id="business-type"
          value={config.type}
          onChange={(e) => onChange('type', e.target.value)}
        >
          <option value="cafe">Caffetteria</option>
          <option value="restaurant">Ristorante</option>
          <option value="bar">Bar</option>
          <option value="store">Negozio</option>
          <option value="hybrid">Ibrido</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="business-logo">Logo URL</label>
        <input
          id="business-logo"
          type="text"
          value={config.logo}
          onChange={(e) => onChange('logo', e.target.value)}
          placeholder="URL del logo"
        />
      </div>
    </div>
  );
};