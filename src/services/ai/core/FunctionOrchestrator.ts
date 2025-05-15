import { Message } from "../../../types/Message";
import { UserContext } from "../../../types/UserContext";
import { IFunctionExecutionStrategy } from "../../function/interfaces/IFunctionExecutionStrategy";
import { IFunctionService } from "../../function/interfaces/IFunctionService";
import { IFunctionOrchestrator } from "./interfaces/IFunctionOrchestrator";

export class FunctionOrchestrator implements IFunctionOrchestrator {
    constructor(
      private functionService: IFunctionService,
      private executionStrategy: IFunctionExecutionStrategy
    ) {}
    
    async processFunctionCall(call: any): Promise<Message> {
      // Esegui la funzione
      const args = JSON.parse(call.arguments);
      const result = await this.executionStrategy.executeFunction(call.name, args);
      
      // Crea un messaggio per il risultato
      const functionResultMessage: Message = {
        role: 'function',
        name: call.name,
        content: this.generateResponseFromResult(call.name, result).content,
        functionResult: {
          name: call.name,
          result: result
        },
        timestamp: Date.now()
      };
      
      return functionResultMessage;
    }
    
    async executeForMessage(message: string, userContext: UserContext): Promise<any[]> {
      // Se la strategia supporta l'esecuzione basata su messaggio, usala
      if (this.executionStrategy.executeForMessage) {
        return await this.executionStrategy.executeForMessage(message, userContext);
      }
      
      // Altrimenti, non è possibile eseguire funzioni in base al messaggio
      console.warn('Function strategy does not support message-based execution');
      return [];
    }
    
    getFunctionsForAI(): any[] {
      return this.functionService.getFunctionsForAI();
    }
    
    shouldExecuteFunction(response: any): boolean {
      return !!response.function_call;
    }
    
    private generateResponseFromResult(functionName: string, result: any): Message {
      // Logica per generare una risposta testuale dal risultato della funzione
      
      let responseText = "";
      const data = result.data?.data ?? result.data;
      
      if (functionName === "get_user_loyalty_points" && result.success) {
        responseText = `Hai accumulato ${data.points} punti fedeltà e sei nel livello ${data.tier}. Ti mancano ${data.nextTier.pointsNeeded} punti per raggiungere il livello ${data.nextTier.name}.`;
      } else if (functionName === "get_user_preferences" && result.success) {
        responseText = `In base alle tue preferenze, noto che apprezzi ${data.favoriteDrinks.join(' e ')} da bere e ${data.favoriteFood.join(' e ')} da mangiare. Di solito visiti il nostro locale al mattino.`;
      } else if (functionName === "get_menu_recommendations" && result.success) {
        const items = data.recommendations.map((r: any) => r.name).join(', ');
        responseText = `Ecco alcune raccomandazioni dal menu: ${items}. Ti sembrano interessanti?`;
      } else if (functionName === "get_product_recommendations" && result.success) {
        const products = data.recommendations.map((r: any) => r.name).join(', ');
        responseText = `Ecco alcuni prodotti che potrebbero interessarti: ${products}. Posso darti più dettagli su uno di questi.`;
      } else {
        responseText = Array.isArray(data.results) && data.results.length > 0 ? data.results[0] : data?.message || "Ho elaborato la tua richiesta. C'è altro di cui hai bisogno?";
      }
      
      return {
        role: "assistant",
        content: responseText,
        timestamp: Date.now()
      };
    }
  }