import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';

export interface ISuggestionProvider {
  generateSuggestions(response: Message, userContext: UserContext, timeOfDay: string): Promise<string[]>;
}