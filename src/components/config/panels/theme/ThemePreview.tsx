import React from 'react';
import type { AppConfig } from '../../../../config/interfaces/IAppConfig';

type ThemeConfig = AppConfig['business']['theme'];

interface ThemePreviewProps {
  theme: ThemeConfig;
  businessName: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, businessName }) => {
  return (
    <div 
      className="theme-preview" 
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        borderColor: theme.primaryColor,
        padding: '1rem',
        border: '1px solid',
        borderRadius: '8px',
        marginTop: '1rem'
      }}
    >
      <div 
        className="preview-header" 
        style={{ 
          backgroundColor: theme.primaryColor, 
          color: '#fff', 
          padding: '0.5rem', 
          borderRadius: '4px 4px 0 0' 
        }}
      >
        <h4>{businessName || "Anteprima Nome Business"}</h4>
      </div>
      <div className="preview-content" style={{ padding: '1rem' }}>
        <p>Questo è un testo di anteprima per vedere come appaiono i colori.</p>
        <button 
          style={{
            backgroundColor: theme.primaryColor,
            color: '#fff',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            marginRight: '0.5rem'
          }}
        >
          Pulsante Primario
        </button>
        <button 
          style={{
            backgroundColor: theme.secondaryColor,
            color: '#fff',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Pulsante Secondario
        </button>
      </div>
    </div>
  );
};
