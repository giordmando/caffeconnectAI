import React, { useState, useEffect } from 'react';
import { themeService } from '../services/theme/ThemeService';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { catalogService } from '../services/catalog/CatalogService';
import { AppConfig } from '../config/interfaces/IAppConfig';
import { configManager } from '../config/ConfigManager';

interface BusinessConfigPanelProps {
  onClose: () => void;
  onSave: () => void;
}

// Definiamo un tipo per le voci della Knowledge Base per chiarezza
interface KnowledgeBaseEntry {
  key: string;
  facts: string[];
  scope?: 'global' | 'product' | 'category';
  itemId?: string;
}


/**
 * Pannello di configurazione per il business
 * Permette di personalizzare vari aspetti dell'applicazione
 */
const BusinessConfigPanel: React.FC<BusinessConfigPanelProps> = ({ onClose, onSave }) => {
  // Carica la configurazione corrente
  const [config, setConfig] = useState<AppConfig>(configManager.getConfig());

  // Stati per le diverse sezioni
  const [activeTab, setActiveTab] = useState<'business' | 'ai' | 'catalog' | 'functions' | 'ui' | 'privacy' | 'knowledgeBase'>('business'); // Aggiunta 'knowledgeBase'
  const [isDirty, setIsDirty] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<string[]>([
    'cafe', 'restaurant', 'bar', 'store', 'hybrid'
  ]);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<{ menu: string[], products: string[] }>({
    menu: [], products: []
  });

  const [isLoadingFunctions, setIsLoadingFunctions] = useState<boolean>(false);
  const [functionLoadError, setFunctionLoadError] = useState<string | null>(null);

  // Carica funzioni e categorie all'avvio
  useEffect(() => {
    const loadData = async () => {
      setAvailableFunctions(functionRegistry.getAllFunctions().map(fn => fn.name));
      setCatalogCategories(catalogService.getCategories());
    };
    loadData();
  }, []);

  const handleLoadFunctionsFromEndpoint = async () => {
    const endpoint = config.functions.customFunctionEndpoint;
    if (!endpoint) {
      setFunctionLoadError("Devi specificare un endpoint valido.");
      return;
    }
    setIsLoadingFunctions(true);
    setFunctionLoadError(null);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Errore nel caricamento delle funzioni: ${response.status} ${response.statusText}`);
      }
      let customFunctions = await response.json();
      if (!customFunctions.functions) {
        throw new Error("La risposta non contiene un array di funzioni.");
      } else {
        customFunctions = customFunctions.functions;
        if (!Array.isArray(customFunctions)) {
          throw new Error("Il formato della risposta non è valido. Dovrebbe essere un array di funzioni.");
        }
      }
      const functionNames = customFunctions.map((func: any) => func.name);
      setAvailableFunctions(functionNames);
      handleConfigChange('functions', 'enabledFunctions', functionNames);
      setIsDirty(true);
    } catch (error) {
      console.error("Errore nel caricamento delle funzioni:", error);
      setFunctionLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingFunctions(false);
    }
  };

  // Gestione modifiche alla configurazione
  const handleConfigChange = (section: keyof AppConfig, field: string, value: any) => {
    setConfig(prevConfig => {
      const newConfig = JSON.parse(JSON.stringify(prevConfig)) as AppConfig;
      if (section === 'knowledgeBase' && field === '_self') { // Caso speciale per sostituire l'intero array knowledgeBase
        newConfig.knowledgeBase = value;
      } else if (field.includes('.')) {
        const parts = field.split('.');
        let current: any = newConfig[section];
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        (newConfig[section] as any)[field] = value;
      }
      return newConfig;
    });
    setIsDirty(true);
  };

  // Salva le modifiche
  const handleSave = () => {
    Object.keys(config).forEach(section => {
      configManager.updateSection(section as keyof AppConfig, (config as any)[section]);
    });
    themeService.applyTheme({
      primaryColor: config.business.theme.primaryColor,
      secondaryColor: config.business.theme.secondaryColor,
      bgColor: config.business.theme.backgroundColor,
      textColor: config.business.theme.textColor
    });
    onSave();
    onClose();
  };

  // Esporta configurazione
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

  // Importa configurazione
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        // Assicurati che knowledgeBase sia un array, anche se mancante o null nel file importato
        if (!importedConfig.knowledgeBase || !Array.isArray(importedConfig.knowledgeBase)) {
            importedConfig.knowledgeBase = [];
        }
        setConfig(importedConfig);
        setIsDirty(true);
      } catch (error) {
        console.error('Error parsing config file:', error);
        alert('Errore nel file di configurazione');
      }
    };
    reader.readAsText(file);
  };

  // Funzioni per la gestione della Knowledge Base
  const handleAddKnowledgeEntry = () => {
    const newEntry: KnowledgeBaseEntry = { key: '', facts: [''], scope: 'global' };
    const currentKnowledgeBase = config.knowledgeBase || [];
    handleConfigChange('knowledgeBase' as keyof AppConfig, '_self', [...currentKnowledgeBase, newEntry]);
  };

  const handleKnowledgeEntryChange = (index: number, field: keyof KnowledgeBaseEntry, value: string | string[]) => {
    const currentKnowledgeBase = config.knowledgeBase ? [...config.knowledgeBase] : [];
    if (currentKnowledgeBase[index]) {
      (currentKnowledgeBase[index] as any)[field] = value;
      handleConfigChange('knowledgeBase' as keyof AppConfig, '_self', currentKnowledgeBase);
    }
  };

  const handleKnowledgeFactChange = (entryIndex: number, factIndex: number, value: string) => {
    const currentKnowledgeBase = config.knowledgeBase ? [...config.knowledgeBase] : [];
    if (currentKnowledgeBase[entryIndex] && currentKnowledgeBase[entryIndex].facts[factIndex] !== undefined) {
      currentKnowledgeBase[entryIndex].facts[factIndex] = value;
      handleConfigChange('knowledgeBase'as keyof AppConfig, '_self', currentKnowledgeBase);
    }
  };

  const handleAddFactToKnowledgeEntry = (entryIndex: number) => {
    const currentKnowledgeBase = config.knowledgeBase ? [...config.knowledgeBase] : [];
    if (currentKnowledgeBase[entryIndex]) {
      currentKnowledgeBase[entryIndex].facts.push('');
      handleConfigChange('knowledgeBase' as keyof AppConfig, '_self', currentKnowledgeBase);
    }
  };

  const handleRemoveFactFromKnowledgeEntry = (entryIndex: number, factIndex: number) => {
    const currentKnowledgeBase = config.knowledgeBase ? [...config.knowledgeBase] : [];
    if (currentKnowledgeBase[entryIndex] && currentKnowledgeBase[entryIndex].facts.length > 1) { // Impedisce la rimozione dell'ultimo fatto
      currentKnowledgeBase[entryIndex].facts.splice(factIndex, 1);
      handleConfigChange('knowledgeBase' as keyof AppConfig, '_self', currentKnowledgeBase);
    }
  };

  const handleRemoveKnowledgeEntry = (index: number) => {
    const currentKnowledgeBase = config.knowledgeBase ? [...config.knowledgeBase] : [];
    currentKnowledgeBase.splice(index, 1);
    handleConfigChange('knowledgeBase' as keyof AppConfig, '_self', currentKnowledgeBase);
  };


  return (
    <div className="business-config-panel">
      <div className="config-header">
        <h2>Configurazione Business</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="config-tabs">
        {/* Tab Esistenti */}
        <button
          className={activeTab === 'business' ? 'tab-active' : ''}
          onClick={() => setActiveTab('business')}
        >
          Business
        </button>
        <button
          className={activeTab === 'ai' ? 'tab-active' : ''}
          onClick={() => setActiveTab('ai')}
        >
          AI
        </button>
        <button
          className={activeTab === 'catalog' ? 'tab-active' : ''}
          onClick={() => setActiveTab('catalog')}
        >
          Catalogo
        </button>
        <button
          className={activeTab === 'functions' ? 'tab-active' : ''}
          onClick={() => setActiveTab('functions')}
        >
          Funzioni
        </button>
        <button
          className={activeTab === 'ui' ? 'tab-active' : ''}
          onClick={() => setActiveTab('ui')}
        >
          UI
        </button>
        <button
          className={activeTab === 'privacy' ? 'tab-active' : ''}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy
        </button>
        {/* NUOVA TAB per Knowledge Base */}
        <button
          className={activeTab === 'knowledgeBase' ? 'tab-active' : ''}
          onClick={() => setActiveTab('knowledgeBase')}
        >
          Knowledge Base
        </button>
      </div>

      <div className="config-content">
        {/* Sezioni Esistenti (Business, AI, Catalog, Functions, UI, Privacy) */}
        {activeTab === 'business' && (
          <div className="tab-content">
            {/* ... contenuto tab business ... */}
            <div className="form-group">
              <label htmlFor="business-name">Nome Business</label>
              <input
                id="business-name"
                type="text"
                value={config.business.name}
                onChange={(e) => handleConfigChange('business', 'name', e.target.value)}
                placeholder="Nome della tua attività"
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-type">Tipo Business</label>
              <select
                id="business-type"
                value={config.business.type}
                onChange={(e) => handleConfigChange('business', 'type', e.target.value)}
              >
                {businessCategories.map(type => (
                  <option key={type} value={type}>
                    {type === 'cafe' ? 'Caffetteria' :
                     type === 'restaurant' ? 'Ristorante' :
                     type === 'bar' ? 'Bar' :
                     type === 'store' ? 'Negozio' :
                     type === 'hybrid' ? 'Ibrido' : type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="business-logo">Logo URL</label>
              <input
                id="business-logo"
                type="text"
                value={config.business.logo}
                onChange={(e) => handleConfigChange('business', 'logo', e.target.value)}
                placeholder="URL del logo"
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-indirizzo">Indirizzo</label>
              <input
                id="business-indirizzo"
                type="text"
                value={config.business.indirizzo || ''}
                onChange={(e) => handleConfigChange('business', 'indirizzo', e.target.value)}
                placeholder="Indirizzo della tua attività"
              />
            </div>
            <div className="form-group">
              <label htmlFor="business-telefono">Telefono</label>
              <input
                id="business-telefono"
                type="text"
                value={config.business.telefono || ''}
                onChange={(e) => handleConfigChange('business', 'telefono', e.target.value)}
                placeholder="Numero di telefono"
              />
            </div>
            <div className="form-group">
              <label htmlFor="business-email">Email</label>
              <input
                id="business-email"
                type="email"
                value={config.business.email || ''}
                onChange={(e) => handleConfigChange('business', 'email', e.target.value)}
                placeholder="Email della tua attività"
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-orari">Orari</label>
              <textarea
                id="business-orari"
                rows={3}
                value={config.business.orari || ''}
                onChange={(e) => handleConfigChange('business', 'orari', e.target.value)}
                placeholder="Orari di apertura"
              />
            </div>

            <h3 className="section-title">Social Media</h3>
            <div className="form-group">
              <label htmlFor="facebook">Facebook</label>
              <input
                id="facebook"
                type="text"
                value={config.business.socialMedia?.facebook || ''}
                onChange={(e) => handleConfigChange('business', 'socialMedia.facebook', e.target.value)}
                placeholder="URL pagina Facebook"
              />
            </div>
            <div className="form-group">
              <label htmlFor="instagram">Instagram</label>
              <input
                id="instagram"
                type="text"
                value={config.business.socialMedia?.instagram || ''}
                onChange={(e) => handleConfigChange('business', 'socialMedia.instagram', e.target.value)}
                placeholder="URL profilo Instagram"
              />
            </div>
             <div className="form-group">
              <label htmlFor="twitter">Twitter (X)</label>
              <input
                id="twitter"
                type="text"
                value={config.business.socialMedia?.twitter || ''}
                onChange={(e) => handleConfigChange('business', 'socialMedia.twitter', e.target.value)}
                placeholder="URL profilo Twitter/X"
              />
            </div>
            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn</label>
              <input
                id="linkedin"
                type="text"
                value={config.business.socialMedia?.linkedin || ''}
                onChange={(e) => handleConfigChange('business', 'socialMedia.linkedin', e.target.value)}
                placeholder="URL profilo LinkedIn"
              />
            </div>

            <div className="form-group">
              <label htmlFor="business-website">Sito Web</label>
              <input
                id="business-website"
                type="text"
                value={config.business.website || ''}
                onChange={(e) => handleConfigChange('business', 'website', e.target.value)}
                placeholder="URL del sito web"
              />
            </div>

            <div className="form-group">
              <label htmlFor="privacy-policy">Privacy Policy URL</label>
              <input
                id="privacy-policy"
                type="text"
                value={config.business.privacyPolicy || ''}
                onChange={(e) => handleConfigChange('business', 'privacyPolicy', e.target.value)}
                placeholder="URL della Privacy Policy"
              />
            </div>

            <div className="form-group">
              <label htmlFor="terms-of-service">Termini di Servizio URL</label>
              <input
                id="terms-of-service"
                type="text"
                value={config.business.termsOfService || ''}
                onChange={(e) => handleConfigChange('business', 'termsOfService', e.target.value)}
                placeholder="URL dei Termini di Servizio"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cookie-policy">Cookie Policy URL</label>
              <input
                id="cookie-policy"
                type="text"
                value={config.business.cookiePolicy || ''}
                onChange={(e) => handleConfigChange('business', 'cookiePolicy', e.target.value)}
                placeholder="URL della Cookie Policy"
              />
            </div>

            <h3 className="section-title">Tema</h3>
            <div className="form-group color-group">
              <label htmlFor="primary-color">Colore Primario</label>
              <div className="color-input">
                <input
                  id="primary-color"
                  type="color"
                  value={config.business.theme.primaryColor}
                  onChange={(e) => handleConfigChange('business', 'theme.primaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={config.business.theme.primaryColor}
                  onChange={(e) => handleConfigChange('business', 'theme.primaryColor', e.target.value)}
                />
              </div>
            </div>
            {/* ... altri campi colore tema ... */}
             <div className="form-group color-group">
              <label htmlFor="secondary-color">Colore Secondario</label>
              <div className="color-input">
                <input
                  id="secondary-color"
                  type="color"
                  value={config.business.theme.secondaryColor}
                  onChange={(e) => handleConfigChange('business', 'theme.secondaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={config.business.theme.secondaryColor}
                  onChange={(e) => handleConfigChange('business', 'theme.secondaryColor', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group color-group">
              <label htmlFor="bg-color">Colore Sfondo</label>
              <div className="color-input">
                <input
                  id="bg-color"
                  type="color"
                  value={config.business.theme.backgroundColor}
                  onChange={(e) => handleConfigChange('business', 'theme.backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  value={config.business.theme.backgroundColor}
                  onChange={(e) => handleConfigChange('business', 'theme.backgroundColor', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group color-group">
              <label htmlFor="text-color">Colore Testo</label>
              <div className="color-input">
                <input
                  id="text-color"
                  type="color"
                  value={config.business.theme.textColor}
                  onChange={(e) => handleConfigChange('business', 'theme.textColor', e.target.value)}
                />
                <input
                  type="text"
                  value={config.business.theme.textColor}
                  onChange={(e) => handleConfigChange('business', 'theme.textColor', e.target.value)}
                />
              </div>
            </div>
            <div className="theme-preview" style={{
              backgroundColor: config.business.theme.backgroundColor,
              color: config.business.theme.textColor,
              borderColor: config.business.theme.primaryColor,
              padding: '1rem',
              border: '1px solid',
              borderRadius: '8px',
              marginTop: '1rem'
            }}>
              <div className="preview-header" style={{ backgroundColor: config.business.theme.primaryColor, color: '#fff', padding: '0.5rem', borderRadius: '4px 4px 0 0' }}>
                <h4>{config.business.name || "Anteprima Nome Business"}</h4>
              </div>
              <div className="preview-content" style={{padding: '1rem'}}>
                <p>Questo è un testo di anteprima per vedere come appaiono i colori.</p>
                <button style={{
                  backgroundColor: config.business.theme.primaryColor,
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  marginRight: '0.5rem'
                }}>
                  Pulsante Primario
                </button>
                <button style={{
                  backgroundColor: config.business.theme.secondaryColor,
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px'
                }}>
                  Pulsante Secondario
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ai' && (
          <div className="tab-content">
            {/* ... contenuto tab AI ... */}
             <div className="form-group">
              <label htmlFor="default-provider">Provider AI Predefinito</label>
              <select
                id="default-provider"
                value={config.ai.defaultProvider}
                onChange={(e) => handleConfigChange('ai', 'defaultProvider', e.target.value)}
              >
                {Object.keys(config.ai.providers).map(key => (
                  <option key={key} value={key}>
                    {config.ai.providers[key].displayName}
                  </option>
                ))}
              </select>
            </div>

            <h3 className="section-title">System Prompt</h3>
            <div className="form-group">
              <textarea
                rows={10}
                value={config.ai.systemPrompt}
                onChange={(e) => handleConfigChange('ai', 'systemPrompt', e.target.value)}
                placeholder="Prompt di sistema per l'AI"
              />
              <small className="form-text">
                Questo è il prompt di sistema che definisce il comportamento dell'AI.
                Puoi usare {'{business.name}'} e altri segnaposto per renderlo dinamico.
              </small>
            </div>
             <div className="form-group">
                 <div className="form-check">
                    <input
                        type="checkbox"
                        id="enableAdvancedFunctionSupport"
                        checked={config.ai.enableAdvancedFunctionSupport}
                        onChange={(e) => handleConfigChange('ai', 'enableAdvancedFunctionSupport', e.target.checked)}
                    />
                    <label htmlFor="enableAdvancedFunctionSupport">Abilita supporto avanzato alle funzioni (ciclo chiamate multiple)</label>
                </div>
            </div>

            <div className="providers-container">
              <h3 className="section-title">Provider AI configurati</h3>
              {Object.entries(config.ai.providers).map(([key, provider]) => (
                <div key={key} className="provider-card">
                  <h4>{provider.displayName}</h4>
                  <div className="provider-models">
                    <p>Modelli disponibili:</p>
                    <ul>
                      {provider.models.map(model => (
                        <li key={model.id}>
                          {model.name}
                          {model.id === provider.defaultModel && (
                            <span className="default-badge">default</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'catalog' && (
          <div className="tab-content">
            {/* ... contenuto tab catalogo ... */}
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="enable-local-data"
                  checked={config.catalog.enableLocalData}
                  onChange={(e) => handleConfigChange('catalog', 'enableLocalData', e.target.checked)}
                />
                <label htmlFor="enable-local-data">Usa dati locali (per demo)</label>
              </div>
              <small className="form-text">
                Se abilitato, usa i dati mock inclusi nell'app. Disabilita per usare gli endpoint.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="menu-endpoint">Endpoint Menu</label>
              <input
              id="menu-endpoint"
              type="text"
              value={config.catalog.menuEndpoint || ''}
              onChange={(e) => handleConfigChange('catalog', 'menuEndpoint', e.target.value)}
              placeholder="URL dell'endpoint menu (es. https://api.tuosito.com/menu)"
              disabled={config.catalog.enableLocalData}
              />
              <small className="form-text">
              <a
                href="/template-json/menu-template.json"
                download="menu-template.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scarica il template JSON
              </a>
               {' '}per l'endpoint menu.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="products-endpoint">Endpoint Prodotti</label>
              <input
                id="products-endpoint"
                type="text"
                value={config.catalog.productsEndpoint || ''}
                onChange={(e) => handleConfigChange('catalog', 'productsEndpoint', e.target.value)}
                placeholder="URL dell'endpoint prodotti (es. https://api.tuosito.com/products)"
                disabled={config.catalog.enableLocalData}
              />
              <small className="form-text">
              <a
                href="/template-json/product-template.json"
                download="product-template.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                Scarica il template JSON
              </a>
               {' '}per l'endpoint prodotti.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="refresh-interval">Intervallo Aggiornamento Dati (minuti)</label>
              <input
                id="refresh-interval"
                type="number"
                min="5"
                value={config.catalog.dataRefreshInterval}
                onChange={(e) => handleConfigChange('catalog', 'dataRefreshInterval', parseInt(e.target.value))}
              />
            </div>

            <h3 className="section-title">Categorie Menu/Prodotti Principali</h3>
            <div className="categories-container">
              {(config.catalog.categories || []).map((category, index) => (
                <div key={index} className="category-item">
                  <input
                    type="text"
                    value={category.id}
                    onChange={(e) => {
                      const newCategories = [...(config.catalog.categories || [])];
                      newCategories[index].id = e.target.value;
                      handleConfigChange('catalog', 'categories', newCategories);
                    }}
                    placeholder="ID categoria (es. beverage)"
                  />
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => {
                      const newCategories = [...(config.catalog.categories || [])];
                      newCategories[index].name = e.target.value;
                      handleConfigChange('catalog', 'categories', newCategories);
                    }}
                    placeholder="Nome Categoria (es. Bevande)"
                  />
                  <input
                    type="text"
                    value={category.icon}
                    onChange={(e) => {
                      const newCategories = [...(config.catalog.categories || [])];
                      newCategories[index].icon = e.target.value;
                      handleConfigChange('catalog', 'categories', newCategories);
                    }}
                    placeholder="Icona (emoji)"
                    maxLength={2}
                    className="icon-input"
                  />
                  <button
                    className="remove-btn"
                    onClick={() => {
                      const newCategories = (config.catalog.categories || []).filter((_, i) => i !== index);
                      handleConfigChange('catalog', 'categories', newCategories);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="add-btn"
                onClick={() => {
                  const newCategories = [...(config.catalog.categories || []), { id: '', name: '', icon: '🆕' }];
                  handleConfigChange('catalog', 'categories', newCategories);
                }}
              >
                Aggiungi Categoria Principale
              </button>
            </div>

            <h3 className="section-title">Menu per Fascia Oraria (ID Categorie)</h3>
             <div className="form-group">
              <label htmlFor="morning-menu">Categorie Menu Mattina</label>
              <input
                id="morning-menu"
                type="text"
                value={config.catalog.timeBasedMenus?.morning.join(', ') || ''}
                onChange={(e) => {
                  const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const newTimeBasedMenus = { ...(config.catalog.timeBasedMenus || { morning: [], afternoon: [], evening: [] }), morning: categories };
                  handleConfigChange('catalog', 'timeBasedMenus', newTimeBasedMenus);
                }}
                placeholder="ID categorie per mattina (es. coffee, pastry)"
              />
            </div>
            {/* ... altri campi timeBasedMenus ... */}
            <div className="form-group">
              <label htmlFor="afternoon-menu">Categorie Menu Pomeriggio</label>
              <input
                id="afternoon-menu"
                type="text"
                value={config.catalog.timeBasedMenus?.afternoon.join(', ') || ''}
                onChange={(e) => {
                  const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const newTimeBasedMenus = { ...(config.catalog.timeBasedMenus || { morning: [], afternoon: [], evening: [] }), afternoon: categories };
                  handleConfigChange('catalog', 'timeBasedMenus', newTimeBasedMenus);
                }}
                placeholder="ID categorie per pomeriggio (es. lunch, sandwich)"
              />
            </div>
            <div className="form-group">
              <label htmlFor="evening-menu">Categorie Menu Sera</label>
              <input
                id="evening-menu"
                type="text"
                value={config.catalog.timeBasedMenus?.evening.join(', ') || ''}
                onChange={(e) => {
                  const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const newTimeBasedMenus = { ...(config.catalog.timeBasedMenus || { morning: [], afternoon: [], evening: [] }), evening: categories };
                  handleConfigChange('catalog', 'timeBasedMenus', newTimeBasedMenus);
                }}
                placeholder="ID categorie per sera (es. aperitivo, dinner)"
              />
            </div>
          </div>
        )}
        {activeTab === 'functions' && (
          <div className="tab-content">
            {/* ... contenuto tab funzioni ... */}
            <div className="form-group">
            <label htmlFor="custom-function-endpoint">Endpoint Funzioni Personalizzate (opzionale)</label>
            <div className="endpoint-input-group">
              <input
                id="custom-function-endpoint"
                type="text"
                value={config.functions.customFunctionEndpoint || ''}
                onChange={(e) => handleConfigChange('functions', 'customFunctionEndpoint', e.target.value)}
                placeholder="URL dell'endpoint per caricare funzioni custom"
                className={functionLoadError ? "input-error" : ""}
              />
              <button
                className="load-btn"
                onClick={handleLoadFunctionsFromEndpoint}
                disabled={isLoadingFunctions || !config.functions.customFunctionEndpoint}
              >
                {isLoadingFunctions ? "Caricamento..." : "Carica Funzioni"}
              </button>
            </div>
            {functionLoadError && (
              <div className="error-message" style={{color: 'red', marginTop: '0.5rem'}}>{functionLoadError}</div>
            )}
            <small className="form-text">
              L'endpoint deve restituire un array JSON di definizioni di funzioni. {' '}
              <a
                href="/template-json/registration-funzioni-prsonalizzate.json" // Corretto il typo
                download="registration-funzioni-personalizzate.json" // Corretto il typo
                target="_blank"
                rel="noopener noreferrer"
              >
                Scarica il template JSON
              </a>.
            </small>
          </div>

          <h3 className="section-title">Funzioni Abilitate</h3>
          {isLoadingFunctions ? (
            <div className="loading-indicator">Caricamento funzioni in corso...</div>
          ) : (
            <div className="functions-list">
              {availableFunctions.length === 0 ? (
                <div className="no-functions">
                  Nessuna funzione disponibile. Carica funzioni dall'endpoint o usa quelle predefinite.
                </div>
              ) : (
                availableFunctions.map(functionName => (
                  <div key={functionName} className="function-item">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id={`function-${functionName}`}
                        checked={config.functions.enabledFunctions.includes(functionName)}
                        onChange={(e) => {
                          let newEnabledFunctions;
                          if (e.target.checked) {
                            newEnabledFunctions = [...config.functions.enabledFunctions, functionName];
                          } else {
                            newEnabledFunctions = config.functions.enabledFunctions.filter(fn => fn !== functionName);
                          }
                          handleConfigChange('functions', 'enabledFunctions', newEnabledFunctions);
                        }}
                      />
                      <label htmlFor={`function-${functionName}`}>{functionName}</label>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="form-group">
            <button
              className="btn btn-secondary"
              onClick={() => {
                const defaultCoreFunctions = [ // Funzioni core predefinite
                    'get_user_loyalty_points',
                    'get_user_preferences',
                    'get_menu_recommendations',
                    'get_product_recommendations',
                    'track_user_action',
                    'search_product_by_name',
                    'view_item_details'
                ];
                setAvailableFunctions(defaultCoreFunctions);
                handleConfigChange('functions', 'enabledFunctions', defaultCoreFunctions);
                setIsDirty(true);
              }}
            >
              Ripristina Funzioni Predefinite
            </button>
          </div>

          <h3 className="section-title">Endpoint Dati per Funzioni (opzionale)</h3>
           <small className="form-text" style={{marginBottom: '1rem', display: 'block'}}>
              Se le tue funzioni (predefinite o custom) necessitano di chiamare API esterne per recuperare dati, specifica qui gli endpoint.
              L'AI passerà i parametri necessari a questi endpoint. {' '}
              <a
                href="/template-json/dati-funzioni-standard.json"
                download="dati-funzioni-standard.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vedi esempi di risposte endpoint
              </a>.
            </small>
          {availableFunctions.map(functionName => (
            <div key={functionName} className="form-group">
              <label htmlFor={`endpoint-${functionName}`}>{functionName}</label>
              <input
                id={`endpoint-${functionName}`}
                type="text"
                value={(config.functions.functionDataEndpoints || {})[functionName] || ''}
                onChange={(e) => {
                  const newEndpoints = {
                    ...(config.functions.functionDataEndpoints || {}),
                    [functionName]: e.target.value.trim() === '' ? undefined : e.target.value.trim() // Rimuovi se vuoto
                  };
                  // Rimuovi chiavi con valori undefined
                  Object.keys(newEndpoints).forEach(key => newEndpoints[key] === undefined && delete newEndpoints[key]);
                  handleConfigChange('functions', 'functionDataEndpoints', newEndpoints);
                }}
                placeholder={`URL endpoint per ${functionName} (es. https://api.tuosito.com/data/${functionName})`}
              />
            </div>
          ))}
          </div>
        )}
        {activeTab === 'ui' && (
          <div className="tab-content">
            {/* ... contenuto tab UI ... */}
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="enable-suggestions"
                  checked={config.ui.enableSuggestions}
                  onChange={(e) => handleConfigChange('ui', 'enableSuggestions', e.target.checked)}
                />
                <label htmlFor="enable-suggestions">Abilita Suggerimenti di Prompt</label>
              </div>
            </div>

            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="enable-dynamic-components"
                  checked={config.ui.enableDynamicComponents}
                  onChange={(e) => handleConfigChange('ui', 'enableDynamicComponents', e.target.checked)}
                />
                <label htmlFor="enable-dynamic-components">Abilita Componenti UI Dinamici (Caroselli, Card, etc.)</label>
              </div>
            </div>
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="enable-nlp"
                  checked={config.ui.enableNLP}
                  onChange={(e) => handleConfigChange('ui', 'enableNLP', e.target.checked)}
                />
                <label htmlFor="enable-nlp">Abilita Analisi NLP (Sentiment, Intenti, Topic)</label>
              </div>
              <small className="form-text">
                Mostra insight NLP nella sidebar. Richiede un provider AI configurato che supporti queste analisi.
              </small>
            </div>

            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="show-sidebar"
                  checked={config.ui.showSidebar}
                  onChange={(e) => handleConfigChange('ui', 'showSidebar', e.target.checked)}
                />
                <label htmlFor="show-sidebar">Mostra Sidebar per Componenti Dinamici e NLP</label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="max-recommendations">Numero Massimo Raccomandazioni (in caroselli)</label>
              <input
                id="max-recommendations"
                type="number"
                min="1"
                max="10"
                value={config.ui.maxRecommendations}
                onChange={(e) => handleConfigChange('ui', 'maxRecommendations', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="welcome-message">Messaggio di Benvenuto</label>
              <textarea
                id="welcome-message"
                rows={3}
                value={config.ui.welcomeMessage}
                onChange={(e) => handleConfigChange('ui', 'welcomeMessage', e.target.value)}
                placeholder="Messaggio di benvenuto (es. Benvenuto a {business.name}! Come posso aiutarti?)"
              />
              <small className="form-text">
                Puoi usare {'{business.name}'} per inserire dinamicamente il nome del business.
              </small>
            </div>
          </div>
        )}
        {activeTab === 'privacy' && (
          <div className="tab-content">
            {/* ... contenuto tab privacy ... */}
            <h3 className="section-title">Impostazioni Privacy e Consenso</h3>

            <div className="form-group">
                <div className="form-check">
                <input
                    type="checkbox"
                    id="privacy-enabled"
                    checked={config.privacy?.enabled || false}
                    onChange={(e) => handleConfigChange('privacy', 'enabled', e.target.checked)}
                />
                <label htmlFor="privacy-enabled">Abilita Banner Consenso Privacy</label>
                </div>
            </div>

            <h4>Testi del Banner di Consenso</h4>
            <div className="form-group">
                <label htmlFor="privacy-title">Titolo Banner</label>
                <input
                id="privacy-title"
                type="text"
                value={config.privacy?.bannerTitle || 'Preferenze privacy'}
                onChange={(e) => handleConfigChange('privacy', 'bannerTitle', e.target.value)}
                placeholder="Titolo del banner privacy"
                />
            </div>
            <div className="form-group">
                <label htmlFor="privacy-message">Messaggio Banner</label>
                <textarea
                id="privacy-message"
                rows={3}
                value={config.privacy?.bannerMessage || 'Utilizziamo i dati di conversazione per migliorare il nostro assistente AI. Scegli il livello di condivisione dati che preferisci:'}
                onChange={(e) => handleConfigChange('privacy', 'bannerMessage', e.target.value)}
                placeholder="Messaggio del banner privacy"
                />
            </div>
             <div className="form-group">
                <label htmlFor="privacy-info">Informazioni Aggiuntive nel Banner</label>
                <textarea
                id="privacy-info"
                rows={2}
                value={config.privacy?.additionalInfo || 'Con "Tutto" ci aiuti a personalizzare meglio le risposte in base alle tue preferenze.'}
                onChange={(e) => handleConfigChange('privacy', 'additionalInfo', e.target.value)}
                placeholder="Testo informativo aggiuntivo"
                />
            </div>
             <div className="form-group">
                <label htmlFor="privacy-policy-link-banner">Link Privacy Policy (mostrato nel banner)</label>
                <input
                id="privacy-policy-link-banner"
                type="text"
                value={config.privacy?.policyLink || ''}
                onChange={(e) => handleConfigChange('privacy', 'policyLink', e.target.value)}
                placeholder="URL alla tua privacy policy completa"
                />
                 <small className="form-text">
                    Se vuoto, verrà usato il link dalla sezione Business (se presente).
                </small>
            </div>


            <h4>Etichette e Descrizioni Livelli di Consenso</h4>
            {/* Consenso Minimo */}
            <div className="form-group">
                <label htmlFor="minimal-consent-label">Etichetta Consenso Minimo</label>
                <input
                id="minimal-consent-label"
                type="text"
                value={config.privacy?.consentLabels?.minimal || 'Solo essenziali'}
                onChange={(e) => handleConfigChange('privacy', 'consentLabels.minimal', e.target.value)}
                />
                <label htmlFor="minimal-consent-desc" style={{marginTop: '0.5rem'}}>Descrizione Consenso Minimo</label>
                <textarea
                id="minimal-consent-desc"
                rows={2}
                value={config.privacy?.consentDescriptions?.minimal || 'Raccogliamo solo i dati essenziali per il funzionamento dell\'app.'}
                onChange={(e) => handleConfigChange('privacy', 'consentDescriptions.minimal', e.target.value)}
                className="mt-1"
                />
            </div>
            {/* ... altri livelli di consenso ... */}
            <div className="form-group">
                <label htmlFor="functional-consent-label">Etichetta Consenso Funzionale</label>
                <input
                id="functional-consent-label"
                type="text"
                value={config.privacy?.consentLabels?.functional || 'Funzionali'}
                onChange={(e) => handleConfigChange('privacy', 'consentLabels.functional', e.target.value)}
                />
                 <label htmlFor="functional-consent-desc" style={{marginTop: '0.5rem'}}>Descrizione Consenso Funzionale</label>
                <textarea
                id="functional-consent-desc"
                rows={2}
                value={config.privacy?.consentDescriptions?.functional || 'Permette di memorizzare le conversazioni per migliorare l\'esperienza.'}
                onChange={(e) => handleConfigChange('privacy', 'consentDescriptions.functional', e.target.value)}
                className="mt-1"
                />
            </div>
            <div className="form-group">
                <label htmlFor="analytics-consent-label">Etichetta Consenso Analitico/Completo</label>
                <input
                id="analytics-consent-label"
                type="text"
                value={config.privacy?.consentLabels?.analytics || 'Tutto (consigliato)'}
                onChange={(e) => handleConfigChange('privacy', 'consentLabels.analytics', e.target.value)}
                />
                <label htmlFor="analytics-consent-desc" style={{marginTop: '0.5rem'}}>Descrizione Consenso Analitico/Completo</label>
                <textarea
                id="analytics-consent-desc"
                rows={2}
                value={config.privacy?.consentDescriptions?.analytics || 'Ci permette di analizzare le conversazioni per personalizzare le risposte e migliorare il servizio.'}
                onChange={(e) => handleConfigChange('privacy', 'consentDescriptions.analytics', e.target.value)}
                className="mt-1"
                />
            </div>

            <div className="theme-preview" style={{
              backgroundColor: config.business.theme.backgroundColor,
              color: config.business.theme.textColor,
              borderColor: config.business.theme.primaryColor,
              padding: '20px',
              marginTop: '20px',
              borderRadius: '8px',
              border: '1px solid'
            }}>
              <h3 style={{ color: config.business.theme.primaryColor, marginTop: 0 }}>
                {config.privacy?.bannerTitle || 'Preferenze privacy'}
              </h3>
              <p>{config.privacy?.bannerMessage || 'Utilizziamo i dati di conversazione per migliorare il nostro assistente AI.'}</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button style={{
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #a0aec0'
                }}>
                  {config.privacy?.consentLabels?.minimal || 'Solo essenziali'}
                </button>
                <button style={{
                  backgroundColor: '#4299e1',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none'
                }}>
                  {config.privacy?.consentLabels?.functional || 'Funzionali'}
                </button>
                <button style={{
                  backgroundColor: config.business.theme.primaryColor,
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: 'none'
                }}>
                  {config.privacy?.consentLabels?.analytics || 'Tutto (consigliato)'}
                </button>
              </div>
              <p style={{ fontSize: '12px', marginTop: '15px', color: '#718096' }}>
                {config.privacy?.additionalInfo || 'Con "Tutto" ci aiuti a personalizzare meglio le risposte.'}
                 {config.privacy?.policyLink && (
                    <a href={config.privacy.policyLink || config.business.privacyPolicy} target="_blank" rel="noopener noreferrer" style={{color: config.business.theme.primaryColor, marginLeft: '5px'}}>
                        Leggi la policy.
                    </a>
                 )}
              </p>
            </div>
          </div>
        )}

        {/* NUOVA SEZIONE per Knowledge Base */}
        {activeTab === 'knowledgeBase' && (
          <div className="tab-content">
            <h3 className="section-title">Knowledge Base (Fatti e Risposte Rapide)</h3>
            <p className="form-text" style={{marginBottom: '1rem'}}>
              Aggiungi qui informazioni specifiche che l'AI deve conoscere.
              La "Chiave/Contesto" aiuta l'AI a capire quando usare questi fatti.
              L'AI userà questi fatti per arricchire le sue risposte o rispondere direttamente a domande frequenti.
            </p>
            {(config.knowledgeBase || []).map((entry, entryIndex) => (
              <div key={entryIndex} className="knowledge-entry-card">
                <div className="form-group">
                  <label htmlFor={`kb-key-${entryIndex}`}>Chiave / Contesto (Keywords)</label>
                  <input
                    id={`kb-key-${entryIndex}`}
                    type="text"
                    value={entry.key}
                    onChange={(e) => handleKnowledgeEntryChange(entryIndex, 'key', e.target.value)}
                    placeholder="Es. orari di apertura, info wifi, cornetto integrale"
                  />
                </div>

                <div className="form-group">
                  <label>Fatti / Risposte (uno per riga):</label>
                  {entry.facts.map((fact, factIndex) => (
                    <div key={factIndex} className="fact-item">
                      <textarea
                        rows={2}
                        value={fact}
                        onChange={(e) => handleKnowledgeFactChange(entryIndex, factIndex, e.target.value)}
                        placeholder={`Fatto o risposta ${factIndex + 1}`}
                      />
                      <button
                        type="button"
                        className="remove-btn-small"
                        onClick={() => handleRemoveFactFromKnowledgeEntry(entryIndex, factIndex)}
                        disabled={entry.facts.length <= 1}
                      >
                        -
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-btn-small"
                    onClick={() => handleAddFactToKnowledgeEntry(entryIndex)}
                  >
                    Aggiungi Fatto/Risposta
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor={`kb-scope-${entryIndex}`}>Ambito (Opzionale)</label>
                  <select
                    id={`kb-scope-${entryIndex}`}
                    value={entry.scope || 'global'}
                    onChange={(e) => handleKnowledgeEntryChange(entryIndex, 'scope', e.target.value)}
                  >
                    <option value="global">Globale</option>
                    <option value="product">Specifico Prodotto</option>
                    <option value="category">Specifica Categoria</option>
                  </select>
                </div>

                {entry.scope === 'product' && (
                  <div className="form-group">
                    <label htmlFor={`kb-itemId-${entryIndex}`}>ID Prodotto/Menu (se ambito prodotto)</label>
                    <input
                      id={`kb-itemId-${entryIndex}`}
                      type="text"
                      value={entry.itemId || ''}
                      onChange={(e) => handleKnowledgeEntryChange(entryIndex, 'itemId', e.target.value)}
                      placeholder="ID dell'item dal catalogo"
                    />
                  </div>
                )}
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => handleRemoveKnowledgeEntry(entryIndex)}
                  style={{marginTop: '10px'}}
                >
                  Rimuovi Questa Voce
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-btn"
              onClick={handleAddKnowledgeEntry}
              style={{marginTop: '1rem'}}
            >
              Aggiungi Nuova Voce alla Knowledge Base
            </button>
          </div>
        )}
      </div>

      <div className="form-actions">
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
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </label>
        </div>

        <div className="main-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Annulla
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!isDirty}
          >
            Salva Configurazione
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessConfigPanel;