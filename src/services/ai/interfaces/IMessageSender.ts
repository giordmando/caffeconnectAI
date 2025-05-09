import { AIResponse } from "../../../types/AIResponse";
import { UserContext } from "../../../types/UserContext";

export interface IMessageSender {
    sendMessage(message: string, userContext: UserContext): Promise<AIResponse>;
  }