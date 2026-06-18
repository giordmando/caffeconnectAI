const AGENTS = {
  triage: {
    id: 'triage',
    label: 'Triage Agent',
    terms: [],
    instruction: 'Classifica la richiesta e accompagna il cliente verso menu, vendita, ordine o supporto.'
  },
  menu_advisor: {
    id: 'menu_advisor',
    label: 'Menu Advisor Agent',
    terms: ['menu', 'colazione', 'pranzo', 'aperitivo', 'allerg', 'glutine', 'lattosio', 'vegano', 'ingredient'],
    instruction: 'Focalizzati su menu, ingredienti, allergeni, fasce orarie e alternative alimentari.'
  },
  sales: {
    id: 'sales',
    label: 'Sales Agent',
    terms: ['prodot', 'comprare', 'acquist', 'regalo', 'box', 'shop', 'prezzo', 'offerta', 'sconto'],
    instruction: 'Focalizzati su prodotti acquistabili, bundle, upsell leggero e prossima azione commerciale.'
  },
  order: {
    id: 'order',
    label: 'Order Agent',
    terms: ['ordine', 'ordina', 'carrello', 'checkout', 'ritiro', 'consegna', 'whatsapp', 'pagamento'],
    instruction: 'Focalizzati su preparazione ordine, conferma, ritiro, consegna e passaggio al checkout.'
  },
  knowledge: {
    id: 'knowledge',
    label: 'Knowledge Agent',
    terms: ['orari', 'aperto', 'chiuso', 'storia', 'policy', 'privacy', 'faq', 'fornitori', 'wifi', 'prenotazione', 'allergeni', 'intolleranze'],
    instruction: 'Recupera informazioni specifiche dalle fonti merchant configurate e rispondi solo con dati verificati o chiedi conferma.'
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics Agent',
    terms: ['dashboard', 'metriche', 'analytics', 'conversion', 'vendite', 'report', 'insight'],
    instruction: 'Focalizzati su insight per esercente, performance, prodotti richiesti e azioni consigliate.'
  }
};

function activeAgentIds(payload = {}) {
  const configured = payload.agents || {};
  if (configured.enabled === false) return ['triage'];
  const active = Array.isArray(configured.activeAgents) ? configured.activeAgents : [];
  return active.length > 0 ? active : Object.keys(AGENTS);
}

function routeAgent(message, payload = {}) {
  const lower = String(message || '').toLowerCase();
  const enabledIds = activeAgentIds(payload);

  const ranked = enabledIds
    .map(id => AGENTS[id] || AGENTS.triage)
    .map(agent => {
      const score = agent.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
      return {
        ...agent,
        confidence: agent.id === 'triage' ? 0.45 : Math.min(0.95, 0.55 + score * 0.12),
        score
      };
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence);

  const selected = ranked.find(agent => agent.score > 0) || (AGENTS[enabledIds[0]] || AGENTS.triage);

  return {
    id: selected.id,
    label: selected.label,
    confidence: selected.score > 0 ? selected.confidence : 0.45,
    instruction: selected.instruction
  };
}

module.exports = { AGENTS, routeAgent };
