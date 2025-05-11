import { Message } from "../../../../types/Message";

export interface IAIProviderService {
    sendMessage(prompt: string): Promise<string>;
    sendCompletionRequest(messages: Message[], options?: any): Promise<any>;
    getProviderName(): string;
  }