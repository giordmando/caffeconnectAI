import { AIResponse } from "../../../../types/AIResponse";
import { AIGuidedFunctionStrategy } from "../../strategies/AIGuidedFunctionStrategy";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class FunctionExecutionHandler extends BaseMessageHandler {
  constructor(
    private functionStrategy: AIGuidedFunctionStrategy
  ) {
    super();
  }

  async handle(request: MessageRequest): Promise<AIResponse> {
    // Verifica se FunctionDetectionHandler ha prodotto risultati
    if (!request.functionDetectionResults || request.functionDetectionResults.length === 0) {
      console.log('FunctionExecutionHandler: No functions detected to execute.');
      request.functionResults = []; // Assicura che functionResults sia un array vuoto
      return super.handle(request); // Passa al prossimo handler (probabilmente GroundingHandler)
    }
    
    try {
      const results = await this.functionStrategy.executeForMessage(request.message, request.userContext);
      
      // Aggiorna la richiesta con i risultati
      request.functionResults = results;
      
      // Passa al prossimo handler
      return super.handle(request);
    } catch (error) {
      console.error('Error executing functions:', error);
      request.functionResults = [];
      return super.handle(request);
    }
  }
  
}