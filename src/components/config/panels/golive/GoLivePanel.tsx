import React, { useMemo, useState } from 'react';
import { IConfigSection } from '../../interfaces/IConfigSection';
import { AppConfig } from '../../../../config/interfaces/IAppConfig';

type FullConfig = AppConfig;

const AGENT_OPTIONS = [
  { id: 'triage', label: 'Triage' },
  { id: 'menu_advisor', label: 'Menu advisor' },
  { id: 'sales', label: 'Sales' },
  { id: 'order', label: 'Order' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'analytics', label: 'Analytics' }
];

const TOOL_OPTIONS = [
  'search_menu',
  'search_products',
  'get_item_detail',
  'customer_profile',
  'create_order_draft',
  'knowledge_search'
];

const DEFAULT_AGENT_DEFINITIONS = [
  {
    id: 'triage',
    label: 'Triage Agent',
    goal: 'Capire intento e prossimo agente migliore.',
    terms: [],
    tools: TOOL_OPTIONS,
    tone: 'naturale, breve',
    instruction: 'Classifica la richiesta e accompagna il cliente verso menu, vendita, ordine o supporto.',
    fallback: 'Chiedi una domanda di chiarimento.'
  },
  {
    id: 'menu_advisor',
    label: 'Menu Advisor Agent',
    goal: 'Consigliare menu e alternative compatibili.',
    terms: ['menu', 'colazione', 'pranzo', 'aperitivo', 'allerg', 'glutine', 'lattosio'],
    tools: ['search_menu', 'get_item_detail', 'customer_profile', 'knowledge_search'],
    tone: 'consulente, rassicurante',
    instruction: 'Focalizzati su menu, ingredienti, allergeni, fasce orarie e alternative alimentari.',
    fallback: 'Se manca il menu reale, chiedi di configurarlo.'
  },
  {
    id: 'sales',
    label: 'Sales Agent',
    goal: 'Portare interesse verso prodotto, bundle o carrello.',
    terms: ['prodot', 'comprare', 'acquist', 'regalo', 'box', 'offerta'],
    tools: ['search_products', 'get_item_detail', 'customer_profile', 'create_order_draft', 'knowledge_search'],
    tone: 'commerciale leggero',
    instruction: 'Focalizzati su prodotti acquistabili, bundle, upsell leggero e prossima azione commerciale.',
    fallback: 'Se manca il catalogo prodotti reale, dichiaralo.'
  },
  {
    id: 'order',
    label: 'Order Agent',
    goal: 'Preparare ordine e conferma senza invii automatici.',
    terms: ['ordine', 'ordina', 'carrello', 'checkout', 'ritiro', 'consegna', 'pagamento'],
    tools: ['search_menu', 'search_products', 'get_item_detail', 'customer_profile', 'create_order_draft', 'knowledge_search'],
    tone: 'operativo, preciso',
    instruction: 'Focalizzati su preparazione ordine, conferma, ritiro, consegna e passaggio al checkout.',
    fallback: 'Non inviare mai un ordine senza conferma.'
  },
  {
    id: 'knowledge',
    label: 'Knowledge Agent',
    goal: 'Rispondere usando solo fonti merchant verificabili.',
    terms: ['orari', 'wifi', 'prenotazione', 'allergeni', 'policy', 'faq'],
    tools: ['knowledge_search', 'customer_profile'],
    tone: 'chiaro, affidabile',
    instruction: 'Recupera informazioni specifiche dalle fonti merchant configurate.',
    fallback: 'Se manca la fonte, dichiaralo.'
  },
  {
    id: 'analytics',
    label: 'Analytics Agent',
    goal: 'Trasformare richieste in insight per esercente.',
    terms: ['dashboard', 'metriche', 'analytics', 'vendite', 'report', 'insight'],
    tools: ['customer_profile', 'knowledge_search'],
    tone: 'business, sintetico',
    instruction: 'Focalizzati su insight, performance e azioni consigliate.',
    fallback: 'Se i dati sono pochi, evidenzia il limite.'
  }
];

type AgentDefinition = NonNullable<NonNullable<FullConfig['agents']>['definitions']>[number];

function listToText(values: string[] = []): string {
  return values.join(', ');
}

function textToList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function setupScore(config: FullConfig): number {
  const checks = [
    Boolean(config.business.name && config.business.telefono),
    Boolean(config.catalog.enableLocalData || config.catalog.menuEndpoint || config.catalog.productsEndpoint),
    Boolean(config.knowledgeBase?.length || config.merchantKnowledge?.sources?.some(source => source.enabled && source.url) || config.knowledgeSources?.urls?.length),
    Boolean(config.business.whatsappBusiness || config.business.orderWebhook),
    Boolean(config.agents?.enabled && config.agents.activeAgents.length > 0),
    Boolean(config.integrations?.posProvider && config.integrations.posProvider !== 'none')
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const GoLivePanel: React.FC<IConfigSection<FullConfig>> = ({
  config,
  onChange,
  className = ''
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState('triage');
  const tenant = config.tenant || {
    merchantId: '',
    workspaceId: '',
    plan: 'demo',
    environment: 'demo'
  };
  const agents = config.agents || {
    enabled: true,
    activeAgents: [],
    handoffMode: 'auto',
    definitions: DEFAULT_AGENT_DEFINITIONS
  };
  const agentDefinitions = useMemo(() => {
    const configured = Array.isArray(agents.definitions) ? agents.definitions : [];
    return DEFAULT_AGENT_DEFINITIONS.map(defaultAgent => ({
      ...defaultAgent,
      ...(configured.find(agent => agent.id === defaultAgent.id) || {})
    }));
  }, [agents.definitions]);
  const selectedAgent = agentDefinitions.find(agent => agent.id === selectedAgentId) || agentDefinitions[0];
  const integrations = config.integrations || {};
  const score = setupScore(config);

  const updateTenant = (field: string, value: any) => {
    onChange('tenant', { ...tenant, [field]: value });
  };

  const updateAgents = (field: string, value: any) => {
    onChange('agents', { ...agents, [field]: value });
  };

  const updateAgentDefinition = (agentId: string, patch: Partial<AgentDefinition>) => {
    const nextDefinitions = agentDefinitions.map(agent =>
      agent.id === agentId ? { ...agent, ...patch } : agent
    );
    updateAgents('definitions', nextDefinitions);
  };

  const updateIntegrations = (field: string, value: any) => {
    onChange('integrations', { ...integrations, [field]: value });
  };

  const toggleAgent = (agentId: string) => {
    const activeAgents = agents.activeAgents || [];
    const nextAgents = activeAgents.includes(agentId)
      ? activeAgents.filter(id => id !== agentId)
      : [...activeAgents, agentId];

    updateAgents('activeAgents', nextAgents);
  };

  return (
    <div className={`config-section go-live-panel ${className}`}>
      <div className="go-live-hero">
        <div>
          <h3>Go Live Center</h3>
          <p>Preparazione demo e SaaS readiness per il merchant corrente.</p>
        </div>
        <div className="go-live-score">
          <strong>{score}%</strong>
          <span>pronto demo</span>
        </div>
      </div>

      <div className="go-live-grid">
        <section className="go-live-block">
          <h4>Tenant merchant</h4>
          <div className="form-group">
            <label htmlFor="tenant-merchant-id">Merchant ID</label>
            <input
              id="tenant-merchant-id"
              type="text"
              value={tenant.merchantId}
              onChange={(event) => updateTenant('merchantId', event.target.value)}
              placeholder="cafeconnect-roastery"
            />
          </div>
          <div className="form-group">
            <label htmlFor="tenant-workspace-id">Workspace</label>
            <input
              id="tenant-workspace-id"
              type="text"
              value={tenant.workspaceId}
              onChange={(event) => updateTenant('workspaceId', event.target.value)}
              placeholder="workspace-demo"
            />
          </div>
          <div className="go-live-inline">
            <div className="form-group">
              <label htmlFor="tenant-plan">Piano</label>
              <select
                id="tenant-plan"
                value={tenant.plan}
                onChange={(event) => updateTenant('plan', event.target.value)}
              >
                <option value="demo">Demo</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tenant-env">Ambiente</label>
              <select
                id="tenant-env"
                value={tenant.environment}
                onChange={(event) => updateTenant('environment', event.target.value)}
              >
                <option value="demo">Demo</option>
                <option value="staging">Staging</option>
                <option value="production">Produzione</option>
              </select>
            </div>
          </div>
        </section>

        <section className="go-live-block">
          <h4>Agent Studio</h4>
          <label className="config-toggle">
            <input
              type="checkbox"
              checked={agents.enabled}
              onChange={(event) => updateAgents('enabled', event.target.checked)}
            />
            <span>Router agenti attivo</span>
          </label>
          <div className="agent-chip-grid">
            {AGENT_OPTIONS.map(agent => (
              <button
                key={agent.id}
                type="button"
                className={[
                  agents.activeAgents.includes(agent.id) ? 'agent-chip active' : 'agent-chip',
                  selectedAgentId === agent.id ? 'selected' : ''
                ].filter(Boolean).join(' ')}
                onClick={() => toggleAgent(agent.id)}
                onDoubleClick={() => setSelectedAgentId(agent.id)}
              >
                {agent.label}
              </button>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="agent-editor-select">Modifica agente</label>
            <select
              id="agent-editor-select"
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
            >
              {agentDefinitions.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.label}</option>
              ))}
            </select>
          </div>
          {selectedAgent && (
            <div className="agent-editor">
              <div className="go-live-inline">
                <div className="form-group">
                  <label htmlFor="agent-label">Nome</label>
                  <input
                    id="agent-label"
                    type="text"
                    value={selectedAgent.label}
                    onChange={(event) => updateAgentDefinition(selectedAgent.id, { label: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="agent-tone">Tono</label>
                  <input
                    id="agent-tone"
                    type="text"
                    value={selectedAgent.tone || ''}
                    onChange={(event) => updateAgentDefinition(selectedAgent.id, { tone: event.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="agent-goal">Obiettivo</label>
                <textarea
                  id="agent-goal"
                  value={selectedAgent.goal}
                  onChange={(event) => updateAgentDefinition(selectedAgent.id, { goal: event.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label htmlFor="agent-terms">Trigger intenti</label>
                <input
                  id="agent-terms"
                  type="text"
                  value={listToText(selectedAgent.terms)}
                  onChange={(event) => updateAgentDefinition(selectedAgent.id, { terms: textToList(event.target.value) })}
                />
              </div>
              <div className="agent-tool-grid">
                {TOOL_OPTIONS.map(tool => (
                  <label key={tool} className="agent-tool-toggle">
                    <input
                      type="checkbox"
                      checked={(selectedAgent.tools || []).includes(tool)}
                      onChange={(event) => {
                        const tools = selectedAgent.tools || [];
                        updateAgentDefinition(selectedAgent.id, {
                          tools: event.target.checked
                            ? Array.from(new Set([...tools, tool]))
                            : tools.filter(item => item !== tool)
                        });
                      }}
                    />
                    <span>{tool}</span>
                  </label>
                ))}
              </div>
              <div className="form-group">
                <label htmlFor="agent-instruction">Istruzioni operative</label>
                <textarea
                  id="agent-instruction"
                  value={selectedAgent.instruction || ''}
                  onChange={(event) => updateAgentDefinition(selectedAgent.id, { instruction: event.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="agent-fallback">Fallback</label>
                <input
                  id="agent-fallback"
                  type="text"
                  value={selectedAgent.fallback || ''}
                  onChange={(event) => updateAgentDefinition(selectedAgent.id, { fallback: event.target.value })}
                />
              </div>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="agent-handoff">Handoff</label>
            <select
              id="agent-handoff"
              value={agents.handoffMode}
              onChange={(event) => updateAgents('handoffMode', event.target.value)}
            >
              <option value="auto">Automatico</option>
              <option value="guided">Guidato</option>
            </select>
          </div>
        </section>

        <section className="go-live-block">
          <h4>Integrazioni operative</h4>
          <div className="go-live-inline">
            <div className="form-group">
              <label htmlFor="pos-provider">POS</label>
              <select
                id="pos-provider"
                value={integrations.posProvider || 'none'}
                onChange={(event) => updateIntegrations('posProvider', event.target.value)}
              >
                <option value="none">Non collegato</option>
                <option value="generic-webhook">Webhook generico</option>
                <option value="make">Make</option>
                <option value="zapier">Zapier</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="crm-provider">CRM</label>
              <select
                id="crm-provider"
                value={integrations.crmProvider || 'none'}
                onChange={(event) => updateIntegrations('crmProvider', event.target.value)}
              >
                <option value="none">Non collegato</option>
                <option value="generic-webhook">Webhook generico</option>
                <option value="make">Make</option>
                <option value="zapier">Zapier</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="make-webhook">Make webhook</label>
            <input
              id="make-webhook"
              type="url"
              value={integrations.makeWebhookUrl || ''}
              onChange={(event) => updateIntegrations('makeWebhookUrl', event.target.value)}
              placeholder="https://hook.eu1.make.com/..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="zapier-webhook">Zapier webhook</label>
            <input
              id="zapier-webhook"
              type="url"
              value={integrations.zapierWebhookUrl || ''}
              onChange={(event) => updateIntegrations('zapierWebhookUrl', event.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>
          <div className="go-live-inline">
            <div className="form-group">
              <label htmlFor="booking-url">Prenotazioni</label>
              <input
                id="booking-url"
                type="url"
                value={integrations.bookingUrl || ''}
                onChange={(event) => updateIntegrations('bookingUrl', event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="form-group">
              <label htmlFor="payment-url">Pagamento</label>
              <input
                id="payment-url"
                type="url"
                value={integrations.paymentUrl || ''}
                onChange={(event) => updateIntegrations('paymentUrl', event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
