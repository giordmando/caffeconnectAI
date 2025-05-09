import { AIResponse } from "../../../types/AIResponse";
import { Message } from "../../../types/Message";
import { UserContext } from "../../../types/UserContext";

export interface IFunctionCallSupport {
    sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse>;
    getCompletion(messages: Message[], userContext: UserContext): Promise<any>;
  }