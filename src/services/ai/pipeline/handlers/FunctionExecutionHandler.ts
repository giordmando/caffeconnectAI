import { AIResponse } from "../../../../types/AIResponse";
import { UserContext } from "../../../../types/UserContext";
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
    // Verifica che la lista di funzioni da chiamare sia disponibile
    if (!request.functionDetectionResults || request.functionDetectionResults.length === 0) {
      console.log('No functions to execute');
      request.functionResults = [];
      return super.handle(request);
    }
    
    try {
      // Esegui tutte le funzioni in parallelo
      const results = await Promise.all(
        request.functionDetectionResults.map(async fnName => {
          try {
            const params = await this.functionStrategy.buildParamsForFunction(fnName, request.message, request.userContext);
            const result = await this.functionStrategy.executeFunction(fnName, params);
            return { functionName: fnName, success: result.success, result };
          } catch (error) {
            console.error(`Error executing function ${fnName}:`, error);
            return { functionName: fnName, success: false, error: String(error) };
          }
        })
      );
      
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