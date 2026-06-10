function safeJsonParse(value, fallback = {}) {
  try {
    return typeof value === 'string' ? JSON.parse(value || '{}') : (value || fallback);
  } catch (_error) {
    return fallback;
  }
}

class AgentOrchestrator {
  constructor({ openaiClient, toolRegistry, config }) {
    this.openaiClient = openaiClient;
    this.toolRegistry = toolRegistry;
    this.config = config;
  }

  async runChat(payload) {
    const message = String(payload.message || '').trim();

    if (!message) {
      return {
        message: 'Scrivi un messaggio per iniziare.',
        toolCalls: [],
        mode: 'validation'
      };
    }

    if (this.config.demoMode || !this.openaiClient.isConfigured()) {
      return this.runDemoMode(message);
    }

    return this.runResponsesWithTools(message, payload);
  }

  async runResponsesWithTools(message, payload) {
    const instructions = this.buildInstructions(payload);
    let response = await this.openaiClient.createResponse({
      instructions,
      input: message,
      tools: this.toolRegistry.asOpenAITools(),
      parallel_tool_calls: true,
      metadata: {
        product: 'cafeconnect-ai',
        conversation_id: String(payload.conversationId || 'anonymous')
      }
    });

    const executedToolCalls = [];

    for (let round = 0; round < this.config.maxToolRounds; round += 1) {
      const calls = this.openaiClient.extractFunctionCalls(response);
      if (calls.length === 0) break;

      const toolOutputs = [];

      for (const call of calls) {
        const args = safeJsonParse(call.arguments, {});
        const result = await this.toolRegistry.execute(call.name, args);

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
      toolCalls: executedToolCalls,
      mode: 'openai-responses'
    };
  }

  async runDemoMode(message) {
    const lower = message.toLowerCase();
    const toolCalls = [];

    if (this.isKnowledgeQuestion(lower)) {
      const args = { query: message, limit: 3 };
      const result = await this.toolRegistry.execute('knowledge_search', args);
      toolCalls.push({ name: 'knowledge_search', arguments: args, result });

      return {
        message: result.results.length
          ? this.summarizeKnowledgeResult(result.results)
          : 'Non ho trovato questa informazione nella base conoscenza. Posso aiutarti con menu, prodotti o ordini.',
        toolCalls,
        mode: 'demo'
      };
    }

    if (lower.includes('prodot') || lower.includes('comprare') || lower.includes('acquist')) {
      const args = { query: '', limit: 4 };
      const result = await this.toolRegistry.execute('search_products', args);
      toolCalls.push({ name: 'search_products', arguments: args, result });

      return {
        message: result.products.length
          ? 'Ho trovato alcuni prodotti interessanti: li trovi nelle card qui sotto.'
          : 'Non ho trovato prodotti coerenti con la richiesta, ma posso cercare per categoria.',
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

    const args = {
      query: timeOfDay === 'all' ? message : '',
      timeOfDay,
      limit: 4
    };
    const result = await this.toolRegistry.execute('search_menu', args);
    toolCalls.push({ name: 'search_menu', arguments: args, result });

    return {
      message: result.items.length
        ? 'Ti propongo alcune opzioni dal menu: le trovi nelle card qui sotto.'
        : 'Posso aiutarti con menu, prodotti acquistabili, carrello o ordine WhatsApp.',
      toolCalls,
      mode: 'demo'
    };
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

  isKnowledgeQuestion(lower) {
    return [
      'orari', 'aperto', 'chiuso', 'storia', 'qualita', 'qualità', 'fornitori',
      'allergeni', 'intolleranze', 'vegano', 'glutine', 'lattosio',
      'policy', 'privacy', 'ritiro', 'whatsapp', 'ordine', 'ordini'
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

  buildInstructions(payload) {
    const business = payload.business || {};

    return [
      'Sei CafeConnect AI, un assistente commerciale per bar, cafe e piccoli locali.',
      'Obiettivo: aiutare il cliente a scegliere, comprare o ordinare con precisione e tono naturale.',
      'Usa i tool quando servono dati di menu, prodotto, dettaglio o bozza ordine.',
      'Usa knowledge_search per rispondere su storia del locale, orari, policy, allergeni, fornitori, offerte, FAQ o informazioni personalizzate dell esercente.',
      'Rispondi in italiano con massimo 2 frasi brevi.',
      'Non elencare tutti i dati dei tool: la UI mostra gia card e dettagli visivi.',
      'Non inserire URL, markdown link, tabelle o liste numerate lunghe.',
      'Non inventare prezzi, disponibilita, allergeni o ingredienti: usa i tool o chiedi conferma.',
      'Se il cliente vuole ordinare, prepara una bozza e chiedi conferma prima dell invio.',
      business.name ? 'Locale attivo: ' + business.name + '.' : '',
      business.type ? 'Tipo locale: ' + business.type + '.' : ''
    ].filter(Boolean).join('\n');
  }
}

module.exports = { AgentOrchestrator };

