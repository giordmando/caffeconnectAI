import React from 'react';
import { AppConfig } from '../../../config/interfaces/IAppConfig';
import { ConfigImportExport } from './ConfigImportExport';

interface ConfigActionsProps {
  isDirty: boolean;
  onSave: () => void;
  onCancel: () => void;
  config: AppConfig;
}

export const ConfigActions: React.FC<ConfigActionsProps> = ({
  isDirty,
  onSave,
  onCancel,
  config
}) => {
  return (
    <div className="form-actions">
      <ConfigImportExport config={config} onImport={onSave} />
      
      <div className="main-actions">
        <button
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Annulla
        </button>

        <button
          className="btn btn-primary"
          onClick={onSave}
          disabled={!isDirty}
        >
          Salva Configurazione
        </button>
      </div>
    </div>
  );
};