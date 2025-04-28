;
import { UserContext } from '../../../types/UserContext';
import { AIProviderConfig } from '../../../types/AIProvider';
import { Message } from '../../../types/Message';
import { AIResponse } from '../../../types/AIResponse';

/**
 * Core AI service interface with high-level operations
 */
export interface IAIService {
  /**
   * Send a message to the AI and get a response
   * @param message User message text
   * @param userContext Context about the user
   * @returns Promise resolving to the AI response
   */
  sendMessage(message: string, userContext: UserContext): Promise<AIResponse>;
  
  /**
   * Get the conversation history
   * @returns Array of messages in the conversation
   */
  getConversationHistory(): Message[];
  
  /**
   * Reset the conversation history
   */
  resetConversation(): void;
  
  /**
   * Get the name of the current AI provider
   * @returns The provider name
   */
  getProviderName(): string;
  
  /**
   * Change the AI provider
   * @param provider Provider identifier
   * @param config Provider configuration
   */
  changeProvider(provider: string, config: AIProviderConfig): void;
}