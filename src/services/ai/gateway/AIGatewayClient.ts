export interface AIGatewayChatRequest {
  message: string;
  conversationId?: string | null;
  userContext?: unknown;
  business?: {
    name?: string;
    type?: string;
  };
  knowledgeBase?: Array<{
    key: string;
    facts: string[];
    scope?: 'global' | 'product' | 'category';
    itemId?: string;
  }>;
  knowledgeSources?: {
    urls: string[];
    inlineText: string;
  };
  catalog?: {
    menuItems?: any[];
    products?: any[];
  };
}

export interface AIGatewayChatResponse {
  message: string;
  responseId?: string;
  mode: 'demo' | 'openai-responses' | 'validation';
  toolCalls?: Array<{
    name: string;
    arguments: unknown;
    result: unknown;
  }>;
}

export class AIGatewayClient {
  constructor(
    private readonly baseUrl: string = process.env.REACT_APP_AI_GATEWAY_URL || 'http://localhost:8787'
  ) {}

  async sendMessage(request: AIGatewayChatRequest): Promise<AIGatewayChatResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI Gateway error ${response.status}: ${detail}`);
    }

    return response.json();
  }
}

