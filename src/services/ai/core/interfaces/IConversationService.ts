import { Message } from "../../../../types/Message";

export interface IConversationService {
    getConversationHistory(): Message[];
    addMessage(message: Message): void;
    resetConversation(): void;
    formatMessagesForAI(): any[];
  }
  