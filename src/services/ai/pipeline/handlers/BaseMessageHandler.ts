import { AIResponse } from "../../../../types/AIResponse";
import { IMessageHandler } from "../interfaces/IMessageHandler";
import { MessageRequest } from "../interfaces/MessageRequest";

export abstract class BaseMessageHandler implements IMessageHandler {
    protected nextHandler: IMessageHandler | null = null;
  
    setNext(handler: IMessageHandler): IMessageHandler {
      this.nextHandler = handler;
      return handler;
    }
  
    async handle(request: MessageRequest): Promise<AIResponse> {
      if (this.nextHandler) {
        return this.nextHandler.handle(request);
      }
      
      return {
        message: {
          role: 'assistant',
          content: 'Risposta non elaborata',
          timestamp: Date.now()
        }
      };
    }
  }