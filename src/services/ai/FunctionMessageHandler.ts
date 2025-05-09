// src/services/ai/FunctionMessageHandler.ts
import { Message } from '../../types/Message';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { AIResponseProcessor } from './AIResponseProcessor';

export class FunctionMessageHandler {
  constructor(
    private functionService: IFunctionService,
    private responseProcessor: AIResponseProcessor
  ) {}
  
  async handleFunctionCall(functionCall: any, conversation: Message[]): Promise<Message> {
    return this.responseProcessor.processFunctionCall(functionCall, conversation);
  }
  
  getFunctionsForAI(): any[] {
    return this.functionService.getFunctionsForAI();
  }
  
  getFunctionDescriptions(): string {
    return this.functionService.getAllFunctions()
      .map(fn => `- ${fn.name}: ${fn.description}`)
      .join('\n');
  }
  
  async trackUserInteraction(message: string, userId: string): Promise<void> {
    return this.responseProcessor.trackUserInteraction(message, userId);
  }
}