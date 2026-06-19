// src/components/config/ConfigPanelOrchestrator.tsx
import React, { useCallback, useState } from 'react';
import { useConfigState } from '../../hooks/config/useConfigState';
import { ConfigTabs } from './shared/ConfigTabs';
import { ConfigActions } from './shared/ConfigActions';
import {
  BusinessInfoPanel,
  ContactInfoPanel,
  SocialMediaPanel,
  ThemeConfigPanel,
  AIProviderPanel,
  SystemPromptPanel,
  CatalogSettingsPanel,
  CategoryManagerPanel,
  FunctionSettingsPanel,
  FunctionEndpointPanel,
  UISettingsPanel,
  PrivacySettingsPanel,
  KnowledgeBasePanel,
  GoLivePanel,
} from './panels';
import type { AppConfig } from '../../config/interfaces/IAppConfig';

interface ConfigPanelOrchestratorProps {
  onClose: () => void;
  onSave: () => void;
}

type PanelProps<T> = {
  config: T;
  onChange: (field: string, value: any) => void;
  className?: string;
};

const PANEL_COMPONENTS: Record<string, React.FC<PanelProps<any>>[]> = {
  business: [
    (props) => <BusinessInfoPanel {...props} config={props.config.business} onChange={(field, value) => props.onChange('business', { ...props.config.business, [field]: value })} />,
    (props) => <ContactInfoPanel {...props} config={props.config.business} onChange={(field, value) => props.onChange('business', { ...props.config.business, [field]: value })} />,
    (props) => <SocialMediaPanel {...props} config={props.config.business} onChange={(field, value) => props.onChange('business', { ...props.config.business, [field]: value })} className="config-panel-section" />,
  ],
  theme: [
    (props) => <ThemeConfigPanel {...props} config={props.config.business.theme} onChange={(field, value) => props.onChange('business', { ...props.config.business, theme: { ...props.config.business.theme, [field]: value } })} />,
  ],
  ai: [
    (props) => <AIProviderPanel {...props} config={props.config.ai} onChange={(field, value) => props.onChange('ai', { ...props.config.ai, [field]: value })} className="config-panel-section" />,
    (props) => <SystemPromptPanel {...props} config={props.config.ai} onChange={(field, value) => props.onChange('ai', { ...props.config.ai, [field]: value })} className="config-panel-section" />,
  ],
  catalog: [
    (props) => <CatalogSettingsPanel {...props} config={props.config.catalog} onChange={(field, value) => props.onChange(field, value)} className="config-panel-section" />,
    (props) => <CategoryManagerPanel {...props} config={props.config.catalog} onChange={(field, value) => props.onChange(field, value)} className="config-panel-section" />,
  ],
  functions: [
    (props) => <FunctionSettingsPanel {...props} config={props.config.functions} onChange={(field, value) => props.onChange('functions', { ...props.config.functions, [field]: value })} className="config-panel-section" />,
    (props) => <FunctionEndpointPanel {...props} config={props.config.functions} onChange={(field, value) => props.onChange('functions', { ...props.config.functions, [field]: value })} className="config-panel-section" />,
  ],
  ui: [
    (props) => <UISettingsPanel {...props} config={props.config.ui} onChange={(field, value) => props.onChange('ui', { ...props.config.ui, [field]: value })} className="config-panel-section" />,
  ],
  privacy: [
    (props) => (
      <PrivacySettingsPanel
        {...props}
        config={{
          privacy: props.config.privacy,
          dataGovernance: props.config.dataGovernance
        }}
        onChange={(field, value) => props.onChange(field, value)}
        className="config-panel-section"
      />
    ),
  ],
  knowledge: [
    (props) => (
      <KnowledgeBasePanel
        {...props}
        config={props.config.knowledgeBase || []}
        knowledgeSources={props.config.knowledgeSources || { urls: [], inlineText: '' }}
        merchantKnowledge={props.config.merchantKnowledge || { sources: [] }}
        onSourcesChange={(value) => props.onChange('knowledgeSources', value)}
        onMerchantKnowledgeChange={(value) => props.onChange('merchantKnowledge', value)}
        onChange={(field, value) => {
          if (field === '_self' || field === 'knowledgeBase') {
            props.onChange('knowledgeBase', value);
          } else {
            props.onChange('knowledgeBase', { ...(props.config.knowledgeBase || {}), [field]: value });
          }
        }}
        className="config-panel-section"
      />
    ),
  ],
  golive: [
    (props) => (
      <GoLivePanel
        {...props}
        config={props.config}
        onChange={(field, value) => props.onChange(field, value)}
        className="config-panel-section"
      />
    ),
  ],
};

export const ConfigPanelOrchestrator: React.FC<ConfigPanelOrchestratorProps> = ({
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState('business');
  const { config, updateSection, isDirty, save } = useConfigState();

  const handleSave = useCallback(async () => {
    await save();
    onSave();
  }, [save, onSave]);

  const updateTopLevelSection = useCallback((section: string, value: any) => {
    updateSection(section as keyof AppConfig, section, value);
  }, [updateSection]);

  const renderActivePanel = () => {
    const panelCreators = PANEL_COMPONENTS[activeTab];
    if (!panelCreators) {
      return <p>Seleziona una tab per visualizzare le impostazioni.</p>;
    }

    const panelSharedProps = {
      config,
      onChange: (sectionOrField: string, value: any) => {
        if (
          activeTab === 'knowledge' &&
          (sectionOrField === 'knowledgeBase' || sectionOrField === 'knowledgeSources' || sectionOrField === 'merchantKnowledge')
        ) {
          updateTopLevelSection(sectionOrField, value);
          return;
        }

        if (
          activeTab === 'golive' &&
          ['tenant', 'agents', 'integrations'].includes(sectionOrField)
        ) {
          updateTopLevelSection(sectionOrField, value);
          return;
        }

        if (
          activeTab === 'privacy' &&
          ['privacy', 'dataGovernance'].includes(sectionOrField)
        ) {
          updateTopLevelSection(sectionOrField, value);
          return;
        }

        updateSection(activeTab as keyof AppConfig, sectionOrField, value);
      }
    };

    return panelCreators.map((PanelComponent, index) => (
      <PanelComponent key={index} {...panelSharedProps} />
    ));
  };

  return (
    <div className="config-panel-orchestrator">
      <div className="config-header">
        <h2>Configurazione</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <ConfigTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="config-content">{renderActivePanel()}</div>

      <ConfigActions
        isDirty={isDirty}
        onSave={handleSave}
        onCancel={onClose}
        config={config}
      />
    </div>
  );
};
