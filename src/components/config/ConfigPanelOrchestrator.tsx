import React, { useState, useCallback } from 'react';
import { useConfigState } from '../../hooks/config/useConfigState';
import { ConfigTabs } from './shared/ConfigTabs';
import { ConfigActions } from './shared/ConfigActions';
import { BusinessInfoPanel } from './panels/business/BusinessInfoPanel';
import { ContactInfoPanel } from './panels/business/ContactInfoPanel';
import { ThemeConfigPanel } from './panels/theme/ThemeConfigPanel';
// ... altri import

interface ConfigPanelOrchestratorProps {
  onClose: () => void;
  onSave: () => void;
}

export const ConfigPanelOrchestrator: React.FC<ConfigPanelOrchestratorProps> = ({
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('business');
  const { config, updateSection, isDirty, save } = useConfigState();

  const handleSave = useCallback(async () => {
    await save();
    onSave();
  }, [save, onSave]);

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'business':
        return (
          <>
            <BusinessInfoPanel
              config={config.business}
              onChange={(field, value) => updateSection('business', field, value)}
            />
            <ContactInfoPanel
              config={config.business}
              onChange={(field, value) => updateSection('business', field, value)}
            />
          </>
        );
      case 'theme':
        return (
          <ThemeConfigPanel
            config={config.business.theme}
            onChange={(field, value) => updateSection('business', `theme.${field}`, value)}
          />
        );
      // ... altri casi
      default:
        return null;
    }
  };

  return (
    <div className="config-panel-orchestrator">
      <div className="config-header">
        <h2>Configurazione</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <ConfigTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="config-content">
        {renderActivePanel()}
      </div>

      <ConfigActions
        isDirty={isDirty}
        onSave={handleSave}
        onCancel={onClose}
        config={config}
      />
    </div>
  );
};