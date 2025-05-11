import { AIResponse } from "../../../../types/AIResponse";
import { MessageRequest } from "./MessageRequest";

export interface IMessageHandler {
    setNext(handler: IMessageHandler): IMessageHandler;
    handle(request: MessageRequest): Promise<AIResponse>;
  }
  