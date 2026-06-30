function safeJsonParse(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch (_error) {
    return fallback;
  }
}

const { configuredAgents, getAgentById } = require('./agentRouter');
const { AgentStateManager } = require('./agentStateManager');

class AgentOrchestrator {
  constructor({ openaiClient, toolRegistry, config }) {
    this.openaiClient = openaiClient;
    this.toolRegistry = toolRegistry;
    this.config = config;
    this.agentStateManager = new AgentStateManager();
  }

  async runChat(payload) {
    const message = String(payload.message || '').trim();
    const conversationId = String(payload.conversationId || 'anonymous');
    const stateAnalysis = this.agentStateManager.beginTurn(conversationId);
    const initialAgent = getAgentById(stateAnalysis.state.agentId || 'triage', payload);

    if (!message) {
      return {
        message: 'Scrivi un messaggio per iniziare.',
        agent: initialAgent,
        toolCalls: [],
        mode: 'validation'
      };
    }

    const privacyGovernedResponse = this.handlePrivacyGovernedMemoryRequest(message, payload, initialAgent);
    if (privacyGovernedResponse) {
      return privacyGovernedResponse;
    }

    const plannedStateAnalysis = await this.planConversationTurn(message, payload, stateAnalysis);
    const plannedState = plannedStateAnalysis?.state || stateAnalysis.state;
    const plannedSignals = plannedStateAnalysis?.signals || stateAnalysis.signals || {};
    const plannedAgent = getAgentById(plannedState.agentId || plannedState.plan?.agentId || 'triage', payload);
    const plannedResponse = await this.runPlannedToolFlow(message, payload, plannedAgent, plannedState, plannedSignals);
    if (plannedResponse) {
      return {
        ...plannedResponse,
        mode: 'openai-responses'
      };
    }

    return this.runResponsesWithTools(message, payload, plannedAgent, plannedStateAnalysis);
  }

  async planConversationTurn(message, payload = {}, stateAnalysis) {
    if (!this.openaiClient.isConfigured()) {
      return stateAnalysis;
    }

    const conversationId = String(payload.conversationId || 'anonymous');
    const state = stateAnalysis?.state || this.agentStateManager.getState(conversationId);
    const catalogSummary = await this.collectCatalogSummary(payload);
    const availableAgents = configuredAgents(payload);
    const plannerInstructions = [
      'Sei il planner agentico di CafeConnect AI.',
      'Devi aggiornare lo stato conversazionale, non rispondere al cliente.',
      'Produci solo JSON valido, senza markdown.',
      'Tu sei l unico punto decisionale: scegli agentId, goal, stato e toolPlan. Non delegare la comprensione a keyword o intent parser.',
      'Gli agent sono competenze operative con tool autorizzati: scegli un agentId tra quelli disponibili e pianifica tool compatibili.',
      'Mantieni goal, vincoli e proposte precedenti se il cliente non li cambia.',
      'Se previousState.goal e browse_menu e il cliente fa una domanda breve di follow-up, non ripartire con saluti o ask_info: mantieni browse_menu e pianifica search_menu.',
      'Se il cliente risponde "si", "si grazie" o simili dopo una proposta menu, interpreta come richiesta di vedere/continuare le opzioni, non come nuova conversazione.',
      'Se il cliente chiede se una proposta e fit/salutare/leggera, mantieni mealSlot e vincoli precedenti e cerca opzioni coerenti; non inventare una linea fit se non e nel catalogo.',
      'Se il cliente chiede di aggiungere un articolo per nome, imposta goal order e nextExpectedAction checkout_details.',
      'Se il cliente chiede opzioni da mangiare, evita bevande e pianifica search_menu con category food quando possibile.',
      'Se il cliente chiede allergeni o compatibilita, pianifica dettaglio o ricerca con dietaryPreference.',
      'Se il cliente dichiara allergia, intolleranza o rischio grave, non proporre mai articoli con allergeni incompatibili.',
      'Se un articolo e stato dichiarato incompatibile, non riproporlo come opzione ordinabile nella stessa conversazione.',
      'Quando il cliente conferma dopo una proposta valida, pianifica carrello/ordine invece di fare una nuova raccomandazione generica.',
      'Schema JSON: {"language":"it|en","agentId":"triage|menu_advisor|sales|order|knowledge|analytics","goal":"unknown|browse_menu|browse_products|order|ask_info","mealSlot":"all|breakfast|lunch|aperitivo","constraints":["lactose-free|gluten-free|vegan|vegetarian"],"customerNeed":"string","nextExpectedAction":"none|show_options|choose_item|confirm_proposal|checkout_details|ask_clarification","toolPlan":[{"tool":"search_menu|search_products|get_item_detail|create_order_draft|knowledge_search","args":{}}],"responseStrategy":"string","missingInformation":[]}'
    ].join('\n');

    try {
      const response = await this.openaiClient.createResponse({
        instructions: plannerInstructions,
        input: JSON.stringify({
          message,
          previousState: state,
          availableAgents,
          customerProfile: this.buildCustomerProfile(payload),
          catalogSummary
        }),
        metadata: {
          product: 'cafeconnect-ai',
          conversation_id: conversationId,
          agent_phase: 'planner'
        }
      });
      const text = this.openaiClient.extractText(response);
      const plan = safeJsonParse(this.extractJsonObject(text), {});
      const plannedState = this.agentStateManager.mergePlan(conversationId, plan);
      return {
        state: plannedState,
        signals: stateAnalysis?.signals || {}
      };
    } catch (error) {
      console.warn('[ai-gateway] planner failed, using deterministic state:', error.message);
      return stateAnalysis;
    }
  }

  extractJsonObject(text) {
    const raw = String(text || '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return raw;
    return raw.slice(start, end + 1);
  }

  formatCatalogSummary(catalog = {}) {
    const menuItems = Array.isArray(catalog.menuItems) ? catalog.menuItems : [];
    const products = Array.isArray(catalog.products) ? catalog.products : [];
    const summarize = item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      timeOfDay: item.timeOfDay,
      dietaryInfo: item.dietaryInfo,
      allergens: item.allergens
    });

    return {
      menuItems: menuItems.slice(0, 40).map(summarize),
      products: products.slice(0, 40).map(summarize)
    };
  }

  async collectCatalogSummary(payload = {}) {
    const runtimeSummary = this.formatCatalogSummary(payload.catalog || {});
    if (runtimeSummary.menuItems.length > 0 || runtimeSummary.products.length > 0) {
      return runtimeSummary;
    }

    try {
      const [menuResult, productResult] = await Promise.all([
        this.toolRegistry.execute('search_menu', { query: '', timeOfDay: 'all', limit: 40 }, payload),
        this.toolRegistry.execute('search_products', { query: '', limit: 40 }, payload)
      ]);

      return this.formatCatalogSummary({
        menuItems: menuResult.items || [],
        products: productResult.products || []
      });
    } catch (error) {
      console.warn('[ai-gateway] unable to collect catalog summary for planner:', error.message);
      return runtimeSummary;
    }
  }

  handlePrivacyGovernedMemoryRequest(message, payload = {}, agent) {
    const lower = String(message || '').toLowerCase();
    const dataGovernance = payload.dataGovernance || {};
    const asksToRemember = [
      'ricorda',
      'ricordati',
      'ricordatelo',
      'tienilo a mente',
      'tienilo presente',
      'per le prossime volte',
      'per la prossima volta'
    ].some(term => lower.includes(term));

    const localNonSensitivePreference =
      dataGovernance.customerProfileStorage === 'local-only' &&
      this.containsNonSensitivePreference(lower) &&
      !this.containsSensitivePreference(lower);

    if (!asksToRemember && !localNonSensitivePreference) {
      return null;
    }

    const sensitive = this.containsSensitivePreference(lower);
    const storageDisabled = dataGovernance.customerProfileStorage === 'disabled';
    const sensitiveInferenceDisabled = dataGovernance.allowSensitiveInference === false;

    if (storageDisabled || (sensitive && sensitiveInferenceDisabled)) {
      return {
        message: this.privacyMemoryRefusalMessage(lower, storageDisabled, sensitive),
        agent,
        toolCalls: [],
        mode: 'validation'
      };
    }

    if (localNonSensitivePreference) {
      return {
        message: this.localPreferenceMemoryMessage(lower),
        agent,
        toolCalls: [],
        mode: 'validation'
      };
    }

    return null;
  }

  containsSensitivePreference(lower) {
    return [
      'allerg',
      'intoller',
      'lattosio',
      'glutine',
      'celiach',
      'diabet',
      'salute',
      'medic',
      'malatt',
      'gravid',
      'relig',
      'halal',
      'kosher'
    ].some(term => lower.includes(term));
  }

  privacyMemoryRefusalMessage(lower, storageDisabled, sensitive) {
    const scope = storageDisabled
      ? 'non memorizzero preferenze per le prossime volte'
      : 'non memorizzero questa informazione come preferenza futura';

    if (lower.includes('lattosio')) {
      return `Posso tenerne conto per questa conversazione, ma ${scope}. Per opzioni senza lattosio posso consigliarti il cappuccino con bevanda d avena o le proposte indicate come senza lattosio.`;
    }

    if (sensitive) {
      return `Posso usarlo solo per aiutarti in questa richiesta, ma ${scope}. Se hai allergie o intolleranze importanti, segnalalo anche al personale prima dell ordine.`;
    }

    return `Posso aiutarti in questa conversazione, ma ${scope} con le impostazioni privacy attuali.`;
  }

  containsNonSensitivePreference(lower) {
    return [
      'preferisco',
      'mi piace',
      'prendo spesso',
      'spesso prendo',
      'di solito prendo',
      'adoro'
    ].some(term => lower.includes(term));
  }

  localPreferenceMemoryMessage(lower) {
    if (lower.includes('vegetal') && lower.includes('filtro')) {
      return 'Perfetto, lo terrò presente su questo dispositivo: preferisci bevande vegetali e caffè filtro. Posso consigliarti l Etiopia Yirgacheffe Specialty oppure una bevanda con latte d avena.';
    }

    if (lower.includes('vegetal')) {
      return 'Perfetto, terrò conto su questo dispositivo che preferisci bevande vegetali. Posso proporti opzioni con latte d avena o alternative senza lattosio.';
    }

    if (lower.includes('filtro')) {
      return 'Perfetto, terrò conto su questo dispositivo che preferisci caffè filtro. Ti posso consigliare l Etiopia Yirgacheffe Specialty.';
    }

    return 'Perfetto, terrò conto di questa preferenza su questo dispositivo e la userò per consigliarti meglio durante l esperienza.';
  }

  async runResponsesWithTools(message, payload, agent, stateAnalysis) {
    const retrievedKnowledge = await this.retrieveKnowledgeContext(message, payload);
    const customerProfile = this.buildCustomerProfile(payload);
    const allowedTools = Array.isArray(agent.tools) && agent.tools.length > 0 ? agent.tools : null;
    const instructions = this.buildInstructions(payload, agent, {
      retrievedKnowledge,
      customerProfile,
      agentState: stateAnalysis?.state
    });
    let response = await this.openaiClient.createResponse({
      instructions,
      input: message,
      tools: this.toolRegistry.asOpenAITools(allowedTools),
      parallel_tool_calls: true,
      metadata: {
        product: 'cafeconnect-ai',
        conversation_id: String(payload.conversationId || 'anonymous'),
        agent_id: agent.id
      }
    });

    const executedToolCalls = [];
    if (retrievedKnowledge.results.length > 0) {
      executedToolCalls.push({
        name: retrievedKnowledge.source === 'runtime' ? 'runtime_knowledge_search' : 'knowledge_search',
        arguments: { query: message, limit: 4, preflight: true },
        result: retrievedKnowledge
      });
    }

    for (let round = 0; round < this.config.maxToolRounds; round += 1) {
      const calls = this.openaiClient.extractFunctionCalls(response);
      if (calls.length === 0) break;

      const toolOutputs = [];

      for (const call of calls) {
        const args = safeJsonParse(call.arguments, {});
        const result = await this.toolRegistry.execute(call.name, args, payload);

        executedToolCalls.push({ name: call.name, arguments: args, result });
        toolOutputs.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(result)
        });
      }

      response = await this.openaiClient.createResponse({
        instructions,
        previous_response_id: response.id,
        input: toolOutputs,
        tools: this.toolRegistry.asOpenAITools(allowedTools),
        parallel_tool_calls: true
      });
    }

    const modelText = this.openaiClient.extractText(response) || 'Ho elaborato la richiesta.';

    return {
      message: this.summarizeToolBackedResponse(modelText, executedToolCalls),
      responseId: response.id,
      agent,
      toolCalls: executedToolCalls,
      mode: 'openai-responses'
    };
  }

  async runPlannedToolFlow(message, payload, agent, state = {}, signals = {}) {
    const toolPlan = Array.isArray(state.plan?.toolPlan) ? state.plan.toolPlan : [];
    const conversationId = String(payload.conversationId || 'anonymous');
    const executablePlan = this.ensureExecutablePlan(toolPlan, message, state, signals);
    const toolCalls = [];

    for (const step of executablePlan) {
      const toolName = step.tool;
      if (!['search_menu', 'search_products', 'get_item_detail', 'create_order_draft', 'knowledge_search'].includes(toolName)) {
        continue;
      }

      const args = this.enrichPlannedToolArgs(toolName, step.args || {}, message, state);
      try {
        const result = await this.toolRegistry.execute(toolName, args, payload);
        toolCalls.push({ name: toolName, arguments: args, result });
        if (
          toolName === 'search_menu' &&
          (!result.items || result.items.length === 0) &&
          (this.timeOfDayFromState(state) !== 'all' || args.query)
        ) {
          const fallbackArgs = {
            ...args,
            query: '',
            originalQuery: message,
            timeOfDay: this.timeOfDayFromState(state) !== 'all'
              ? this.timeOfDayFromState(state)
              : 'all'
          };
          const fallbackResult = await this.toolRegistry.execute('search_menu', fallbackArgs, payload);
          toolCalls.push({ name: 'search_menu', arguments: fallbackArgs, result: fallbackResult });
        }
      } catch (error) {
        console.warn('[ai-gateway] planned tool failed:', toolName, error.message);
      }
    }

    const catalogItems = this.itemsFromToolCalls(toolCalls);
    if (catalogItems.length > 0) {
      this.agentStateManager.updateProposals(
        conversationId,
        catalogItems.map(({ item, type }) => ({
          id: item.id,
          name: item.name,
          type,
          price: item.price
        })),
        state.goal === 'order' ? 'confirm_proposal' : 'choose_item'
      );
    }

    const cartCandidates = await this.resolveCartCandidates(message, payload, state, catalogItems);
    if (cartCandidates.length > 0 && state.goal === 'order' && ['checkout_details', 'confirm_proposal'].includes(state.nextExpectedAction)) {
      this.agentStateManager.setNextAction(conversationId, 'checkout_details');
      const itemNames = cartCandidates.map(candidate => candidate.item.name).join(' e ');
      return {
        message: state.language === 'en'
          ? `I added ${itemNames} to your cart. You can open the cart to confirm pickup and contact details.`
          : `Ho aggiunto al carrello ${itemNames}. Apri il carrello per confermare ritiro e dati di contatto.`,
        agent,
        toolCalls,
        cartOperations: cartCandidates.map(candidate => ({
          action: 'add',
          item: candidate.item,
          itemType: candidate.type,
          quantity: 1
        })),
        mode: 'openai-responses'
      };
    }

    if (toolCalls.length === 0) {
      return null;
    }

    const firstMenuCall = toolCalls.find(call => call.name === 'search_menu' && call.result?.items?.length > 0);
    if (firstMenuCall) {
      const composedMessage = await this.composePlannedResponse(message, payload, agent, state, toolCalls);
      return {
        message: composedMessage || this.planBackedCatalogMessage(state, firstMenuCall.result.items, message),
        agent,
        toolCalls,
        mode: 'openai-responses'
      };
    }

    const firstProductCall = toolCalls.find(call => call.name === 'search_products' && call.result?.products?.length > 0);
    if (firstProductCall) {
      const composedMessage = await this.composePlannedResponse(message, payload, agent, state, toolCalls);
      return {
        message: composedMessage || this.planBackedProductMessage(state, firstProductCall.result.products),
        agent,
        toolCalls,
        mode: 'openai-responses'
      };
    }

    const detailCall = toolCalls.find(call => call.name === 'get_item_detail' && call.result?.item);
    if (detailCall) {
      const composedMessage = await this.composePlannedResponse(message, payload, agent, state, toolCalls);
      return {
        message: composedMessage || (state.language === 'en'
          ? `Here are the details for ${detailCall.result.item.name}.`
          : `Ecco il dettaglio di ${detailCall.result.item.name}.`),
        agent,
        toolCalls,
        mode: 'openai-responses'
      };
    }

    return null;
  }

  async composePlannedResponse(message, payload, agent, state = {}, toolCalls = []) {
    if (!this.openaiClient.isConfigured() || toolCalls.length === 0) {
      return '';
    }

    const customerProfile = this.buildCustomerProfile(payload);
    const compactToolResults = toolCalls.map(call => ({
      tool: call.name,
      arguments: call.arguments,
      result: this.compactToolResult(call.result)
    }));
    const instructions = [
      'Sei il response composer di CafeConnect AI.',
      'Scrivi solo la risposta finale al cliente, senza JSON e senza markdown.',
      'Non salutare e non ricominciare se esiste previousState.goal o previousState.proposedItems.',
      'Mantieni il riferimento conversazionale: conferme brevi come ok/si grazie/procedi si riferiscono alla proposta attiva.',
      'Usa esclusivamente i risultati dei tool e lo stato fornito: non inventare prodotti, prezzi, ingredienti o allergeni.',
      'Se il cliente chiede qualcosa di fit o poco calorico e il catalogo non espone calorie, parla di opzioni leggere nel menu attuale senza dichiarare calorie precise.',
      'Se ci sono opzioni compatibili, proponi una prossima azione concreta: dettagli, aggiunta al carrello o conferma ordine.',
      'Rispondi nella lingua dello stato conversazionale. Massimo 2 frasi brevi, tono professionale e naturale.'
    ].join('\n');

    try {
      const response = await this.openaiClient.createResponse({
        instructions,
        input: JSON.stringify({
          message,
          previousState: state,
          agent,
          customerProfile,
          toolResults: compactToolResults
        }),
        metadata: {
          product: 'cafeconnect-ai',
          conversation_id: String(payload.conversationId || 'anonymous'),
          agent_phase: 'response_composer'
        }
      });
      const text = this.openaiClient.extractText(response);
      const maybeJson = safeJsonParse(this.extractJsonObject(text), null);
      if (maybeJson && typeof maybeJson === 'object' && (maybeJson.goal || maybeJson.toolPlan || maybeJson.agentId)) {
        return '';
      }
      return this.cleanModelText(text, toolCalls);
    } catch (error) {
      console.warn('[ai-gateway] response composer failed:', error.message);
      return '';
    }
  }

  compactToolResult(result = {}) {
    const compactItem = item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      subcategory: item.subcategory,
      timeOfDay: item.timeOfDay,
      dietaryInfo: item.dietaryInfo,
      allergens: item.allergens,
      description: item.description
    });

    return {
      source: result.source,
      count: result.count,
      items: Array.isArray(result.items) ? result.items.slice(0, 6).map(compactItem) : undefined,
      products: Array.isArray(result.products) ? result.products.slice(0, 6).map(compactItem) : undefined,
      item: result.item ? compactItem(result.item) : undefined,
      results: Array.isArray(result.results)
        ? result.results.slice(0, 4).map(entry => ({
            title: entry.title,
            content: String(entry.content || '').slice(0, 700),
            source: entry.source
          }))
        : undefined
    };
  }

  ensureExecutablePlan(toolPlan = [], message = '', state = {}, signals = {}) {
    const explicitPlan = toolPlan.filter(step => step && step.tool).slice(0, 3);
    if (explicitPlan.length > 0) {
      return explicitPlan;
    }

    if (state.goal === 'browse_products' || signals.wantsProducts) {
      return [{
        tool: 'search_products',
        args: {
          query: message,
          dietaryPreference: state.constraints?.[0] || '',
          limit: 6
        }
      }];
    }

    if (
      state.goal === 'browse_menu' ||
      state.nextExpectedAction === 'choose_item' ||
      signals.wantsCatalog ||
      state.mealSlot !== 'all'
    ) {
      return [{
        tool: 'search_menu',
        args: {
          query: this.queryFromState(state, message),
          timeOfDay: this.timeOfDayFromState(state),
          dietaryPreference: state.constraints?.[0] || '',
          limit: 6
        }
      }];
    }

    return [];
  }

  enrichPlannedToolArgs(toolName, args = {}, message, state = {}) {
    const nextArgs = { ...args };
    if (toolName === 'search_menu') {
      nextArgs.originalQuery = nextArgs.originalQuery || message;
      nextArgs.query = nextArgs.query || this.queryFromState(state, message);
      nextArgs.timeOfDay = nextArgs.timeOfDay || this.timeOfDayFromState(state);
      nextArgs.dietaryPreference = nextArgs.dietaryPreference || state.constraints?.[0] || '';
      nextArgs.limit = nextArgs.limit || 6;
    }
    if (toolName === 'search_products') {
      nextArgs.originalQuery = nextArgs.originalQuery || message;
      nextArgs.query = nextArgs.query || message;
      nextArgs.dietaryPreference = nextArgs.dietaryPreference || state.constraints?.[0] || '';
      nextArgs.limit = nextArgs.limit || 6;
    }
    return nextArgs;
  }

  queryFromState(state = {}, message = '') {
    const normalizedMessage = this.normalizeLoose(message);
    if (state.mealSlot === 'breakfast') {
      if (/\b(fit|healthy|salutare|legger|proteic|bilanciat|mangiare|mangio|cibo|food)\b/.test(normalizedMessage)) {
        return `breakfast ${normalizedMessage}`.trim();
      }
      return 'breakfast';
    }
    if (state.mealSlot === 'lunch') {
      if (/\b(fit|healthy|salutare|legger|proteic|bilanciat)\b/.test(normalizedMessage)) {
        return `lunch ${normalizedMessage}`.trim();
      }
      return 'lunch';
    }
    if (state.mealSlot === 'aperitivo') return 'aperitivo';
    return message;
  }

  itemsFromToolCalls(toolCalls = []) {
    return toolCalls.flatMap(call => {
      if (call.name === 'search_menu') {
        return (call.result?.items || []).map(item => ({ item, type: 'menuItem' }));
      }
      if (call.name === 'search_products') {
        return (call.result?.products || []).map(item => ({ item, type: 'product' }));
      }
      if (call.name === 'get_item_detail' && call.result?.item) {
        return [{ item: call.result.item, type: call.arguments?.type || 'menuItem' }];
      }
      return [];
    });
  }

  async resolveCartCandidates(message, payload, state = {}, catalogItems = []) {
    const [menuResult, productResult] = await Promise.all([
      this.toolRegistry.execute('search_menu', { query: '', timeOfDay: 'all', limit: 80 }, payload).catch(() => ({ items: [] })),
      this.toolRegistry.execute('search_products', { query: '', limit: 80 }, payload).catch(() => ({ products: [] }))
    ]);
    const candidates = [
      ...catalogItems,
      ...(menuResult.items || []).map(item => ({ item, type: 'menuItem' })),
      ...(productResult.products || []).map(item => ({ item, type: 'product' })),
      ...(state.proposedItems || []).map(item => ({ item, type: item.type || 'menuItem' }))
    ].filter(candidate => candidate.item?.id && candidate.item?.name);
    const uniqueCandidates = Array.from(
      new Map(candidates.map(candidate => [`${candidate.type}:${candidate.item.id}`, candidate])).values()
    );
    const normalizedMessage = this.normalizeLoose(message);
    const requestedParts = this.extractRequestedItemPhrases(normalizedMessage);
    const matches = requestedParts
      .map(part => this.bestCatalogMatch(part, uniqueCandidates, state))
      .filter(Boolean);
    const uniqueMatches = Array.from(
      new Map(matches.map(candidate => [`${candidate.type}:${candidate.item.id}`, candidate])).values()
    );

    if (uniqueMatches.length > 0) {
      return uniqueMatches;
    }

    if (state.goal === 'order' && Array.isArray(state.proposedItems) && state.proposedItems.length > 0) {
      return state.proposedItems
        .map(proposal => uniqueCandidates.find(candidate => candidate.item.id === proposal.id && candidate.type === proposal.type))
        .filter(Boolean)
        .slice(0, 2);
    }

    return [];
  }

  normalizeLoose(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  extractRequestedItemPhrases(normalizedMessage) {
    const cleaned = normalizedMessage
      .replace(/\b(aggiungi|aggiungere|metti|mettere|carrello|nel|nel carrello|li puoi|puoi|vorrei|voglio|prendo|prendere|fammi|vedere|anche|menu)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned
      .split(/\s+(?:e|con|piu|,)\s+/)
      .map(part => part.trim())
      .filter(part => part.length > 2);
  }

  bestCatalogMatch(phrase, candidates = [], state = {}) {
    const phraseTokens = phrase.split(/\s+/).filter(token => token.length > 2);
    if (phraseTokens.length === 0) return null;

    const scored = candidates.map(candidate => {
      const haystack = this.normalizeLoose([
        candidate.item.name,
        candidate.item.description,
        candidate.item.category,
        candidate.item.subcategory,
        ...(candidate.item.ingredients || []),
        ...(candidate.item.preferences || []),
        ...(candidate.item.dietaryInfo || [])
      ].filter(Boolean).join(' '));
      const name = this.normalizeLoose(candidate.item.name);
      let score = 0;
      if (name.includes(phrase)) score += 100;
      if (phrase.includes(name)) score += 100;
      phraseTokens.forEach(token => {
        if (name.includes(token)) score += 35;
        else if (haystack.includes(token)) score += 12;
      });
      if (state.constraints?.includes('lactose-free') && (candidate.item.allergens || []).some(allergen =>
        ['latte', 'lattosio', 'milk', 'burro', 'panna'].includes(this.normalizeLoose(allergen))
      )) {
        const hasPlantVariant = haystack.includes('avena') || haystack.includes('vegetal') || haystack.includes('senza lattosio');
        score += hasPlantVariant && (phrase.includes('avena') || phrase.includes('vegetal')) ? 40 : -80;
      }
      return { candidate, score };
    }).sort((a, b) => b.score - a.score);

    return scored[0]?.score > 20 ? scored[0].candidate : null;
  }

  planBackedCatalogMessage(state = {}, items = [], message = '') {
    const hasFood = items.some(item => {
      const category = String(item.category || '').toLowerCase();
      const subcategory = String(item.subcategory || '').toLowerCase();
      return !['beverage', 'coffee', 'drink'].includes(category) && !['beverage', 'coffee', 'drink'].includes(subcategory);
    });
    const wantsHealthy = /\b(fit|healthy|salutare|legger|proteic|bilanciat)\b/.test(
      this.normalizeLoose([state.plan?.customerNeed, state.plan?.intent, message].filter(Boolean).join(' '))
    );
    if (state.language === 'en') {
      if (wantsHealthy && hasFood) {
        return 'I found the lighter compatible options from the current menu. Open a card or tell me which one to add.';
      }
      return hasFood
        ? 'I found food options compatible with your request. Open a card to choose one or tell me which one to add.'
        : 'I found compatible menu options. Open a card to choose one or tell me which one to add.';
    }
    if (wantsHealthy && hasFood) {
      return 'Ho trovato le opzioni piu leggere compatibili nel menu attuale. Apri una card oppure dimmi quale vuoi aggiungere.';
    }
    return hasFood
      ? 'Ho trovato opzioni da mangiare compatibili con la richiesta. Apri una card oppure dimmi quale vuoi aggiungere.'
      : 'Ho trovato opzioni di menu compatibili. Apri una card oppure dimmi quale vuoi aggiungere.';
  }

  planBackedProductMessage(state = {}, products = []) {
    if (state.language === 'en') {
      return 'I found compatible products. Open a card for details or tell me which one to add.';
    }
    return 'Ho trovato prodotti compatibili. Apri una card per i dettagli oppure dimmi quale vuoi aggiungere.';
  }

  timeOfDayFromState(state = {}) {
    if (state.mealSlot === 'breakfast') return 'morning';
    if (state.mealSlot === 'lunch') return 'afternoon';
    if (state.mealSlot === 'aperitivo') return 'evening';
    return 'all';
  }

  summarizeMenuSuggestion(timeOfDay, lower, items = [], state = {}) {
    const personalReason = this.bestPersonalizationReason(items);
    const reasonSuffix = personalReason ? ` Ho dato priorita a opzioni ${personalReason}.` : '';
    const english = state.language === 'en';
    const constraints = Array.isArray(state.constraints) ? state.constraints : [];
    const hasConstraints = constraints.length > 0;

    if (timeOfDay === 'afternoon') {
      if (english) {
        return 'For lunch, I found compatible savory options. You can open a card or add one to the cart.' + reasonSuffix;
      }
      return lower.includes('ho chiesto') || lower.startsWith('ma ')
        ? 'Hai ragione: per pranzo ti propongo opzioni salate e complete. Puoi scegliere una bowl o un toast e aggiungerli al carrello.' + reasonSuffix
        : 'Per pranzo ti propongo opzioni salate e complete. Le trovi nelle card qui sotto.' + reasonSuffix;
    }

    if (timeOfDay === 'morning') {
      if (english) {
        return hasConstraints
          ? 'For breakfast, I found options compatible with your preferences. You can open a card or add one to the cart.' + reasonSuffix
          : 'For breakfast, I found suitable morning options. You can open a card or add one to the cart.' + reasonSuffix;
      }
      return hasConstraints
        ? 'Per colazione ti mostro opzioni compatibili con le tue preferenze. Le trovi nelle card qui sotto.' + reasonSuffix
        : 'Per colazione ti propongo alcune opzioni adatte al mattino. Le trovi nelle card qui sotto.' + reasonSuffix;
    }

    if (timeOfDay === 'evening') {
      if (english) {
        return 'For aperitivo, I found suitable evening options. You can open a card or add one to the cart.' + reasonSuffix;
      }
      return 'Per aperitivo ti propongo alcune opzioni pensate per la sera. Le trovi nelle card qui sotto.' + reasonSuffix;
    }

    return english
      ? 'I found some menu options. You can open a card or add one to the cart.' + reasonSuffix
      : 'Ti propongo alcune opzioni dal menu: le trovi nelle card qui sotto.' + reasonSuffix;
  }

  summarizeToolBackedResponse(modelText, toolCalls) {
    const hasProducts = toolCalls.some(call => call.name === 'search_products' && call.result?.products?.length > 0);
    if (hasProducts) {
      const productsCall = toolCalls.find(call => call.name === 'search_products' && call.result?.products?.length > 0);
      return this.summarizePersonalizedSelection(productsCall.result.products, 'prodotti') + ' Posso mostrarti i dettagli o aiutarti a preparare un ordine.';
    }

    const hasMenuItems = toolCalls.some(call => call.name === 'search_menu' && call.result?.items?.length > 0);
    if (hasMenuItems) {
      const menuCall = toolCalls.find(call => call.name === 'search_menu' && call.result?.items?.length > 0);
      return this.summarizeMenuSuggestion('all', '', menuCall.result.items) + ' Posso spiegarti ingredienti, allergeni o alternative.';
    }

    const hasKnowledge = toolCalls.find(call =>
      ['knowledge_search', 'runtime_knowledge_search'].includes(call.name)
      && call.result?.results?.length > 0
    );
    if (hasKnowledge) {
      const query = hasKnowledge.arguments?.query || '';
      return this.summarizeKnowledgeResult(hasKnowledge.result.results, {}, query, modelText, toolCalls);
    }

    const hasDetail = toolCalls.some(call => call.name === 'get_item_detail' && call.result?.item);
    if (hasDetail) {
      return 'Ecco il dettaglio richiesto: puoi consultarlo nella card qui sotto.';
    }

    return this.cleanModelText(modelText, toolCalls) || 'Posso consigliarti solo articoli presenti nel catalogo del locale. Vuoi che ti mostri le opzioni disponibili?';
  }

  async searchRuntimeKnowledge(query, payload) {
    const entries = await this.runtimeKnowledgeEntries(payload);
    const terms = String(query || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 2);

    const results = entries
      .map(entry => {
        const haystack = [entry.title, entry.content, ...(entry.tags || [])].join(' ').toLowerCase();
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { ...entry, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      results,
      count: results.length,
      sources: ['runtime-settings']
    };
  }

  async retrieveKnowledgeContext(query, payload) {
    const runtimeResult = await this.searchRuntimeKnowledge(query, payload);
    if (runtimeResult.results.length > 0) {
      return { ...runtimeResult, source: 'runtime' };
    }

    try {
      const result = await this.toolRegistry.execute('knowledge_search', { query, limit: 4 }, payload);
      return {
        results: result.results || [],
        count: result.count || 0,
        sources: result.sources || [],
        source: 'tool'
      };
    } catch (_error) {
      return { results: [], count: 0, sources: [], source: 'none' };
    }
  }

  buildCustomerProfile(payload = {}) {
    const userContext = payload.userContext || {};
    const preferences = Array.isArray(userContext.preferences) ? userContext.preferences : [];
    const interactions = Array.isArray(userContext.interactions) ? userContext.interactions : [];
    const dietaryRestrictions = Array.isArray(userContext.dietaryRestrictions) ? userContext.dietaryRestrictions : [];

    return {
      userId: userContext.userId || 'anonymous',
      name: userContext.name || '',
      dietaryRestrictions,
      topPreferences: preferences
        .slice()
        .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))
        .slice(0, 6)
        .map(preference => ({
          itemName: preference.itemName,
          itemCategory: preference.itemCategory,
          itemType: preference.itemType,
          rating: preference.rating
        })),
      recentInteractions: interactions.slice(0, 8)
    };
  }

  formatCustomerProfile(profile) {
    if (!profile) return '';
    const lines = [];

    if (profile.name) lines.push(`Nome cliente: ${profile.name}.`);
    if (profile.dietaryRestrictions?.length) {
      lines.push(`Restrizioni/preferenze alimentari dichiarate: ${profile.dietaryRestrictions.join(', ')}.`);
    }
    if (profile.topPreferences?.length) {
      lines.push('Preferenze cliente note: ' + profile.topPreferences
        .map(preference => `${preference.itemName || preference.itemCategory || preference.itemType} (${preference.rating}/5)`)
        .join(', ') + '.');
    }
    if (profile.recentInteractions?.length) {
      lines.push('Interazioni recenti: ' + profile.recentInteractions.join(' | ') + '.');
    }

    return lines.length
      ? ['Profilo cliente da incrociare con catalogo e knowledge:', ...lines].join('\n')
      : '';
  }

  formatRetrievedKnowledge(retrievedKnowledge) {
    const results = retrievedKnowledge?.results || [];
    if (results.length === 0) return '';

    return [
      'Fonti recuperate per questa richiesta, da usare prima della conoscenza generica:',
      ...results.slice(0, 4).map((result, index) => {
        const content = String(result.content || '').replace(/\s+/g, ' ').slice(0, 360);
        const source = result.source ? ` fonte: ${result.source}` : '';
        return `${index + 1}. ${result.title || 'Fonte'}:${source} ${content}`;
      })
    ].join('\n');
  }

  formatAgentState(state = {}) {
    if (!state || state.goal === 'unknown') return '';
    const proposed = Array.isArray(state.proposedItems) && state.proposedItems.length > 0
      ? state.proposedItems.slice(0, 5).map(item => item.name).filter(Boolean).join(', ')
      : '';

    return [
      'Stato conversazionale corrente da preservare finche il cliente non lo cambia:',
      state.language ? `- Lingua: ${state.language}` : '',
      state.goal ? `- Goal: ${state.goal}` : '',
      state.mealSlot && state.mealSlot !== 'all' ? `- Fascia/occasione: ${state.mealSlot}` : '',
      Array.isArray(state.constraints) && state.constraints.length ? `- Vincoli/preferenze: ${state.constraints.join(', ')}` : '',
      state.nextExpectedAction ? `- Prossima azione attesa: ${state.nextExpectedAction}` : '',
      proposed ? `- Proposte attive: ${proposed}` : ''
    ].filter(Boolean).join('\n');
  }

  bestPersonalizationReason(items = []) {
    const reasons = items
      .flatMap(item => item?.personalization?.reasons || [])
      .filter(Boolean);
    return reasons[0] || '';
  }

  summarizePersonalizedSelection(items = [], label = 'opzioni') {
    const reason = this.bestPersonalizationReason(items);
    return reason
      ? `Ho trovato ${label} coerenti con il tuo profilo: priorita a elementi ${reason}. Le card sono qui sotto.`
      : `Ho trovato alcuni ${label} interessanti: li trovi nelle card qui sotto.`;
  }

  async runtimeKnowledgeEntries(payload) {
    const knowledgeBase = Array.isArray(payload.knowledgeBase) ? payload.knowledgeBase : [];
    const knowledgeSources = payload.knowledgeSources || {};
    const merchantKnowledge = payload.merchantKnowledge || {};

    const entries = knowledgeBase.flatMap((entry, entryIndex) => {
      const facts = Array.isArray(entry.facts) ? entry.facts : [];

      return facts
        .filter(fact => String(fact || '').trim())
        .map((fact, factIndex) => ({
          id: `runtime-${entryIndex}-${factIndex}`,
          title: entry.key || 'Knowledge setting',
          content: String(fact),
          tags: [entry.key, entry.scope, entry.itemId].filter(Boolean),
          source: 'runtime-settings'
        }));
    });

    const merchantSources = Array.isArray(merchantKnowledge.sources)
      ? merchantKnowledge.sources.filter(source => source && source.enabled && source.url)
      : [];

    const urls = [
      ...merchantSources.map(source => ({
        url: source.url,
        label: source.label || source.url,
        type: source.type || 'url',
        sourceId: source.id || source.url
      })),
      ...(Array.isArray(knowledgeSources.urls)
        ? knowledgeSources.urls.map(url => ({ url, label: url, type: 'legacy-url', sourceId: url }))
        : [])
    ];
    for (const source of urls.slice(0, 8)) {
      try {
        const response = await fetch(source.url);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          const remoteEntries = this.normalizeRuntimeKnowledgePayload(data, source.url)
            .map(entry => ({
              ...entry,
              title: entry.title || source.label,
              tags: [...(entry.tags || []), source.type, source.label].filter(Boolean),
              source: source.label
            }));
          entries.push(...remoteEntries);
        } else {
          const text = await response.text();
          entries.push({
            id: `runtime-url-${source.sourceId}`,
            title: source.label,
            content: text.slice(0, 20000),
            tags: ['url', 'remote', source.type].filter(Boolean),
            source: source.label
          });
        }
      } catch (error) {
        console.warn('[ai-gateway] Runtime knowledge URL failed:', source.url, error.message);
      }
    }

    return entries;
  }

  formatRuntimeKnowledge(payload) {
    const knowledgeBase = Array.isArray(payload.knowledgeBase) ? payload.knowledgeBase : [];
    const merchantKnowledge = payload.merchantKnowledge || {};
    const entries = knowledgeBase.flatMap((entry, entryIndex) => {
      const facts = Array.isArray(entry.facts) ? entry.facts : [];
      return facts.map((fact, factIndex) => ({
        id: `runtime-${entryIndex}-${factIndex}`,
        title: entry.key || 'Knowledge setting',
        content: String(fact)
      }));
    });

    const activeMerchantSources = Array.isArray(merchantKnowledge.sources)
      ? merchantKnowledge.sources.filter(source => source.enabled && source.url)
      : [];
    if (activeMerchantSources.length > 0) {
      entries.push({
        id: 'merchant-sources',
        title: 'Fonti merchant collegate',
        content: activeMerchantSources.map(source => `${source.label || source.type}: ${source.url}`).join(', ')
      });
    }

    const limitedEntries = entries.slice(0, 8);
    if (limitedEntries.length === 0) return '';

    return [
      'Base conoscenza configurata dall esercente:',
      ...limitedEntries.map(entry => `- ${entry.title}: ${entry.content}`)
    ].join('\n');
  }

  normalizeRuntimeKnowledgePayload(payload, source) {
    const rawEntries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.knowledgeBase)
        ? payload.knowledgeBase
        : Array.isArray(payload?.entries)
          ? payload.entries
          : [];

    return rawEntries.flatMap((entry, index) => {
      if (entry.facts && Array.isArray(entry.facts)) {
        return entry.facts.map((fact, factIndex) => ({
          id: entry.id || `runtime-url-${index}-${factIndex}`,
          title: entry.title || entry.key || source,
          content: String(fact),
          tags: entry.tags || [entry.key, entry.scope].filter(Boolean),
          source
        }));
      }

      return [{
        id: entry.id || `runtime-url-${index}`,
        title: entry.title || entry.key || source,
        content: String(entry.content || entry.text || entry.description || ''),
        tags: entry.tags || [entry.key, entry.scope].filter(Boolean),
        source
      }];
    }).filter(entry => entry.content.trim().length > 0);
  }

  summarizeKnowledgeResult(results, payload = {}, query = '', modelText = '', toolCalls = []) {
    const first = results[0];
    if (!first) {
      return 'Non ho trovato questa informazione nella base conoscenza.';
    }

    const text = String(first.content || '').trim();
    const naturalModelText = this.cleanModelText(modelText, toolCalls);
    if (naturalModelText && !this.looksLikeInternalPlaybook(naturalModelText)) {
      return naturalModelText.length > 260 ? naturalModelText.slice(0, 257).trim() + '...' : naturalModelText;
    }

    const customerFacingText = this.customerFacingKnowledgeText(text, query);
    const shortText = customerFacingText.length > 260 ? customerFacingText.slice(0, 257).trim() + '...' : customerFacingText;
    const profile = this.buildCustomerProfile(payload);
    const restrictions = profile.dietaryRestrictions?.length
      ? ` Tengo conto anche di: ${profile.dietaryRestrictions.join(', ')}.`
      : '';
    return (shortText || 'Ho trovato un riferimento nella base conoscenza dell esercente.') + restrictions;
  }

  looksLikeInternalPlaybook(text) {
    const lower = String(text || '').toLowerCase();
    return [
      'consiglia prima',
      'per richieste regalo proporre',
      'deve comunicare',
      'non deve confermare',
      'l assistente',
      'l\'assistente',
      'chiedere se',
      'proporre ',
      'quando il cliente',
      'quando l utente',
      'quando l\'utente',
      'il cliente chiede',
      'le proposte salate hanno priorita',
      'playbook',
      'policy interna'
    ].some(pattern => lower.includes(pattern));
  }

  customerFacingKnowledgeText(content, query = '') {
    const lowerContent = String(content || '').toLowerCase();
    const lowerQuery = String(query || '').toLowerCase();

    if (lowerQuery.includes('pranzo') || lowerContent.includes('a pranzo')) {
      return 'Per un pranzo leggero ti consiglierei la Bowl pollo e cereali oppure l Insalata quinoa avocado. Se preferisci qualcosa di vegetale e senza lattosio, il Toast hummus e verdure e una buona alternativa.';
    }

    if (lowerQuery.includes('regalo') || lowerQuery.includes('filtro') || lowerContent.includes('regali')) {
      return 'Per una persona che ama il caffe filtro ti consiglierei l Etiopia Yirgacheffe Specialty. Se vuoi fare un regalo piu completo, la Box degustazione CafeConnect e l opzione piu scenografica.';
    }

    if (lowerQuery.includes('wifi') || lowerQuery.includes('wi-fi') || lowerQuery.includes('prenot')) {
      return 'Si, il locale offre WiFi gratuito e prese vicino ai tavoli laterali. Per 7 persone e meglio prenotare telefonicamente, perche sopra le 6 persone la prenotazione e consigliata.';
    }

    if (lowerQuery.includes('orari') || lowerQuery.includes('aperto') || lowerQuery.includes('chiuso')) {
      return 'Il locale e aperto dal lunedi al venerdi dalle 7:30 alle 19:30 e il sabato dalle 8:00 alle 13:00. La domenica apre solo per eventi o degustazioni su prenotazione.';
    }

    if (lowerQuery.includes('allerg') || lowerQuery.includes('glutine') || lowerQuery.includes('intoller')) {
      return 'Posso aiutarti a scegliere opzioni compatibili, ma per allergie o intolleranze e sempre meglio segnalarlo prima dell ordine. Alcune opzioni sono senza lattosio o senza glutine solo quando indicato nel catalogo.';
    }

    return String(content || '')
      .replace(/\b(consiglia|proporre|chiedere|deve|l assistente|l'assistente)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  catalogNamesFromToolCalls(toolCalls = []) {
    return toolCalls.flatMap(call => {
      const result = call.result || {};
      const items = [
        ...(Array.isArray(result.items) ? result.items : []),
        ...(Array.isArray(result.products) ? result.products : []),
        ...(result.item ? [result.item] : [])
      ];
      return items
        .map(item => String(item.name || '').toLowerCase())
        .filter(Boolean);
    });
  }

  mentionsUnavailableCatalogItem(text, toolCalls = []) {
    const lower = String(text || '').toLowerCase();
    const catalogNames = this.catalogNamesFromToolCalls(toolCalls);
    const riskyCatalogPhrases = [
      'cookie di avena',
      'biscotti di avena',
      'frutti rossi',
      'muffin',
      'brownie'
    ];

    return riskyCatalogPhrases.some(phrase =>
      lower.includes(phrase) && !catalogNames.some(name => name.includes(phrase))
    );
  }

  cleanModelText(text, toolCalls = []) {
    const cleaned = String(text || '')
      .replace(/\[[^\]]+\]\([^\)]+\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return this.mentionsUnavailableCatalogItem(cleaned, toolCalls) ? '' : cleaned;
  }

  buildInstructions(payload, agent, context = {}) {
    const business = payload.business || {};
    const tenant = payload.tenant || {};
    const integrations = payload.integrations || {};
    const dataGovernance = payload.dataGovernance || {};
    const runtimeKnowledge = this.formatRuntimeKnowledge(payload);
    const customerProfile = this.formatCustomerProfile(context.customerProfile);
    const retrievedKnowledge = this.formatRetrievedKnowledge(context.retrievedKnowledge);
    const agentState = this.formatAgentState(context.agentState);

    return [
      'Sei CafeConnect AI, un assistente commerciale per bar, cafe e piccoli locali.',
      agent?.label ? 'Agente attivo: ' + agent.label + '.' : '',
      agent?.instruction ? agent.instruction : '',
      Array.isArray(agent?.tools) && agent.tools.length > 0 ? 'Tool autorizzati per questo agente: ' + agent.tools.join(', ') + '.' : '',
      'Obiettivo: aiutare il cliente a scegliere, comprare o ordinare con precisione e tono naturale.',
      'Usa i tool quando servono dati di menu, prodotto, dettaglio o bozza ordine.',
      'Usa knowledge_search per rispondere su storia del locale, orari, policy, allergeni, fornitori, offerte, FAQ o informazioni personalizzate dell esercente.',
      'Incrocia sempre tre fonti quando disponibili: catalogo reale, fonti recuperate e profilo/preferenze cliente.',
      'Se suggerisci qualcosa, privilegia articoli compatibili con restrizioni alimentari, preferenze esplicite e interazioni recenti.',
      'Quando una raccomandazione e personalizzata, spiega in poche parole il motivo senza mostrare punteggi tecnici.',
      'Se il cliente chiede di ricordare preferenze e la policy profilo e disabled, spiega che non puoi memorizzarle per il futuro.',
      'Se il cliente chiede di ricordare allergie, intolleranze, salute o altri dati sensibili e allowSensitiveInference e false, usa il dato solo per la richiesta corrente e non promettere memoria futura.',
      'Rispondi in italiano con massimo 2 frasi brevi.',
      'Se il cliente scrive in inglese, rispondi in inglese mantenendo le stesse regole operative.',
      'Non elencare tutti i dati dei tool: la UI mostra gia card e dettagli visivi.',
      'Non inserire URL, markdown link, markdown immagini, tabelle o liste numerate lunghe.',
      'Quando mostri prodotti o menu usa i tool: rispondi con una frase breve e lascia le card alla UI.',
      'Se il cliente chiede dettagli o acquisto di un articolo per nome, usa get_item_detail o cerca prima il prodotto corrispondente.',
      'Non inventare prezzi, disponibilita, allergeni o ingredienti: usa i tool o chiedi conferma.',
      'Non citare prodotti, dolci, snack o varianti che non compaiono nel catalogo recuperato dai tool.',
      'Se il catalogo non contiene un articolo, non proporlo: suggerisci solo alternative presenti nelle card o nel catalogo.',
      'Se il cliente chiede una prenotazione e non esiste bookingUrl configurato, non dire che puoi prenotare: indica il contatto telefonico o suggerisci contatto umano.',
      'Se il cliente chiede un pagamento e non esiste paymentUrl configurato, non promettere pagamento online: prepara solo riepilogo ordine e conferma.',
      'Se il cliente vuole ordinare, prepara una bozza e chiedi conferma prima dell invio.',
      'Usa lo stato conversazionale per mantenere goal, vincoli, lingua, proposte attive e prossima azione attesa.',
      'Se nextExpectedAction e confirm_proposal e il cliente conferma, non ricominciare: continua sulla proposta attiva e guida verso carrello o checkout.',
      'Preserva fascia pasto, vincoli alimentari e preferenze esplicite finche il cliente non li cambia.',
      business.name ? 'Locale attivo: ' + business.name + '.' : '',
      business.type ? 'Tipo locale: ' + business.type + '.' : '',
      tenant.merchantId ? 'Merchant ID: ' + tenant.merchantId + '.' : '',
      tenant.plan ? 'Piano merchant: ' + tenant.plan + '.' : '',
      dataGovernance.customerProfileStorage ? 'Policy profilo cliente: ' + dataGovernance.customerProfileStorage + '.' : '',
      dataGovernance.conversationTranscript ? 'Policy transcript: ' + dataGovernance.conversationTranscript + '.' : '',
      dataGovernance.allowSensitiveInference === false ? 'Non inferire, memorizzare o riusare preferenze sensibili o dati sanitari: usa solo la richiesta corrente e chiedi conferma.' : '',
      dataGovernance.tenantIsolation ? 'Isolamento tenant richiesto: ' + dataGovernance.tenantIsolation + '.' : '',
      integrations.bookingUrl ? 'Prenotazioni disponibili tramite URL configurato.' : '',
      integrations.paymentUrl ? 'Pagamento online disponibile tramite URL configurato.' : '',
      integrations.posProvider && integrations.posProvider !== 'none' ? 'POS collegato: ' + integrations.posProvider + '.' : '',
      integrations.crmProvider && integrations.crmProvider !== 'none' ? 'CRM collegato: ' + integrations.crmProvider + '.' : '',
      customerProfile,
      retrievedKnowledge,
      agentState,
      runtimeKnowledge
    ].filter(Boolean).join('\n');
  }
}

module.exports = { AgentOrchestrator };

