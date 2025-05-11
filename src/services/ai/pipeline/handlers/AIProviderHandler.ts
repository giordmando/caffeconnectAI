import { AIResponse } from "../../../../types/AIResponse";
import { Message } from "../../../../types/Message";
import { getTimeOfDay } from "../../../../utils/timeContext";
import { IFunctionService } from "../../../function/interfaces/IFunctionService";
import { IAIProviderService } from "../../core/interfaces/IAIProviderService";
import { IConversationService } from "../../core/interfaces/IConversationService";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class AIProviderHandler extends BaseMessageHandler {
    constructor(
      private aiProviderService: IAIProviderService,
      private conversationService: IConversationService,
      private functionService: IFunctionService
    ) {
      super();
    }
  
    async handle(request: MessageRequest): Promise<AIResponse> {
      try {
        // Prepara i messaggi per l'AI
        const messages = this.conversationService.formatMessagesForAI();
        // Ottieni funzioni
        const functions = this.functionService.getFunctionsForAI();
        // Invia la richiesta all'AI provider
        const response = await this.aiProviderService.sendCompletionRequest(messages, {
          functions: functions,
          context: {
            timeOfDay: getTimeOfDay(),
            userContext: request.userContext
          }
        });
        
        // Verifica se è necessario processare una funzione o restituire una risposta
        if (!response.function_call) {
          // Crea il messaggio di risposta
          const aiMessage: Message = {
            role: 'assistant',
            content: response.content || '',
            timestamp: Date.now()
          };
          
          // Registra il messaggio
          this.conversationService.addMessage(aiMessage);
          
          // Modifica la richiesta per gli handler successivi
          request.aiMessage = aiMessage;
        } else {
          // Imposta la funzione da chiamare
          request.functionCall = response.function_call;
        }
        
        // Passa alla fase successiva
        return super.handle(request);
      } catch (error) {
        // Gestione errori
        console.error('Error in AI Provider communication:', error);
        
        // Risposta di fallback
        const errorMessage: Message = {
          role: 'assistant',
          content: 'Mi dispiace, ho avuto un problema nel processare la richiesta.',
          timestamp: Date.now()
        };
        
        this.conversationService.addMessage(errorMessage);
        
        return { message: errorMessage };
      }
    }
  }