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
    const instructions = this.buildInstructions(payload, agent);
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

    if (this.isKnowledgeQuestion(lower)) {
      const runtimeResult = await this.searchRuntimeKnowledge(message, payload);
      if (runtimeResult.results.length > 0) {
        toolCalls.push({
          name: 'runtime_knowledge_search',
          arguments: { query: message },
          result: runtimeResult
        });

        return {
          message: this.summarizeKnowledgeResult(runtimeResult.results),
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
          ? this.summarizeKnowledgeResult(result.results)
          : 'Non ho trovato questa informazione nella base conoscenza. Posso aiutarti con menu, prodotti o ordini.',
        agent,
        toolCalls,
        mode: 'demo'
      };
    }

    if (lower.includes('prodot') || lower.includes('comprare') || lower.includes('acquist')) {
      const args = { query: '', limit: 4 };
      const result = await this.toolRegistry.execute('search_products', args, payload);
      toolCalls.push({ name: 'search_products', arguments: args, result });

      return {
        message: result.products.length
          ? 'Ho trovato alcuni prodotti interessanti: li trovi nelle card qui sotto.'
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
      timeOfDay,
      limit: 4
    };
    const result = await this.toolRegistry.execute('search_menu', args, payload);
    toolCalls.push({ name: 'search_menu', arguments: args, result });

    return {
      message: result.items.length
        ? this.summarizeMenuSuggestion(timeOfDay, lower)
        : 'Posso aiutarti con menu, prodotti acquistabili, carrello o ordine WhatsApp.',
      agent,
      toolCalls,
      mode: 'demo'
    };
  }

  summarizeMenuSuggestion(timeOfDay, lower) {
    if (timeOfDay === 'afternoon') {
      return lower.includes('ho chiesto') || lower.startsWith('ma ')
        ? 'Hai ragione: per pranzo ti propongo opzioni salate e complete. Puoi scegliere una bowl o un toast e aggiungerli al carrello.'
        : 'Per pranzo ti propongo opzioni salate e complete: una bowl bilanciata o un toast leggero. Le trovi nelle card qui sotto.';
    }

    if (timeOfDay === 'morning') {
      return 'Per colazione ti propongo alcune opzioni adatte al mattino. Le trovi nelle card qui sotto.';
    }

    if (timeOfDay === 'evening') {
      return 'Per aperitivo ti propongo alcune opzioni pensate per la sera. Le trovi nelle card qui sotto.';
    }

    return 'Ti propongo alcune opzioni dal menu: le trovi nelle card qui sotto.';
  }

  summarizeToolBackedResponse(modelText, toolCalls) {
    const hasProducts = toolCalls.some(call => call.name === 'search_products' && call.result?.products?.length > 0);
    if (hasProducts) {
      return 'Ho trovato alcuni prodotti interessanti: li trovi nelle card qui sotto. Posso mostrarti i dettagli o aiutarti a preparare un ordine.';
    }

    const hasMenuItems = toolCalls.some(call => call.name === 'search_menu' && call.result?.items?.length > 0);
    if (hasMenuItems) {
      return 'Ti propongo alcune opzioni dal menu: le trovi nelle card qui sotto. Posso spiegarti ingredienti, allergeni o alternative.';
    }

    const hasKnowledge = toolCalls.find(call => call.name === 'knowledge_search' && call.result?.results?.length > 0);
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

  async runtimeKnowledgeEntries(payload) {
    const knowledgeBase = Array.isArray(payload.knowledgeBase) ? payload.knowledgeBase : [];
    const knowledgeSources = payload.knowledgeSources || {};

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

    if (knowledgeSources.inlineText) {
      entries.push({
        id: 'runtime-inline-text',
        title: 'Testo libero esercente',
        content: String(knowledgeSources.inlineText),
        tags: ['inline', 'settings'],
        source: 'runtime-settings'
      });
    }

    const urls = Array.isArray(knowledgeSources.urls) ? knowledgeSources.urls : [];
    for (const url of urls.slice(0, 5)) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          const remoteEntries = this.normalizeRuntimeKnowledgePayload(data, url);
          entries.push(...remoteEntries);
        } else {
          const text = await response.text();
          entries.push({
            id: `runtime-url-${url}`,
            title: url,
            content: text.slice(0, 20000),
            tags: ['url', 'remote'],
            source: url
          });
        }
      } catch (error) {
        console.warn('[ai-gateway] Runtime knowledge URL failed:', url, error.message);
      }
    }

    return entries;
  }

  formatRuntimeKnowledge(payload) {
    const knowledgeBase = Array.isArray(payload.knowledgeBase) ? payload.knowledgeBase : [];
    const knowledgeSources = payload.knowledgeSources || {};
    const entries = knowledgeBase.flatMap((entry, entryIndex) => {
      const facts = Array.isArray(entry.facts) ? entry.facts : [];
      return facts.map((fact, factIndex) => ({
        id: `runtime-${entryIndex}-${factIndex}`,
        title: entry.key || 'Knowledge setting',
        content: String(fact)
      }));
    });

    if (knowledgeSources.inlineText) {
      entries.push({
        id: 'runtime-inline-text',
        title: 'Testo libero esercente',
        content: String(knowledgeSources.inlineText)
      });
    }

    if (Array.isArray(knowledgeSources.urls) && knowledgeSources.urls.length > 0) {
      entries.push({
        id: 'runtime-urls',
        title: 'URL knowledge collegati',
        content: knowledgeSources.urls.join(', ')
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
      'offerta', 'offerte', 'promozione', 'promozioni', 'sconto', 'sconti'
    ].some(term => lower.includes(term));
  }

  summarizeKnowledgeResult(results) {
    const first = results[0];
    if (!first) {
      return 'Non ho trovato questa informazione nella base conoscenza.';
    }

    const text = String(first.content || '').trim();
    const shortText = text.length > 220 ? text.slice(0, 217).trim() + '...' : text;
    return shortText || 'Ho trovato un riferimento nella base conoscenza dell esercente.';
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

  buildInstructions(payload, agent) {
    const business = payload.business || {};
    const tenant = payload.tenant || {};
    const integrations = payload.integrations || {};
    const runtimeKnowledge = this.formatRuntimeKnowledge(payload);

    return [
      'Sei CafeConnect AI, un assistente commerciale per bar, cafe e piccoli locali.',
      agent?.label ? 'Agente attivo: ' + agent.label + '.' : '',
      agent?.instruction ? agent.instruction : '',
      'Obiettivo: aiutare il cliente a scegliere, comprare o ordinare con precisione e tono naturale.',
      'Usa i tool quando servono dati di menu, prodotto, dettaglio o bozza ordine.',
      'Usa knowledge_search per rispondere su storia del locale, orari, policy, allergeni, fornitori, offerte, FAQ o informazioni personalizzate dell esercente.',
      'Rispondi in italiano con massimo 2 frasi brevi.',
      'Non elencare tutti i dati dei tool: la UI mostra gia card e dettagli visivi.',
      'Non inserire URL, markdown link, tabelle o liste numerate lunghe.',
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
      runtimeKnowledge
    ].filter(Boolean).join('\n');
  }
}

module.exports = { AgentOrchestrator };

