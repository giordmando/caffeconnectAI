import React, { useState, useCallback } from 'react';
import { useConfigState } from '../../hooks/config/useConfigState';
import { ConfigTabs } from './shared/ConfigTabs';
import { ConfigActions } from './shared/ConfigActions';
import { BusinessInfoPanel } from './panels/business/BusinessInfoPanel';
import { ContactInfoPanel } from './panels/business/ContactInfoPanel';
import { ThemeConfigPanel } from './panels/theme/ThemeConfigPanel';
import { AIProviderPanel, CatalogSettingsPanel, CategoryManagerPanel, FunctionEndpointPanel, FunctionSettingsPanel, KnowledgeBasePanel, PrivacySettingsPanel, SocialMediaPanel, SystemPromptPanel, UISettingsPanel } from './panels';
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
            <SocialMediaPanel
              config={config.business}
              onChange={(field, value) => updateSection('business', field, value)}
              className="config-panel-section"
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
        case 'ai':
          return (
            <>
              <AIProviderPanel
                config={config.ai}
                onChange={(field, value) => updateSection('ai', field, value)}
                className="config-panel-section"
              />
              <SystemPromptPanel
                config={config.ai}
                onChange={(field, value) => updateSection('ai', field, value)}
                className="config-panel-section"
              />
            </>
          );
        case 'catalog':
          return (
            <>
              <CatalogSettingsPanel
                config={config.catalog}
                onChange={(field, value) => updateSection('catalog', field, value)}
                className="config-panel-section"
              />
              <CategoryManagerPanel
                config={config.catalog}
                onChange={(field, value) => updateSection('catalog', field, value)}
                className="config-panel-section"
              />
            </>
          );
        case 'functions':
          return (
            <>
              <FunctionSettingsPanel
                config={config.functions}
                onChange={(field, value) => updateSection('functions', field, value)}
                className="config-panel-section"
              />
              <FunctionEndpointPanel
                config={config.functions}
                onChange={(field, value) => updateSection('functions', field, value)}
                className="config-panel-section"
              />
            </>
          );
        case 'ui':
          return (
            <UISettingsPanel
              config={config.ui}
              onChange={(field, value) => updateSection('ui', field, value)}
              className="config-panel-section"
            />
          );
        case 'privacy':
          return (
            <PrivacySettingsPanel
              config={config.privacy}
              onChange={(field, value) => updateSection('privacy', field, value)}
              className="config-panel-section"
            />
          );
        case 'knowledge':
          return (
            <KnowledgeBasePanel
              config={config.knowledgeBase || []} // Assicura che sia un array
              onChange={(field, value) => {
                // KnowledgeBasePanel passa '_self' come field per aggiornare l'intero array
                if (field === '_self') {
                  updateSection('knowledgeBase', 'knowledgeBase', value); // Aggiorna l'intera sezione knowledgeBase
                } else {
                  // Per coerenza, anche se non previsto da KnowledgeBasePanel
                  updateSection('knowledgeBase', field, value);
                }
              }}
              className="config-panel-section"
            />
          );
        default:
          return <p>Seleziona una tab per visualizzare le impostazioni.</p>;
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