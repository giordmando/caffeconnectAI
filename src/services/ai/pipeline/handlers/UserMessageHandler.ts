import { AIResponse } from "../../../../types/AIResponse";
import { Message } from "../../../../types/Message";
import { IConversationService } from "../../core/interfaces/IConversationService";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class UserMessageHandler extends BaseMessageHandler {
    constructor(private conversationService: IConversationService) {
      super();
    }
  
    async handle(request: MessageRequest): Promise<AIResponse> {
      // Crea e registra il messaggio utente
      const userMessage: Message = {
        role: 'user',
        content: request.message,
        timestamp: Date.now()
      };
      
      this.conversationService.addMessage(userMessage);
      
      // Passa alla fase successiva
      return super.handle(request);
    }
  }