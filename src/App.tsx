import React, { useState, useEffect } from 'react';
import { useServices, useService } from './contexts/ServiceProvider';
import CompleteChatInterface from './components/ContextChatUI';
import './styles/App.css';
import { CartDrawer } from './components/cart/CartDrawer';
import { CartButton } from './components/cart/CartButton';
import { ConfigPanelOrchestrator } from './components/config/ConfigPanelOrchestrator';
import { BusinessDashboard } from './components/BusinessDashboard';
import { AdminControlPlane } from './components/AdminControlPlane';
import { businessEventService } from './services/analytics/BusinessEventService';

/**
 * Componente principale dell'applicazione
 * Utilizza il nuovo sistema di servizi centralizzato
 */
function App() {
  // Stati dell'applicazione
  const [isBusinessPanelOpen, setIsBusinessPanelOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashboardInitialSection, setDashboardInitialSection] = useState<'overview' | 'orders'>('overview');
  const [isAdminControlOpen, setIsAdminControlOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { currentAiProvider, reloadServices, appConfig, isInitialized, initializationError } = useServices();
  const functionRegistry = useService('functionRegistry'); // configManager è già in appConfig

  // Stato locale per le funzioni disponibili, aggiornato dopo l'inizializzazione
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);

  const readinessItems = appConfig ? [
    Boolean(appConfig.business.name && appConfig.business.telefono),
    Boolean(appConfig.catalog.enableLocalData || appConfig.catalog.menuEndpoint || appConfig.catalog.productsEndpoint),
    Boolean(appConfig.knowledgeBase?.length || appConfig.merchantKnowledge?.sources?.some(source => source.enabled && source.url) || appConfig.knowledgeSources?.urls?.length),
    Boolean(appConfig.business.whatsappBusiness || appConfig.business.orderWebhook),
    Boolean(appConfig.agents?.enabled && appConfig.agents.activeAgents.length > 0)
  ] : [];
  const readinessScore = readinessItems.length
    ? Math.round((readinessItems.filter(Boolean).length / readinessItems.length) * 100)
    : 0;
  const isAdminPanelEnabled = process.env.REACT_APP_ENABLE_ADMIN_PANEL === 'true';
  const tenantEnvironment = appConfig?.tenant?.environment || 'demo';
  const tenantPlan = appConfig?.tenant?.plan || 'demo';
  const hasKnowledge = Boolean(
    appConfig?.knowledgeBase?.length ||
    appConfig?.merchantKnowledge?.sources?.some(source => source.enabled && source.url) ||
    appConfig?.knowledgeSources?.urls?.length
  );

  useEffect(() => {
    if (isInitialized && !initializationError && functionRegistry) {
      setAvailableFunctions(functionRegistry.getAllFunctions().map(fn => fn.name));
    }
  }, [isInitialized, initializationError, functionRegistry]);


  // Gestione della reinizializzazione dopo cambio configurazione business
  const handleBusinessConfigSave = async () => {
    try {
      await reloadServices(); // AppInitializer gestirà lo stato di caricamento
    } catch (error) {
      console.error('Error reinitializing app after business config save:', error);
    }
  };

  const openDashboard = (section: 'overview' | 'orders' = 'overview') => {
    setDashboardInitialSection(section);
    setIsDashboardOpen(true);
  };

  // Se i servizi non sono ancora inizializzati o c'è un errore critico durante l'init,
  // AppInitializer (usato in index.tsx) dovrebbe gestire la visualizzazione del caricamento/errore.
  // Qui potremmo aggiungere un ulteriore controllo se App viene renderizzato prima che AppInitializer abbia finito.
  if (!isInitialized || !appConfig) {
    // Questo stato dovrebbe essere gestito da AppInitializer, ma come fallback:
    return <div>Inizializzazione dell'applicazione in corso o fallita...</div>;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <img src={appConfig.business.logo} alt={appConfig.business.name} />
          <h1>{appConfig.business.name}</h1>
        </div>

        <div className="header-actions">
          <div className="provider-info">
            <span className="provider-label">AI:</span>
            <span className="provider-name">{currentAiProvider}</span>
          </div>

          <button
            className="dashboard-button"
            onClick={() => openDashboard('overview')}
          >
            Dashboard
          </button>

          <button
            className="dashboard-button orders-button"
            onClick={() => openDashboard('orders')}
          >
            Ordini
          </button>

          <button
            className="business-config-button"
            onClick={() => setIsBusinessPanelOpen(true)}
          >
            Impostazioni
          </button>

          {isAdminPanelEnabled && (
            <button
              className="business-config-button admin-control-button"
              onClick={() => setIsAdminControlOpen(true)}
            >
              Admin
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <section className="demo-cockpit">
          <div>
            <span className="cockpit-eyebrow">
              {tenantEnvironment === 'production' ? 'Production demo' : 'Demo workspace'}
            </span>
            <strong>{readinessScore}% pronto</strong>
          </div>
          <div className="cockpit-pills">
            <span>{appConfig.agents?.activeAgents?.length || 0} agenti attivi</span>
            <span>{hasKnowledge ? 'Knowledge collegata' : 'Knowledge da collegare'}</span>
            <span>{appConfig.integrations?.crmProvider && appConfig.integrations.crmProvider !== 'none' ? `${appConfig.integrations.crmProvider} ready` : 'CRM da collegare'}</span>
            <span>{tenantPlan} · {tenantEnvironment}</span>
          </div>
        </section>
        <CompleteChatInterface
          initialConfig={{
            showSidebar: false,
            enableSuggestions: appConfig.ui.enableSuggestions,
            enableDynamicComponents: appConfig.ui.enableDynamicComponents,
            enableNLP: false,
            maxRecommendations: appConfig.ui.maxRecommendations
          }}
        />
      </main>
      {/* Cart Components */}
      <CartButton onClick={() => {
        businessEventService.track('cart_opened');
        setIsCartOpen(true);
      }} />
          <CartDrawer 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
          />
      <footer className="app-footer">
        <div className="functions-info">
          <span>Funzioni disponibili: {availableFunctions.length}</span>
          <div className="functions-list">
            {availableFunctions.map(fn => (
              <span key={fn} className="function-badge">{fn}</span>
            ))}
          </div>
        </div>
        <div className="app-info">
          <p>{appConfig.business.name} &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>

      {isBusinessPanelOpen && (
        <div className="modal-overlay">
          <ConfigPanelOrchestrator
            onClose={() => setIsBusinessPanelOpen(false)}
            onSave={handleBusinessConfigSave}
          />
        </div>
      )}

      {isDashboardOpen && (
        <div className="modal-overlay">
          <BusinessDashboard
            onClose={() => setIsDashboardOpen(false)}
            initialSection={dashboardInitialSection}
          />
        </div>
      )}

      {isAdminControlOpen && (
        <div className="modal-overlay">
          <AdminControlPlane
            appConfig={appConfig}
            onClose={() => setIsAdminControlOpen(false)}
            onSaved={handleBusinessConfigSave}
          />
        </div>
      )}
    </div>
  );
}

export default App;
