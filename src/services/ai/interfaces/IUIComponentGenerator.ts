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
  
}
