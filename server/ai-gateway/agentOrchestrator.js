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

    return {
      message: this.openaiClient.extractText(response) || 'Ho elaborato la richiesta.',
      responseId: response.id,
      toolCalls: executedToolCalls,
      mode: 'openai-responses'
    };
  }

  async runDemoMode(message) {
    const lower = message.toLowerCase();
    const toolCalls = [];

    if (lower.includes('prodot') || lower.includes('comprare') || lower.includes('acquist')) {
      const args = { query: '', limit: 4 };
      const result = await this.toolRegistry.execute('search_products', args);
      toolCalls.push({ name: 'search_products', arguments: args, result });

      return {
        message: result.products.length
          ? 'Ho trovato alcuni prodotti interessanti. Posso mostrarti i dettagli o prepararli nel carrello.'
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
        ? 'Ti propongo alcune opzioni dal menu. Posso spiegarti ingredienti, alternative o aggiungerne una al carrello.'
        : 'Posso aiutarti con menu, prodotti acquistabili, carrello o ordine WhatsApp.',
      toolCalls,
      mode: 'demo'
    };
  }

  buildInstructions(payload) {
    const business = payload.business || {};

    return [
      'Sei CafeConnect AI, un assistente commerciale per bar, cafe e piccoli locali.',
      'Obiettivo: aiutare il cliente a scegliere, comprare o ordinare con precisione e tono naturale.',
      'Usa i tool quando servono dati di menu, prodotto, dettaglio o bozza ordine.',
      'Non inventare prezzi, disponibilita, allergeni o ingredienti: usa i tool o chiedi conferma.',
      'Se il cliente vuole ordinare, prepara una bozza e chiedi conferma prima dell invio.',
      business.name ? 'Locale attivo: ' + business.name + '.' : '',
      business.type ? 'Tipo locale: ' + business.type + '.' : ''
    ].filter(Boolean).join('\n');
  }
}

module.exports = { AgentOrchestrator };
