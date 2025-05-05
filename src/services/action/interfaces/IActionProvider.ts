import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';

export interface IActionProvider {
  generateActions(response: Message, userContext: UserContext, timeOfDay: string): Promise<any[]>;
}
