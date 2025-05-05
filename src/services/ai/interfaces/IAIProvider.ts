import { Message } from '../../../types/Message';

/**
 * Base interface for all AI providers
 */
export interface IAIProvider {
  /** The name of the provider */
  name: string;
  
  /** Get the provider name */
  providerName(): string;
  /**
   * Send a message to the AI provider and get a response
   * @param prompt The prompt message to send
   * @param options Optional configuration for the request
   * @returns Promise resolving to the AI response text
   */
  sendMessage(prompt: string, options?: any): Promise<string>;
   /**
   * Stream a message response from the AI provider
   * @param prompt The prompt message to send
   * @param callback Function called with each chunk of the response
   * @param options Optional configuration for the request
   * @returns Promise resolving when the stream is complete
   */
   streamMessage(prompt: string, callback: (chunk: string) => void, options?: any): Promise<void>;
   /**
   * Send a completion request with possible function calls
   * @param messages Array of message objects
   * @param options Optional configuration for the request
   * @returns Promise resolving to the AI response
   */
  sendCompletionRequest(messages: Message[], options?: any): Promise<any>;

    // Metodo opzionale per ottenere la configurazione
    getConfig?(): any;
}
