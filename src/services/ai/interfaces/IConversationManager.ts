import { Message } from "../../../types/Message";

export interface IConversationManager {
    getConversationHistory(): Message[];
    resetConversation(): void;
    addMessageToConversation(message: Message): void;
    setConversation(messages: Message[]): void;
  }