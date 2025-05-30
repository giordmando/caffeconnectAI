// src/components/config/ConfigPanelOrchestrator.tsx
import React, { useState, useCallback } from 'react';
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
} from './panels'; // Assumendo che l'export da './panels' sia corretto
import type { AppConfig } from '../../config/interfaces/IAppConfig';

interface ConfigPanelOrchestratorProps {
  onClose: () => void;
  onSave: () => void; // Questa prop sarà chiamata dopo il salvataggio interno
}

// Definiamo un tipo per le props dei pannelli individuali
type PanelProps<T> = {
  config: T;
  onChange: (field: string, value: any) => void;
  className?: string;
};

// Definiamo la mappa dei componenti per ogni tab
const PANEL_COMPONENTS: Record<string, React.FC<PanelProps<any>>[]> = {
  business: [
    (props) => <BusinessInfoPanel {...props} config={props.config.business} onChange={(f, v) => props.onChange('business', { ...props.config.business, [f]: v })} />,
    (props) => <ContactInfoPanel {...props} config={props.config.business} onChange={(f, v) => props.onChange('business', { ...props.config.business, [f]: v })} />,
    (props) => <SocialMediaPanel {...props} config={props.config.business} onChange={(f, v) => props.onChange('business', { ...props.config.business, [f]: v })} className="config-panel-section" />,
  ],
  theme: [
    (props) => <ThemeConfigPanel {...props} config={props.config.business.theme} onChange={(f, v) => props.onChange('business', { ...props.config.business, theme: { ...props.config.business.theme, [f]: v }})} />,
  ],
  ai: [
    (props) => <AIProviderPanel {...props} config={props.config.ai} onChange={(f,v) => props.onChange('ai', { ...props.config.ai, [f]: v })} className="config-panel-section" />,
    (props) => <SystemPromptPanel {...props} config={props.config.ai} onChange={(f,v) => props.onChange('ai', { ...props.config.ai, [f]: v })} className="config-panel-section" />,
  ],
  catalog: [
    (props) => <CatalogSettingsPanel {...props} config={props.config.catalog} onChange={(f,v) => props.onChange('catalog', { ...props.config.catalog, [f]: v })} className="config-panel-section" />,
    (props) => <CategoryManagerPanel {...props} config={props.config.catalog} onChange={(f,v) => props.onChange('catalog', { ...props.config.catalog, [f]: v })} className="config-panel-section" />,
  ],
  functions: [
    (props) => <FunctionSettingsPanel {...props} config={props.config.functions} onChange={(f,v) => props.onChange('functions', { ...props.config.functions, [f]: v })} className="config-panel-section" />,
    (props) => <FunctionEndpointPanel {...props} config={props.config.functions} onChange={(f,v) => props.onChange('functions', { ...props.config.functions, [f]: v })} className="config-panel-section" />,
  ],
  ui: [
    (props) => <UISettingsPanel {...props} config={props.config.ui} onChange={(f,v) => props.onChange('ui', { ...props.config.ui, [f]: v })} className="config-panel-section" />,
  ],
  privacy: [
    (props) => <PrivacySettingsPanel {...props} config={props.config.privacy} onChange={(f,v) => props.onChange('privacy', { ...props.config.privacy, [f]: v })} className="config-panel-section" />,
  ],
  knowledge: [
    (props) => (
      <KnowledgeBasePanel
        {...props}
        config={props.config.knowledgeBase || []}
        onChange={(field, value) => {
          // KnowledgeBasePanel passa '_self' come field per aggiornare l'intero array
          // o il nome del campo se si aggiorna una proprietà specifica (improbabile con l'implementazione corrente di KnowledgeBasePanel)
          if (field === '_self' || field === 'knowledgeBase') {
             props.onChange('knowledgeBase', value); // Aggiorna l'intera sezione knowledgeBase
          } else {
            // Questo caso è meno probabile per KnowledgeBasePanel com'è ora, ma per completezza:
             props.onChange('knowledgeBase', { ...(props.config.knowledgeBase || {}), [field]:value });
          }
        }}
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
    await save(); // Salva lo stato interno del config hook
    onSave(); // Chiama la prop onSave passata da App.tsx (che farà reloadServices)
  }, [save, onSave]);

  // Funzione wrapper per updateSection che si adatta alla struttura dei PanelProps
  // Questa funzione `updateSectionForTab` ora passa l'intero oggetto `config`
  // e lascia che sia la funzione nel mapping `PANEL_COMPONENTS` a gestire
  // come aggiornare la specifica sotto-sezione.
  const handleChangeForTab = useCallback((sectionKey: keyof AppConfig, fieldOrSubSection: string, value: any) => {
    // Se fieldOrSubSection è la stessa sectionKey, significa che il pannello sta aggiornando l'intera sua sezione
    // (come nel caso di KnowledgeBasePanel che passa l'intero array).
    if (sectionKey === fieldOrSubSection) {
        updateSection(sectionKey, sectionKey, value);
    } else {
        // Altrimenti, è un campo specifico all'interno della sezione.
        updateSection(sectionKey, fieldOrSubSection, value);
    }
  }, [updateSection]);


  const renderActivePanel = () => {
    const panelCreators = PANEL_COMPONENTS[activeTab];
    if (!panelCreators) {
      return <p>Seleziona una tab per visualizzare le impostazioni.</p>;
    }

    // Passiamo l'intero `config` e una funzione `onChange` specifica per la tab
    // che sa come aggiornare la sezione corretta di `AppConfig`.
    // La funzione `onChange` passata ai panelCreators ora sarà `(field, value) => handleChangeForTab(activeTab as keyof AppConfig, field, value)`
    // Tuttavia, i panel sono stati definiti aspettandosi `onChange` per la loro specifica sotto-sezione.
    // Quindi, il mapping in PANEL_COMPONENTS deve gestire questo adattamento.

    // Le props passate ai componenti panel renderizzati:
    const panelSharedProps = {
        config: config, // Passiamo l'intero oggetto config
        // La funzione `onChange` qui sarà quella che i componenti Panel si aspettano,
        // ma dovrà essere adattata nel mapping PANEL_COMPONENTS per chiamare `updateSection` correttamente.
        // Per ora, `updateSection` è direttamente disponibile, e i panel devono usarlo
        // per specificare la sezione e il campo.
        // La soluzione più pulita è che ogni panel sappia la sua `sectionKey` e la usi con `updateSection`.
        // Oppure, il mapping in `PANEL_COMPONENTS` adatta la chiamata.
        onChange: (sectionOrField: string, valueOrField: any, fieldValue?: any) => {
            // Questo è un punto delicato. La firma di `updateSection` è `(section: keyof AppConfig, field: string, value: any)`
            // I panel, tuttavia, chiamano `onChange(field, value)` relativo alla loro sotto-configurazione.
            // Il mapping in PANEL_COMPONENTS risolve questo.
            // Qui `onChange` è una prop generica, il suo significato specifico è definito nel mapping.
            // Quindi, passiamo `updateSection` direttamente, ma i componenti nel mapping
            // devono usarlo correttamente o adattarlo.
            // Per coerenza con come `updateSection` è definito in `useConfigState`,
            // il mapping `PANEL_COMPONENTS` ora si occupa di chiamare `updateSection`
            // con i parametri corretti.
             if (fieldValue !== undefined) { // Firma (section, field, value)
                updateSection(sectionOrField as keyof AppConfig, valueOrField, fieldValue);
            } else { // Firma (field, value) - qui `sectionOrField` è il field, `valueOrField` è il value. La section è implicita dalla tab
                updateSection(activeTab as keyof AppConfig, sectionOrField, valueOrField);
            }
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