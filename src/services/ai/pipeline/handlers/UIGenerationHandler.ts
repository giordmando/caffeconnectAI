import { AIResponse } from "../../../../types/AIResponse";
import { IUIResponseGenerator } from "../../core/interfaces/IUIResponseGenerator";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class UIGenerationHandler extends BaseMessageHandler {
    constructor(private uiResponseGenerator: IUIResponseGenerator) {
      super();
    }
  
    async handle(request: MessageRequest): Promise<AIResponse> {
      // Se non c'è un messaggio AI, passa al prossimo handler
      if (!request.aiMessage) {
        return super.handle(request);
      }
      
      try {
      // PUNTO CRITICO: Passa il contesto della funzione al generatore UI
      const functionContext = request.functionResult ? {
        functionName: request.functionResult.name,
        functionResult: request.functionResult.result
      } : undefined;
      
      // Genera componenti UI, suggerimenti e azioni in parallelo
      const [uiComponents, suggestedPrompts, availableActions] = await Promise.all([
        this.uiResponseGenerator.generateUIComponents(
          request.aiMessage,
          request.userContext,
          request.conversationHistory,
          functionContext  // Passa il contesto della funzione
        ),
        this.uiResponseGenerator.generateSuggestions(
          request.aiMessage,
          request.userContext
        ),
        this.uiResponseGenerator.generateActions(
          request.aiMessage,
          request.userContext
        )
      ]);
      
      // Componi la risposta completa
      return {
        message: request.aiMessage,
        uiComponents,
        suggestedPrompts,
        availableActions
      };
      } catch (error) {
        console.error('Error generating UI components:', error);
        
        // Ritorna almeno il messaggio
        return { message: request.aiMessage };
      }
    }
  }