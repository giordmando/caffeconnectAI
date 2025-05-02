// src/services/ai/FunctionCallProcessor.ts

import { Message } from '../../types/Message';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { FunctionDefinition, FunctionCallResult } from '../../types/Function';

/**
 * Service responsible for processing function calls
 */
export class FunctionCallProcessor {
  private functionService: IFunctionService;
  
  constructor(functionService: IFunctionService) {
    this.functionService = functionService;
  }
  
  /**
   * Process a function call and return the result
   * @param functionCall The function call details
   * @param conversation The current conversation history
   * @param isMockMode Whether to use mock mode
   * @returns The resulting message with function result
   */
  async processFunctionCall(
    functionCall: any,
    conversation: Message[],
    isMockMode: boolean = false
  ): Promise<Message> {
    const functionName = functionCall.name;
    let args;
    
    try {
      args = JSON.parse(functionCall.arguments);
    } catch (error) {
      console.error('Error parsing function arguments:', error);
      args = {};
    }
    
    console.log(`Processing function call: ${functionName}`, args);
    
    // Create a message for the function call
    const functionCallMessage: Message = {
      role: 'assistant',
      content: '',
      functionCall: {
        name: functionName,
        arguments: functionCall.arguments
      },
      timestamp: Date.now()
    };
    
    // Add to conversation
    conversation.push(functionCallMessage);
    
    try {
      // Execute the function
      const result = await this.functionService.executeFunction(functionName, args);
      
      // Create a message with the result
      const functionResultMessage: Message = {
        role: 'function',
        name: functionName,
        content: '',
        functionResult: {
          name: functionName,
          result: JSON.stringify(result)
        },
        timestamp: Date.now()
      };
      
      // Add to conversation
      conversation.push(functionResultMessage);
      
      return functionResultMessage;
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      
      // Create an error message
      const errorMessage: Message = {
        role: 'function',
        name: functionName,
        content: '',
        functionResult: {
          name: functionName,
          result: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          })
        },
        timestamp: Date.now()
      };
      
      // Add to conversation
      conversation.push(errorMessage);
      
      return errorMessage;
    }
  }
}