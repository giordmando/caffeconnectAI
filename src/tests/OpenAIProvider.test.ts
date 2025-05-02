// src/tests/OpenAIProvider.test.ts
import { OpenAIProvider } from '../services/ai/providers/OpenAIProvider';
import { AIProviderConfig } from '../types/AIProvider';

describe('OpenAIProvider', () => {
  // Usa un mock per le chiamate API
  global.fetch = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should initialize with the correct model', () => {
    const config: AIProviderConfig = {
      apiKey: 'test-key',
      model: 'gpt-4'
    };
    
    const provider = new OpenAIProvider(config);
    expect(provider.providerName()).toBe('OpenAI');
  });
  
  it('should send a message correctly', async () => {
    // Mock della risposta di OpenAI
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'Test response'
            }
          }
        ]
      })
    });
    
    const config: AIProviderConfig = {
      apiKey: 'test-key',
      model: 'gpt-3.5-turbo'
    };
    
    const provider = new OpenAIProvider(config);
    const response = await provider.sendMessage('Test message');
    
    expect(response).toBe('Test response');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Verifica che la richiesta sia corretta
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(JSON.parse(options.body)).toEqual({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test message' }]
    });
    expect(options.headers.Authorization).toBe('Bearer test-key');
  });
  
  it('should handle function calls correctly', async () => {
    // Mock della risposta di OpenAI con function call
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              function_call: {
                name: 'get_menu_recommendations',
                arguments: '{"userId":"user123","timeOfDay":"morning"}'
              }
            }
          }
        ]
      })
    });
    
    const config: AIProviderConfig = {
      apiKey: 'test-key',
      model: 'gpt-4'
    };
    
    const provider = new OpenAIProvider(config);
    const messages = [
      { role: 'system' as const, content: 'System prompt', timestamp: Date.now() },
      { role: 'user' as const, content: 'Test message', timestamp: Date.now() }
    ];
    
    const functions = [
      {
        name: 'get_menu_recommendations',
        description: 'Get menu recommendations',
        parameters: { type: 'object', properties: {} }
      }
    ];
    
    const response = await provider.sendCompletionRequest(messages, { functions });
    
    expect(response.function_call).toBeDefined();
    expect(response.function_call.name).toBe('get_menu_recommendations');
    expect(response.content).toBeNull();
  });
  
  it('should handle errors correctly', async () => {
    // Mock di una risposta di errore
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } })
    });
    
    const config: AIProviderConfig = {
      apiKey: 'invalid-key',
      model: 'gpt-3.5-turbo'
    };
    
    const provider = new OpenAIProvider(config);
    
    await expect(provider.sendMessage('Test message')).rejects.toThrow('OpenAI API error: 401');
  });
});