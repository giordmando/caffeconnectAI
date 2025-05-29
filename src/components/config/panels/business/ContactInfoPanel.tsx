import React from 'react';
import { IConfigSection } from '../../interfaces/IConfigSection';
import { AppConfig } from '../../../../config/interfaces/IAppConfig';

type BusinessConfig = AppConfig['business'];

export const ContactInfoPanel: React.FC<IConfigSection<BusinessConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Informazioni di Contatto</h3>
      
      <div className="form-group">
        <label htmlFor="business-indirizzo">Indirizzo</label>
        <input
          id="business-indirizzo"
          type="text"
          value={config.indirizzo || ''}
          onChange={(e) => onChange('indirizzo', e.target.value)}
          placeholder="Indirizzo della tua attività"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-telefono">Telefono</label>
        <input
          id="business-telefono"
          type="text"
          value={config.telefono || ''}
          onChange={(e) => onChange('telefono', e.target.value)}
          placeholder="Numero di telefono"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-email">Email</label>
        <input
          id="business-email"
          type="email"
          value={config.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="Email della tua attività"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-orari">Orari</label>
        <textarea
          id="business-orari"
          rows={3}
          value={config.orari || ''}
          onChange={(e) => onChange('orari', e.target.value)}
          placeholder="Orari di apertura"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="whatsapp-business">WhatsApp Business</label>
        <input
          id="whatsapp-business"
          type="text"
          value={config.whatsappBusiness || ''}
          onChange={(e) => onChange('whatsappBusiness', e.target.value)}
          placeholder="+39 333 1234567"
        />
        <small className="form-text">
          Numero WhatsApp Business per ricevere ordini
        </small>
      </div>
    </div>
  );
};