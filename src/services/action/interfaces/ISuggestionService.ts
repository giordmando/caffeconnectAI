// src/services/suggestions/interfaces/ISuggestionService.ts
import { Message } from '../../../types/Message';
import { UserContext } from '../../../types/UserContext';

export interface ISuggestionService {
    getSuggestedPrompts(response: Message, userContext: UserContext): Promise<string[]>;
}