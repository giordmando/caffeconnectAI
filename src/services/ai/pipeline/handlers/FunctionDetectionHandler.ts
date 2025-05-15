import { AIResponse } from "../../../../types/AIResponse";
import { AIGuidedFunctionStrategy } from "../../strategies/AIGuidedFunctionStrategy";
import { MessageRequest } from "../interfaces/MessageRequest";
import { BaseMessageHandler } from "./BaseMessageHandler";

export class FunctionDetectionHandler extends BaseMessageHandler {
    constructor(
      private aiGuidedFunctionStrategy: AIGuidedFunctionStrategy
    ) {
      super();
    }
  
    async handle(request: MessageRequest): Promise<AIResponse> {
      // Determina quali funzioni chiamare
      const functionsToCall = await this.aiGuidedFunctionStrategy.determineFunctions(
        request.message, 
        request.userContext
      );
      
      // Aggiungi i risultati alla richiesta
      request.functionDetectionResults = functionsToCall;
      
      // Passa al prossimo handler
      return super.handle(request);
    }
  }