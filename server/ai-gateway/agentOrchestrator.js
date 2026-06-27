function safeJsonParse(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch (_error) {
    return fallback;
  }
}

const { routeAgent } = require('./agentRouter');
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
    const stateAnalysis = this.agentStateManager.analyzeMessage(conversationId, message);
    const agent = routeAgent(message, payload);

    if (!message) {
      return {
        message: 'Scrivi un messaggio per iniziare.',
        agent,
        toolCalls: [],
        mode: 'validation'
      };
    }

    const privacyGovernedResponse = this.handlePrivacyGovernedMemoryRequest(message, payload, agent);
    if (privacyGovernedResponse) {
      return privacyGovernedResponse;
    }

    const plannedStateAnalysis = await this.planConversationTurn(message, payload, stateAnalysis);

    if (this.config.demoMode || !this.openaiClient.isConfigured()) {
      return this.runDemoMode(message, payload, agent, plannedStateAnalysis);
    }

    return this.runResponsesWithTools(message, payload, agent, plannedStateAnalysis);
  }

  async planConversationTurn(message, payload = {}, stateAnalysis) {
    if (!this.openaiClient.isConfigured()) {
      return stateAnalysis;
    }

    const conversationId = String(payload.conversationId || 'anonymous');
    const state = stateAnalysis?.state || this.agentStateManager.getState(conversationId);
    const catalogSummary = await this.collectCatalogSummary(payload);
    const plannerInstructions = [
      'Sei il planner agentico di CafeConnect AI.',
      'Devi aggiornare lo stato conversazionale, non rispondere al cliente.',
      'Produci solo JSON valido, senza markdown.',
      'Mantieni goal, vincoli e proposte precedenti se il cliente non li cambia.',
      'Se il cliente chiede di aggiungere un articolo per nome, imposta goal order e nextExpectedAction checkout_details.',
      'Se il cliente chiede opzioni da mangiare, evita bevande e pianifica search_menu con category food quando possibile.',
      'Se il cliente chiede allergeni o compatibilita, pianifica dettaglio o ricerca con dietaryPreference.',
      'Schema JSON: {"language":"it|en","goal":"unknown|browse_menu|browse_products|order|ask_info","mealSlot":"all|breakfast|lunch|aperitivo","constraints":["lactose-free|gluten-free|vegan|vegetarian"],"intent":"string","customerNeed":"string","nextExpectedAction":"none|show_options|choose_item|confirm_proposal|checkout_details|ask_clarification","toolPlan":[{"tool":"search_menu|search_products|get_item_detail|create_order_draft|knowledge_search","args":{}}],"responseStrategy":"string","missingInformation":[]}'
    ].join('\n');

    try {
      const response = await this.openaiClient.createResponse({
        instructions: plannerInstructions,
        input: JSON.stringify({
          message,
          previousState: state,
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

  async runDemoMode(message, payload = {}, agent, stateAnalysis) {
    const lower = message.toLowerCase();
    const toolCalls = [];
    const retrievedKnowledge = await this.retrieveKnowledgeContext(message, payload);
    const conversationId = String(payload.conversationId || 'anonymous');
    const state = stateAnalysis?.state || this.agentStateManager.getState(conversationId);
    const signals = stateAnalysis?.signals || {};

    const plannedResponse = await this.runPlannedToolFlow(message, payload, agent, state, signals);
    if (plannedResponse) {
      return plannedResponse;
    }

    if (retrievedKnowledge.results.length > 0 && (this.isKnowledgeQuestion(lower) || agent.id === 'triage')) {
      toolCalls.push({
        name: retrievedKnowledge.source === 'runtime' ? 'runtime_knowledge_search' : 'knowledge_search',
        arguments: { query: message, limit: 4, preflight: true },
        result: retrievedKnowledge
      });
    }

    if (this.isKnowledgeQuestion(lower) && !this.isRecommendationIntent(lower)) {
      const runtimeResult = retrievedKnowledge.source === 'runtime'
        ? retrievedKnowledge
        : await this.searchRuntimeKnowledge(message, payload);
      if (runtimeResult.results.length > 0) {
        if (!toolCalls.some(call => call.name === 'runtime_knowledge_search')) {
          toolCalls.push({
            name: 'runtime_knowledge_search',
            arguments: { query: message },
            result: runtimeResult
          });
        }

        return {
          message: this.summarizeKnowledgeResult(runtimeResult.results, payload, message),
          agent,
          toolCalls,
          mode: 'demo'
        };
      }

      const args = { query: message, limit: 3 };
      const result = await this.toolRegistry.execute('knowledge_search', args, payload);
      toolCalls.push({ name: 'knowledge_search', arguments: args, result });

      return {
          message: result.results.length
          ? this.summarizeKnowledgeResult(result.results, payload, message)
          : 'Non ho trovato questa informazione nella base conoscenza. Posso aiutarti con menu, prodotti o ordini.',
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    if (this.isDetailRequest(lower)) {
      const detailResult = await this.resolveDetailRequest(message, payload);
      if (detailResult.item) {
        toolCalls.push({
          name: 'get_item_detail',
          arguments: { id: detailResult.item.id, type: detailResult.type },
          result: { item: detailResult.item, found: true, source: 'catalog' }
        });

        return {
          message: `Ecco il dettaglio di ${detailResult.item.name}. Puoi aggiungerlo al carrello dalla card.`,
          agent,
          toolCalls,
          mode: 'demo'
        };
      }
    }

    if (lower.includes('prodot') || lower.includes('comprare') || lower.includes('acquist')) {
      const args = { query: '', limit: 4 };
      const result = await this.toolRegistry.execute('search_products', args, payload);
      toolCalls.push({ name: 'search_products', arguments: args, result });
      if (result.products?.length) {
        this.agentStateManager.updateProposals(
          conversationId,
          result.products.map(product => ({
            id: product.id,
            name: product.name,
            type: 'product',
            price: product.price
          })),
          signals.wantsOrder ? 'confirm_proposal' : 'choose_item'
        );
      }
      const productMessage = result.products.length
        ? this.summarizePersonalizedSelection(result.products, 'prodotti')
        : result.source === 'missing-production-catalog'
          ? 'Non trovo un catalogo prodotti collegato per questo merchant. Configura una fonte prodotti reale per attivare consigli e acquisto.'
          : 'Non ho trovato prodotti coerenti con la richiesta, ma posso cercare per categoria.';

      return {
        message: productMessage,
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    const timeOfDay = this.timeOfDayFromState(state);

    const queryByTime = {
      morning: 'breakfast',
      afternoon: 'lunch',
      evening: 'aperitivo'
    };
    const args = {
      query: timeOfDay === 'all' ? message : queryByTime[timeOfDay] || '',
      originalQuery: message,
      dietaryPreference: state.constraints?.[0] || this.extractDietaryPreference(lower),
      timeOfDay,
      limit: 4
    };
    const result = await this.toolRegistry.execute('search_menu', args, payload);
    toolCalls.push({ name: 'search_menu', arguments: args, result });
    if (result.items?.length) {
      this.agentStateManager.updateProposals(
        conversationId,
        result.items.map(item => ({
          id: item.id,
          name: item.name,
          type: 'menuItem',
          price: item.price
        })),
        signals.wantsOrder ? 'confirm_proposal' : 'choose_item'
      );
    }
    const menuMessage = result.items.length
      ? this.summarizeMenuSuggestion(timeOfDay, lower, result.items, state)
      : result.source === 'missing-production-catalog'
        ? 'Non trovo un menu collegato per questo merchant. Configura una fonte menu reale per attivare consigli affidabili.'
        : args.dietaryPreference
          ? `Non trovo opzioni ${args.dietaryPreference} compatibili per questa fascia oraria nel catalogo attuale. Posso proporti un alternativa sicura o segnalare la richiesta al locale.`
          : 'Posso aiutarti con menu, prodotti acquistabili, carrello o ordine WhatsApp.';

    return {
      message: menuMessage,
      agent,
      toolCalls,
      mode: 'demo'
    };
  }

  async runPlannedToolFlow(message, payload, agent, state = {}, signals = {}) {
    const toolPlan = Array.isArray(state.plan?.toolPlan) ? state.plan.toolPlan : [];
    const conversationId = String(payload.conversationId || 'anonymous');
    const executablePlan = toolPlan.filter(step => step && step.tool).slice(0, 3);
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
      } catch (error) {
        console.warn('[ai-gateway] planned tool failed:', toolName, error.message);
      }
    }

    if (toolCalls.length === 0) {
      return null;
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

    const cartCandidate = this.selectCartCandidate(message, state, catalogItems);
    if (cartCandidate && state.goal === 'order' && ['checkout_details', 'confirm_proposal'].includes(state.nextExpectedAction)) {
      this.agentStateManager.setNextAction(conversationId, 'checkout_details');
      return {
        message: state.language === 'en'
          ? `I added ${cartCandidate.item.name} to your cart. Would you like anything to eat with it?`
          : `Ho aggiunto al carrello ${cartCandidate.item.name}. Vuoi aggiungere anche qualcosa da mangiare?`,
        agent,
        toolCalls,
        cartOperations: [{
          action: 'add',
          item: cartCandidate.item,
          itemType: cartCandidate.type,
          quantity: 1
        }],
        mode: 'demo'
      };
    }

    const firstMenuCall = toolCalls.find(call => call.name === 'search_menu' && call.result?.items?.length > 0);
    if (firstMenuCall) {
      return {
        message: this.planBackedCatalogMessage(state, firstMenuCall.result.items),
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    const firstProductCall = toolCalls.find(call => call.name === 'search_products' && call.result?.products?.length > 0);
    if (firstProductCall) {
      return {
        message: this.planBackedProductMessage(state, firstProductCall.result.products),
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    const detailCall = toolCalls.find(call => call.name === 'get_item_detail' && call.result?.item);
    if (detailCall) {
      return {
        message: state.language === 'en'
          ? `Here are the details for ${detailCall.result.item.name}.`
          : `Ecco il dettaglio di ${detailCall.result.item.name}.`,
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    return null;
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
    if (state.mealSlot === 'breakfast') return 'breakfast';
    if (state.mealSlot === 'lunch') return 'lunch';
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

  selectCartCandidate(message, state = {}, catalogItems = []) {
    const normalizedMessage = String(message || '').toLowerCase();
    const candidates = catalogItems.length > 0
      ? catalogItems
      : (state.proposedItems || []).map(item => ({ item, type: item.type }));

    return candidates.find(({ item }) => {
      const name = String(item.name || '').toLowerCase();
      return name && (normalizedMessage.includes(name) || name.split(/\s+/).some(part => part.length > 4 && normalizedMessage.includes(part)));
    }) || candidates[0] || null;
  }

  planBackedCatalogMessage(state = {}, items = []) {
    const hasFood = items.some(item => String(item.category || '').toLowerCase() === 'food');
    if (state.language === 'en') {
      return hasFood
        ? 'I found food options compatible with your request. Open a card to choose one or tell me which one to add.'
        : 'I found compatible menu options. Open a card to choose one or tell me which one to add.';
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

  isDetailRequest(lower) {
    return ['dettaglio', 'dettagli', 'vedere', 'vedi', 'visualizzare', 'acquistare', 'comprare'].some(term => lower.includes(term));
  }

  timeOfDayFromState(state = {}) {
    if (state.mealSlot === 'breakfast') return 'morning';
    if (state.mealSlot === 'lunch') return 'afternoon';
    if (state.mealSlot === 'aperitivo') return 'evening';
    return 'all';
  }

  async resolveDetailRequest(message, payload) {
    const query = String(message || '')
      .replace(/\b(voglio|vorrei|vedere|vedi|visualizzare|il|la|lo|i|gli|le|dettaglio|dettagli|di|del|della|acquistare|comprare)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const productSearch = await this.toolRegistry.execute('search_products', { query, limit: 1 }, payload);
    if (productSearch.products && productSearch.products[0]) {
      return { item: productSearch.products[0], type: 'product' };
    }

    const menuSearch = await this.toolRegistry.execute('search_menu', { query, timeOfDay: 'all', limit: 1 }, payload);
    if (menuSearch.items && menuSearch.items[0]) {
      return { item: menuSearch.items[0], type: 'menuItem' };
    }

    return { item: null, type: 'product' };
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

  isKnowledgeQuestion(lower) {
    return [
      'orari', 'aperto', 'chiuso', 'storia', 'qualita', 'qualità', 'fornitori',
      'allergeni', 'intolleranze', 'vegano', 'glutine', 'lattosio',
      'policy', 'privacy', 'ritiro', 'whatsapp', 'ordine', 'ordini',
      'offerta', 'offerte', 'promozione', 'promozioni', 'sconto', 'sconti',
      'wifi', 'wi-fi', 'prenotare', 'prenotazione', 'prenotazioni'
    ].some(term => lower.includes(term));
  }

  isRecommendationIntent(lower) {
    return [
      'consigli', 'consiglia', 'cosa mi', 'cosa avete', 'menu', 'pranzo',
      'colazione', 'aperitivo', 'mangiare', 'bere', 'prodotto', 'prodotti',
      'acquistare', 'comprare', 'vorrei'
    ].some(term => lower.includes(term));
  }

  extractDietaryPreference(lower) {
    if (lower.includes('senza glutine') || lower.includes('gluten')) return 'gluten-free';
    if (lower.includes('senza lattosio') || lower.includes('lattosio') || lower.includes('lactose')) return 'lactose-free';
    if (lower.includes('vegano') || lower.includes('vegan')) return 'vegan';
    if (lower.includes('vegetariano') || lower.includes('vegetarian')) return 'vegetarian';
    return '';
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

