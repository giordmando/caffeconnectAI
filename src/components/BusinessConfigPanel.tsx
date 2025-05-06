import React, { useState, useEffect } from 'react';
import { configManager, AppConfig } from '../config/ConfigManager';
import { themeService } from '../services/theme/ThemeService';
import { functionRegistry } from '../services/function/FunctionRegistry';
import { catalogService } from '../services/catalog/CatalogService';

interface BusinessConfigPanelProps {
  onClose: () => void;
  onSave: () => void;
}

/**
 * Pannello di configurazione per il business
 * Permette di personalizzare vari aspetti dell'applicazione
 */
const BusinessConfigPanel: React.FC<BusinessConfigPanelProps> = ({ onClose, onSave }) => {
  // Carica la configurazione corrente
  const [config, setConfig] = useState<AppConfig>(configManager.getConfig());
  
  // Stati per le diverse sezioni
  const [activeTab, setActiveTab] = useState<'business'|'ai'|'catalog'|'functions'|'ui'|'privacy'>('business');
  const [isDirty, setIsDirty] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<string[]>([
    'cafe', 'restaurant', 'bar', 'store', 'hybrid'
  ]);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<{menu: string[], products: string[]}>({
    menu: [], products: []
  });
  
  const [isLoadingFunctions, setIsLoadingFunctions] = useState<boolean>(false);
  const [functionLoadError, setFunctionLoadError] = useState<string | null>(null);
  // Carica funzioni e categorie all'avvio
  useEffect(() => {
    const loadData = async () => {
      // Carica funzioni disponibili
      setAvailableFunctions(functionRegistry.getAllFunctions().map(fn => fn.name));
      
      // Carica categorie del catalogo
      setCatalogCategories(catalogService.getCategories());
    };
    
    loadData();
  }, []);
  
  // Aggiungi questa funzione per caricare funzioni dall'endpoint
  const handleLoadFunctionsFromEndpoint = async () => {
    const endpoint = config.functions.customFunctionEndpoint;
    
    if (!endpoint) {
      setFunctionLoadError("Devi specificare un endpoint valido.");
      return;
    }
    
    setIsLoadingFunctions(true);
    setFunctionLoadError(null);
    
    try {
      // Recupera le funzioni dall'endpoint
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Errore nel caricamento delle funzioni: ${response.status} ${response.statusText}`);
      }
      
      let customFunctions = await response.json();
      if (!customFunctions.functions) {
        throw new Error("La risposta non contiene un array di funzioni.");
      }else{
        customFunctions = customFunctions.functions;
        if (!Array.isArray(customFunctions)) {
          throw new Error("Il formato della risposta non è valido. Dovrebbe essere un array di funzioni.");
        }
      }

      // Estrai i nomi delle funzioni dall'array di funzioni
      const functionNames = customFunctions.map(func => func.name);
      
      // Aggiorna la lista delle funzioni disponibili
      setAvailableFunctions(functionNames);
      
      // Aggiorna le funzioni abilitate per includere tutte quelle caricate
      handleConfigChange('functions', 'enabledFunctions', functionNames);
      
      // Feedback di successo
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
      // Crea copia profonda per evitare mutazioni
      const newConfig = JSON.parse(JSON.stringify(prevConfig)) as AppConfig;
      
      // Aggiorna il campo specifico
      if (field.includes('.')) {
        // Campo nidificato (es. business.theme.primaryColor)
        const parts = field.split('.');
        let current: any = newConfig[section];
        
        for (let i = 0; i < parts.length - 1; i++) {
          current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = value;
      } else {
        // Campo diretto
        (newConfig[section] as any)[field] = value;
      }
      
      return newConfig;
    });
    
    setIsDirty(true);
  };
  
  // Salva le modifiche
  const handleSave = () => {
    // Aggiorna la configurazione nell'app
    Object.keys(config).forEach(section => {
      configManager.updateSection(section as keyof AppConfig, (config as any)[section]);
    });
    
    // Applica il tema
    themeService.applyTheme({
      primaryColor: config.business.theme.primaryColor,
      secondaryColor: config.business.theme.secondaryColor,
      bgColor: config.business.theme.backgroundColor,
      textColor: config.business.theme.textColor
    });
    
    // Aggiorna altre parti dell'app che potrebbero dipendere dalla configurazione
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
        setConfig(importedConfig);
        setIsDirty(true);
      } catch (error) {
        console.error('Error parsing config file:', error);
        alert('Errore nel file di configurazione');
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="business-config-panel">
      <div className="config-header">
        <h2>Configurazione Business</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="config-tabs">
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
      </div>
      
      <div className="config-content">
        {/* Sezione Business */}
        {activeTab === 'business' && (
          <div className="tab-content">
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
                value={config.business.indirizzo}
                onChange={(e) => handleConfigChange('business', 'indirizzo', e.target.value)}
                placeholder="Indirizzo della tua attività"
              />
            </div>
            <div className="form-group">
              <label htmlFor="business-telefono">Telefono</label>
              <input
                id="business-telefono"
                type="text"
                value={config.business.telefono}
                onChange={(e) => handleConfigChange('business', 'telefono', e.target.value)}
                placeholder="Numero di telefono"
              />
            </div>
            <div className="form-group">
              <label htmlFor="business-telefono">Telefono</label>
              <input
                id="business-telefono"
                type="text"
                value={config.business.telefono}
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
              <label htmlFor="twitter">Twitter</label>
              <input
                id="twitter"
                type="text"
                value={config.business.socialMedia?.twitter || ''}
                onChange={(e) => handleConfigChange('business', 'socialMedia.twitter', e.target.value)}
                placeholder="URL profilo Twitter"
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
              <label htmlFor="privacy-policy">Privacy Policy</label>
              <input
                id="privacy-policy"
                type="text"
                value={config.business.privacyPolicy || ''}
                onChange={(e) => handleConfigChange('business', 'privacyPolicy', e.target.value)}
                placeholder="URL della Privacy Policy"
              />
            </div>

            <div className="form-group">
              <label htmlFor="terms-of-service">Termini di Servizio</label>
              <input
                id="terms-of-service"
                type="text"
                value={config.business.termsOfService || ''}
                onChange={(e) => handleConfigChange('business', 'termsOfService', e.target.value)}
                placeholder="URL dei Termini di Servizio"
              />
            </div>

            <div className="form-group">
              <label htmlFor="cookie-policy">Cookie Policy</label>
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
              borderColor: config.business.theme.primaryColor
            }}>
              <div className="preview-header" style={{ backgroundColor: config.business.theme.primaryColor, color: '#fff' }}>
                <h4>{config.business.name}</h4>
              </div>
              <div className="preview-content">
                <p>Anteprima del tema</p>
                <button style={{ 
                  backgroundColor: config.business.theme.primaryColor, 
                  color: '#fff' 
                }}>
                  Pulsante Primario
                </button>
                <button style={{ 
                  backgroundColor: config.business.theme.secondaryColor, 
                  color: '#fff' 
                }}>
                  Pulsante Secondario
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Sezione AI */}
        {activeTab === 'ai' && (
          <div className="tab-content">
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
        
        {/* Sezione Catalogo */}
        {activeTab === 'catalog' && (
          <div className="tab-content">
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="enable-local-data"
                  checked={config.catalog.enableLocalData}
                  onChange={(e) => handleConfigChange('catalog', 'enableLocalData', e.target.checked)}
                />
                <label htmlFor="enable-local-data">Usa dati locali</label>
              </div>
              <small className="form-text">
                Se abilitato, usa i dati mock inclusi nell'app anziché caricarli da un endpoint.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="menu-endpoint">Endpoint Menu</label>
              <input
              id="menu-endpoint"
              type="text"
              value={config.catalog.menuEndpoint || ''}
              onChange={(e) => handleConfigChange('catalog', 'menuEndpoint', e.target.value)}
              placeholder="URL dell'endpoint menu"
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
               per l'endpoint menu.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="products-endpoint">Endpoint Prodotti</label>
              <input
                id="products-endpoint"
                type="text"
                value={config.catalog.productsEndpoint || ''}
                onChange={(e) => handleConfigChange('catalog', 'productsEndpoint', e.target.value)}
                placeholder="URL dell'endpoint prodotti"
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
               per l'endpoint prodotti.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="refresh-interval">Intervallo Aggiornamento (minuti)</label>
              <input
                id="refresh-interval"
                type="number"
                min="5"
                value={config.catalog.dataRefreshInterval}
                onChange={(e) => handleConfigChange('catalog', 'dataRefreshInterval', parseInt(e.target.value))}
              />
            </div>
            
            <h3 className="section-title">Categorie Menu</h3>
            
            <div className="categories-container">
              {config.catalog.categories.map((category, index) => (
                <div key={index} className="category-item">
                  <input
                    type="text"
                    value={category.id}
                    onChange={(e) => {
                      const newCategories = [...config.catalog.categories];
                      newCategories[index].id = e.target.value;
                      handleConfigChange('catalog', 'categories', newCategories);
                    }}
                    placeholder="ID categoria"
                  />
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => {
                      const newCategories = [...config.catalog.categories];
                      newCategories[index].name = e.target.value;
                      handleConfigChange('catalog', 'categories', newCategories);
                    }}
                    placeholder="Nome categoria"
                  />
                  <input
                    type="text"
                    value={category.icon}
                    onChange={(e) => {
                      const newCategories = [...config.catalog.categories];
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
                      const newCategories = config.catalog.categories.filter((_, i) => i !== index);
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
                  const newCategories = [...config.catalog.categories, { id: '', name: '', icon: '🔍' }];
                  handleConfigChange('catalog', 'categories', newCategories);
                }}
              >
                Aggiungi Categoria
              </button>
            </div>
            
            <h3 className="section-title">Menu per Fascia Oraria</h3>
            
            <div className="form-group">
              <label htmlFor="morning-menu">Menu Mattina</label>
              <input
                id="morning-menu"
                type="text"
                value={config.catalog.timeBasedMenus.morning.join(', ')}
                onChange={(e) => {
                  const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const newTimeBasedMenus = { ...config.catalog.timeBasedMenus, morning: categories };
                  handleConfigChange('catalog', 'timeBasedMenus', newTimeBasedMenus);
                }}
                placeholder="Categorie per la mattina, separate da virgola"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="afternoon-menu">Menu Pomeriggio</label>
              <input
                id="afternoon-menu"
                type="text"
                value={config.catalog.timeBasedMenus.afternoon.join(', ')}
                onChange={(e) => {
                  const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const newTimeBasedMenus = { ...config.catalog.timeBasedMenus, afternoon: categories };
                  handleConfigChange('catalog', 'timeBasedMenus', newTimeBasedMenus);
                }}
                placeholder="Categorie per il pomeriggio, separate da virgola"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="evening-menu">Menu Sera</label>
              <input
                id="evening-menu"
                type="text"
                value={config.catalog.timeBasedMenus.evening.join(', ')}
                onChange={(e) => {
                  const categories = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const newTimeBasedMenus = { ...config.catalog.timeBasedMenus, evening: categories };
                  handleConfigChange('catalog', 'timeBasedMenus', newTimeBasedMenus);
                }}
                placeholder="Categorie per la sera, separate da virgola"
              />
            </div>
          </div>
        )}
        
        {/* Sezione Funzioni */}
        {activeTab === 'functions' && (
        <div className="tab-content">
          <div className="form-group">
            <label htmlFor="custom-function-endpoint">Endpoint Funzioni Personalizzate</label>
            <div className="endpoint-input-group">
              <input
                id="custom-function-endpoint"
                type="text"
                value={config.functions.customFunctionEndpoint || ''}
                onChange={(e) => handleConfigChange('functions', 'customFunctionEndpoint', e.target.value)}
                placeholder="URL dell'endpoint funzioni personalizzate"
                className={functionLoadError ? "input-error" : ""}
              />
              <button 
                className="load-btn"
                onClick={handleLoadFunctionsFromEndpoint}
                disabled={isLoadingFunctions || !config.functions.customFunctionEndpoint}
              >
                {isLoadingFunctions ? "Caricamento..." : "Carica funzioni"}
              </button>
            </div>
            {functionLoadError && (
              <div className="error-message">{functionLoadError}</div>
            )}
            <small className="form-text">
              L'endpoint deve restituire un array di definizioni di funzioni
            </small>
          </div>
          
          <h3 className="section-title">Funzioni Abilitate</h3>
          
          {isLoadingFunctions ? (
            <div className="loading-indicator">Caricamento funzioni...</div>
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
                setAvailableFunctions([
                  'get_user_loyalty_points',
                  'get_user_preferences',
                  'get_menu_recommendations',
                  'get_product_recommendations',
                  'track_user_action'
                ]);
                handleConfigChange('functions', 'enabledFunctions', [
                  'get_user_loyalty_points',
                  'get_user_preferences',
                  'get_menu_recommendations',
                  'get_product_recommendations',
                  'track_user_action'
                ]);
                setIsDirty(true);
              }}
            >
              Ripristina funzioni predefinite
            </button>
          </div>
          
          <h3 className="section-title">Endpoint Dati per Funzioni</h3>
          
          {/* Form dinamico per gli endpoint dati */}
          {availableFunctions.map(functionName => (
            <div key={functionName} className="form-group">
              <label htmlFor={`endpoint-${functionName}`}>{functionName}</label>
              <input
                id={`endpoint-${functionName}`}
                type="text"
                value={config.functions.functionDataEndpoints?.[functionName] || ''}
                onChange={(e) => {
                  const newEndpoints = {
                    ...config.functions.functionDataEndpoints || {},
                    [functionName]: e.target.value
                  };
                  handleConfigChange('functions', 'functionDataEndpoints', newEndpoints);
                }}
                placeholder={`Endpoint dati per ${functionName}`}
              />
            </div>
          ))}
        </div>
      )}
        
        {/* Sezione UI */}
        {activeTab === 'ui' && (
          <div className="tab-content">
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="enable-suggestions"
                  checked={config.ui.enableSuggestions}
                  onChange={(e) => handleConfigChange('ui', 'enableSuggestions', e.target.checked)}
                />
                <label htmlFor="enable-suggestions">Abilita Suggerimenti</label>
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
                <label htmlFor="enable-dynamic-components">Abilita Componenti Dinamici</label>
              </div>
            </div>
            
            <div className="form-group">
              <div className="form-check">
                <input
                  type="checkbox"
                  id="show-sidebar"
                  checked={config.ui.showSidebar}
                  onChange={(e) => handleConfigChange('ui', 'showSidebar', e.target.checked)}
                />
                <label htmlFor="show-sidebar">Mostra Sidebar</label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="max-recommendations">Numero massimo raccomandazioni</label>
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
                placeholder="Messaggio di benvenuto"
              />
              <small className="form-text">
                Puoi usare {'{business.name}'} e altri segnaposto per renderlo dinamico.
              </small>
            </div>
          </div>
        )}
        {activeTab === 'privacy' && (
        <div className="tab-content">
          <h3 className="section-title">Impostazioni Privacy</h3>
          
          <div className="form-group">
            <label htmlFor="privacy-enabled">Abilita gestione consenso</label>
            <div className="form-check">
              <input
                type="checkbox"
                id="privacy-enabled"
                checked={config.privacy?.enabled || false}
                onChange={(e) => handleConfigChange('privacy', 'enabled', e.target.checked)}
              />
              <label htmlFor="privacy-enabled">Mostra banner consenso privacy</label>
            </div>
          </div>
          
          <h4>Livelli di consenso</h4>
          
          <div className="form-group">
            <label htmlFor="minimal-consent-label">Etichetta consenso minimo</label>
            <input
              id="minimal-consent-label"
              type="text"
              value={config.privacy?.consentLabels?.minimal || 'Solo essenziali'}
              onChange={(e) => handleConfigChange('privacy', 'consentLabels.minimal', e.target.value)}
              placeholder="Etichetta per il consenso minimo"
            />
            <textarea
              rows={2}
              value={config.privacy?.consentDescriptions?.minimal || 'Raccogliamo solo i dati essenziali per il funzionamento dell\'app.'}
              onChange={(e) => handleConfigChange('privacy', 'consentDescriptions.minimal', e.target.value)}
              placeholder="Descrizione per il consenso minimo"
              className="mt-2"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="functional-consent-label">Etichetta consenso funzionale</label>
            <input
              id="functional-consent-label"
              type="text"
              value={config.privacy?.consentLabels?.functional || 'Funzionali'}
              onChange={(e) => handleConfigChange('privacy', 'consentLabels.functional', e.target.value)}
              placeholder="Etichetta per il consenso funzionale"
            />
            <textarea
              rows={2}
              value={config.privacy?.consentDescriptions?.functional || 'Permette di memorizzare le conversazioni per migliorare l\'esperienza.'}
              onChange={(e) => handleConfigChange('privacy', 'consentDescriptions.functional', e.target.value)}
              placeholder="Descrizione per il consenso funzionale"
              className="mt-2"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="analytics-consent-label">Etichetta consenso analitico</label>
            <input
              id="analytics-consent-label"
              type="text"
              value={config.privacy?.consentLabels?.analytics || 'Tutto (consigliato)'}
              onChange={(e) => handleConfigChange('privacy', 'consentLabels.analytics', e.target.value)}
              placeholder="Etichetta per il consenso analitico"
            />
            <textarea
              rows={2}
              value={config.privacy?.consentDescriptions?.analytics || 'Ci permette di analizzare le conversazioni per personalizzare le risposte.'}
              onChange={(e) => handleConfigChange('privacy', 'consentDescriptions.analytics', e.target.value)}
              placeholder="Descrizione per il consenso analitico"
              className="mt-2"
            />
          </div>
          
          <h4>Banner Privacy</h4>
          
          <div className="form-group">
            <label htmlFor="privacy-title">Titolo banner privacy</label>
            <input
              id="privacy-title"
              type="text"
              value={config.privacy?.bannerTitle || 'Preferenze privacy'}
              onChange={(e) => handleConfigChange('privacy', 'bannerTitle', e.target.value)}
              placeholder="Titolo del banner privacy"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="privacy-message">Messaggio privacy</label>
            <textarea
              id="privacy-message"
              rows={4}
              value={config.privacy?.bannerMessage || 'Utilizziamo i dati di conversazione per migliorare il nostro assistente AI. Scegli il livello di condivisione dati che preferisci:'}
              onChange={(e) => handleConfigChange('privacy', 'bannerMessage', e.target.value)}
              placeholder="Messaggio del banner privacy"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="privacy-info">Informazioni aggiuntive</label>
            <textarea
              id="privacy-info"
              rows={3}
              value={config.privacy?.additionalInfo || 'Con "Tutto" ci aiuti a personalizzare meglio le risposte in base alle tue preferenze.'}
              onChange={(e) => handleConfigChange('privacy', 'additionalInfo', e.target.value)}
              placeholder="Informazioni aggiuntive sulla privacy"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="privacy-policy-link">Link alla policy privacy completa</label>
            <input
              id="privacy-policy-link"
              type="text"
              value={config.privacy?.policyLink || config.business.privacyPolicy || ''}
              onChange={(e) => handleConfigChange('privacy', 'policyLink', e.target.value)}
              placeholder="URL della privacy policy completa"
            />
          </div>
          
          <div className="theme-preview" style={{
            backgroundColor: config.business.theme.backgroundColor,
            color: config.business.theme.textColor,
            borderColor: config.business.theme.primaryColor,
            padding: '20px',
            marginTop: '20px',
            borderRadius: '8px'
          }}>
            <h3 style={{ color: config.business.theme.primaryColor }}>
              {config.privacy?.bannerTitle || 'Preferenze privacy'}
            </h3>
            <p>{config.privacy?.bannerMessage || 'Utilizziamo i dati di conversazione per migliorare il nostro assistente AI.'}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button style={{ 
                backgroundColor: '#e2e8f0', 
                color: '#4a5568',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none'
              }}>
                {config.privacy?.consentLabels?.minimal || 'Solo essenziali'}
              </button>
              <button style={{ 
                backgroundColor: '#4299e1', 
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none'
              }}>
                {config.privacy?.consentLabels?.functional || 'Funzionali'}
              </button>
              <button style={{ 
                backgroundColor: config.business.theme.primaryColor, 
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none'
              }}>
                {config.privacy?.consentLabels?.analytics || 'Tutto (consigliato)'}
              </button>
            </div>
            <p style={{ fontSize: '12px', marginTop: '10px', color: '#a0aec0' }}>
              {config.privacy?.additionalInfo || 'Con "Tutto" ci aiuti a personalizzare meglio le risposte.'}
            </p>
          </div>
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