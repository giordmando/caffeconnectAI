import { Message } from '../../types/Message';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { IFunctionExecutionStrategy } from '../function/interfaces/IFunctionExecutionStrategy';

/**
 * Service responsible for processing AI responses and handling function calls
 */
export class AIResponseProcessor {
  private functionService: IFunctionService;
  private executionStrategy: IFunctionExecutionStrategy;

  constructor(functionService: IFunctionService, executionStrategy: IFunctionExecutionStrategy) {
    this.functionService = functionService;
    this.executionStrategy = executionStrategy;
  }
  
  /**
   * Process a function call from an AI response
   */
  async processFunctionCall(
    functionCall: any, 
    conversation: Message[]
  ): Promise<Message> {
    const functionName = functionCall.name;
    const args = JSON.parse(functionCall.arguments);
    
    console.log(`Function call: ${functionName}`, args);
    
    // Add function call message to conversation
    const functionCallMessage: Message = {
      role: 'assistant',
      content: '',
      name: functionName,
      functionCall: {
        name: functionName,
        arguments: functionCall.arguments
      },
      timestamp: Date.now()
    };
    
    conversation.push(functionCallMessage);
    
    // Execute function (real or mock based on mode)
  
    const functionmeta = this.functionService.getFunctionDataEndpoints(functionName);
    //if (isMockMode && (!functionmeta && !this.functionService.areCustomFunctionsLoaded())) {
    //  functionResult = await mockFunctionExecution(functionName, args);
    //} else {
    //  functionResult = await this.functionService.executeFunction(functionName, args);
    //}

    const functionResult = await this.executionStrategy.executeFunction(functionName, args);
    
    // Add function result message
    const functionResultMessage: Message = {
      role: 'function',
      content: '',
      name: functionName,
      functionResult: {
        name: functionName,
        result: JSON.stringify(functionResult)
      },
      timestamp: Date.now()
    };
    
    conversation.push(functionResultMessage);

    const mockResponse = this.generateMockResponseForFunction(functionName, functionResult);
    return {
      role: 'assistant',
      content: mockResponse,
      timestamp: Date.now()
    };
    
  }
  
  /**
   * Generate a mock response based on function result
   */
  private generateMockResponseForFunction(functionName: string, functionResult: any): string {
    const data = functionResult.data?.data ?? functionResult.data;
    if (functionName === 'get_user_loyalty_points' && functionResult.success) {
      // Mock data for loyalty points
      return `Hai accumulato ${data.points} punti fedeltà e sei nel livello ${data.tier}. Ti mancano ${data.nextTier.pointsNeeded} punti per raggiungere il livello ${data.nextTier.name}.`;
    } 
    else if (functionName === 'get_user_preferences' && functionResult.success) {
      // Mock data for user preferences
      return `In base alle tue preferenze, noto che apprezzi ${data.favoriteDrinks.join(' e ')} da bere e ${data.favoriteFood.join(' e ')} da mangiare. Di solito visiti il nostro locale al mattino.`;
    }
    else if (functionName === 'get_menu_recommendations' && functionResult.success) {
      // Mock data for menu recommendations
      const items = data.recommendations.map((r: any) => r.name).join(', ');
      let timeOfDay;
      if (typeof functionResult.args === 'string') {
        try {
          const argsfunc = JSON.parse(functionResult.args);
          timeOfDay = argsfunc.timeOfDay;
        } catch (e) {
          console.error('Error parsing JSON:', e);
        }
      } else if (typeof functionResult.args === 'object') {
        const argsfunc = functionResult.args;
        timeOfDay = argsfunc.timeOfDay;
      } else {
        console.log('Unsupported type:', typeof functionResult.args);
      }
      if (timeOfDay === 'morning') {
        return `Per colazione, in base alle tue preferenze, ti consiglio: ${items}. Sono tutte ottime scelte per iniziare la giornata!`;
      } else if (timeOfDay === 'afternoon') {
        return `Per pranzo oggi potresti provare: ${items}. Sono opzioni leggere ma soddisfacenti.`;
      } else {
        return `Per l'aperitivo di questa sera ti suggerisco: ${items}. Perfetti per un momento di relax.`;
      }
    }
    else if (functionName === 'get_product_recommendations' && functionResult.success) {
      const data = functionResult.data;
      const products = data.recommendations.map((r: any) => r.name).join(', ');
      return `Ecco alcuni prodotti che potrebbero interessarti per l'acquisto: ${products}. Posso darti più dettagli su uno di questi, se sei interessato.`;
    }
    else {
      return "Ho elaborato la tua richiesta, ma ho riscontrato un problema. Puoi riprovare con una domanda diversa?";
    }
  }
  
  /**
   * Track user interaction for analytics
   */
  async trackUserInteraction(
    message: string, 
    userId: string, 
  ): Promise<void> {
    try {
      const args = {
        userId,
        actionType: 'interaction',
        itemId: 'chat-message',
        itemType: 'conversation',
        metadata: { message }
      }

      this.executionStrategy.executeFunction('track_user_action', args);
    
    } catch (error) {
      console.warn('Error tracking interaction:', error);
      // Don't block the flow in case of tracking error
    }
  }
}