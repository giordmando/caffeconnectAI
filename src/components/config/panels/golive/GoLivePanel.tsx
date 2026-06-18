import React from 'react';
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
  const tenant = config.tenant || {
    merchantId: '',
    workspaceId: '',
    plan: 'demo',
    environment: 'demo'
  };
  const agents = config.agents || {
    enabled: true,
    activeAgents: [],
    handoffMode: 'auto'
  };
  const integrations = config.integrations || {};
  const score = setupScore(config);

  const updateTenant = (field: string, value: any) => {
    onChange('tenant', { ...tenant, [field]: value });
  };

  const updateAgents = (field: string, value: any) => {
    onChange('agents', { ...agents, [field]: value });
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
          <h4>Agenti specializzati</h4>
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
                className={agents.activeAgents.includes(agent.id) ? 'agent-chip active' : 'agent-chip'}
                onClick={() => toggleAgent(agent.id)}
              >
                {agent.label}
              </button>
            ))}
          </div>
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
