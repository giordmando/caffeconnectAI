export interface AIGatewayChatRequest {
  message: string;
  conversationId?: string | null;
  userContext?: unknown;
  business?: {
    name?: string;
    type?: string;
  };
  tenant?: unknown;
  dataGovernance?: unknown;
  agents?: unknown;
  integrations?: unknown;
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
  merchantKnowledge?: {
    sources: Array<{
      id: string;
      label: string;
      type: 'url' | 'json' | 'faq' | 'sheet' | 'site';
      url: string;
      enabled: boolean;
    }>;
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
  agent?: {
    id: string;
    label: string;
    confidence: number;
  };
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
    const merchantId = (request.tenant as any)?.merchantId || process.env.REACT_APP_MERCHANT_ID || '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (merchantId) {
      headers['X-Merchant-Id'] = String(merchantId);
    }

    const response = await fetch(`${this.baseUrl}/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI Gateway error ${response.status}: ${detail}`);
    }

    return response.json();
  }
}

