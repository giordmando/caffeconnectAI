function safeJsonParse(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch (_error) {
    return fallback;
  }
}

const { routeAgent } = require('./agentRouter');

class AgentOrchestrator {
  constructor({ openaiClient, toolRegistry, config }) {
    this.openaiClient = openaiClient;
    this.toolRegistry = toolRegistry;
    this.config = config;
  }

  async runChat(payload) {
    const message = String(payload.message || '').trim();
    const agent = routeAgent(message, payload);

    if (!message) {
      return {
        message: 'Scrivi un messaggio per iniziare.',
        agent,
        toolCalls: [],
        mode: 'validation'
      };
    }

    if (this.config.demoMode || !this.openaiClient.isConfigured()) {
      return this.runDemoMode(message, payload, agent);
    }

    return this.runResponsesWithTools(message, payload, agent);
  }

  async runResponsesWithTools(message, payload, agent) {
    const retrievedKnowledge = await this.retrieveKnowledgeContext(message, payload);
    const customerProfile = this.buildCustomerProfile(payload);
    const instructions = this.buildInstructions(payload, agent, {
      retrievedKnowledge,
      customerProfile
    });
    let response = await this.openaiClient.createResponse({
      instructions,
      input: message,
      tools: this.toolRegistry.asOpenAITools(),
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
        tools: this.toolRegistry.asOpenAITools(),
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

  async runDemoMode(message, payload = {}, agent) {
    const lower = message.toLowerCase();
    const toolCalls = [];
    const retrievedKnowledge = await this.retrieveKnowledgeContext(message, payload);

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
          message: this.summarizeKnowledgeResult(runtimeResult.results, payload),
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
          ? this.summarizeKnowledgeResult(result.results, payload)
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

      return {
        message: result.products.length
          ? this.summarizePersonalizedSelection(result.products, 'prodotti')
          : 'Non ho trovato prodotti coerenti con la richiesta, ma posso cercare per categoria.',
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    const timeOfDay = lower.includes('colazione')
      ? 'morning'
      : lower.includes('pranzo')
        ? 'afternoon'
        : lower.includes('aperitivo') || lower.includes('sera')
          ? 'evening'
          : 'all';

    const queryByTime = {
      morning: 'breakfast',
      afternoon: 'lunch',
      evening: 'aperitivo'
    };
    const args = {
      query: timeOfDay === 'all' ? message : queryByTime[timeOfDay] || '',
      originalQuery: message,
      dietaryPreference: this.extractDietaryPreference(lower),
      timeOfDay,
      limit: 4
    };
    const result = await this.toolRegistry.execute('search_menu', args, payload);
    toolCalls.push({ name: 'search_menu', arguments: args, result });

    return {
      message: result.items.length
        ? this.summarizeMenuSuggestion(timeOfDay, lower, result.items)
        : args.dietaryPreference
          ? `Non trovo opzioni ${args.dietaryPreference} compatibili per questa fascia oraria nel catalogo attuale. Posso proporti un alternativa sicura o segnalare la richiesta al locale.`
          : 'Posso aiutarti con menu, prodotti acquistabili, carrello o ordine WhatsApp.',
      agent,
      toolCalls,
      mode: 'demo'
    };
  }

  isDetailRequest(lower) {
    return ['dettaglio', 'dettagli', 'vedere', 'vedi', 'visualizzare', 'acquistare', 'comprare'].some(term => lower.includes(term));
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

  summarizeMenuSuggestion(timeOfDay, lower, items = []) {
    const personalReason = this.bestPersonalizationReason(items);
    const reasonSuffix = personalReason ? ` Ho dato priorita a opzioni ${personalReason}.` : '';

    if (timeOfDay === 'afternoon') {
      return lower.includes('ho chiesto') || lower.startsWith('ma ')
        ? 'Hai ragione: per pranzo ti propongo opzioni salate e complete. Puoi scegliere una bowl o un toast e aggiungerli al carrello.' + reasonSuffix
        : 'Per pranzo ti propongo opzioni salate e complete. Le trovi nelle card qui sotto.' + reasonSuffix;
    }

    if (timeOfDay === 'morning') {
      return 'Per colazione ti propongo alcune opzioni adatte al mattino. Le trovi nelle card qui sotto.' + reasonSuffix;
    }

    if (timeOfDay === 'evening') {
      return 'Per aperitivo ti propongo alcune opzioni pensate per la sera. Le trovi nelle card qui sotto.' + reasonSuffix;
    }

    return 'Ti propongo alcune opzioni dal menu: le trovi nelle card qui sotto.' + reasonSuffix;
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
      return this.summarizeKnowledgeResult(hasKnowledge.result.results);
    }

    const hasDetail = toolCalls.some(call => call.name === 'get_item_detail' && call.result?.item);
    if (hasDetail) {
      return 'Ecco il dettaglio richiesto: puoi consultarlo nella card qui sotto.';
    }

    return this.cleanModelText(modelText);
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

  summarizeKnowledgeResult(results, payload = {}) {
    const first = results[0];
    if (!first) {
      return 'Non ho trovato questa informazione nella base conoscenza.';
    }

    const text = String(first.content || '').trim();
    const shortText = text.length > 220 ? text.slice(0, 217).trim() + '...' : text;
    const profile = this.buildCustomerProfile(payload);
    const restrictions = profile.dietaryRestrictions?.length
      ? ` Tengo conto anche di: ${profile.dietaryRestrictions.join(', ')}.`
      : '';
    return (shortText || 'Ho trovato un riferimento nella base conoscenza dell esercente.') + restrictions;
  }

  cleanModelText(text) {
    return String(text || '')
      .replace(/\[[^\]]+\]\([^\)]+\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  buildInstructions(payload, agent, context = {}) {
    const business = payload.business || {};
    const tenant = payload.tenant || {};
    const integrations = payload.integrations || {};
    const runtimeKnowledge = this.formatRuntimeKnowledge(payload);
    const customerProfile = this.formatCustomerProfile(context.customerProfile);
    const retrievedKnowledge = this.formatRetrievedKnowledge(context.retrievedKnowledge);

    return [
      'Sei CafeConnect AI, un assistente commerciale per bar, cafe e piccoli locali.',
      agent?.label ? 'Agente attivo: ' + agent.label + '.' : '',
      agent?.instruction ? agent.instruction : '',
      'Obiettivo: aiutare il cliente a scegliere, comprare o ordinare con precisione e tono naturale.',
      'Usa i tool quando servono dati di menu, prodotto, dettaglio o bozza ordine.',
      'Usa knowledge_search per rispondere su storia del locale, orari, policy, allergeni, fornitori, offerte, FAQ o informazioni personalizzate dell esercente.',
      'Incrocia sempre tre fonti quando disponibili: catalogo reale, fonti recuperate e profilo/preferenze cliente.',
      'Se suggerisci qualcosa, privilegia articoli compatibili con restrizioni alimentari, preferenze esplicite e interazioni recenti.',
      'Quando una raccomandazione e personalizzata, spiega in poche parole il motivo senza mostrare punteggi tecnici.',
      'Rispondi in italiano con massimo 2 frasi brevi.',
      'Non elencare tutti i dati dei tool: la UI mostra gia card e dettagli visivi.',
      'Non inserire URL, markdown link, markdown immagini, tabelle o liste numerate lunghe.',
      'Quando mostri prodotti o menu usa i tool: rispondi con una frase breve e lascia le card alla UI.',
      'Se il cliente chiede dettagli o acquisto di un articolo per nome, usa get_item_detail o cerca prima il prodotto corrispondente.',
      'Non inventare prezzi, disponibilita, allergeni o ingredienti: usa i tool o chiedi conferma.',
      'Se il cliente vuole ordinare, prepara una bozza e chiedi conferma prima dell invio.',
      business.name ? 'Locale attivo: ' + business.name + '.' : '',
      business.type ? 'Tipo locale: ' + business.type + '.' : '',
      tenant.merchantId ? 'Merchant ID: ' + tenant.merchantId + '.' : '',
      tenant.plan ? 'Piano merchant: ' + tenant.plan + '.' : '',
      integrations.bookingUrl ? 'Prenotazioni disponibili tramite URL configurato.' : '',
      integrations.paymentUrl ? 'Pagamento online disponibile tramite URL configurato.' : '',
      integrations.posProvider && integrations.posProvider !== 'none' ? 'POS collegato: ' + integrations.posProvider + '.' : '',
      integrations.crmProvider && integrations.crmProvider !== 'none' ? 'CRM collegato: ' + integrations.crmProvider + '.' : '',
      customerProfile,
      retrievedKnowledge,
      runtimeKnowledge
    ].filter(Boolean).join('\n');
  }
}

module.exports = { AgentOrchestrator };

