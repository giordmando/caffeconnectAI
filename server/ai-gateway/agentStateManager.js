const STATE_TTL_MS = 30 * 60 * 1000;

const SEMANTIC_MARKERS = {
  languageEn: [
    ' i ',
    ' do ',
    ' can ',
    ' want ',
    ' would ',
    ' please ',
    ' breakfast',
    ' lunch',
    ' order',
    ' show',
    ' dairy',
    ' gluten',
    ' vegan'
  ],
  confirm: ['si', 'ok', 'va bene', 'vai', 'procedi', 'confermo', 'prepara', 'yes', 'yeah', 'yep', 'go ahead', 'proceed', 'confirm'],
  order: ['ordine', 'ordina', 'ordinare', 'carrello', 'checkout', 'ritiro', 'acquist', 'comprare', 'order', 'cart', 'buy', 'pickup'],
  show: ['mostra', 'fammi vedere', 'vedere', 'quali', 'opzioni', 'proposte', 'proponi', 'suggerisci', 'qualcosa', 'avete', 'hai qualcosa', 'consigli', 'consiglia', 'show', 'options', 'recommend', 'suggest', 'do you have'],
  details: ['dettaglio', 'dettagli', 'scheda', 'ingredient', 'allergen', 'detail', 'details'],
  products: ['prodotti', 'prodotto', 'shop', 'confezione', 'tazza', 'biscotti', 'caffe in grani', 'products', 'beans', 'gift'],
  info: ['wifi', 'wi-fi', 'prenot', 'orari', 'aperto', 'chiuso', 'telefono', 'contatto', 'policy', 'privacy', 'booking', 'reservation', 'opening'],
  alternatives: ['altro', 'alternativa', 'alternative', 'oppure', 'else'],
  meal: {
    breakfast: ['colazione', 'mattina', 'cappuccino', 'cornetto', 'breakfast', 'morning', 'pastry'],
    lunch: ['pranzo', 'bowl', 'toast', 'insalata', 'lunch'],
    aperitivo: ['aperitivo', 'sera', 'after work', 'evening']
  },
  constraints: {
    'lactose-free': ['senza lattosio', 'lattosio', 'intoller', 'latte vegetale', 'bevanda vegetale', 'lactose', 'dairy free', 'non dairy'],
    'gluten-free': ['senza glutine', 'glutine', 'celiach', 'gluten free', 'gluten'],
    vegan: ['vegano', 'vegana', 'vegan'],
    vegetarian: ['vegetariano', 'vegetariana', 'vegetarian']
  }
};

class AgentStateManager {
  constructor() {
    this.states = new Map();
  }

  analyzeMessage(conversationId, message) {
    const normalized = this.normalize(message);
    const previous = this.getState(conversationId);
    const language = this.detectLanguage(normalized, previous.language);
    const constraints = this.mergeConstraints(previous.constraints, this.detectConstraints(normalized));
    const mealSlot = this.detectMealSlot(normalized) || previous.mealSlot;
    const signals = this.detectSignals(normalized, previous);
    const goal = this.resolveGoal(signals, previous.goal);
    const nextExpectedAction = this.resolveNextAction(signals, goal, previous);
    const state = {
      ...previous,
      language,
      goal,
      mealSlot,
      constraints,
      nextExpectedAction,
      updatedAt: Date.now()
    };

    this.states.set(conversationId, state);
    return { state, signals };
  }

  getState(conversationId) {
    const existing = this.states.get(conversationId);
    if (existing && Date.now() - existing.updatedAt <= STATE_TTL_MS) {
      return existing;
    }

    return {
      conversationId,
      language: 'it',
      goal: 'unknown',
      mealSlot: 'all',
      constraints: [],
      proposedItems: [],
      nextExpectedAction: 'none',
      updatedAt: Date.now()
    };
  }

  updateProposals(conversationId, proposals = [], nextExpectedAction = 'confirm_proposal') {
    const state = this.getState(conversationId);
    const updated = {
      ...state,
      proposedItems: proposals.slice(0, 8),
      nextExpectedAction,
      updatedAt: Date.now()
    };
    this.states.set(conversationId, updated);
    return updated;
  }

  setNextAction(conversationId, nextExpectedAction) {
    const state = this.getState(conversationId);
    const updated = { ...state, nextExpectedAction, updatedAt: Date.now() };
    this.states.set(conversationId, updated);
    return updated;
  }

  normalize(value) {
    return ` ${String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()} `;
  }

  includesAny(text, terms = []) {
    return terms.some(term => {
      const normalizedTerm = this.normalize(term).trim();
      return text.includes(` ${normalizedTerm} `) || text.includes(normalizedTerm);
    });
  }

  detectLanguage(normalized, fallback) {
    return this.includesAny(normalized, SEMANTIC_MARKERS.languageEn) ? 'en' : fallback;
  }

  detectMealSlot(normalized) {
    if (this.includesAny(normalized, SEMANTIC_MARKERS.meal.breakfast)) return 'breakfast';
    if (this.includesAny(normalized, SEMANTIC_MARKERS.meal.lunch)) return 'lunch';
    if (this.includesAny(normalized, SEMANTIC_MARKERS.meal.aperitivo)) return 'aperitivo';
    return null;
  }

  detectConstraints(normalized) {
    return Object.entries(SEMANTIC_MARKERS.constraints)
      .filter(([, markers]) => this.includesAny(normalized, markers))
      .map(([constraint]) => constraint);
  }

  mergeConstraints(previous = [], next = []) {
    return Array.from(new Set([...previous, ...next]));
  }

  detectSignals(normalized, previous) {
    const isConfirmation = this.includesAny(normalized, SEMANTIC_MARKERS.confirm)
      && ['confirm_proposal', 'choose_item', 'checkout_details'].includes(previous.nextExpectedAction);
    const wantsOrder = this.includesAny(normalized, SEMANTIC_MARKERS.order) || isConfirmation;
    const wantsProducts = this.includesAny(normalized, SEMANTIC_MARKERS.products);
    const wantsDetails = this.includesAny(normalized, SEMANTIC_MARKERS.details);
    const wantsInfo = this.includesAny(normalized, SEMANTIC_MARKERS.info);
    const wantsCatalog = this.includesAny(normalized, SEMANTIC_MARKERS.show)
      || Boolean(this.detectMealSlot(normalized))
      || this.detectConstraints(normalized).length > 0
      || (previous.goal === 'browse_menu' && this.includesAny(normalized, SEMANTIC_MARKERS.alternatives));

    return {
      isConfirmation,
      wantsCatalog,
      wantsProducts,
      wantsOrder,
      wantsDetails,
      wantsInfo,
      asksForAlternatives: this.includesAny(normalized, SEMANTIC_MARKERS.alternatives)
    };
  }

  resolveGoal(signals, previousGoal) {
    if (signals.wantsOrder) return 'order';
    if (signals.wantsProducts) return 'browse_products';
    if (signals.wantsCatalog || signals.wantsDetails) return 'browse_menu';
    if (signals.wantsInfo) return 'ask_info';
    return previousGoal;
  }

  resolveNextAction(signals, goal, previous) {
    if (signals.isConfirmation && previous.proposedItems.length > 0) return 'checkout_details';
    if (signals.wantsDetails) return 'show_options';
    if (goal === 'order' && previous.proposedItems.length > 0) return 'confirm_proposal';
    if (goal === 'browse_menu' || goal === 'browse_products') return 'choose_item';
    if (goal === 'ask_info') return 'none';
    return previous.nextExpectedAction;
  }
}

module.exports = { AgentStateManager };
