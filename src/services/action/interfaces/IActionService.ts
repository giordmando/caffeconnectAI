// src/services/actions/interfaces/IActionService.ts
import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';

export interface IActionService {
    generateAvailableActions(response: Message, userContext: UserContext): Promise<any[]>;
}