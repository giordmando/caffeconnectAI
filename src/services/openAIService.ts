import { AIProvider } from './aiProviderService';
import { functionService } from './functionService';
import { OpenAIClient } from './openAIClient';
import { Message } from '../types/Message';

export interface OpenAIOptions {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * Implementazione reale dell'integrazione con OpenAI
 */
export class OpenAIService implements AIProvider {
  name = 'OpenAI';
  private client: OpenAIClient;
  private model: string;
  private defaultOptions: Partial<OpenAIOptions>;
  
  constructor(options: OpenAIOptions) {
    this.client = new OpenAIClient(options.apiKey);
    this.model = options.model || 'gpt-4';
    
    // Opzioni predefinite per le chiamate API
    this.defaultOptions = {
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000,
      topP: options.topP || 1,
      presencePenalty: options.presencePenalty || 0,
      frequencyPenalty: options.frequencyPenalty || 0
    };
  }
  providerName(): string {
    return this.name;
  }
  
  /**
   * Converte i messaggi interni nel formato richiesto dall'API OpenAI
   */
  private formatMessagesForAPI(messages: Message[]): any[] {
    return messages.map(msg => {
      const formattedMsg: any = {
        role: msg.role,
        content: msg.content
      };
      
      // Aggiungi function_call se presente
      if (msg.functionCall) {
        formattedMsg.function_call = {
          name: msg.functionCall.name,
          arguments: msg.functionCall.arguments
        };
      }
      
      return formattedMsg;
    });
  }
  
  /**
   * Invia una richiesta completa all'API di OpenAI
   */
  public async sendCompletionRequest(
    messages: Message[], 
    options: Partial<OpenAIOptions> = {}
  ): Promise<any> {
    const formattedMessages = this.formatMessagesForAPI(messages);
    
    // Recupera le definizioni delle funzioni per l'API
    const functions = functionService.getFunctionsForAI();
    
    // Prepara i parametri della richiesta
    const requestParams: any = {
      model: options.model || this.model,
      messages: formattedMessages,
      temperature: options.temperature || this.defaultOptions.temperature,
      max_tokens: options.maxTokens || this.defaultOptions.maxTokens,
      top_p: options.topP || this.defaultOptions.topP,
      presence_penalty: options.presencePenalty || this.defaultOptions.presencePenalty,
      frequency_penalty: options.frequencyPenalty || this.defaultOptions.frequencyPenalty
    };
    
    // Aggiungi le funzioni se disponibili
    if (functions && functions.length > 0) {
      requestParams.functions = functions;
    }
    
    try {
      const response = await this.client.createChatCompletion(requestParams);
      return response;
    } catch (error) {
      console.error('Errore nella chiamata a OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Metodo principale per invio messaggio (implementazione dell'interfaccia AIProvider)
   */
  public async sendMessage(prompt: string, options: Partial<OpenAIOptions> = {}): Promise<string> {
    try {
      const messages: Message[] = [
        {
          role: 'system',
          content: 'Sei un assistente AI per CaféConnect, una caffetteria italiana di qualità.',
          timestamp: Date.now()
        },
        {
          role: 'user',
          content: prompt,
          timestamp: Date.now()
        }
      ];
      
      const response = await this.sendCompletionRequest(messages, options);
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content || '';
      }
      
      return '';
    } catch (error) {
      console.error('Errore nell\'invio del messaggio a OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Supporto per lo streaming delle risposte
   */
  public async streamMessage(
    prompt: string, 
    callback: (chunk: string) => void,
    options: Partial<OpenAIOptions> = {}
  ): Promise<void> {
    try {
      const messages: Message[] = [
        {
          role: 'system',
          content: 'Sei un assistente AI per CaféConnect, una caffetteria italiana di qualità.',
          timestamp: Date.now()
        },
        {
          role: 'user',
          content: prompt,
          timestamp: Date.now()
        }
      ];
      
      // Imposta il parametro stream a true
      const streamOptions = {
        ...options,
        stream: true
      };
      
      // Chiamata API con streaming
      await this.client.createChatCompletionStream(
        this.formatMessagesForAPI(messages),
        streamOptions,
        callback
      );
    } catch (error) {
      console.error('Errore nello streaming della risposta da OpenAI:', error);
      throw error;
    }
  }
}