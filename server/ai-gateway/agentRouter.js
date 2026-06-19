const AGENTS = {
  triage: {
    id: 'triage',
    label: 'Triage Agent',
    terms: [],
    tools: ['search_menu', 'search_products', 'get_item_detail', 'customer_profile', 'create_order_draft', 'knowledge_search'],
    instruction: 'Classifica la richiesta e accompagna il cliente verso menu, vendita, ordine o supporto.'
  },
  menu_advisor: {
    id: 'menu_advisor',
    label: 'Menu Advisor Agent',
    terms: ['menu', 'colazione', 'pranzo', 'aperitivo', 'allerg', 'glutine', 'lattosio', 'vegano', 'ingredient'],
    tools: ['search_menu', 'get_item_detail', 'customer_profile', 'knowledge_search'],
    instruction: 'Focalizzati su menu, ingredienti, allergeni, fasce orarie e alternative alimentari.'
  },
  sales: {
    id: 'sales',
    label: 'Sales Agent',
    terms: ['prodot', 'comprare', 'acquist', 'regalo', 'box', 'shop', 'prezzo', 'offerta', 'sconto'],
    tools: ['search_products', 'get_item_detail', 'customer_profile', 'create_order_draft', 'knowledge_search'],
    instruction: 'Focalizzati su prodotti acquistabili, bundle, upsell leggero e prossima azione commerciale.'
  },
  order: {
    id: 'order',
    label: 'Order Agent',
    terms: ['ordine', 'ordina', 'carrello', 'checkout', 'ritiro', 'consegna', 'whatsapp', 'pagamento'],
    tools: ['search_menu', 'search_products', 'get_item_detail', 'customer_profile', 'create_order_draft', 'knowledge_search'],
    instruction: 'Focalizzati su preparazione ordine, conferma, ritiro, consegna e passaggio al checkout.'
  },
  knowledge: {
    id: 'knowledge',
    label: 'Knowledge Agent',
    terms: ['orari', 'aperto', 'chiuso', 'storia', 'policy', 'privacy', 'faq', 'fornitori', 'wifi', 'prenotazione', 'allergeni', 'intolleranze'],
    tools: ['knowledge_search', 'customer_profile'],
    instruction: 'Recupera informazioni specifiche dalle fonti merchant configurate e rispondi solo con dati verificati o chiedi conferma.'
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics Agent',
    terms: ['dashboard', 'metriche', 'analytics', 'conversion', 'vendite', 'report', 'insight'],
    tools: ['customer_profile', 'knowledge_search'],
    instruction: 'Focalizzati su insight per esercente, performance, prodotti richiesti e azioni consigliate.'
  }
};

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function configuredAgents(payload = {}) {
  const configured = payload.agents || {};
  const definitions = Array.isArray(configured.definitions) ? configured.definitions : [];
  const merged = { ...AGENTS };

  definitions.forEach(definition => {
    if (!definition || !definition.id) return;
    const base = merged[definition.id] || {
      id: definition.id,
      label: definition.label || definition.id,
      terms: [],
      tools: [],
      instruction: ''
    };

    merged[definition.id] = {
      ...base,
      label: definition.label || base.label,
      terms: normalizeList(definition.terms).length > 0 ? normalizeList(definition.terms) : base.terms,
      tools: normalizeList(definition.tools).length > 0 ? normalizeList(definition.tools) : base.tools,
      instruction: [
        definition.goal ? `Obiettivo: ${definition.goal}` : '',
        definition.tone ? `Tono: ${definition.tone}` : '',
        definition.instruction || base.instruction,
        definition.fallback ? `Fallback: ${definition.fallback}` : ''
      ].filter(Boolean).join('\n')
    };
  });

  return merged;
}

function activeAgentIds(payload = {}) {
  const configured = payload.agents || {};
  const agents = configuredAgents(payload);
  if (configured.enabled === false) return ['triage'];
  const active = Array.isArray(configured.activeAgents) ? configured.activeAgents : [];
  return active.length > 0 ? active : Object.keys(agents);
}

function routeAgent(message, payload = {}) {
  const lower = String(message || '').toLowerCase();
  const agents = configuredAgents(payload);
  const enabledIds = activeAgentIds(payload);

  const ranked = enabledIds
    .map(id => agents[id] || agents.triage)
    .map(agent => {
      const score = agent.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
      return {
        ...agent,
        confidence: agent.id === 'triage' ? 0.45 : Math.min(0.95, 0.55 + score * 0.12),
        score
      };
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  const selected = ranked.find(agent => agent.score > 0) || (agents[enabledIds[0]] || agents.triage);

  return {
    id: selected.id,
    label: selected.label,
    confidence: selected.score > 0 ? selected.confidence : 0.45,
    instruction: selected.instruction,
    tools: selected.tools || []
  };
}

module.exports = { AGENTS, configuredAgents, routeAgent };
