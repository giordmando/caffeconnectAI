const STATE_TTL_MS = 30 * 60 * 1000;

const DEFAULT_STATE = {
  language: 'it',
  agentId: 'triage',
  goal: 'unknown',
  mealSlot: 'all',
  constraints: [],
  proposedItems: [],
  nextExpectedAction: 'none',
  plan: {
    agentId: 'triage',
    customerNeed: '',
    toolPlan: [],
    responseStrategy: '',
    missingInformation: []
  }
};

const ALLOWED_LANGUAGES = new Set(['it', 'en']);
const ALLOWED_AGENTS = new Set(['triage', 'menu_advisor', 'sales', 'order', 'knowledge', 'analytics']);
const ALLOWED_GOALS = new Set(['unknown', 'browse_menu', 'browse_products', 'order', 'ask_info']);
const ALLOWED_MEAL_SLOTS = new Set(['all', 'breakfast', 'lunch', 'aperitivo']);
const ALLOWED_ACTIONS = new Set([
  'none',
  'show_options',
  'choose_item',
  'confirm_proposal',
  'checkout_details',
  'ask_clarification'
]);
const ALLOWED_CONSTRAINTS = new Set(['lactose-free', 'gluten-free', 'vegan', 'vegetarian']);
const ALLOWED_TOOLS = new Set([
  'search_menu',
  'search_products',
  'get_item_detail',
  'create_order_draft',
  'knowledge_search'
]);

class AgentStateManager {
  constructor() {
    this.states = new Map();
  }

  beginTurn(conversationId) {
    const state = this.getState(conversationId);
    this.states.set(conversationId, { ...state, updatedAt: Date.now() });
    return { state: this.getState(conversationId), signals: {} };
  }

  analyzeMessage(conversationId) {
    return this.beginTurn(conversationId);
  }

  getState(conversationId) {
    const existing = this.states.get(conversationId);
    if (existing && Date.now() - existing.updatedAt <= STATE_TTL_MS) {
      return existing;
    }

    return {
      conversationId,
      ...DEFAULT_STATE,
      proposedItems: [],
      plan: { ...DEFAULT_STATE.plan, toolPlan: [], missingInformation: [] },
      updatedAt: Date.now()
    };
  }

  updateProposals(conversationId, proposals = [], nextExpectedAction = 'confirm_proposal') {
    const state = this.getState(conversationId);
    const updated = {
      ...state,
      proposedItems: this.sanitizeProposals(proposals).slice(0, 8),
      nextExpectedAction: this.allowed(nextExpectedAction, ALLOWED_ACTIONS, state.nextExpectedAction),
      updatedAt: Date.now()
    };
    this.states.set(conversationId, updated);
    return updated;
  }

  mergePlan(conversationId, plan = {}) {
    const state = this.getState(conversationId);
    const plannedToolPlan = this.sanitizeToolPlan(plan.toolPlan);
    const plannedGoal = this.allowed(plan.goal, ALLOWED_GOALS, state.goal);
    const preserveMenuContext = (
      state.goal === 'browse_menu' &&
      ['ask_info', 'unknown'].includes(plannedGoal) &&
      plannedToolPlan.length === 0
    );
    const nextProposals = Array.isArray(plan.proposedItems) && plan.proposedItems.length > 0
      ? this.sanitizeProposals(plan.proposedItems)
      : state.proposedItems;
    const agentId = this.allowed(plan.agentId, ALLOWED_AGENTS, state.agentId || 'triage');

    const updated = {
      ...state,
      language: this.allowed(plan.language, ALLOWED_LANGUAGES, state.language),
      agentId,
      goal: preserveMenuContext ? state.goal : plannedGoal,
      mealSlot: this.allowed(plan.mealSlot, ALLOWED_MEAL_SLOTS, state.mealSlot),
      constraints: Array.isArray(plan.constraints)
        ? this.mergeConstraints(state.constraints, plan.constraints)
        : state.constraints,
      proposedItems: nextProposals,
      nextExpectedAction: preserveMenuContext
        ? 'choose_item'
        : this.allowed(plan.nextExpectedAction, ALLOWED_ACTIONS, state.nextExpectedAction),
      plan: {
        agentId,
        customerNeed: this.cleanText(plan.customerNeed),
        toolPlan: plannedToolPlan,
        responseStrategy: this.cleanText(plan.responseStrategy),
        missingInformation: Array.isArray(plan.missingInformation)
          ? plan.missingInformation.map(item => this.cleanText(item)).filter(Boolean).slice(0, 5)
          : []
      },
      updatedAt: Date.now()
    };

    this.states.set(conversationId, updated);
    return updated;
  }

  setNextAction(conversationId, nextExpectedAction) {
    const state = this.getState(conversationId);
    const updated = {
      ...state,
      nextExpectedAction: this.allowed(nextExpectedAction, ALLOWED_ACTIONS, state.nextExpectedAction),
      updatedAt: Date.now()
    };
    this.states.set(conversationId, updated);
    return updated;
  }

  mergeConstraints(previous = [], next = []) {
    return Array.from(new Set([
      ...previous,
      ...next
        .map(value => this.cleanText(value))
        .filter(value => ALLOWED_CONSTRAINTS.has(value))
    ]));
  }

  sanitizeToolPlan(toolPlan = []) {
    if (!Array.isArray(toolPlan)) return [];
    return toolPlan
      .filter(step => step && ALLOWED_TOOLS.has(step.tool))
      .map(step => ({
        tool: step.tool,
        args: step.args && typeof step.args === 'object' ? step.args : {}
      }))
      .slice(0, 5);
  }

  sanitizeProposals(proposals = []) {
    if (!Array.isArray(proposals)) return [];
    return proposals
      .filter(item => item && item.id && item.name)
      .map(item => ({
        id: this.cleanText(item.id),
        name: this.cleanText(item.name),
        type: this.cleanText(item.type || 'menuItem') || 'menuItem',
        price: item.price
      }));
  }

  allowed(value, allowedValues, fallback) {
    const normalized = this.cleanText(value);
    return allowedValues.has(normalized) ? normalized : fallback;
  }

  cleanText(value) {
    return String(value || '').trim();
  }
}

module.exports = { AgentStateManager };
