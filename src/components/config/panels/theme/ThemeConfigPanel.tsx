import { AppConfig } from "../../../../config/interfaces/IAppConfig";
import { IConfigSection } from "../../interfaces/IConfigSection";

type BusinessConfig = AppConfig['business'];

export const ThemeConfigPanel: React.FC<IConfigSection<BusinessConfig['theme']>> = ({
    config,
    onChange
  }) => {
    return (
      <div className="config-section">
        <h3>Tema</h3>
        
        <div className="form-group color-group">
          <label htmlFor="primary-color">Colore Primario</label>
          <div className="color-input">
            <input
              id="primary-color"
              type="color"
              value={config.primaryColor}
              onChange={(e) => onChange('primaryColor', e.target.value)}
            />
            <input
              type="text"
              value={config.primaryColor}
              onChange={(e) => onChange('primaryColor', e.target.value)}
            />
          </div>
        </div>
        
        <div className="theme-preview" style={{
          backgroundColor: config.backgroundColor,
          color: config.textColor,
          borderColor: config.primaryColor,
          padding: '1rem',
          border: '1px solid',
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <div className="preview-header" style={{ 
            backgroundColor: config.primaryColor, 
            color: '#fff', 
            padding: '0.5rem', 
            borderRadius: '4px 4px 0 0' 
          }}>
            <h4>Anteprima Tema</h4>
          </div>
          <div className="preview-content" style={{padding: '1rem'}}>
            <p>Questo è un testo di anteprima per vedere come appaiono i colori.</p>
          </div>
        </div>
      </div>
    );
  };