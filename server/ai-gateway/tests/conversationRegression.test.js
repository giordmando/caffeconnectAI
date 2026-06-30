const assert = require('assert');
const { AgentOrchestrator } = require('../agentOrchestrator');
const { createDefaultToolRegistry } = require('../toolRegistry');

class FakeOpenAIClient {
  isConfigured() {
    return true;
  }

  async createResponse(payload) {
    const input = this.parseInput(payload.input);
    const message = String(input.message || '').toLowerCase();
    const previousState = input.previousState || {};
    const plan = this.planFor(message, previousState);

    return {
      id: 'fake-response-' + Date.now(),
      output_text: JSON.stringify(plan),
      output: [
        {
          type: 'message',
          content: [{ type: 'output_text', text: JSON.stringify(plan) }]
        }
      ]
    };
  }

  extractText(response) {
    return response.output_text || '';
  }

  extractFunctionCalls() {
    return [];
  }

  parseInput(input) {
    try {
      return JSON.parse(input || '{}');
    } catch (_error) {
      return { message: String(input || '') };
    }
  }

  planFor(message, previousState) {
    if (message.includes('senza lattosio') && message.includes('colazione')) {
      return {
        language: 'it',
        goal: 'browse_menu',
        mealSlot: 'breakfast',
        constraints: ['lactose-free'],
        intent: 'breakfast_lactose_free_recommendation',
        customerNeed: 'colazione senza lattosio',
        nextExpectedAction: 'choose_item',
        toolPlan: [
          {
            tool: 'search_menu',
            args: {
              query: 'breakfast',
              timeOfDay: 'morning',
              dietaryPreference: 'lactose-free',
              limit: 6
            }
          }
        ],
        responseStrategy: 'Mostra solo opzioni compatibili.',
        missingInformation: []
      };
    }

    if (message.includes('mangiare') || message.includes('qualcosa da mangiare')) {
      return {
        language: 'it',
        goal: 'browse_menu',
        mealSlot: previousState.mealSlot || 'breakfast',
        constraints: previousState.constraints || ['lactose-free'],
        intent: 'food_lactose_free_options',
        customerNeed: 'opzioni da mangiare senza lattosio',
        nextExpectedAction: 'choose_item',
        toolPlan: [
          {
            tool: 'search_menu',
            args: {
              query: 'food hummus toast',
              dietaryPreference: 'lactose-free',
              timeOfDay: 'all',
              limit: 6
            }
          }
        ],
        responseStrategy: 'Mostra opzioni da mangiare compatibili, non bevande.',
        missingInformation: []
      };
    }

    if (
      message.includes('cappuccino') ||
      message.includes('toast') ||
      message.includes('procedi') ||
      message.includes('aggiungi')
    ) {
      return {
        language: 'it',
        goal: 'order',
        mealSlot: previousState.mealSlot || 'breakfast',
        constraints: previousState.constraints || ['lactose-free'],
        intent: 'add_items_to_cart',
        customerNeed: 'aggiungere articoli al carrello',
        nextExpectedAction: 'checkout_details',
        toolPlan: [],
        responseStrategy: 'Aggiungi gli articoli richiesti al carrello se presenti e compatibili.',
        missingInformation: []
      };
    }

    return {
      language: 'it',
      goal: previousState.goal || 'unknown',
      mealSlot: previousState.mealSlot || 'all',
      constraints: previousState.constraints || [],
      intent: 'fallback',
      customerNeed: '',
      nextExpectedAction: previousState.nextExpectedAction || 'none',
      toolPlan: [],
      responseStrategy: '',
      missingInformation: []
    };
  }
}

function createOrchestrator() {
  return new AgentOrchestrator({
    openaiClient: new FakeOpenAIClient(),
    toolRegistry: createDefaultToolRegistry({}),
    config: {
      demoMode: false,
      maxToolRounds: 3
    }
  });
}

function demoPayload(conversationId = 'regression-conversation') {
  return {
    conversationId,
    tenant: {
      merchantId: 'cafeconnect-roastery',
      environment: 'demo',
      plan: 'demo'
    },
    userContext: {
      userId: 'test-user',
      preferences: [],
      interactions: [],
      dietaryRestrictions: []
    }
  };
}

async function testBreakfastLactoseFreeSearch() {
  const orchestrator = createOrchestrator();
  const response = await orchestrator.runChat({
    ...demoPayload('breakfast-safe'),
    message: 'cosa avete per colazione senza lattosio?'
  });
  const menuCall = response.toolCalls.find(call => call.name === 'search_menu');
  const itemNames = (menuCall?.result?.items || []).map(item => item.name);

  assert(menuCall, 'expected search_menu tool call');
  assert(itemNames.includes("Cappuccino con bevanda d'avena"), 'expected oat cappuccino in breakfast results');
  assert(!itemNames.some(name => /cornetto/i.test(name)), 'must not suggest cornetto as lactose-free item');
}

async function testMultiItemCartOperation() {
  const orchestrator = createOrchestrator();
  const conversationId = 'multi-item-cart';

  await orchestrator.runChat({
    ...demoPayload(conversationId),
    message: 'cosa avete per colazione senza lattosio?'
  });

  const response = await orchestrator.runChat({
    ...demoPayload(conversationId),
    message: "si cappuccino d'avena e toast con hummus"
  });
  const cartNames = (response.cartOperations || []).map(operation => operation.item.name);

  assert.strictEqual(response.mode, 'openai-responses', 'planned execution should also run in openai mode');
  assert(cartNames.includes("Cappuccino con bevanda d'avena"), 'expected cappuccino added to cart');
  assert(cartNames.includes('Toast hummus e verdure'), 'expected toast hummus added to cart');
  assert.strictEqual(cartNames.length, 2, 'expected exactly two cart operations');
}

async function testProceedUsesPreviousProposal() {
  const orchestrator = createOrchestrator();
  const conversationId = 'proceed-previous-proposal';

  await orchestrator.runChat({
    ...demoPayload(conversationId),
    message: 'voglio qualcosa da mangiare senza lattosio'
  });

  const response = await orchestrator.runChat({
    ...demoPayload(conversationId),
    message: 'si procedi'
  });
  const cartNames = (response.cartOperations || []).map(operation => operation.item.name);

  assert(cartNames.length > 0, 'expected at least one previous proposal added to cart');
  assert(cartNames.every(name => !/cappuccino/i.test(name)), 'food proposal should not add beverage');
}

async function run() {
  const tests = [
    testBreakfastLactoseFreeSearch,
    testMultiItemCartOperation,
    testProceedUsesPreviousProposal
  ];

  for (const test of tests) {
    await test();
    console.log(`PASS ${test.name}`);
  }
}

run().catch(error => {
  console.error('FAIL conversation regression suite');
  console.error(error);
  process.exitCode = 1;
});
