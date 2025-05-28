import React, { useRef } from 'react';
import { AppConfig } from '../../../config/interfaces/IAppConfig';

interface ConfigImportExportProps {
  config: AppConfig;
  onImport: () => void;
}

export const ConfigImportExport: React.FC<ConfigImportExportProps> = ({
  config,
  onImport
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const configJson = JSON.stringify(config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cafeconnect-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        // Validate and merge config
        console.log('Config imported:', importedConfig);
        onImport();
      } catch (error) {
        console.error('Error parsing config file:', error);
        alert('Errore nel file di configurazione');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="import-export-actions">
      <button
        className="btn btn-secondary"
        onClick={handleExport}
      >
        Esporta Configurazione
      </button>

      <label className="import-btn btn btn-secondary">
        Importa Configurazione
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </label>
    </div>
  );
};