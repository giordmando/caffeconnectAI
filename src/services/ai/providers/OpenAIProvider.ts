// src/services/ai/providers/OpenAIProvider.ts
import { IAIProvider} from '../interfaces/IAIProvider';
import { AIProviderConfig } from '../../../types/AIProvider';
import { Message } from '../../../types/Message';

/**
 * OpenAI Provider per CaféConnect AI
 * Implementa tutte le interfacce per massima compatibilità
 */
export class OpenAIProvider implements IAIProvider {
  name = 'OpenAI';
  private apiKey: string;
  private model: string;
  private baseUrl: string = 'https://api.openai.com/v1';
  
  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    
    // Override base URL se specificato nelle opzioni
    if (config.options?.baseUrl) {
      this.baseUrl = config.options.baseUrl;
    }
    
    console.log(`OpenAI provider initialized with model: ${this.model}`);
  }
  
  /**
   * Get the provider name
   */
  providerName(): string {
    return this.name;
  }
  
  /**
   * Send a message to OpenAI
   */
  async sendMessage(prompt: string, options?: any): Promise<string> {
    const messages = [{ role: 'user', content: prompt }];
    
    try {
      const response = await this.callCompletionsAPI(messages);
      const message = response.choices[0]?.message?.content || '';
      return message;
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Stream a message response
   */
  async streamMessage(prompt: string, callback: (chunk: string) => void, options?: any): Promise<void> {
    const messages = [{ role: 'user', content: prompt }];
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: true,
          ...options
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body stream not available');
      
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      // Processa lo stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Dividi le righe dello stream
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Conserva l'ultima linea incompleta
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const data = line.slice(6);
            try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices[0]?.delta?.content;
              if (content) {
                callback(content);
              }
            } catch (e) {
              console.warn('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming from OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Send a completion request with function call support
   */
  async sendCompletionRequest(messages: Message[], options?: any): Promise<any> {
    try {
      // Converti messaggi CaféConnect nel formato OpenAI
      const openAIMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.functionCall ? { function_call: { name: msg.functionCall.name, arguments: msg.functionCall.arguments } } : {}),
        ...(msg.functionResult ? { name: msg.functionResult.name, content: msg.functionResult.result } : {}),
        ...(msg.role === 'function' && msg.name ? { name: msg.name } : {})
      }));
      
      const response = await this.callCompletionsAPI(openAIMessages, options);
      
      // Formatta la risposta
      const choice = response.choices[0];
      const message = choice.message;
      
      if (message.function_call) {
        return {
          content: null,
          function_call: {
            name: message.function_call.name,
            arguments: message.function_call.arguments
          }
        };
      } else {
        return {
          content: message.content
        };
      }
    } catch (error) {
      console.error('Error sending completion request to OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to call OpenAI Chat Completions API
   */
  private async callCompletionsAPI(messages: any[], options?: any): Promise<any> {
    
    // Estrai il contesto, se presente
    const context = options?.context;

   // Crea una copia delle messages per non modificare l'originale
  const formattedMessages = [...messages];
  
  // Se abbiamo informazioni di contesto, aggiungiamole al prompt di sistema
  if (context) {
    // Cerca un messaggio di sistema esistente
    const systemMessageIndex = formattedMessages.findIndex(m => m.role === 'system');
    
    // Crea una stringa con le informazioni di contesto
    const contextInfo = `
Contesto attuale:
- UserId: ${context.userId}
- Momento della giornata: ${context.timeOfDay}
- Ora: ${context.currentTime}
- Data: ${context.date}
${context.userContext ? `- Preferenze utente: ${JSON.stringify(context.userContext.preferences || [])}` : ''}
${context.userContext?.dietaryRestrictions?.length > 0 ? `- Restrizioni alimentari: ${context.userContext.dietaryRestrictions.join(', ')}` : ''}
`;
    
    if (systemMessageIndex >= 0) {
      // Aggiungi il contesto al messaggio di sistema esistente
      formattedMessages[systemMessageIndex].content += '\n\n' + contextInfo;
    } else {
      // Crea un nuovo messaggio di sistema con il contesto
      formattedMessages.unshift({
        role: 'system',
        content: contextInfo,
        timestamp: Date.now()
      });
    }
  }

  const requestBody: any = {
    model: this.model,
    messages: formattedMessages,
    ...options
  };
  // Aggiungi functions se presenti nelle opzioni
  if (options?.functions) {
    requestBody.functions = options.functions;
    
    if (options.function_call) {
      requestBody.function_call = options.function_call;
    }
  }
  if (options?.context) {
    delete requestBody.context;
  }
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    console.log(requestBody);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  }
}