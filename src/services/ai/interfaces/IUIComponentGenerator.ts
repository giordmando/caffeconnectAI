import { UIComponent } from '../../../types/UI';
import { UserContext } from '../../../types/UserContext';
import { Message } from '../../../types/Message';

/**
 * Interface for generating UI components based on AI responses
 */
export interface IUIComponentGenerator {
  /**
   * Generate UI components based on an AI response and user context
   * @param response The AI response message
   * @param userContext The user context
   * @returns Array of UI component objects
   */
  generateUIComponents(response: Message, userContext: UserContext, conversation: Message[]): UIComponent[];
  
  /**
   * Generate suggested prompts based on the user context
   * @param userContext The user context
   * @returns Array of suggested prompt strings
   */
  getSuggestedPrompts(userContext: UserContext): string[];
  
  /**
   * Generate available actions based on an AI response
   * @param response The AI response message
   * @param userContext The user context
   * @returns Array of available action objects
   */
  generateAvailableActions(response: Message, userContext: UserContext): any[];
}
