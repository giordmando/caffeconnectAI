import { Message } from './Message';
import { UIComponent } from './UI';

/**
 * Represents a complete response from the AI service
 */
export interface AIResponse {
  /** The AI's message response */
  message: Message;
  
  /** Optional available actions the user can take */
  availableActions?: {
    type: string;
    title: string;
    payload: any;
  }[];
  
  /** Optional suggested prompts for the user */
  suggestedPrompts?: string[];
  
  /** Optional UI components to display */
  uiComponents?: UIComponent[];
}