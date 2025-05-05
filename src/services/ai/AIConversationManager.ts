// src/services/ai/AIConversationManager.ts

import { IAIService } from './interfaces/IAIService';
import { IUIComponentGenerator } from './interfaces/IUIComponentGenerator';
import { AIProviderConfig } from '../../types/AIProvider';
import { Message } from '../../types/Message';
import { UserContext } from '../../types/UserContext';
import { AIResponse } from '../../types/AIResponse';
import { UIComponentGenerator } from '../ui/UIComponentGenerator';
// Aggiunta all'inizio del file AIConversationManager.ts
import { FunctionCallProcessor } from './FunctionCallProcessor';
import { IFunctionService } from '../function/interfaces/IFunctionService';
import { ISuggestionService } from '../action/interfaces/ISuggestionService';
import { IActionService } from '../action/interfaces/IActionService';



/**
 * Advanced AI service with enhanced function calling support
 * Implements IAIService interface for seamless integration
 */
export class AIConversationManager implements IAIService {
    private baseService: IAIService;
    private uiComponentGenerator: IUIComponentGenerator;
    private maxFunctionCalls: number = 5;
    // Aggiunta alle proprietà della classe
    private functionCallProcessor: FunctionCallProcessor;
    private readonly suggestionService: ISuggestionService;
    private readonly actionService: IActionService;


    // Aggiunta al costruttore
    constructor(baseService: IAIService, functionService: IFunctionService, suggestionService: ISuggestionService,
      actionService: IActionService) {
        this.baseService = baseService;
        this.uiComponentGenerator = new UIComponentGenerator();
        this.functionCallProcessor = new FunctionCallProcessor(functionService);
        this.suggestionService = suggestionService;
        this.actionService = actionService;
    }

    async getCompletion(messages: Message[], userContext:UserContext): Promise<any> {
        return this.baseService.getCompletion(messages, userContext);
      }
      
      addMessageToConversation(message: Message): void {
        this.baseService.addMessageToConversation(message);
      }
      
      setConversation(messages: Message[]): void {
        this.baseService.setConversation(messages);
      }
  
  /**
   * Get the current provider name (delegates to base service)
   */
  getProviderName(): string {
    return this.baseService.getProviderName();
  }
  
  /**
   * Change the AI provider (delegates to base service)
   */
  changeProvider(provider: string, config: AIProviderConfig): void {
    this.baseService.changeProvider(provider, config);
  }
  
  /**
   * Get the conversation history (delegates to base service)
   */
  getConversationHistory(): Message[] {
    return this.baseService.getConversationHistory();
  }
  
  /**
   * Reset the conversation (delegates to base service)
   */
  resetConversation(): void {
    this.baseService.resetConversation();
  }
  
  
  /**
   * Simple message sending (delegates to advanced implementation)
   */
  async sendMessage(message: string, userContext: UserContext): Promise<AIResponse> {
    // Use the advanced implementation by default
    return this.sendMessageWithFunctionSupport(message, userContext);
  }
  
  async sendMessageWithFunctionSupport(message: string, userContext: UserContext): Promise<AIResponse> {
    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    // Get current conversation (for local use only)
    const conversation = [...this.baseService.getConversationHistory()];
    
    // Add user message to local conversation
    conversation.push(userMessage);
    
    // Add user message to the actual conversation
    this.baseService.addMessageToConversation(userMessage);
    
    // Track function calls
    let functionCalls = 0;
    const maxFunctionCalls = this.maxFunctionCalls;
    let isResponseComplete = false;
    let aiMessage: Message | null = null;
    
    try {
      // Start the function calling cycle
      while (!isResponseComplete && functionCalls < maxFunctionCalls) {
        // Request completion from the AI provider
        const completion = await this.getCompletion(conversation, userContext);
        
        // Check if the completion contains a function call
        if (completion.function_call) {
          functionCalls++;
          console.log(`Function call ${functionCalls}/${maxFunctionCalls}: ${completion.function_call.name}`);
          
          // Process the function call
          const functionResultMessage = await this.functionCallProcessor.processFunctionCall(
            completion.function_call,
            conversation
          );
          
          // Add function call and result to the actual conversation
          this.baseService.addMessageToConversation({
            role: 'assistant',
            content: '',
            functionCall: completion.function_call,
            timestamp: Date.now()
          });
          
          this.baseService.addMessageToConversation(functionResultMessage);
          
          // Continue the loop - we need another round of AI response
        } else {
          // No function call, we have a final response
          aiMessage = {
            role: 'assistant',
            content: completion.content || '',
            timestamp: Date.now()
          };
          
          // Add the final AI message to the conversation
          conversation.push(aiMessage);
          this.baseService.addMessageToConversation(aiMessage);
          
          isResponseComplete = true;
        }
      }
      
      // If we've reached the maximum number of function calls without a final response
      if (!isResponseComplete) {
        console.warn(`Reached maximum function calls (${maxFunctionCalls}) without final response`);
        
        // Generate a fallback response
        aiMessage = {
          role: 'assistant',
          content: 'Sto avendo difficoltà a elaborare la tua richiesta. Potresti fornire maggiori dettagli?',
          timestamp: Date.now()
        };
        
        // Add to conversation
        conversation.push(aiMessage);
        this.baseService.addMessageToConversation(aiMessage);
      }
      
      // Generate UI components and other response elements
      const uiComponents = this.uiComponentGenerator.generateUIComponents(
        aiMessage!,
        userContext,
        conversation
      );
      
      // Usa i nuovi servizi
      const suggestedPrompts = await this.suggestionService.getSuggestedPrompts(aiMessage!, userContext);
      const availableActions = await this.actionService.generateAvailableActions(
        aiMessage!, 
        userContext
      );
      
      // Return the complete response
      return {
        message: aiMessage!,
        uiComponents,
        suggestedPrompts,
        availableActions
      };
    } catch (error) {
      console.error('Error in function support cycle:', error);
      
      // Create an error response
      aiMessage = {
        role: 'assistant',
        content: 'Mi dispiace, ho avuto un problema nel processare la tua richiesta. Puoi riprovare?',
        timestamp: Date.now()
      };
      
      // Add error message to conversation
      this.baseService.addMessageToConversation(aiMessage);
      
      return {
        message: aiMessage,
        suggestedPrompts: ['Cosa c\'è nel menu?', 'Mostrami i prodotti', 'Quanti punti ho?']
      };
    }
  }

 
}