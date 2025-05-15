import { AIResponse } from "../../../../types/AIResponse";
import { GroundingService } from "../../core/GroundingService";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class GroundingHandler extends BaseMessageHandler {
  constructor(
    private groundingService: GroundingService
  ) {
    super();
  }

  async handle(request: MessageRequest): Promise<AIResponse> {
    // Verifica che i risultati delle funzioni siano disponibili
    if (!request.functionResults) {
      console.warn('No function results available for grounding');
      request.functionResults = [];
    }
    
    try {
      // Genera risposta grounded sui dati recuperati
      const aiMessage = await this.groundingService.generateGroundedResponse(
        request.message,
        request.functionResults,
        request.userContext,
        request.conversationHistory
      );
      
      // Aggiorna la richiesta con la risposta AI
      request.aiMessage = aiMessage;
      
      // Passa al prossimo handler
      return super.handle(request);
    } catch (error) {
      console.error('Error in grounding response:', error);
      
      // Crea una risposta di fallback
      request.aiMessage = {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
      
      return super.handle(request);
    }
  }
}