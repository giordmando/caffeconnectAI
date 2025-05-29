import React from 'react';
import type { IConfigSection } from '../../interfaces/IConfigSection';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type BusinessConfig = AppConfig['business'];

export const SocialMediaPanel: React.FC<IConfigSection<BusinessConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  return (
    <div className={`config-section ${className}`}>
      <h3>Social Media</h3>
      
      <div className="form-group">
        <label htmlFor="facebook">Facebook</label>
        <input
          id="facebook"
          type="text"
          value={config.socialMedia?.facebook || ''}
          onChange={(e) => onChange('socialMedia.facebook', e.target.value)}
          placeholder="URL pagina Facebook"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="instagram">Instagram</label>
        <input
          id="instagram"
          type="text"
          value={config.socialMedia?.instagram || ''}
          onChange={(e) => onChange('socialMedia.instagram', e.target.value)}
          placeholder="URL profilo Instagram"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="twitter">Twitter (X)</label>
        <input
          id="twitter"
          type="text"
          value={config.socialMedia?.twitter || ''}
          onChange={(e) => onChange('socialMedia.twitter', e.target.value)}
          placeholder="URL profilo Twitter/X"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="linkedin">LinkedIn</label>
        <input
          id="linkedin"
          type="text"
          value={config.socialMedia?.linkedin || ''}
          onChange={(e) => onChange('socialMedia.linkedin', e.target.value)}
          placeholder="URL profilo LinkedIn"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="business-website">Sito Web</label>
        <input
          id="business-website"
          type="text"
          value={config.website || ''}
          onChange={(e) => onChange('website', e.target.value)}
          placeholder="URL del sito web"
        />
      </div>
    </div>
  );
};